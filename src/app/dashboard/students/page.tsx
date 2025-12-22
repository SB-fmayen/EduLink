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
import { MoreHorizontal, PlusCircle, Eye, EyeOff } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDocs, setDoc, writeBatch, documentId, deleteDoc, updateDoc } from 'firebase/firestore';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createUserAction } from '@/app/actions/create-user-action';


interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  schoolId: string;
  sectionId?: string;
  gradeId?: string;
  enrolledCourses?: string[];
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

const newStudentFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(2, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'El correo electrónico no es válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export default function StudentsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const schoolId = 'default-school-id'; // Hardcoded schoolId

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
  const { data: userData } = useDoc<{ role: Role }>(userDocRef);
  const userRole = userData?.role;

  const [selectedSectionFilter, setSelectedSectionFilter] = React.useState<string>('all');

  const studentsQuery = useMemoFirebase(() => {
    if (userRole === 'admin' || userRole === 'director') {
      return query(collection(firestore, 'users'), where('role', '==', 'student'));
    }
    return null;
  }, [userRole, firestore]);
  const { data: allStudents, isLoading: isProfilesLoading } = useCollection<UserData>(studentsQuery);

  const teacherCoursesQuery = useMemoFirebase(() => {
    if (userRole === 'teacher' && user) {
      return query(collection(firestore, `courses`), where('teacherId', '==', user.uid));
    }
    return null;
  }, [userRole, user, firestore]);
  const { data: teacherCourses } = useCollection<CourseData>(teacherCoursesQuery);

  const allSectionsRef = useMemoFirebase(() => collection(firestore, `sections`), [firestore]);
  const { data: allSections } = useCollection<SectionData>(allSectionsRef);

  const gradesRef = useMemoFirebase(() => (collection(firestore, `grades`)), [firestore]);
  const { data: grades } = useCollection<GradeData>(gradesRef);

  const coursesRef = useMemoFirebase(() => (collection(firestore, `courses`)), [firestore]);
  const { data: courses } = useCollection<CourseData>(coursesRef);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isNewStudentDialogOpen, setIsNewStudentDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<UserData | null>(null);
  const [selectedSection, setSelectedSection] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [teacherStudentIds, setTeacherStudentIds] = React.useState<string[] | null>(null);
  const [isLoadingTeacherStudentIds, setIsLoadingTeacherStudentIds] = React.useState(true);


  const teacherSections = React.useMemo(() => {
    if (userRole !== 'teacher' || !teacherCourses || !allSections) return allSections || [];
    const sectionIds = new Set(teacherCourses.map(c => c.sectionId));
    return allSections.filter(s => sectionIds.has(s.id));
  }, [userRole, teacherCourses, allSections]);
  
  const gradesMap = React.useMemo(() => grades?.reduce((acc, grade) => ({ ...acc, [grade.id]: grade.name }), {} as Record<string, string>) || {}, [grades]);
  const sectionsMap = React.useMemo(() => allSections?.reduce((acc, section) => ({ ...acc, [section.id]: section }), {} as Record<string, SectionData>) || {}, [allSections]);

  const newStudentForm = useForm<z.infer<typeof newStudentFormSchema>>({
    resolver: zodResolver(newStudentFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onNewStudentSubmit = async (values: z.infer<typeof newStudentFormSchema>) => {
  
    try {
      const { uid, error: authError } = await createUserAction(values.email, values.password);
  
      if (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          newStudentForm.setError('email', { type: 'manual', message: 'Este correo ya está en uso.' });
        } else {
           toast({ variant: 'destructive', title: 'Error de Autenticación', description: authError.message });
        }
        return;
      }
  
      if (!uid) {
        toast({ variant: 'destructive', title: 'Error de Creación', description: 'No se pudo obtener el ID del nuevo usuario.' });
        return;
      }
      
      const batch = writeBatch(firestore);
      const userPayload: Omit<UserData, 'id'> = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: 'student',
        schoolId: schoolId,
        enrolledCourses: [],
      };
      
      const userDocRef = doc(firestore, 'users', uid);
      batch.set(userDocRef, userPayload);
      
      await batch.commit();
      
      toast({
        title: 'Estudiante Creado',
        description: 'La cuenta y el perfil del estudiante han sido creados correctamente.'
      });
      setIsNewStudentDialogOpen(false);
      newStudentForm.reset();
  
    } catch (dbError: any) {
      console.error("Error al escribir en Firestore:", dbError);
      toast({ variant: 'destructive', title: 'Error de Base de Datos', description: 'El usuario fue autenticado pero no se pudo guardar su perfil. Contacta a soporte.' });
    }
  };
  
const handleAssignToSection = async () => {
    if (!selectedStudent || !selectedSection || !courses || !allSections) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor selecciona un estudiante y una opción.' });
        return;
    }

    const studentDocRef = doc(firestore, 'users', selectedStudent.id);
    const batch = writeBatch(firestore);

    try {
        // --- Caso 1: Des-asignar al estudiante (se seleccionó "Ninguno") ---
        if (selectedSection === 'none') {
            const oldSectionId = selectedStudent.sectionId;

            // Si tenía una sección anterior, quitarlo de esos cursos
            if (oldSectionId) {
                const oldCourses = courses.filter(c => c.sectionId === oldSectionId);
                for (const course of oldCourses) {
                    const oldEnrollmentRef = doc(firestore, `courses/${course.id}/students`, selectedStudent.id);
                    batch.delete(oldEnrollmentRef);
                }
            }

            // Actualizar el perfil del estudiante para quitar la sección y los cursos
            batch.update(studentDocRef, {
                sectionId: null,
                gradeId: null,
                enrolledCourses: [],
            });

            await batch.commit();
            toast({ title: 'Asignación Removida', description: `${selectedStudent.firstName} ha sido des-asignado de su sección.` });

        } else {
            // --- Caso 2: Asignar a una nueva sección ---
            const sectionData = allSections.find((s) => s.id === selectedSection);
            if (!sectionData) {
                toast({ variant: 'destructive', title: 'Error', description: 'La sección seleccionada no es válida.' });
                return;
            }

            const oldSectionId = selectedStudent.sectionId;
            const coursesInSection = courses.filter((course) => course.sectionId === selectedSection);
            const newCourseIds = coursesInSection.map(c => c.id);

            // 1. Actualizar el perfil del estudiante con la nueva sección y lista de cursos
            batch.update(studentDocRef, {
                sectionId: sectionData.id,
                gradeId: sectionData.gradeId,
                enrolledCourses: newCourseIds,
            });

            // 2. Si tenía una sección anterior diferente, quitarlo de los cursos antiguos
            if (oldSectionId && oldSectionId !== selectedSection) {
                const oldCourses = courses.filter(c => c.sectionId === oldSectionId);
                for (const course of oldCourses) {
                    const oldEnrollmentRef = doc(firestore, `courses/${course.id}/students`, selectedStudent.id);
                    batch.delete(oldEnrollmentRef);
                }
            }

            // 3. Inscribirlo en los cursos de la nueva sección
            for (const course of coursesInSection) {
                const enrollmentRef = doc(firestore, `courses/${course.id}/students`, selectedStudent.id);
                batch.set(enrollmentRef, { 
                    studentId: selectedStudent.id, 
                    sectionId: course.sectionId,
                    studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`
                });
            }
            
            await batch.commit();
            toast({ title: 'Estudiante Asignado', description: `${selectedStudent.firstName} ha sido inscrito en la nueva sección y sus cursos.` });
        }
    } catch (error) {
        console.error("Error assigning student to section:", error)
        toast({ variant: "destructive", title: "Error de Asignación", description: "No se pudo completar la operación. Revisa los permisos." });
    } finally {
        setIsAssignDialogOpen(false);
        setSelectedSection('');
        setSelectedStudent(null);
    }
};
  
  const handleAssignClick = (student: UserData) => {
    setSelectedStudent(student);
    setSelectedSection(student.sectionId || '');
    setIsAssignDialogOpen(true);
  };
  
  React.useEffect(() => {
    async function fetchTeacherStudentIds() {
        if (userRole !== 'teacher' || !teacherCourses || teacherCourses.length === 0 || !firestore) {
          setIsLoadingTeacherStudentIds(false);
          setTeacherStudentIds([]);
          return;
        }

        setIsLoadingTeacherStudentIds(true);
        const studentIds = new Set<string>();
        try {
            for (const course of teacherCourses) {
                const enrollmentsRef = collection(firestore, `courses/${course.id}/students`);
                const snapshot = await getDocs(enrollmentsRef);
                snapshot.forEach(doc => studentIds.add(doc.data().studentId));
            }
            setTeacherStudentIds(studentIds.size > 0 ? Array.from(studentIds) : []);
        } catch (error) {
            console.error("Error fetching teacher student IDs:", error);
            setTeacherStudentIds([]);
        } finally {
            setIsLoadingTeacherStudentIds(false);
        }
    }
    fetchTeacherStudentIds();
  }, [userRole, teacherCourses, firestore]);


  const teacherStudentsQuery = useMemoFirebase(() => {
    if (teacherStudentIds === null || teacherStudentIds.length === 0) {
      return null;
    }
    // Firestore 'in' queries have a limit of 30 items per query.
    return query(collection(firestore, 'users'), where(documentId(), 'in', teacherStudentIds.slice(0, 30)));
  }, [teacherStudentIds, firestore]);

  const { data: teacherStudents, isLoading: isLoadingTeacherStudents } = useCollection<UserData>(teacherStudentsQuery);

  const studentsToDisplay = React.useMemo(() => {
    if (userRole === 'admin' || userRole === 'director') return allStudents;
    if (userRole === 'teacher') {
      if (!teacherStudents) return [];
      if (!selectedSectionFilter || selectedSectionFilter === 'all') {
        return teacherStudents;
      }
      return teacherStudents.filter(student => student.sectionId === selectedSectionFilter);
    }
    return [];
  }, [allStudents, teacherStudents, userRole, selectedSectionFilter]);
  
  const isLoading = isProfilesLoading || isLoadingTeacherStudentIds || isLoadingTeacherStudents;
  const canManageStudents = userRole === 'admin' || userRole === 'director';
  
  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>
          {canManageStudents && (
            <Button onClick={() => setIsNewStudentDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Estudiante
            </Button>
          )}
          {userRole === 'teacher' && (
              <div className="w-1/3">
                  <Select onValueChange={setSelectedSectionFilter} value={selectedSectionFilter}>
                      <SelectTrigger><SelectValue placeholder="Filtrar por sección..." /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos mis Estudiantes</SelectItem>
                          {teacherSections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                {gradesMap[section.gradeId] || 'Grado'} - {section.name}
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
            <CardDescription>Consulta, administra y asigna estudiantes a sus secciones.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Sección Asignada</TableHead><TableHead>Rol</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading && ( <TableRow><TableCell colSpan={5} className="text-center">Cargando estudiantes...</TableCell></TableRow> )}
                {!isLoading && studentsToDisplay && studentsToDisplay.length > 0 ? (
                  studentsToDisplay.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {student.sectionId && sectionsMap[student.sectionId] ? ( `${gradesMap[sectionsMap[student.sectionId].gradeId] || ''} - ${sectionsMap[student.sectionId].name}` ) : ( <span className="text-muted-foreground">No asignado</span> )}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{student.role}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canManageStudents && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleAssignClick(student)}>Asignar a Sección</DropdownMenuItem>
                              <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : !isLoading && ( <TableRow><TableCell colSpan={5} className="text-center h-24">{userRole === 'teacher' ? "Selecciona una sección para ver a los estudiantes." : "No hay estudiantes registrados."}</TableCell></TableRow> )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Estudiante a Sección</DialogTitle><DialogDescription>Selecciona la sección para {selectedStudent?.firstName}.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="section">Sección</Label>
              <Select onValueChange={setSelectedSection} value={selectedSection}>
                <SelectTrigger id="section"><SelectValue placeholder="Selecciona una sección" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {allSections?.map((section) => (<SelectItem key={section.id} value={section.id}>{gradesMap[section.gradeId] || 'Grado'} - {section.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button><Button onClick={handleAssignToSection}>Asignar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isNewStudentDialogOpen} onOpenChange={setIsNewStudentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear Nuevo Estudiante</DialogTitle><DialogDescription>Introduce los datos para crear la cuenta. El estudiante será asignado a tu escuela.</DialogDescription></DialogHeader>
          <Form {...newStudentForm}>
            <form onSubmit={newStudentForm.handleSubmit(onNewStudentSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={newStudentForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={newStudentForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <FormField control={newStudentForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={newStudentForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <FormControl><Input type={showPassword ? 'text' : 'password'} {...field} /></FormControl>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={newStudentForm.formState.isSubmitting}>{newStudentForm.formState.isSubmitting ? 'Creando...' : 'Crear Cuenta'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
