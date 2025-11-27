
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, FileText, Megaphone } from 'lucide-react';


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

function CourseGrades({ courseId, schoolId }: { courseId: string, schoolId: string }) {
    const firestore = useFirestore();
    const [students, setStudents] = React.useState<Student[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
    
    const courseRef = useMemoFirebase(() => schoolId ? doc(firestore, `schools/${schoolId}/courses`, courseId) : null, [firestore, schoolId, courseId]);
    const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseRef);


    React.useEffect(() => {
        const fetchStudents = async () => {
            if (!courseId || !firestore || !course) return;
            setIsLoadingStudents(true);
            setStudents([]);

            try {
                const usersRef = collection(firestore, 'users');
                const q = query(usersRef, where('role', '==', 'student'));
                const allStudentsSnapshot = await getDocs(q);

                const enrolledStudents: Student[] = [];

                for (const studentDoc of allStudentsSnapshot.docs) {
                    const studentCoursesRef = collection(firestore, `users/${studentDoc.id}/studentCourses`);
                    const studentCoursesQuery = query(studentCoursesRef, where('courseId', '==', courseId));
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
    }, [courseId, firestore, course]);
    
    if (isLoadingCourse) {
         return <Skeleton className="h-60 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registro de Calificaciones</CardTitle>
                <CardDescription>
                    Introduzca las notas de los estudiantes para el curso {course?.subjectName}.
                </CardDescription>
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
                        ) : students.length > 0 ? (
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
            </CardContent>
        </Card>
    )
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
    const firestore = useFirestore();
    const { user } = useUser();
    const courseId = params.id;
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userData, isLoading: isUserLoading } = useDoc<{ schoolId: string }>(userDocRef);

    const courseRef = useMemoFirebase(() => userData?.schoolId ? doc(firestore, `schools/${userData.schoolId}/courses`, courseId) : null, [firestore, userData, courseId]);
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

    if (isUserLoading || isCourseLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-9 w-1/2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }
    
    if (!course || !userData) {
        return <p>No se pudo cargar la información del curso.</p>
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
                    <CourseGrades courseId={courseId} schoolId={userData.schoolId} />
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
