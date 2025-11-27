

'use client';

import { Book, GraduationCap, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, getDocs, documentId } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import React from 'react';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Role } from '@/lib/roles';
import { MoreHorizontal, PlusCircle } from 'lucide-react';


interface CourseData {
    id: string;
    subjectId: string;
    subjectName?: string;
    sectionId: string;
    sectionName?: string;
    teacherId: string;
    teacherName?: string;
    schedule: string;
}

interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
    schoolId: string;
}


// Componente para la gestión de Cursos (Asignaturas)
interface SubjectData {
  id: string;
  name: string;
  createdAt?: {
    toDate: () => Date;
  };
}

const subjectFormSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
});

function CoursesManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string }>(userDocRef);
  const schoolId = userData?.schoolId;

  const subjectsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/subjects`) : null, [schoolId, firestore]);
  const { data: subjects, isLoading } = useCollection<SubjectData>(subjectsRef);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<SubjectData | null>(null);
  
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [alertContent, setAlertContent] = React.useState({ title: '', description: ''});
  const [subjectToDelete, setSubjectToDelete] = React.useState<SubjectData | null>(null);

  const form = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    form.reset({ name: editingSubject?.name || '' });
  }, [editingSubject, form]);

  const handleEditClick = (subject: SubjectData) => {
    setEditingSubject(subject);
    setIsDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingSubject(null);
    setIsDialogOpen(true);
  };

  const handleDeleteAttempt = async (subject: SubjectData) => {
    if (!schoolId || !firestore) return;
    const coursesRef = collection(firestore, 'schools', schoolId, 'courses');
    const q = query(coursesRef, where('subjectId', '==', subject.id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setAlertContent({
        title: 'No se puede eliminar la asignatura',
        description: `Esta asignatura está asignada a ${snapshot.size} curso(s) y no puede ser eliminada.`,
      });
      setIsAlertOpen(true);
    } else {
      setSubjectToDelete(subject);
    }
  };

  const executeDelete = () => {
    if (!subjectToDelete || !schoolId || !firestore) return;
    const subjectDocRef = doc(firestore, 'schools', schoolId, 'subjects', subjectToDelete.id);
    deleteDocumentNonBlocking(subjectDocRef);
    toast({
        title: "Asignatura Eliminada",
        description: "La asignatura ha sido eliminada correctamente."
    });
    setSubjectToDelete(null);
  };

  const onSubmit = (values: z.infer<typeof subjectFormSchema>) => {
    if (!schoolId || !subjectsRef || !firestore) return;
    if (editingSubject) {
      const subjectDocRef = doc(firestore, 'schools', schoolId, 'subjects', editingSubject.id);
      updateDocumentNonBlocking(subjectDocRef, values);
       toast({
        title: "Asignatura Actualizada",
        description: "La información de la asignatura ha sido actualizada."
      });
    } else {
      addDocumentNonBlocking(subjectsRef, { ...values, schoolId, createdAt: serverTimestamp() });
       toast({
        title: "Asignatura Creada",
        description: "La nueva asignatura ha sido creada correctamente."
      });
    }
    setIsDialogOpen(false);
    setEditingSubject(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Gestión de Cursos (Asignaturas)</CardTitle>
            <CardDescription>Crea y edita las materias que se impartirán.</CardDescription>
        </div>
        <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Curso
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre de la Asignatura</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Cargando...</TableCell></TableRow>
                ) : subjects && subjects.length > 0 ? (
                subjects.map((subject) => (
                    <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.createdAt ? new Date(subject.createdAt.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(subject)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeleteAttempt(subject); }}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow><TableCell colSpan={3} className="text-center">No hay asignaturas registradas.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>{editingSubject ? 'Editar Curso' : 'Crear Nuevo Curso'}</DialogTitle>
            <DialogDescription>{editingSubject ? 'Modifica el nombre del curso.' : 'Completa el nombre para crear un nuevo curso.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre del Curso</FormLabel>
                    <FormControl><Input placeholder="Matemáticas Avanzadas" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                <Button type="submit">{editingSubject ? 'Guardar Cambios' : 'Crear Curso'}</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={subjectToDelete !== null} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la asignatura.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAlertOpen(false)}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}


// Componente para la gestión de grados
interface GradeData {
  id: string;
  name: string;
  createdAt?: {
    toDate: () => Date;
  };
}

const gradeFormSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
});

function GradesManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string }>(userDocRef);
  const schoolId = userData?.schoolId;

  const gradesRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/grades`) : null, [schoolId, firestore]);
  const { data: grades, isLoading } = useCollection<GradeData>(gradesRef);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingGrade, setEditingGrade] = React.useState<GradeData | null>(null);

  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [alertContent, setAlertContent] = React.useState({ title: '', description: ''});
  const [gradeToDelete, setGradeToDelete] = React.useState<GradeData | null>(null);

  const form = useForm<z.infer<typeof gradeFormSchema>>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    form.reset({ name: editingGrade?.name || '' });
  }, [editingGrade, form]);

  const handleEditClick = (grade: GradeData) => {
    setEditingGrade(grade);
    setIsDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingGrade(null);
    setIsDialogOpen(true);
  };

  const handleDeleteAttempt = async (grade: GradeData) => {
    if (!schoolId || !firestore) return;
    const sectionsRef = collection(firestore, 'schools', schoolId, 'sections');
    const q = query(sectionsRef, where('gradeId', '==', grade.id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        setAlertContent({
            title: 'No se puede eliminar el grado',
            description: `Este grado tiene ${snapshot.size} sección(es) asociadas y no puede ser eliminado.`,
        });
        setIsAlertOpen(true);
    } else {
        setGradeToDelete(grade);
    }
  };

  const executeDelete = () => {
    if (!gradeToDelete || !schoolId || !firestore) return;
    const gradeDocRef = doc(firestore, 'schools', schoolId, 'grades', gradeToDelete.id);
    deleteDocumentNonBlocking(gradeDocRef);
    toast({
        title: "Grado Eliminado",
        description: "El grado ha sido eliminado correctamente."
    });
    setGradeToDelete(null);
  };

  const onSubmit = (values: z.infer<typeof gradeFormSchema>) => {
    if (!schoolId || !gradesRef || !firestore) return;
    if (editingGrade) {
      const gradeDocRef = doc(firestore, 'schools', schoolId, 'grades', editingGrade.id);
      updateDocumentNonBlocking(gradeDocRef, values);
       toast({
        title: "Grado Actualizado",
        description: "La información del grado ha sido actualizada."
      });
    } else {
      addDocumentNonBlocking(gradesRef, { ...values, schoolId, createdAt: serverTimestamp() });
       toast({
        title: "Grado Creado",
        description: "El nuevo grado ha sido creado correctamente."
      });
    }
    setIsDialogOpen(false);
    setEditingGrade(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Gestión de Grados</CardTitle>
            <CardDescription>Crea, edita y elimina los grados o niveles educativos.</CardDescription>
        </div>
        <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Grado
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Nombre del Grado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Cargando...</TableCell></TableRow>
                ) : grades && grades.length > 0 ? (
                grades.map((grade) => (
                    <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.name}</TableCell>
                    <TableCell>{grade.createdAt ? new Date(grade.createdAt.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(grade)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeleteAttempt(grade); }}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow><TableCell colSpan={3} className="text-center">No hay grados registrados.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>{editingGrade ? 'Editar Grado' : 'Crear Nuevo Grado'}</DialogTitle>
            <DialogDescription>{editingGrade ? 'Modifica el nombre del grado.' : 'Completa el nombre para crear un nuevo grado.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre del Grado</FormLabel>
                    <FormControl><Input placeholder="1er Grado" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                <Button type="submit">{editingGrade ? 'Guardar Cambios' : 'Crear Grado'}</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
       <AlertDialog open={gradeToDelete !== null} onOpenChange={(open) => !open && setGradeToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el grado.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsAlertOpen(false)}>Entendido</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Componente para la gestión de secciones
interface SectionData {
  id: string;
  name: string;
  gradeId: string;
  gradeName?: string;
  createdAt?: {
    toDate: () => Date;
  };
}

const sectionFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido.' }),
  gradeId: z.string({ required_error: 'Debes seleccionar un grado.' }).min(1, {message: 'Debes seleccionar un grado.'}),
});

const courseAssignmentFormSchema = z.object({
    subjectId: z.string({ required_error: 'Debes seleccionar una asignatura.' }).min(1, {message: 'Debes seleccionar una asignatura.'}),
    teacherId: z.string({ required_error: 'Debes seleccionar un profesor.' }).min(1, {message: 'Debes seleccionar un profesor.'}),
    schedule: z.string().min(3, { message: 'El horario debe tener al menos 3 caracteres.' }),
});

function SectionsManager() {
    const firestore = useFirestore();
    const { user } = useUser();
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userData } = useDoc<{ schoolId: string }>(userDocRef);
    const schoolId = userData?.schoolId;

    // Data hooks
    const sectionsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/sections`) : null, [schoolId, firestore]);
    const { data: sections, isLoading: isLoadingSections } = useCollection<SectionData>(sectionsRef);
    
    const gradesRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/grades`) : null, [schoolId, firestore]);
    const { data: grades } = useCollection<GradeData>(gradesRef);

    const subjectsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/subjects`) : null, [schoolId, firestore]);
    const { data: subjects } = useCollection<SubjectData>(subjectsRef);

    // Get teacher IDs from the new subcollection
    const schoolTeachersRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/teachers`) : null, [schoolId, firestore]);
    const { data: teacherRefs } = useCollection<{id: string}>(schoolTeachersRef);
    const teacherIds = React.useMemo(() => teacherRefs?.map(t => t.id) || [], [teacherRefs]);
    
    // Get teacher profiles from the main users collection
    const teachersQuery = useMemoFirebase(() => {
        if (teacherIds.length > 0) {
            return query(collection(firestore, 'users'), where(documentId(), 'in', teacherIds));
        }
        return null;
    }, [teacherIds, firestore]);
    const { data: teachers } = useCollection<UserData>(teachersQuery);


    const coursesRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/courses`) : null, [schoolId, firestore]);
    const { data: allCourses, isLoading: isLoadingCourses } = useCollection<CourseData>(coursesRef);

    // State for dialogs
    const [isSectionDialogOpen, setIsSectionDialogOpen] = React.useState(false);
    const [editingSection, setEditingSection] = React.useState<SectionData | null>(null);
    const [isCourseDialogOpen, setIsCourseDialogOpen] = React.useState(false);
    const [managingCoursesForSection, setManagingCoursesForSection] = React.useState<SectionData | null>(null);
    const [editingCourse, setEditingCourse] = React.useState<CourseData | null>(null);
    
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [alertContent, setAlertContent] = React.useState({ title: '', description: '' });
    const [sectionToDelete, setSectionToDelete] = React.useState<SectionData | null>(null);
    const [courseToDeleteId, setCourseToDeleteId] = React.useState<string | null>(null);
    
    // Forms
    const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
        resolver: zodResolver(sectionFormSchema),
        defaultValues: { name: '', gradeId: '' },
    });

    const courseAssignmentForm = useForm<z.infer<typeof courseAssignmentFormSchema>>({
        resolver: zodResolver(courseAssignmentFormSchema),
        defaultValues: { subjectId: '', teacherId: '', schedule: '' },
    });

    // Effects
    React.useEffect(() => {
        sectionForm.reset({ name: editingSection?.name || '', gradeId: editingSection?.gradeId || '' });
    }, [editingSection, sectionForm]);

    React.useEffect(() => {
        if (editingCourse) {
            courseAssignmentForm.reset({
                subjectId: editingCourse.subjectId,
                teacherId: editingCourse.teacherId,
                schedule: editingCourse.schedule,
            });
        } else {
            courseAssignmentForm.reset({ subjectId: '', teacherId: '', schedule: '' });
        }
    }, [editingCourse, courseAssignmentForm]);


    // Handlers
    const handleEditSectionClick = (section: SectionData) => {
        setEditingSection(section);
        setIsSectionDialogOpen(true);
    };

    const handleCreateSectionClick = () => {
        setEditingSection(null);
        setIsSectionDialogOpen(true);
    };

    const handleDeleteSectionAttempt = async (section: SectionData) => {
        if (!schoolId || !coursesRef) return;
        const coursesQuery = query(coursesRef!, where('sectionId', '==', section.id));
        const snapshot = await getDocs(coursesQuery);
        
        if (!snapshot.empty) {
            setAlertContent({
                title: 'No se puede eliminar la sección',
                description: `Esta sección tiene ${snapshot.size} curso(s) asignado(s) y no puede ser eliminada.`,
            });
            setIsAlertOpen(true);
        } else {
            setSectionToDelete(section);
        }
    };
    
    const executeDeleteSection = () => {
        if (!sectionToDelete || !schoolId || !firestore) return;
        const sectionDocRef = doc(firestore, 'schools', schoolId, 'sections', sectionToDelete.id);
        deleteDocumentNonBlocking(sectionDocRef);
        toast({ title: "Sección Eliminada", description: "La sección ha sido eliminada correctamente." });
        setSectionToDelete(null);
    };

    const onSectionSubmit = (values: z.infer<typeof sectionFormSchema>) => {
        if (!schoolId || !grades || !sectionsRef) return;

        const grade = grades.find(g => g.id === values.gradeId);
        if (!grade) {
            toast({ variant: "destructive", title: "Error", description: "El grado seleccionado no es válido."});
            return;
        }

        const dataToSave = {
            ...values,
            gradeName: grade.name,
        };

        if (editingSection) {
            const sectionDocRef = doc(firestore, 'schools', schoolId, 'sections', editingSection.id);
            updateDocumentNonBlocking(sectionDocRef, dataToSave);
            toast({ title: "Sección Actualizada" });
        } else {
            addDocumentNonBlocking(sectionsRef, { ...dataToSave, schoolId, createdAt: serverTimestamp() });
            toast({ title: "Sección Creada" });
        }
        setIsSectionDialogOpen(false);
        setEditingSection(null);
    };

    const handleManageCoursesClick = (section: SectionData) => {
        setManagingCoursesForSection(section);
        setIsCourseDialogOpen(true);
        setEditingCourse(null);
    };

    const onCourseAssignmentSubmit = (values: z.infer<typeof courseAssignmentFormSchema>) => {
        if (!schoolId || !managingCoursesForSection || !coursesRef || !subjects || !teachers) return;
        
        const subject = subjects.find(s => s.id === values.subjectId);
        const teacher = teachers.find(t => t.id === values.teacherId);

        if (!subject || !teacher) {
            toast({ variant: "destructive", title: "Error", description: "La asignatura o el profesor seleccionado no son válidos." });
            return;
        }

        const dataToSave = {
            ...values,
            sectionId: managingCoursesForSection.id,
            sectionName: managingCoursesForSection.name,
            subjectName: subject.name,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            schoolId,
        };

        if (editingCourse) {
            const courseDocRef = doc(firestore, 'schools', schoolId, 'courses', editingCourse.id);
            updateDocumentNonBlocking(courseDocRef, dataToSave);
            toast({ title: "Asignación Actualizada", description: "El curso ha sido actualizado." });

        } else {
            addDocumentNonBlocking(coursesRef, {
                ...dataToSave,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Curso Asignado", description: "El curso ha sido asignado a la sección." });
        }
        courseAssignmentForm.reset();
        setEditingCourse(null);
    };
    
    const executeDeleteCourse = () => {
        if (!courseToDeleteId || !schoolId || !firestore) return;
        const courseDocRef = doc(firestore, 'schools', schoolId, 'courses', courseToDeleteId);
        deleteDocumentNonBlocking(courseDocRef);
        toast({ title: "Asignación Eliminada", description: "Se ha eliminado el curso de la sección." });
        setCourseToDeleteId(null);
    }

    const handleEditCourseClick = (course: CourseData) => {
        setEditingCourse(course);
    };
    
    const handleCancelEdit = () => {
        setEditingCourse(null);
        courseAssignmentForm.reset({ subjectId: '', teacherId: '', schedule: '' });
    };

    const sectionCourses = React.useMemo(() => {
        if (!managingCoursesForSection || !allCourses) return [];
        return allCourses.filter(course => course.sectionId === managingCoursesForSection.id);
    }, [managingCoursesForSection, allCourses]);

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestión de Secciones</CardTitle>
                        <CardDescription>Organiza los grupos de estudiantes dentro de cada grado.</CardDescription>
                    </div>
                    <Button onClick={handleCreateSectionClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Sección
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Grado</TableHead>
                                <TableHead>Fecha de Creación</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSections ? (
                                <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                            ) : sections && sections.length > 0 ? (
                                sections.map((section) => (
                                    <TableRow key={section.id}>
                                        <TableCell className="font-medium">{section.name}</TableCell>
                                        <TableCell>{section.gradeName || 'N/A'}</TableCell>
                                        <TableCell>{section.createdAt ? new Date(section.createdAt.toDate()).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleManageCoursesClick(section)} className="mr-2">
                                                Administrar Cursos
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditSectionClick(section)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeleteSectionAttempt(section); }}>Eliminar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="text-center">No hay secciones registradas.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog for Creating/Editing Section */}
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingSection ? 'Editar Sección' : 'Crear Nueva Sección'}</DialogTitle>
                    </DialogHeader>
                    <Form {...sectionForm}>
                        <form onSubmit={sectionForm.handleSubmit(onSectionSubmit)} className="grid gap-4 py-4">
                            <FormField control={sectionForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl><Input placeholder="Sección A" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={sectionForm.control} name="gradeId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Grado</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un grado" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {grades?.map((grade) => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit">{editingSection ? 'Guardar Cambios' : 'Crear Sección'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Dialog for Managing Courses in Section */}
            <Dialog open={isCourseDialogOpen} onOpenChange={(isOpen) => { setIsCourseDialogOpen(isOpen); if (!isOpen) setEditingCourse(null); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Administrar Cursos para {managingCoursesForSection?.name}</DialogTitle>
                        <DialogDescription>Asigna asignaturas, profesores y horarios a esta sección.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-4">{editingCourse ? 'Editar Asignación' : 'Asignar Nuevo Curso'}</h3>
                            <Form {...courseAssignmentForm}>
                                <form onSubmit={courseAssignmentForm.handleSubmit(onCourseAssignmentSubmit)} className="space-y-4">
                                    <FormField control={courseAssignmentForm.control} name="subjectId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Asignatura</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona asignatura" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {subjects?.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={courseAssignmentForm.control} name="teacherId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Profesor</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={!teachers ? 'Cargando...' : 'Selecciona profesor'} /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {teachers?.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacher.firstName} {teacher.lastName}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            {!teachers && teacherIds.length > 0 && <p className="text-sm text-muted-foreground">Cargando perfiles de profesor...</p>}
                                            {teacherIds.length === 0 && <p className="text-sm text-muted-foreground">No hay profesores en esta escuela.</p>}
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={courseAssignmentForm.control} name="schedule" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Horario</FormLabel>
                                            <FormControl><Input placeholder="Lunes 9:00 AM - 10:00 AM" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="flex gap-2">
                                        <Button type="submit">{editingCourse ? 'Guardar Cambios' : 'Asignar Curso'}</Button>
                                        {editingCourse && <Button variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>}
                                    </div>
                                </form>
                            </Form>
                        </div>
                        <div>
                             <h3 className="font-semibold mb-4">Cursos Asignados</h3>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asignatura</TableHead>
                                        <TableHead>Profesor</TableHead>
                                        <TableHead>Horario</TableHead>
                                        <TableHead><span className="sr-only">Acciones</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingCourses ? (
                                         <TableRow><TableCell colSpan={4} className="text-center">Cargando...</TableCell></TableRow>
                                    ) : sectionCourses.length > 0 ? (
                                        sectionCourses.map(course => (
                                            <TableRow key={course.id}>
                                                <TableCell>{course.subjectName || 'N/A'}</TableCell>
                                                <TableCell>{course.teacherName || 'N/A'}</TableCell>
                                                <TableCell>{course.schedule}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleEditCourseClick(course)}>Editar</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCourseToDeleteId(course.id); }}>Eliminar</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center">No hay cursos asignados.</TableCell></TableRow>
                                    )}
                                </TableBody>
                             </Table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialogs */}
            <AlertDialog open={sectionToDelete !== null} onOpenChange={(open) => !open && setSectionToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la sección.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteSection}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={courseToDeleteId !== null} onOpenChange={(open) => !open && setCourseToDeleteId(null)}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción eliminará la asignación del curso a esta sección. No se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDeleteCourse}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{alertContent.title}</AlertDialogTitle>
                    <AlertDialogDescription>{alertContent.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsAlertOpen(false)}>Entendido</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function AcademicsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestión Académica</h1>
      <Tabs defaultValue="courses">
        <TabsList className="grid w-full grid-cols-3">
           <TabsTrigger value="courses">
            <Book className="mr-2 h-4 w-4" />
            Cursos
          </TabsTrigger>
          <TabsTrigger value="grades">
            <GraduationCap className="mr-2 h-4 w-4" />
            Grados
          </TabsTrigger>
          <TabsTrigger value="sections">
            <Users className="mr-2 h-4 w-4" />
            Secciones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
            <CoursesManager />
        </TabsContent>
        <TabsContent value="grades">
          <GradesManager />
        </TabsContent>
        <TabsContent value="sections">
          <SectionsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
