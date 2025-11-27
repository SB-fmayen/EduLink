'use client';

import React from 'react';
import Link from 'next/link';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    subjectName?: string;
    sectionId: string;
    teacherId: string;
    gradeId?: string; // Asumiendo que los cursos pueden tener gradeId
}

interface Subject {
    id: string;
    name: string;
}

interface GradeData {
    id: string;
    name: string;
}

interface SectionData {
    id: string;
    name: string;
    gradeId: string;
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white">
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
            <p className="text-sm text-muted-foreground">{course.id}</p>
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

  // Estados para los filtros
  const [selectedGrade, setSelectedGrade] = React.useState('all');
  const [selectedSection, setSelectedSection] = React.useState('all');

  // Cargar datos para los filtros
  const gradesRef = useMemoFirebase(() => profile.schoolId ? collection(firestore, `schools/${profile.schoolId}/grades`) : null, [firestore, profile.schoolId]);
  const { data: grades } = useCollection<GradeData>(gradesRef);
  
  const sectionsRef = useMemoFirebase(() => profile.schoolId ? collection(firestore, `schools/${profile.schoolId}/sections`) : null, [firestore, profile.schoolId]);
  const { data: allSections } = useCollection<SectionData>(sectionsRef);
  
  // Filtrar secciones basadas en el grado seleccionado
  const filteredSections = React.useMemo(() => {
    if (!allSections) return []; // Asegurarse de que sea siempre un array
    if (selectedGrade === 'all') return allSections;
    return allSections.filter(section => section.gradeId === selectedGrade);
  }, [selectedGrade, allSections]);


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

  const sectionsMap = React.useMemo(() => allSections?.reduce((acc, section) => {
        acc[section.id] = section;
        return acc;
    }, {} as Record<string, SectionData>)
  , [allSections]);


  const filteredCourses = React.useMemo(() => {
    let coursesToFilter = profile.role === 'student' ? studentCourses : teacherCourses;
    if (!coursesToFilter || !sectionsMap) return [];
    
    let courseIds: string[] = [];

    if (profile.role === 'student') {
      courseIds = (coursesToFilter as StudentCourse[]).map(sc => sc.courseId);
      // Para estudiantes, no aplicamos filtro de UI, solo mostramos sus cursos
      return courseIds;
    }

    let finalCourses = coursesToFilter as Course[];

    // Aplicar filtro de grado
    if (selectedGrade !== 'all') {
      finalCourses = finalCourses.filter(course => {
        const section = sectionsMap[course.sectionId];
        return section && section.gradeId === selectedGrade;
      });
    }

    // Aplicar filtro de sección
    if (selectedSection !== 'all') {
      finalCourses = finalCourses.filter(course => course.sectionId === selectedSection);
    }

    return finalCourses.map(c => c.id);

  }, [profile.role, studentCourses, teacherCourses, selectedGrade, selectedSection, sectionsMap]);

  const isLoading = isLoadingStudentCourses || isLoadingTeacherCourses;

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tablero</h1>
        {(profile.role === 'teacher' || profile.role === 'admin') && (
            <div className="flex items-center gap-2">
                <Select value={selectedGrade} onValueChange={(value) => { setSelectedGrade(value); setSelectedSection('all'); }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por grado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los grados</SelectItem>
                        {grades?.map(grade => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={selectedGrade === 'all' && filteredSections.length === 0}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por sección" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las secciones</SelectItem>
                        {filteredSections.map(section => <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        )}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.length > 0 ? (
            filteredCourses.map(id => <CourseCard key={id} courseId={id} schoolId={profile.schoolId} />)
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-10">No tienes cursos que coincidan con los filtros seleccionados.</p>
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Panel de Control</h1>
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
