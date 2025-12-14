
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
import { collection, query, where, doc, getDocs, documentId } from 'firebase/firestore';
import { Role } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toast } from '@/hooks/use-toast';


// --- Interfaces ---
interface UserProfile {
  role: Role;
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
}

interface EnrolledStudent {
    studentId: string;
    id: string;
}

interface Grade {
    id: string;
    studentId: string;
    courseId: string;
    score: number;
    term: string; // ej: "1er Trimestre"
}


// --- Vista para Profesores ---
function TeacherGradesView({ profile }: { profile: UserProfile }) {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');
    const [grades, setGrades] = React.useState<Record<string, number | string>>({});

    // 1. Obtener los cursos del profesor
    const teacherCoursesQuery = useMemoFirebase(() => {
        if (user) {
            return query(
                collection(firestore, `courses`),
                where('teacherId', '==', user.uid)
            );
        }
        return null;
    }, [firestore, user]);
    const { data: teacherCourses, isLoading: isLoadingCourses } = useCollection<Course>(teacherCoursesQuery);

    // 2. Obtener estudiantes del curso seleccionado
    const enrolledStudentsRef = useMemoFirebase(() => {
        if (selectedCourseId) {
            return collection(firestore, `courses/${selectedCourseId}/students`);
        }
        return null;
    }, [selectedCourseId, firestore]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);

    const studentIds = React.useMemo(() => enrolledStudents?.map(s => s.studentId) || [], [enrolledStudents]);

    const studentProfilesQuery = useMemoFirebase(() => {
        if (studentIds.length > 0) {
            return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
        }
        return null;
    }, [studentIds, firestore]);
    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);
    
    const handleGradeChange = (studentId: string, value: string) => {
        const score = value === '' ? '' : Number(value);
         if (score === '' || (score >= 0 && score <= 100)) {
            setGrades(prev => ({...prev, [studentId]: score}));
        }
    };
    
    const handleSaveGrades = () => {
        if (!selectedCourseId) return;

        Object.entries(grades).forEach(([studentId, score]) => {
            if (score === '' || typeof score !== 'number') return;
            
            // Aquí definiríamos una referencia única para la calificación, por ejemplo, por trimestre.
            // Para este ejemplo, usaremos un ID simple.
            const gradeId = `${selectedCourseId}-${studentId}-term1`;
            const gradeRef = doc(firestore, `grades`, gradeId);

            const gradeData = {
                score,
                studentId,
                courseId: selectedCourseId,
                updatedAt: new Date(),
            };
            
            updateDocumentNonBlocking(gradeRef, gradeData);
        });

        toast({
            title: 'Calificaciones Guardadas',
            description: 'Las calificaciones han sido guardadas correctamente.',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registro de Calificaciones</CardTitle>
                <CardDescription>
                    Selecciona un curso para ver los estudiantes y registrar sus calificaciones.
                </CardDescription>
                <div className="pt-4 flex justify-between items-center">
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
                     {selectedCourseId && (
                        <Button onClick={handleSaveGrades} disabled={Object.keys(grades).length === 0}>
                            Guardar Cambios
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
               {selectedCourseId ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Estudiante</TableHead>
                            <TableHead className="w-[150px]">Calificación (0-100)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingEnrolled || isLoadingProfiles ? (
                            <TableRow><TableCell colSpan={2} className="text-center">Cargando estudiantes...</TableCell></TableRow>
                        ) : students && students.length > 0 ? (
                            students.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            min="0"
                                            max="100"
                                            value={grades[student.id] ?? ''}
                                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                            placeholder="N/A"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                           <TableRow><TableCell colSpan={2} className="text-center h-24">No hay estudiantes en este curso.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
               ) : (
                <div className="text-center text-muted-foreground h-24 flex items-center justify-center">
                    <p>Por favor, selecciona un curso del menú superior para comenzar.</p>
                </div>
               )}
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
                return <Card><CardHeader><CardTitle>Vista de Administrador</CardTitle></CardHeader><CardContent><p>La vista de administrador para calificaciones está en construcción.</p></CardContent></Card>;
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
