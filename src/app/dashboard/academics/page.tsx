
'use client';

import { Book, GraduationCap, Users, Component, MoreHorizontal, PlusCircle } from 'lucide-react';
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
import { collection, doc, serverTimestamp } from 'firebase/firestore';
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

// Componente para la gestión de asignaturas
function SubjectsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string }>(userDocRef);
  const schoolId = userData?.schoolId;

  const subjectsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/subjects`) : null, [schoolId, firestore]);
  const { data: subjects, isLoading } = useCollection<SubjectData>(subjectsRef);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<SubjectData | null>(null);

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

  const handleDelete = (subjectId: string) => {
    if (!schoolId) return;
    const subjectDocRef = doc(firestore, 'schools', schoolId, 'subjects', subjectId);
    deleteDocumentNonBlocking(subjectDocRef);
    toast({
        title: "Asignatura Eliminada",
        description: "La asignatura ha sido eliminada correctamente."
    });
  };

  const onSubmit = (values: z.infer<typeof subjectFormSchema>) => {
    if (!schoolId) return;
    if (editingSubject) {
      const subjectDocRef = doc(firestore, 'schools', schoolId, 'subjects', editingSubject.id);
      updateDocumentNonBlocking(subjectDocRef, values);
       toast({
        title: "Asignatura Actualizada",
        description: "La información de la asignatura ha sido actualizada."
      });
    } else {
      addDocumentNonBlocking(subjectsRef!, { ...values, schoolId, createdAt: serverTimestamp() });
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
            <CardTitle>Gestión de Asignaturas</CardTitle>
            <CardDescription>Crea, edita y elimina las asignaturas que se imparten.</CardDescription>
        </div>
        <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Asignatura
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
                            <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Eliminar</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la asignatura.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(subject.id)}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
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
            <DialogTitle>{editingSubject ? 'Editar Asignatura' : 'Crear Nueva Asignatura'}</DialogTitle>
            <DialogDescription>{editingSubject ? 'Modifica el nombre de la asignatura.' : 'Completa el nombre para crear una nueva asignatura.'}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre de la Asignatura</FormLabel>
                    <FormControl><Input placeholder="Matemáticas" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <DialogFooter>
                <Button type="submit">{editingSubject ? 'Guardar Cambios' : 'Crear Asignatura'}</Button>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      </Dialog>
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

  const handleDelete = (gradeId: string) => {
    if (!schoolId) return;
    const gradeDocRef = doc(firestore, 'schools', schoolId, 'grades', gradeId);
    deleteDocumentNonBlocking(gradeDocRef);
    toast({
        title: "Grado Eliminado",
        description: "El grado ha sido eliminado correctamente."
    });
  };

  const onSubmit = (values: z.infer<typeof gradeFormSchema>) => {
    if (!schoolId) return;
    if (editingGrade) {
      const gradeDocRef = doc(firestore, 'schools', schoolId, 'grades', editingGrade.id);
      updateDocumentNonBlocking(gradeDocRef, values);
       toast({
        title: "Grado Actualizado",
        description: "La información del grado ha sido actualizada."
      });
    } else {
      addDocumentNonBlocking(gradesRef!, { ...values, schoolId, createdAt: serverTimestamp() });
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
                            <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}>Eliminar</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente el grado.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(grade.id)}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
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
    </Card>
  );
}


export default function AcademicsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestión Académica</h1>
      <Tabs defaultValue="subjects">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subjects">
            <Book className="mr-2 h-4 w-4" />
            Asignaturas
          </TabsTrigger>
          <TabsTrigger value="grades">
            <GraduationCap className="mr-2 h-4 w-4" />
            Grados
          </TabsTrigger>
          <TabsTrigger value="sections">
            <Users className="mr-2 h-4 w-4" />
            Secciones
          </TabsTrigger>
          <TabsTrigger value="courses">
            <Component className="mr-2 h-4 w-4" />
            Cursos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subjects">
            <SubjectsManager />
        </TabsContent>
        <TabsContent value="grades">
          <GradesManager />
        </TabsContent>
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Secciones</CardTitle>
              <CardDescription>
                Organiza los grupos de estudiantes dentro de cada grado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Cursos</CardTitle>
              <CardDescription>
                Asigna materias, profesores y horarios a cada sección.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
