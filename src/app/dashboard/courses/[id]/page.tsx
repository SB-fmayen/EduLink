

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
import { ClipboardList, FileText, Megaphone, ShieldAlert, Users } from 'lucide-react';
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

function StudentListTab({ courseId, schoolId, hasPermission }: { courseId: string, schoolId: string, hasPermission: boolean }) {
    const firestore = useFirestore();

    const enrolledStudentsRef = useMemoFirebase(() => {
        if (hasPermission && schoolId && courseId) {
            return collection(firestore, `schools/${schoolId}/courses/${courseId}/students`);
        }
        return null;
    }, [hasPermission, firestore, schoolId, courseId]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);

    const studentIds = React.useMemo(() => {
        if (!enrolledStudents) return null;
        if (enrolledStudents.length === 0) return []; // Return empty array to avoid query errors
        return enrolledStudents.map(s => s.studentId);
    }, [enrolledStudents]);

    const studentProfilesQuery = useMemoFirebase(() => {
        if (studentIds === null) return null; // Still waiting for enrolled students
        if (studentIds.length === 0) return null; // No students to query
        // Firestore 'in' queries are limited to 30 items. For larger classes, pagination would be needed.
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
    }, [firestore, studentIds]);

    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);

    const isLoading = isLoadingEnrolled || isLoadingProfiles;

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">Acceso Restringido</h3>
                <p className="text-sm text-muted-foreground">No tienes permisos para ver la lista de estudiantes.</p>
            </div>
        );
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : students && students.length > 0 ? (
                    students.map(student => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                            <TableCell>{student.email}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">
                            No hay estudiantes inscritos en este curso.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}


export default function CourseDetailsPage({ params }: { params: { id: string } }) {
    const courseId = params.id;
    const firestore = useFirestore();
    const { user, isUserLoading: isAuthLoading } = useUser();
    
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

    const isCoreDataLoading = isAuthLoading || isProfileLoading || isCourseLoading;

    const canViewStudents = React.useMemo(() => {
        if (isCoreDataLoading || !userProfile || !course) return false;
        return userProfile.role === 'admin' || user?.uid === course.teacherId;
    }, [isCoreDataLoading, userProfile, course, user]);


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
            <h1 className="text-3xl font-bold tracking-tight">{course.subjectName} - {course.sectionName}</h1>
            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="students">
                        <Users className="mr-2 h-4 w-4" />
                        Estudiantes
                    </TabsTrigger>
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
                        Material
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="students">
                     <Card>
                        <CardHeader>
                            <CardTitle>Estudiantes Inscritos</CardTitle>
                            <CardDescription>Lista de estudiantes que participan en este curso.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <StudentListTab courseId={course.id} schoolId={userProfile.schoolId} hasPermission={canViewStudents} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="grades">
                     <PlaceholderTab title="Registro de Calificaciones" />
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
