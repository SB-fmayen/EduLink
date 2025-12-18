'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Mail, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  photoURL?: string;
}

interface Course {
    id: string;
    subjectName?: string;
    sectionName?: string;
}

function TeacherCourses({ teacherId }: { teacherId: string }) {
    const firestore = useFirestore();
    const teacherCoursesQuery = useMemoFirebase(() => {
        if (teacherId) {
            return query(
                collection(firestore, `courses`),
                where('teacherId', '==', teacherId)
            );
        }
        return null;
    }, [firestore, teacherId]);

    const { data: courses, isLoading } = useCollection<Course>(teacherCoursesQuery);

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}><CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
                ))}
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cursos Asignados</CardTitle>
                <CardDescription>Estos son los cursos que el profesor imparte actualmente.</CardDescription>
            </CardHeader>
            <CardContent>
                {courses && courses.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {courses.map(course => (
                           <Card key={course.id} className="flex flex-col">
                               <CardHeader>
                                   <CardTitle className="text-base">{course.subjectName}</CardTitle>
                                   <CardDescription>{course.sectionName}</CardDescription>
                               </CardHeader>
                               <CardFooter className="mt-auto">
                                   <Button asChild variant="outline" size="sm" className="w-full">
                                       <Link href={`/dashboard/courses/${course.id}`}>Ver Curso</Link>
                                   </Button>
                               </CardFooter>
                           </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Este profesor no tiene cursos asignados.</p>
                )}
            </CardContent>
        </Card>
    );
}


export default function TeacherProfilePage({ params }: { params: { id: string } }) {
  const teacherId = params.id;
  const firestore = useFirestore();

  const teacherDocRef = useMemoFirebase(() => doc(firestore, 'users', teacherId), [firestore, teacherId]);
  const { data: teacher, isLoading } = useDoc<TeacherProfile>(teacherDocRef);
  
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-3">
             <Card className="lg:col-span-1">
                <CardHeader className="items-center text-center p-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2 mt-4">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </CardContent>
            </Card>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Profesor no encontrado</CardTitle>
            </CardHeader>
            <CardContent>
                <p>No se pudo encontrar la información para el ID de profesor proporcionado.</p>
                <Button asChild variant="link" className="px-0">
                    <Link href="/dashboard/teachers">Volver al listado</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Perfil del Profesor</h1>
        <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1 self-start">
                <CardHeader className="items-center text-center p-6">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={teacher.photoURL || userAvatar?.imageUrl} alt="Avatar del profesor" />
                        <AvatarFallback>{teacher.firstName.charAt(0)}{teacher.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-2xl">{teacher.firstName} {teacher.lastName}</CardTitle>
                    <Badge variant="outline">{teacher.role}</Badge>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <UserIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">ID: {teacher.id}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-2">
                <TeacherCourses teacherId={teacher.id} />
            </div>
        </div>
    </div>
  );
}
