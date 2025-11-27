
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
    const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');
    const [students, setStudents] = React.useState<Student[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);

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

    // 2. Cuando se selecciona un curso, buscar a los estudiantes inscritos
    React.useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedCourseId || !firestore || !teacherCourses) return;
            setIsLoadingStudents(true);
            setStudents([]);
            
            const selectedCourse = teacherCourses.find(c => c.id === selectedCourseId);
            if (!selectedCourse) {
                 setIsLoadingStudents(false);
                 return;
            }

            try {
                // Encontrar a los usuarios que tienen este curso en su subcolección 'studentCourses'
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('role', '==', 'student'));
                const allStudentsSnapshot = await getDocs(q);

                const enrolledStudents: Student[] = [];

                for (const studentDoc of allStudentsSnapshot.docs) {
                    const studentCoursesRef = collection(firestore, `users/${studentDoc.id}/studentCourses`);
                    const studentCoursesQuery = query(studentCoursesRef, where('courseId', '==', selectedCourseId));
                    const studentCoursesSnapshot = await getDocs(studentCoursesQuery);

                    if (!studentCoursesSnapshot.empty) {
                        enrolledStudents.push({ id: studentDoc.id, ...studentDoc.data() } as Student);
                    }
                }
                
                setStudents(enrolledStudents);

            } catch (error) {
                console.error("Error fetching students for course:", error);
            } finally {
                setIsLoadingStudents(false);
            }
        };

        fetchStudents();
    }, [selectedCourseId, firestore, teacherCourses]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Registro de Calificaciones</CardTitle>
                <CardDescription>
                    Selecciona un curso para ver los estudiantes y registrar sus notas.
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-[250px]'>Estudiante</TableHead>
                            <TableHead>Evaluación</TableHead>
                            <TableHead>Nota</TableHead>
                            <TableHead className='text-right'>Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingStudents ? (
                            <TableRow><TableCell colSpan={4} className="text-center"><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                        ) : selectedCourseId && students.length > 0 ? (
                            students.map(student => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                                    <TableCell>
                                       <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tipo de evaluación" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="exam">Examen</SelectItem>
                                                <SelectItem value="homework">Tarea</SelectItem>
                                                <SelectItem value="project">Proyecto</SelectItem>
                                                <SelectItem value="quiz">Prueba Corta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" placeholder="0.0" min="0" max="100" step="0.1" />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm">Guardar</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    {selectedCourseId ? 'No hay estudiantes inscritos en este curso.' : 'Selecciona un curso para ver la lista de estudiantes.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
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

    