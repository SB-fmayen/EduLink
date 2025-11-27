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
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { collection, query, where, doc, getDocs, setDoc, writeBatch, documentId, deleteDoc } from 'firebase/firestore';
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
import { createUserWithEmailAndPassword } from 'firebase/auth';

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

const newStudentFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(2, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'El correo electrónico no es válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export default function StudentsPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, `users/${user.uid}`) : null), [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string; role: Role }>(userDocRef);
  const schoolId = userData?.schoolId;
  const userRole = userData?.role;
  
  const [selectedSectionFilter, setSelectedSectionFilter] = React.useState<string>('all');

  const studentsQuery = useMemoFirebase(() => {
    if (schoolId && userRole === 'admin') {
      return query(collection(firestore, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student'));
    }
    return null; // Teachers will filter differently
  }, [schoolId, userRole, firestore]);
  const { data: allStudents, isLoading: isProfilesLoading } = useCollection<UserData>(studentsQuery);


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

  const gradesRef = useMemoFirebase(() => (schoolId ? collection(firestore, `schools/${schoolId}/grades`) : null), [schoolId, firestore]);
  const { data: grades } = useCollection<GradeData>(gradesRef);

  const coursesRef = useMemoFirebase(() => (schoolId ? collection(firestore, `schools/${schoolId}/courses`) : null), [schoolId, firestore]);
  const { data: courses } = useCollection<CourseData>(coursesRef);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isNewStudentDialogOpen, setIsNewStudentDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<UserData | null>(null);
  const [selectedSection, setSelectedSection] = React.useState<string>('');
  const [showPassword, setShowPassword] = React.useState(false);

  const gradesMap = React.useMemo(() => grades?.reduce((acc, grade) => ({ ...acc, [grade.id]: grade.name }), {} as Record<string, string>) || {}, [grades]);
  const sectionsMap = React.useMemo(() => allSections?.reduce((acc, section) => ({ ...acc, [section.id]: section }), {} as Record<string, SectionData>) || {}, [allSections]);

  const newStudentForm = useForm<z.infer<typeof newStudentFormSchema>>({
    resolver: zodResolver(newStudentFormSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const teacherStudentIds = useMemoFirebase(async () => {
    if (userRole !== 'teacher' || !teacherCourses || teacherCourses.length === 0) return [];
    
    const studentIds = new Set<string>();
    for (const course of teacherCourses) {
        const enrollmentsRef = collection(firestore, `schools/${schoolId}/courses/${course.id}/students`);
        const snapshot = await getDocs(enrollmentsRef);
        snapshot.forEach(doc => studentIds.add(doc.data().studentId));
    }
    return Array.from(studentIds);
  }, [userRole, teacherCourses, firestore, schoolId]);

  const { data: teacherStudents, isLoading: isLoadingTeacherStudents } = useCollection<UserData>(
    useMemoFirebase(() => {
        if (teacherStudentIds && teacherStudentIds.length > 0) {
            return query(collection(firestore, 'users'), where(documentId(), 'in', teacherStudentIds));
        }
        return null;
    }, [teacherStudentIds, firestore])
  );

  const studentsToDisplay = React.useMemo(() => {
    if (userRole === 'admin') return allStudents;
    if (userRole === 'teacher') {
      if (!teacherStudents) return [];
      if (!selectedSectionFilter || selectedSectionFilter === 'all') {
        return teacherStudents;
      }
      return teacherStudents.filter(student => student.sectionId === selectedSectionFilter);
    }
    return [];
  }, [allStudents, teacherStudents, userRole, selectedSectionFilter]);
  
  const isLoading = isProfilesLoading || isLoadingTeacherStudents;


  const handleAssignClick = (student: UserData) => {
    setSelectedStudent(student);
    setSelectedSection(student.sectionId || '');
    setIsAssignDialogOpen(true);
  };

  const onNewStudentSubmit = async (values: z.infer<typeof newStudentFormSchema>) => {
    if (!auth || !schoolId) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      const userPayload: UserData = {
        id: newUser.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: 'student',
        schoolId: schoolId,
      };

      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, userPayload);

      toast({ title: 'Estudiante Creado', description: 'La cuenta del nuevo estudiante ha sido creada.' });
      setIsNewStudentDialogOpen(false);
      newStudentForm.reset();
    } catch (error: any) {
       if (error.code === 'auth/email-already-in-use') {
        newStudentForm.setError('email', { message: 'Este correo ya está en uso.' });
      } else {
        toast({ variant: 'destructive', title: 'Error al crear estudiante', description: 'Ocurrió un error inesperado.' });
      }
    }
  };
  
  const handleAssignToSection = async () => {
    if (!selectedStudent || !selectedSection || !courses || !allSections || !schoolId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor selecciona un estudiante y una sección.' });
      return;
    }

    const sectionData = allSections.find((s) => s.id === selectedSection);
    if (!sectionData) {
      toast({ variant: 'destructive', title: 'Error', description: 'La sección seleccionada no es válida.' });
      return;
    }
    
    const oldSectionId = selectedStudent.sectionId;
    const coursesInSection = courses.filter((course) => course.sectionId === selectedSection);
    
    const studentDocRef = doc(firestore, 'users', selectedStudent.id);
    const batch = writeBatch(firestore);

    batch.update(studentDocRef, { sectionId: sectionData.id, gradeId: sectionData.gradeId });
    
    const schoolStudentRef = doc(firestore, `schools/${schoolId}/students`, selectedStudent.id);
    batch.set(schoolStudentRef, { id: selectedStudent.id }, { merge: true });
    
    if (oldSectionId && oldSectionId !== selectedSection) {
        const oldCourses = courses.filter(c => c.sectionId === oldSectionId);
        for (const course of oldCourses) {
            const oldEnrollmentRef = doc(firestore, `schools/${schoolId}/courses/${course.id}/students`, selectedStudent.id);
            batch.delete(oldEnrollmentRef);
        }
    }

    for (const course of coursesInSection) {
        const enrollmentRef = doc(firestore, `schools/${schoolId}/courses/${course.id}/students`, selectedStudent.id);
        batch.set(enrollmentRef, { studentId: selectedStudent.id });
    }

    try {
        await batch.commit();
        toast({ title: 'Estudiante Asignado', description: `${selectedStudent.firstName} ha sido inscrito en la nueva sección.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error de Asignación", description: "No se pudo completar la inscripción." });
    }
    
    setIsAssignDialogOpen(false);
    setSelectedSection('');
    setSelectedStudent(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>
        {userRole === 'admin' && (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {userRole === 'admin' && <DropdownMenuItem onClick={() => handleAssignClick(student)}>Asignar a Sección</DropdownMenuItem>}
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isLoading && ( <TableRow><TableCell colSpan={5} className="text-center h-24">{userRole === 'teacher' ? "Selecciona una sección para ver a los estudiantes." : "No hay estudiantes registrados."}</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Estudiante a Sección</DialogTitle><DialogDescription>Selecciona la sección para {selectedStudent?.firstName}.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="section">Sección</Label>
              <Select onValueChange={setSelectedSection} value={selectedSection}>
                <SelectTrigger id="section"><SelectValue placeholder="Selecciona una sección" /></SelectTrigger>
                <SelectContent>
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
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
    </div>
  );
}
