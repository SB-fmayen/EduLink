
'use client';

import React from 'react';
import Link from 'next/link';
import { useDoc, useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, collectionGroup, documentId } from 'firebase/firestore';
import { Role } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Activity, FileText, MessageSquare, Bell, BarChart2 } from 'lucide-react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Interfaces para los datos ---
interface UserProfile {
  role: Role;
  firstName: string;
  lastName: string;
}

interface Course {
    id: string;
    subjectId: string;
    subjectName?: string;
    sectionId: string;
    teacherId: string;
    gradeId?: string; // Asumiendo que los cursos pueden tener gradeId
    sectionName?: string;
}

interface SectionData {
    id: string;
    name: string;
    gradeId: string;
}

interface GradeData {
    id: string;
    name: string;
}


interface CourseCardProps {
  courseId: string;
}

// --- Componente CourseCard ---
function CourseCard({ courseId }: CourseCardProps) {
  const firestore = useFirestore();

  const courseRef = useMemoFirebase(() => doc(firestore, `courses`, courseId), [firestore, courseId]);
  const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseRef);
  
  const courseImage = PlaceHolderImages.find(img => img.id === 'course-placeholder');

  if (isLoadingCourse) {
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
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white" onClick={(e) => e.preventDefault()}>
                            <MoreVertical className="h-4 w-4 text-gray-700"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Mover</DropdownMenuItem>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Editar</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
          <CardContent className="p-4 flex flex-col flex-grow">
            <h3 className="font-semibold text-primary truncate" title={course.subjectName}>
                {course.subjectName || 'Curso sin nombre'}
            </h3>
            <p className="text-sm text-muted-foreground">{course.sectionName}</p>
            <p className="text-xs text-muted-foreground flex-grow">2-Semestre-Trimestre</p>
            <div className="flex items-center gap-4 text-muted-foreground pt-4">
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
            <CardTitle className="text-sm font-medium">
              Total de Estudiantes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{students?.length || 0}</div>}
            <p className="text-xs text-muted-foreground">
              En tu escuela
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

  // Fetch student enrollments using collectionGroup query
  // This requires a composite index: (students collection group, studentId ASC)
  const studentEnrollmentsQuery = useMemoFirebase(() => {
    if (profile.role !== 'student') return null;
    return query(collectionGroup(firestore, 'students'), where('studentId', '==', user.uid));
  }, [firestore, user, profile.role]);
  
  const { data: studentEnrollments, isLoading: isLoadingEnrollments } = useCollection(studentEnrollmentsQuery);

  const studentCourseIds = React.useMemo(() => {
    if (!studentEnrollments) return null; // Still loading or not applicable
    // If studentEnrollments is an empty array, it means the query ran and found nothing.
    return studentEnrollments.map(doc => doc.ref.parent.parent!.id);
  }, [studentEnrollments]);

  // Lógica para profesores
  const teacherCoursesQuery = useMemoFirebase(() => {
    if (profile.role === 'teacher') {
      return query(
        collection(firestore, `courses`),
        where('teacherId', '==', user.uid)
      );
    }
    return null;
  }, [firestore, user, profile.role]);
  const { data: teacherCourses, isLoading: isLoadingTeacherCourses } = useCollection<Course>(teacherCoursesQuery);


  const coursesToDisplay = React.useMemo(() => {
    if (profile.role === 'student') return studentCourseIds; // Can be null, or empty array
    if (profile.role === 'teacher') return teacherCourses?.map(c => c.id) || []; // Default to empty array
    return []; // Default for other roles
  }, [profile.role, studentCourseIds, teacherCourses]);

  const isLoading = isLoadingEnrollments || isLoadingTeacherCourses;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mis Cursos</h1>
      </div>
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
        <>
          {coursesToDisplay && coursesToDisplay.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {coursesToDisplay.map(id => <CourseCard key={id} courseId={id} />)}
            </div>
          ) : (
             <Card className="col-span-full text-center py-10">
                <CardContent>
                    <p className="text-muted-foreground">
                        {profile.role === 'student' ? "Aún no se te han asignado cursos. ¡Muy pronto aparecerán aquí!" : "No tienes cursos asignados."}
                    </p>
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
            <h1 className="text-3xl font-bold tracking-tight mb-6">Bienvenido, {userProfile.firstName}</h1>
            <AdminParentDashboard profile={userProfile} />
        </div>
    );
  }

  if (role === 'student' || role === 'teacher') {
    return <StudentTeacherDashboard user={user} profile={userProfile} />;
  }

  return <p>Rol de usuario no reconocido.</p>;
}
