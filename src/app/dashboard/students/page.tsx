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
import { collection, query, where, doc, getDocs, documentId, collectionGroup } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/lib/roles';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  
  const [selectedSectionFilter, setSelectedSectionFilter] = React.useState<string>('');
  const [students, setStudents] = React.useState<UserData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // For Admins: A simple query to get all students
  const adminStudentsQuery = useMemoFirebase(() => {
    if (userRole === 'admin') {
      return query(
        collection(firestore, 'users'),
        where('role', '==', 'student')
      );
    }
    return null;
  }, [userRole, firestore]);
  const { data: adminStudents, isLoading: isAdminStudentsLoading } = useCollection<UserData>(adminStudentsQuery);

  React.useEffect(() => {
    if (userRole === 'admin') {
      setStudents(adminStudents || []);
      setIsLoading(isAdminStudentsLoading);
    }
  }, [userRole, adminStudents, isAdminStudentsLoading]);
  
  // For Teachers: Multi-step secure fetch logic
  React.useEffect(() => {
    if (userRole !== 'teacher' || !selectedSectionFilter || !firestore || !user || !schoolId) {
        if(userRole === 'teacher') setStudents([]);
        return;
    }

    const fetchStudentsForTeacher = async () => {
        setIsLoading(true);
        try {
            // Step 1: Find courses taught by the teacher in the selected section
            const teacherCoursesQuery = query(
                collection(firestore, `schools/${schoolId}/courses`),
                where('teacherId', '==', user.uid),
                where('sectionId', '==', selectedSectionFilter)
            );
            const coursesSnapshot = await getDocs(teacherCoursesQuery);
            const courseIds = coursesSnapshot.docs.map(doc => doc.id);

            if (courseIds.length === 0) {
                setStudents([]);
                setIsLoading(false);
                return;
            }

            // Step 2: Find all student enrollments for these courses using a collectionGroup query
            const studentCoursesQuery = query(
                collectionGroup(firestore, 'studentCourses'),
                where('courseId', 'in', courseIds)
            );
            const studentCoursesSnapshot = await getDocs(studentCoursesQuery);
            const studentIds = [...new Set(studentCoursesSnapshot.docs.map(doc => doc.data().studentId))];


            // Step 3: Fetch the user profiles for these students
            if (studentIds.length > 0) {
                 const studentsQuery = query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
                 const studentsSnapshot = await getDocs(studentsQuery);
                 const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
                 setStudents(studentsData);
            } else {
                setStudents([]);
            }

        } catch (error) {
            console.error("Error fetching students for teacher:", error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los estudiantes."});
            setStudents([]);
        } finally {
            setIsLoading(false);
        }
    };

    fetchStudentsForTeacher();

  }, [userRole, selectedSectionFilter, firestore, user, schoolId]);


  const teacherCoursesQuery = useMemoFirebase(() => {
      if (userRole === 'teacher' && user && schoolId) {
          return query(collection(firestore, 'schools', schoolId!, 'courses'), where('teacherId', '==', user.uid));
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

  const sectionsRef = useMemoFirebase(
    () => (schoolId ? collection(firestore, `schools/${schoolId}/sections`) : null),
    [schoolId, firestore]
  );
  const { data: sections } = useCollection<SectionData>(sectionsRef);

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
      () => sections?.reduce((acc, section) => ({ ...acc, [section.id]: section }), {} as Record<string, SectionData>) || {},
      [sections]
    );

  const handleAssignClick = (student: UserData) => {
    setSelectedStudent(student);
    setSelectedSection(student.sectionId || '');
    setIsAssignDialogOpen(true);
  };

  const handleAssignToSection = async () => {
    if (!selectedStudent || !selectedSection || !courses || !sections) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor selecciona un estudiante y una sección.',
      });
      return;
    }

    const sectionData = sections.find((s) => s.id === selectedSection);
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

    // 1. Update the student's document with sectionId and gradeId
    const studentDocRef = doc(firestore, 'users', selectedStudent.id);
    updateDocumentNonBlocking(studentDocRef, {
      sectionId: sectionData.id,
      gradeId: sectionData.gradeId,
    });

    // 2. Enroll the student in all courses of that section
    const studentCoursesRef = collection(firestore, 'users', selectedStudent.id, 'studentCourses');
    // Note: For a real-world app, you might want to first check which courses the student is already enrolled in to avoid duplicates.
    // For simplicity here, we'll add them. Firestore will create new documents with unique IDs.
    for (const course of coursesInSection) {
      await addDocumentNonBlocking(studentCoursesRef, {
        studentId: selectedStudent.id,
        courseId: course.id,
      });
    }

    toast({
      title: 'Estudiante Asignado',
      description: `${selectedStudent.firstName} ha sido inscrito en los cursos y actualizado.`,
    });
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
              {isLoading && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Cargando estudiantes...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && students.length > 0 ? (
                students.map((student) => (
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
              ) : !isLoading && (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                   {userRole === 'teacher' ? "Por favor, selecciona una sección o no hay estudiantes en la sección seleccionada." : "No hay estudiantes registrados."}
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
