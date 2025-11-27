

'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDocs } from 'firebase/firestore';
import { Role } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
interface UserProfile {
  role: Role;
  schoolId: string;
}

interface Course {
    id: string;
    subjectName: string;
    sectionName: string;
    teacherId: string;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

// --- Vista para Profesores ---
function TeacherGradesView({ profile }: { profile: UserProfile }) {
    const firestore = useFirestore();
    const { user } = useUser();
    const router = useRouter();
    const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');

    // 1. Obtener los cursos del profesor
    const teacherCoursesQuery = useMemoFirebase(() => {
        if (profile.schoolId && user) {
            return query(
                collection(firestore, `schools/${profile.schoolId}/courses`),
                where('teacherId', '==', user.uid)
            );
        }
        return null;
    }, [firestore, user, profile.schoolId]);
    const { data: teacherCourses, isLoading: isLoadingCourses } = useCollection<Course>(teacherCoursesQuery);
    
    React.useEffect(() => {
        if(selectedCourseId) {
            router.push(`/dashboard/courses/${selectedCourseId}`)
        }
    }, [selectedCourseId, router])


    return (
        <Card>
            <CardHeader>
                <CardTitle>Selección de Curso</CardTitle>
                <CardDescription>
                    Selecciona un curso para gestionar las calificaciones, tareas y más. Serás redirigido a la página del curso.
                </CardDescription>
                <div className="pt-4">
                    <Select onValueChange={setSelectedCourseId} value={selectedCourseId} disabled={isLoadingCourses}>
                        <SelectTrigger className="w-full md:w-1/2">
                            <SelectValue placeholder={isLoadingCourses ? "Cargando cursos..." : "Selecciona un curso"} />
                        </SelectTrigger>
                        <SelectContent>
                            {teacherCourses?.map(course => (
                                <SelectItem key={course.id} value={course.id}>
                                    {course.subjectName} - {course.sectionName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground h-24 flex items-center justify-center">
                    <p>Por favor, selecciona un curso del menú superior para comenzar.</p>
                </div>
            </CardContent>
        </Card>
    );
}

// --- Vista para Estudiantes/Padres (Placeholder) ---
function StudentParentGradesView() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Mis Calificaciones</CardTitle>
                <CardDescription>
                    Aquí podrás ver un resumen de tus calificaciones por curso.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Módulo en construcción.</p>
            </CardContent>
        </Card>
    );
}

// --- Componente Principal ---
export default function GradesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    if (isProfileLoading || !userProfile) {
        return (
             <div className="flex flex-col gap-6">
                <h1 className="text-3xl font-bold tracking-tight">Gestión de Calificaciones</h1>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-5 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
  
    const renderContent = () => {
        switch (userProfile.role) {
            case 'teacher':
                return <TeacherGradesView profile={userProfile} />;
            case 'student':
            case 'parent':
                return <StudentParentGradesView />;
            case 'admin':
                return <p>La vista de administrador para calificaciones está en construcción.</p>;
            default:
                return <p>No tienes acceso a este módulo.</p>;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Calificaciones</h1>
            {renderContent()}
        </div>
    );
}

    
