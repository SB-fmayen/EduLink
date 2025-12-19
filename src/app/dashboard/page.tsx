
'use client';

import React from 'react';
import Link from 'next/link';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { Role } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Activity, FileText, MessageSquare, Bell, BarChart2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// --- Interfaces para los datos ---
interface UserProfile {
  role: Role;
  firstName: string;
  lastName: string;
  enrolledCourses?: string[];
}

interface Course {
    id: string;
    subjectId: string;
    subjectName?: string;
    sectionId: string;
    teacherId: string;
    gradeName?: string; 
    sectionName?: string;
}

interface AssignedCourse {
    id: string; // This is the document ID from the subcollection
    courseId: string; // This is the ID of the actual course in the `courses` collection
}

interface CourseCardProps {
  courseId: string;
}

// --- Componente CourseCard (ACTUALIZADO para aceptar datos directamente) ---
function CourseCard({ courseId }: CourseCardProps) {
  const firestore = useFirestore();

  const courseRef = useMemoFirebase(() => {
    if (courseId) {
        return doc(firestore, `courses`, courseId);
    }
    return null;
  }, [firestore, courseId]);

  const { data: course, isLoading } = useDoc<Course>(courseRef);
  
  const courseImage = PlaceHolderImages.find(img => img.id === 'course-placeholder');

  if (isLoading) {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-36 w-full" />
            <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex items-center gap-4 pt-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                </div>
            </CardContent>
        </Card>
    );
  }

  if (!course) return null;

  return (
    <Card className="overflow-hidden flex flex-col group">
      <Link href={`/dashboard/courses/${course.id}`} className="flex flex-col flex-grow">
          <div className="relative h-36 w-full">
            <Image
              src={courseImage?.imageUrl || "https://picsum.photos/seed/1/600/400"}
              alt={course.subjectName || 'Course Image'}
              fill
              className="object-cover"
              data-ai-hint={courseImage?.imageHint}
            />
            <div className="absolute top-2 right-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => e.preventDefault()}>
                            <MoreVertical className="h-4 w-4 text-white"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Mover</DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Anular Inscripción</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
          <CardContent className="p-4 flex flex-col flex-grow">
            <div className="flex-grow">
                <h3 className="font-bold text-primary uppercase truncate" title={course.subjectName}>
                    {course.subjectName || 'Curso sin nombre'}
                </h3>
                <p className="text-sm text-muted-foreground truncate" title={course.gradeName && course.sectionName ? `${course.gradeName} - ${course.sectionName}` : course.sectionName}>
                  {course.gradeName && course.sectionName 
                    ? `${course.gradeName} - ${course.sectionName}` 
                    : course.sectionName || 'Sección no asignada'}
                </p>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground pt-4 mt-auto">
              <BarChart2 className="h-5 w-5 hover:text-primary cursor-pointer" />
              <Bell className="h-5 w-5 hover:text-primary cursor-pointer" />
              <MessageSquare className="h-5 w-5 hover:text-primary cursor-pointer" />
              <FileText className="h-5 w-5 hover:text-primary cursor-pointer" />
            </div>
          </CardContent>
      </Link>
    </Card>
  );
}


// --- Vistas del Dashboard ---
function AdminParentDashboard({ profile }: { profile: UserProfile }) {
  const firestore = useFirestore();

  const studentsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'users'), where('role', '==', 'student'));
  }, [firestore]);
  const { data: students, isLoading: isLoadingStudents } = useCollection(studentsQuery);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{students?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">En tu escuela</p>
          </CardContent>
        </Card>
        {/* Otras tarjetas para Admin/Padre ... */}
      </div>
    </>
  );
}

// --- Dashboard para Estudiantes ---
function StudentDashboard({ userProfile }: { userProfile: UserProfile }) {
  const courseIds = userProfile.enrolledCourses || [];

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tablero</h1>
      </div>
      {courseIds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courseIds.map(id => <CourseCard key={id} courseId={id} />)}
        </div>
      ) : (
        <Card className="col-span-full text-center py-20">
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-2xl font-medium text-muted-foreground">¡Bienvenido!</p>
            <p>Aún no se te han asignado cursos. ¡Muy pronto aparecerán aquí!</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// --- Dashboard para Profesores (REFACTORIZADO) ---
function TeacherDashboard({ user }: { user: any }) {
  const firestore = useFirestore();

  const assignedCoursesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/assignedCourses`);
  }, [firestore, user]);
  
  const { data: assignedCourses, isLoading } = useCollection<AssignedCourse>(assignedCoursesQuery);
  
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tablero</h1>
      </div>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
             <Card key={i} className="overflow-hidden">
                <Skeleton className="h-36 w-full" />
                <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {assignedCourses && assignedCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assignedCourses.map(assigned => <CourseCard key={assigned.id} courseId={assigned.courseId} />)}
            </div>
          ) : (
             <Card className="col-span-full text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">No tienes cursos asignados.</p>
                </CardContent>
             </Card>
          )}
        </>
      )}
    </>
  );
}


// --- Componente Principal ---
export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  if (isUserLoading || isProfileLoading || !userProfile) {
    return (
        <div>
          <div className="flex justify-between items-center mb-6">
             <Skeleton className="h-9 w-48" />
          </div>
          <div className="flex items-center justify-center h-64">
             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             <p className="ml-4 text-muted-foreground">Cargando tu información...</p>
          </div>
        </div>
    );
  }

  const role = userProfile.role;

  if (role === 'admin' || role === 'parent') {
    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-6">Bienvenido, {userProfile.firstName}</h1>
            <AdminParentDashboard profile={userProfile} />
        </div>
    );
  }

  if (role === 'student') {
    return <StudentDashboard userProfile={userProfile} />;
  }
  
  if (role === 'teacher') {
    return <TeacherDashboard user={user} />;
  }

  return <p>Rol de usuario no reconocido.</p>;
}
