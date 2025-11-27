
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/lib/roles';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  schoolId: string;
  sectionId?: string;
  gradeId?: string;
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

interface CourseData {
  id: string;
  sectionId: string;
}

export default function StudentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<{ schoolId: string; role: Role }>(userDocRef);
  const schoolId = userData?.schoolId;
  const userRole = userData?.role;
  
  const [selectedSectionFilter, setSelectedSectionFilter] = React.useState<string>('all');

  // --- Data fetching ---

  const allStudentsInSchoolQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(
        collection(firestore, 'users'),
        where('schoolId', '==', schoolId),
        where('role', '==', 'student')
    );
  }, [schoolId, firestore]);
  const { data: allStudents, isLoading: isStudentsLoading } = useCollection<UserData>(allStudentsInSchoolQuery);


  const teacherCoursesQuery = useMemoFirebase(() => {
      if (userRole === 'teacher' && user && schoolId) {
          return query(collection(firestore, `schools/${schoolId}/courses`), where('teacherId', '==', user.uid));
      }
      return null;
  }, [schoolId, userRole, user, firestore]);
  const { data: teacherCourses } = useCollection<CourseData>(teacherCoursesQuery);

  const allSectionsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/sections`) : null, [schoolId, firestore]);
  const { data: allSections } = useCollection<SectionData>(allSectionsRef);

  const teacherSections = React.useMemo(() => {
    if (userRole !== 'teacher' || !teacherCourses || !allSections) return allSections || [];
    const sectionIds = new Set(teacherCourses.map(c => c.sectionId));
    return allSections.filter(s => sectionIds.has(s.id));
  }, [userRole, teacherCourses, allSections]);

  const gradesRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, `schools/${schoolId}/grades`) : null),
    [schoolId, firestore]
  );
  const { data: grades } = useCollection<GradeData>(gradesRef);

  const coursesRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, `schools/${schoolId}/courses`) : null),
    [schoolId, firestore]
  );
  const { data: courses } = useCollection<CourseData>(coursesRef);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<UserData | null>(null);
  const [selectedSection, setSelectedSection] = React.useState<string>('');

  const gradesMap =
    React.useMemo(
      () => grades?.reduce((acc, grade) => ({ ...acc, [grade.id]: grade.name }), {} as Record<string, string>) || {},
      [grades]
    );
  const sectionsMap =
    React.useMemo(
      () => allSections?.reduce((acc, section) => ({ ...acc, [section.id]: section }), {} as Record<string, SectionData>) || {},
      [allSections]
    );

  const handleAssignClick = (student: UserData) => {
    setSelectedStudent(student);
    setSelectedSection(student.sectionId || '');
    setIsAssignDialogOpen(true);
  };
  
  const studentsToDisplay = React.useMemo(() => {
    if (!allStudents) return [];
    if (userRole === 'admin') {
      return allStudents;
    }
    // For teachers, filter students based on the selected section
    if (userRole === 'teacher') {
      if (!selectedSectionFilter || selectedSectionFilter === 'all') return allStudents;
      return allStudents.filter(student => student.sectionId === selectedSectionFilter);
    }
    return [];
  }, [allStudents, userRole, selectedSectionFilter]);


  const handleAssignToSection = async () => {
    if (!selectedStudent || !selectedSection || !courses || !allSections || !schoolId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un estudiante y una sección.',
      });
      return;
    }

    const sectionData = allSections.find((s) => s.id === selectedSection);
    if (!sectionData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La sección seleccionada no es válida.',
      });
      return;
    }

    const coursesInSection = courses.filter((course) => course.sectionId === selectedSection);
    if (coursesInSection.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sin cursos',
        description: 'Esta sección no tiene cursos asignados. Asigna cursos primero.',
      });
      setIsAssignDialogOpen(false);
      return;
    }

    const studentDocRef = doc(firestore, 'users', selectedStudent.id);
    
    const batch = writeBatch(firestore);

    // Update the student's section and grade
    batch.update(studentDocRef, {
      sectionId: sectionData.id,
      gradeId: sectionData.gradeId,
    });

    // Enroll the student in all courses for that section
    for (const course of coursesInSection) {
        const enrollmentRef = doc(firestore, `schools/${schoolId}/courses/${course.id}/students`, selectedStudent.id);
        batch.set(enrollmentRef, { studentId: selectedStudent.id });
    }

    try {
        await batch.commit();
        toast({
          title: 'Estudiante Asignado',
          description: `${selectedStudent.firstName} ha sido inscrito en los cursos y actualizado.`,
        });
    } catch (error) {
        console.error("Error assigning student to section: ", error);
        toast({
            variant: "destructive",
            title: "Error de Asignación",
            description: "No se pudo completar la inscripción del estudiante."
        })
    }
    
    setIsAssignDialogOpen(false);
    setSelectedSection('');
    setSelectedStudent(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>
        {userRole === 'teacher' && (
             <div className="w-1/3">
                 <Select onValueChange={setSelectedSectionFilter} value={selectedSectionFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una sección para ver estudiantes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos mis Estudiantes</SelectItem>
                        {teacherSections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                               {gradesMap[section.gradeId] || 'Grado desconocido'} - {section.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Estudiantes</CardTitle>
          <CardDescription>
            Consulta, administra y asigna estudiantes a sus secciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Sección Asignada</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isStudentsLoading && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Cargando estudiantes...
                  </TableCell>
                </TableRow>
              )}
              {!isStudentsLoading && studentsToDisplay && studentsToDisplay.length > 0 ? (
                studentsToDisplay.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {student.sectionId && sectionsMap[student.sectionId] ? (
                        `${gradesMap[sectionsMap[student.sectionId].gradeId] || ''} - ${sectionsMap[student.sectionId].name}`
                      ) : (
                        <span className="text-muted-foreground">No asignado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{student.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {userRole === 'admin' && (
                            <DropdownMenuItem onClick={() => handleAssignClick(student)}>
                                Asignar a Sección
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isStudentsLoading && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                   {userRole === 'teacher' ? "Por favor, selecciona una sección para ver a los estudiantes." : "No hay estudiantes registrados."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Estudiante a Sección</DialogTitle>
            <DialogDescription>
              Selecciona la sección a la que quieres asignar a {selectedStudent?.firstName}{' '}
              {selectedStudent?.lastName}. El estudiante será inscrito en todos los cursos de esa
              sección.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="section">Sección</Label>
              <Select onValueChange={setSelectedSection} value={selectedSection}>
                <SelectTrigger id="section">
                  <SelectValue placeholder="Selecciona una sección" />
                </SelectTrigger>
                <SelectContent>
                  {allSections?.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {gradesMap[section.gradeId] || 'Grado desconocido'} - {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignToSection}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
