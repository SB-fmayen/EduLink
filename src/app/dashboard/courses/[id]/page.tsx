
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
import { collection, query, where, doc, documentId } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, FileText, Megaphone, ShieldAlert } from 'lucide-react';
import { Role } from '@/lib/roles';


interface Course {
    id: string;
    subjectName: string;
    sectionName: string;
    teacherId: string;
    sectionId: string;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface EnrolledStudent {
    id: string; 
    studentId: string;
}

interface UserProfile {
  role: Role;
  schoolId: string;
}

function PlaceholderTab({ title }: { title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Módulo en construcción.</p>
            </CardContent>
        </Card>
    )
}


export default function CourseDetailsPage({ params }: { params: { id: string } }) {
    const courseId = React.use(params).id;
    const firestore = useFirestore();
    const { user, isUserLoading: isAuthLoading } = useUser();
    
    // --- Data Fetching ---
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const schoolId = userProfile?.schoolId;

    const courseRef = useMemoFirebase(() => {
        if (schoolId && courseId) {
            return doc(firestore, `schools/${schoolId}/courses`, courseId);
        }
        return null;
    }, [firestore, schoolId, courseId]);
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

    // --- Permissions Logic ---
    const canViewStudents = React.useMemo(() => {
        // Only determine permissions AFTER all loading is complete.
        if (isProfileLoading || isCourseLoading || !userProfile || !course) return false;
        return userProfile.role === 'admin' || user?.uid === course.teacherId;
    }, [isProfileLoading, isCourseLoading, userProfile, course, user]);


    // --- Student Data Fetching (Conditional) ---
    // This ref is now derived from canViewStudents, which waits for loading to complete.
    const enrolledStudentsRef = useMemoFirebase(() => {
        if (canViewStudents && schoolId && courseId) {
            return collection(firestore, `schools/${schoolId}/courses/${courseId}/students`);
        }
        return null;
    }, [canViewStudents, firestore, schoolId, courseId]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);

    const studentIds = React.useMemo(() => {
        if (!enrolledStudents || enrolledStudents.length === 0) return null;
        return enrolledStudents.map(s => s.id);
    }, [enrolledStudents]);

    const studentProfilesQuery = useMemoFirebase(() => {
        if (!studentIds) return null;
        // Important: Ensure studentIds is not empty before creating a query with 'in'
        if (studentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
    }, [firestore, studentIds]);

    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);


    // --- Combined Loading State ---
    const isCoreDataLoading = isAuthLoading || isProfileLoading || isCourseLoading;
    const isLoadingStudentList = canViewStudents && (isLoadingEnrolled || isLoadingProfiles);

    if (isCoreDataLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-9 w-1/2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }
    
    if (!course || !user || !userProfile) {
        return <p>No se pudo cargar la información del curso o del usuario.</p>
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">{course.subjectName}</h1>
            <Tabs defaultValue="grades" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="grades">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Calificaciones
                    </TabsTrigger>
                    <TabsTrigger value="assignments">
                        <FileText className="mr-2 h-4 w-4" />
                        Tareas
                    </TabsTrigger>
                    <TabsTrigger value="announcements">
                        <Megaphone className="mr-2 h-4 w-4" />
                        Anuncios
                    </TabsTrigger>
                    <TabsTrigger value="materials">
                        <FileText className="mr-2 h-4 w-4" />
                        Material de Clase
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="grades">
                     <Card>
                        <CardHeader>
                            <CardTitle>Registro de Calificaciones</CardTitle>
                            <CardDescription>
                                Introduzca las notas de los estudiantes para el curso {course?.subjectName}.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!canViewStudents ? (
                                <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                                    <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                                    <h3 className="font-semibold">Acceso Restringido</h3>
                                    <p className="text-sm text-muted-foreground">No tienes permisos para ver la lista de estudiantes.</p>
                                </div>
                            ) : (
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
                                    {isLoadingStudentList ? (
                                        Array.from({ length: 3 }).map((_, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : students && students.length > 0 ? (
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
                                                No hay estudiantes inscritos en este curso.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="assignments">
                     <PlaceholderTab title="Tareas" />
                </TabsContent>
                <TabsContent value="announcements">
                     <PlaceholderTab title="Anuncios" />
                </TabsContent>
                 <TabsContent value="materials">
                     <PlaceholderTab title="Material de Clase" />
                </TabsContent>
            </Tabs>
        </div>
    );
}

