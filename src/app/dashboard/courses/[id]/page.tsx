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
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, documentId, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, FileText, Megaphone, ShieldAlert, Users, CalendarCheck } from 'lucide-react';
import { Role } from '@/lib/roles';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';


interface Course {
    id: string;
    subjectName: string;
    sectionName: string;
    gradeName?: string;
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
}

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string; // Campo para legibilidad
    status: 'presente' | 'ausente' | 'tardanza';
    date: string;
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

function AttendanceTab({ courseId, hasPermission }: { courseId: string; hasPermission: boolean }) {
    const firestore = useFirestore();
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

    // 1. Get enrolled students for the course
    const enrolledStudentsRef = useMemoFirebase(() => {
        if (hasPermission && courseId) {
            return collection(firestore, `courses/${courseId}/students`);
        }
        return null;
    }, [hasPermission, firestore, courseId]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);
    
    const studentIds = React.useMemo(() => enrolledStudents?.map(s => s.studentId) || [], [enrolledStudents]);

    // 2. Get profiles of enrolled students
    const studentProfilesQuery = useMemoFirebase(() => {
        if (studentIds.length > 0) {
            return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
        }
        return null;
    }, [firestore, studentIds]);
    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);

    // 3. Get attendance records for the selected date from the subcollection
    const attendanceQuery = useMemoFirebase(() => {
        if (courseId && formattedDate) {
            return query(
                collection(firestore, `courses/${courseId}/attendance`), 
                where('date', '==', formattedDate)
            );
        }
        return null;
    }, [firestore, courseId, formattedDate]);
    const { data: attendanceData, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);


    const attendanceMap = React.useMemo(() => {
        if (!attendanceData) return new Map();
        return attendanceData.reduce((acc, record) => {
            acc.set(record.studentId, record.status);
            return acc;
        }, new Map<string, string>());
    }, [attendanceData]);

    const handleSetAttendance = async (studentId: string, status: 'presente' | 'ausente' | 'tardanza') => {
        if (!courseId || !date || !hasPermission || !students) return;

        const student = students.find(s => s.id === studentId);
        if (!student) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se encontró el estudiante para guardar la asistencia.',
            });
            return;
        }
        
        const recordId = `${studentId}_${formattedDate}`;
        const attendanceRef = doc(firestore, `courses/${courseId}/attendance`, recordId);

        try {
            await setDoc(attendanceRef, {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`, // <-- Dato legible
                date: formattedDate,
                status: status,
            }, { merge: true });
            toast({
                title: 'Asistencia Actualizada',
                description: `Se ha guardado la asistencia.`,
            })
        } catch (error) {
            console.error("Error updating attendance:", error);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: 'No se pudo actualizar la asistencia. Verifica tus permisos.',
            })
        }
    };

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">Acceso Restringido</h3>
                <p className="text-sm text-muted-foreground">No tienes permisos para gestionar la asistencia.</p>
            </div>
        );
    }
    
    const isLoading = isLoadingEnrolled || isLoadingProfiles || isLoadingAttendance;

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Seleccionar Fecha</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={es}
                            className="rounded-md border w-full"
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Lista de Estudiantes</CardTitle>
                        <CardDescription>
                            Registra la asistencia para el día: {date ? format(date, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Estudiante</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-3/4 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : students && students.length > 0 ? (
                                    students.map(student => {
                                        const currentStatus = attendanceMap.get(student.id);
                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                                                <TableCell className="text-right space-x-1">
                                                     <Button 
                                                        variant={currentStatus === 'presente' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'presente')}>
                                                        Presente
                                                     </Button>
                                                      <Button 
                                                        variant={currentStatus === 'ausente' ? 'destructive' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'ausente')}>
                                                        Ausente
                                                     </Button>
                                                     <Button 
                                                        variant={currentStatus === 'tardanza' ? 'secondary' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'tardanza')}>
                                                        Tardanza
                                                     </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">No hay estudiantes en este curso.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StudentListTab({ courseId, hasPermission }: { courseId: string, hasPermission: boolean }) {
    const firestore = useFirestore();

    const enrolledStudentsRef = useMemoFirebase(() => {
        if (hasPermission && courseId) {
            return collection(firestore, `courses/${courseId}/students`);
        }
        return null;
    }, [hasPermission, firestore, courseId]);
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


    const courseRef = useMemoFirebase(() => {
        if (courseId) {
            return doc(firestore, `courses`, courseId);
        }
        return null;
    }, [firestore, courseId]);
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

    const isCoreDataLoading = isAuthLoading || isProfileLoading || isCourseLoading;

    const canManageCourse = React.useMemo(() => {
        if (isCoreDataLoading || !userProfile || !course) return false;
        // Permite la vista si es admin, director, o el profesor asignado a este curso.
        return userProfile.role === 'admin' || userProfile.role === 'director' || user?.uid === course.teacherId;
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
    
    const courseTitle = `${course.subjectName} - ${course.gradeName || ''} ${course.sectionName}`.replace(/ -  | - $/, ' - ').trim();


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">{courseTitle}</h1>
            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="students">
                        <Users className="mr-2 h-4 w-4" />
                        Estudiantes
                    </TabsTrigger>
                     <TabsTrigger value="attendance">
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Asistencia
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
                           <StudentListTab courseId={course.id} hasPermission={canManageCourse} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="attendance">
                    <AttendanceTab courseId={course.id} hasPermission={canManageCourse} />
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
