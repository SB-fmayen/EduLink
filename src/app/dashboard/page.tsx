'use client';

import React from 'react';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { Role } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Activity, FileText, MessageSquare, Bell, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// --- Interfaces para los datos ---
interface UserProfile {
  role: Role;
  schoolId: string;
}

interface StudentCourse {
    id: string;
    courseId: string;
}

interface Course {
    id: string;
    subjectId: string;
    sectionId: string;
    teacherId: string;
}

interface Subject {
    id: string;
    name: string;
}

interface CourseCardProps {
  courseId: string;
  schoolId: string;
}

// --- Componente CourseCard ---
function CourseCard({ courseId, schoolId }: CourseCardProps) {
  const firestore = useFirestore();

  const courseRef = useMemoFirebase(() => schoolId ? doc(firestore, `schools/${schoolId}/courses`, courseId) : null, [firestore, schoolId, courseId]);
  const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseRef);

  const subjectRef = useMemoFirebase(() => (schoolId && course) ? doc(firestore, `schools/${schoolId}/subjects`, course.subjectId) : null, [firestore, schoolId, course]);
  const { data: subject, isLoading: isLoadingSubject } = useDoc<Subject>(subjectRef);
  
  const courseImage = PlaceHolderImages.find(img => img.id === 'course-placeholder');

  if (isLoadingCourse || isLoadingSubject) {
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

  if (!course || !subject) return null;

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="relative h-36 w-full">
        <Image
          src={courseImage?.imageUrl || "https://picsum.photos/seed/1/600/400"}
          alt={subject.name}
          fill
          className="object-cover"
          data-ai-hint={courseImage?.imageHint}
        />
        <div className="absolute top-2 right-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white">
                        <MoreVertical className="h-4 w-4 text-gray-700"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>Mover</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-primary truncate" title={subject.name}>
            {subject.name}
        </h3>
        <p className="text-sm text-muted-foreground">{course.id}</p>
        <p className="text-xs text-muted-foreground flex-grow">2-Semestre-Trimestre</p>
        <div className="flex items-center gap-4 text-muted-foreground pt-4">
          <BarChart2 className="h-5 w-5 hover:text-primary cursor-pointer" />
          <Bell className="h-5 w-5 hover:text-primary cursor-pointer" />
          <MessageSquare className="h-5 w-5 hover:text-primary cursor-pointer" />
          <FileText className="h-5 w-5 hover:text-primary cursor-pointer" />
        </div>
      </CardContent>
    </Card>
  );
}


// --- Vistas del Dashboard ---
function AdminParentDashboard() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Estudiantes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,254</div>
            <p className="text-xs text-muted-foreground">
              +20.1% desde el último mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos Pendientes
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234.56</div>
            <p className="text-xs text-muted-foreground">
              +15% desde el último mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rendimiento Académico
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.5 / 10</div>
            <p className="text-xs text-muted-foreground">
              Promedio de calificación este semestre
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Un resumen de eventos y anuncios recientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No hay actividad reciente para mostrar.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StudentTeacherDashboard({ user, profile }: { user: any; profile: UserProfile }) {
  const firestore = useFirestore();

  // Lógica para estudiantes
  const studentCoursesRef = useMemoFirebase(() => {
    if (profile.role === 'student') {
      return collection(firestore, `users/${user.uid}/studentCourses`);
    }
    return null;
  }, [firestore, user, profile.role]);
  const { data: studentCourses, isLoading: isLoadingStudentCourses } = useCollection<StudentCourse>(studentCoursesRef);

  // Lógica para profesores
  const teacherCoursesQuery = useMemoFirebase(() => {
    if (profile.role === 'teacher' && profile.schoolId) {
      return query(
        collection(firestore, `schools/${profile.schoolId}/courses`),
        where('teacherId', '==', user.uid)
      );
    }
    return null;
  }, [firestore, user, profile.role, profile.schoolId]);
  const { data: teacherCourses, isLoading: isLoadingTeacherCourses } = useCollection<Course>(teacherCoursesQuery);

  const courseIds = React.useMemo(() => {
    if (profile.role === 'student' && studentCourses) {
        return studentCourses.map(sc => sc.courseId);
    }
    if (profile.role === 'teacher' && teacherCourses) {
        return teacherCourses.map(tc => tc.id);
    }
    return [];
  }, [profile.role, studentCourses, teacherCourses]);

  const isLoading = isLoadingStudentCourses || isLoadingTeacherCourses;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Tablero</h1>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
             <Card key={i} className="overflow-hidden">
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
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courseIds.length > 0 ? (
            courseIds.map(id => <CourseCard key={id} courseId={id} schoolId={profile.schoolId} />)
          ) : (
            <p>No tienes cursos asignados.</p>
          )}
        </div>
      )}
    </>
  );
}

// --- Componente Principal ---
export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  if (isProfileLoading || !userProfile) {
    return (
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-6">Panel de Control</h1>
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
             {[...Array(3)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-5 w-3/4 mb-2"/>
                        <Skeleton className="h-4 w-1/2"/>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-1/2"/>
                    </CardContent>
                 </Card>
             ))}
          </div>
        </div>
    );
  }

  const role = userProfile.role;

  if (role === 'admin' || role === 'parent') {
    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-6">Panel de Control</h1>
            <AdminParentDashboard />
        </div>
    );
  }

  if (role === 'student' || role === 'teacher') {
    return <StudentTeacherDashboard user={user} profile={userProfile} />;
  }

  return <p>Rol de usuario no reconocido.</p>;
}
