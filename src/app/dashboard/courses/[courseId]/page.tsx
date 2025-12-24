'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, documentId, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Megaphone, ShieldAlert, Users, CalendarCheck, ArrowLeft, FileText, PlusCircle, MoreHorizontal, CalendarIcon } from 'lucide-react';
import { Role } from '@/lib/roles';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Course {
    id: string;
    subjectName: string;
    sectionName: string;
    gradeName?: string;
    teacherId: string;
    sectionId: string;
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

interface EnrolledStudent {
    id: string; 
    studentId: string;
}

interface UserProfile {
  role: Role;
}

interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string; 
    status: 'presente' | 'ausente' | 'tardanza';
    date: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: any; // Mantener como 'any' para manejar Timestamps de Firestore
  totalPoints?: number;
}

// --- Esquema de validación para el formulario de tareas ---
const taskFormSchema = z.object({
  title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
  description: z.string().optional(),
  dueDate: z.date({
    required_error: 'La fecha de entrega es requerida.',
  }),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {message: "Formato de hora inválido (HH:mm)"}),
  totalPoints: z.coerce.number().min(0, { message: 'Los puntos no pueden ser negativos.'}).default(100),
});


// --- MÓDULO DE TAREAS RECONSTRUIDO ---
function TasksTab({ courseId, hasPermission }: { courseId: string; hasPermission: boolean }) {
  const firestore = useFirestore();
  const router = useRouter();
  const tasksRef = useMemoFirebase(() => collection(firestore, `courses/${courseId}/tasks`), [firestore, courseId]);
  const { data: tasks, isLoading } = useCollection<Task>(tasksRef);

  // Estados para los diálogos
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  // Estados para la tarea que se está gestionando
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = React.useState<Task | null>(null);

  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: '', description: '', dueTime: '23:59', totalPoints: 100 },
  });

  // Abre el diálogo para crear una nueva tarea
  const handleCreateClick = () => {
    setEditingTask(null);
    form.reset({ title: '', description: '', dueTime: '23:59', totalPoints: 100 });
    setIsDialogOpen(true);
  };

  // Abre el diálogo para editar una tarea existente
  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    const dueDate = task.dueDate?.toDate ? task.dueDate.toDate() : new Date();
    form.reset({
      title: task.title,
      description: task.description,
      dueDate: dueDate,
      dueTime: format(dueDate, 'HH:mm'),
      totalPoints: task.totalPoints || 100,
    });
    setIsDialogOpen(true);
  };
  
  const handleViewSubmissions = (taskId: string) => {
    router.push(`/dashboard/courses/${courseId}/tasks/${taskId}`);
  };

  // Prepara la tarea para ser eliminada y abre el diálogo de confirmación
  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  // Ejecuta la eliminación de la tarea
  const executeDelete = async () => {
    if (!taskToDelete) return;
    try {
      const taskDocRef = doc(firestore, `courses/${courseId}/tasks`, taskToDelete.id);
      await deleteDoc(taskDocRef);
      toast({ title: 'Tarea Eliminada', description: 'La tarea ha sido eliminada correctamente.' });
    } catch (error) {
      console.error("Error deleting task: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarea.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  // Maneja el envío del formulario para crear o editar
  const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
    if (!hasPermission) return;

    const [hours, minutes] = values.dueTime.split(':').map(Number);
    const finalDueDate = new Date(values.dueDate);
    finalDueDate.setHours(hours, minutes);

    const payload = {
      title: values.title,
      description: values.description,
      dueDate: finalDueDate,
      totalPoints: values.totalPoints,
    };

    try {
      if (editingTask) {
        // Actualizar tarea existente
        const taskDocRef = doc(firestore, `courses/${courseId}/tasks`, editingTask.id);
        await updateDoc(taskDocRef, payload);
        toast({ title: 'Tarea Actualizada' });
      } else {
        // Crear nueva tarea
        await addDoc(tasksRef, { ...payload, createdAt: serverTimestamp() });
        toast({ title: 'Tarea Creada' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving task: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la tarea.' });
    }
  };

  if (!hasPermission) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tareas</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                    <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="font-semibold">Acceso Restringido</h3>
                    <p className="text-sm text-muted-foreground">No tienes permisos para ver las tareas de este curso.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tareas del Curso</CardTitle>
            <CardDescription>Gestiona las asignaciones y fechas de entrega.</CardDescription>
          </div>
          {hasPermission && (
            <Button onClick={handleCreateClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Tarea
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Fecha de Entrega</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Cargando tareas...</TableCell></TableRow>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.dueDate?.toDate ? format(task.dueDate.toDate(), 'PPP p', { locale: es }) : 'N/A'}</TableCell>
                    <TableCell>{task.totalPoints ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleViewSubmissions(task.id)}>Ver Entregas</DropdownMenuItem>
                           {hasPermission && <DropdownMenuItem onClick={() => handleEditClick(task)}>Editar</DropdownMenuItem>}
                           {hasPermission && <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeleteClick(task); }}>Eliminar</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No hay tareas creadas para este curso.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Diálogo para Crear/Editar Tarea */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fecha de Entrega</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="dueTime" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Hora de Entrega</FormLabel>
                        <Input type="time" {...field} />
                        <FormMessage />
                    </FormItem>
                )} />
               </div>
               <FormField control={form.control} name="totalPoints" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntos Totales</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingTask ? 'Guardar Cambios' : 'Crear Tarea'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function PlaceholderTab({ title }: { title: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Módulo en construcción.</p>
            </CardContent>
        </Card>
    )
}

function AttendanceTab({ courseId, hasPermission }: { courseId: string; hasPermission: boolean }) {
    const firestore = useFirestore();
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

    const enrolledStudentsRef = useMemoFirebase(() => {
        if (hasPermission && courseId) {
            return collection(firestore, `courses/${courseId}/students`);
        }
        return null;
    }, [hasPermission, firestore, courseId]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);
    
    const studentIds = React.useMemo(() => enrolledStudents?.map(s => s.studentId) || [], [enrolledStudents]);

    const studentProfilesQuery = useMemoFirebase(() => {
        if (studentIds.length > 0) {
            return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
        }
        return null;
    }, [firestore, studentIds]);
    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);

    const attendanceQuery = useMemoFirebase(() => {
        if (courseId && formattedDate && hasPermission) {
            return query(
                collection(firestore, `courses/${courseId}/attendance`), 
                where('date', '==', formattedDate)
            );
        }
        return null;
    }, [firestore, courseId, formattedDate, hasPermission]);
    const { data: attendanceData, isLoading: isLoadingAttendance } = useCollection<AttendanceRecord>(attendanceQuery);


    const attendanceMap = React.useMemo(() => {
        if (!attendanceData) return new Map();
        return attendanceData.reduce((acc, record) => {
            acc.set(record.studentId, record.status);
            return acc;
        }, new Map<string, string>());
    }, [attendanceData]);

    const handleSetAttendance = async (studentId: string, status: 'presente' | 'ausente' | 'tardanza') => {
        if (!courseId || !date || !hasPermission || !students) return;

        const student = students.find(s => s.id === studentId);
        if (!student) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se encontró el estudiante para guardar la asistencia.',
            });
            return;
        }
        
        const recordId = `${studentId}_${formattedDate}`;
        const attendanceRef = doc(firestore, `courses/${courseId}/attendance`, recordId);

        try {
            await setDoc(attendanceRef, {
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                date: formattedDate,
                status: status,
            }, { merge: true });
            toast({
                title: 'Asistencia Actualizada',
                description: `Se ha guardado la asistencia.`,
            })
        } catch (error) {
            console.error("Error updating attendance:", error);
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: 'No se pudo actualizar la asistencia. Verifica tus permisos.',
            })
        }
    };

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">Acceso Restringido</h3>
                <p className="text-sm text-muted-foreground">No tienes permisos para gestionar la asistencia.</p>
            </div>
        );
    }
    
    const isLoading = isLoadingEnrolled || isLoadingProfiles || isLoadingAttendance;

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Seleccionar Fecha</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={es}
                            className="rounded-md border w-full"
                        />
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Lista de Estudiantes</CardTitle>
                        <CardDescription>
                            Registra la asistencia para el día: {date ? format(date, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Estudiante</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-3/4 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : students && students.length > 0 ? (
                                    students.map(student => {
                                        const currentStatus = attendanceMap.get(student.id);
                                        return (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                                                <TableCell className="text-right space-x-1">
                                                     <Button 
                                                        variant={currentStatus === 'presente' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'presente')}>
                                                        Presente
                                                     </Button>
                                                      <Button 
                                                        variant={currentStatus === 'ausente' ? 'destructive' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'ausente')}>
                                                        Ausente
                                                     </Button>
                                                     <Button 
                                                        variant={currentStatus === 'tardanza' ? 'secondary' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleSetAttendance(student.id, 'tardanza')}>
                                                        Tardanza
                                                     </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">No hay estudiantes en este curso.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StudentListTab({ courseId, hasPermission }: { courseId: string, hasPermission: boolean }) {
    const firestore = useFirestore();

    const enrolledStudentsRef = useMemoFirebase(() => {
        if (hasPermission && courseId) {
            return collection(firestore, `courses/${courseId}/students`);
        }
        return null;
    }, [hasPermission, firestore, courseId]);
    const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);

    const studentIds = React.useMemo(() => {
        if (!enrolledStudents) return null;
        if (enrolledStudents.length === 0) return [];
        return enrolledStudents.map(s => s.studentId);
    }, [enrolledStudents]);

    const studentProfilesQuery = useMemoFirebase(() => {
        if (studentIds === null) return null;
        if (studentIds.length === 0) return null;
        // Firestore 'in' queries can handle up to 30 elements in the array.
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
    }, [firestore, studentIds]);

    const { data: students, isLoading: isLoadingProfiles } = useCollection<Student>(studentProfilesQuery);

    const isLoading = isLoadingEnrolled || isLoadingProfiles;

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/50 rounded-md">
                <ShieldAlert className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold">Acceso Restringido</h3>
                <p className="text-sm text-muted-foreground">No tienes permisos para ver la lista de estudiantes.</p>
            </div>
        );
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : students && students.length > 0 ? (
                    students.map(student => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                            <TableCell>{student.email}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">
                            No hay estudiantes inscritos en este curso.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}


export default function CourseDetailsPage({ params }: { params: { courseId: string } }) {
    const { courseId } = params;
    const firestore = useFirestore();
    const { user, isUserLoading: isAuthLoading } = useUser();
    
    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);


    const courseRef = useMemoFirebase(() => {
        if (courseId) {
            return doc(firestore, `courses`, courseId);
        }
        return null;
    }, [firestore, courseId]);
    const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseRef);

    const isCoreDataLoading = isAuthLoading || isProfileLoading || isCourseLoading;

    const canManageCourse = React.useMemo(() => {
        if (isCoreDataLoading || !userProfile || !course) return false;
        const userIsAdminOrDirector = userProfile.role === 'admin' || userProfile.role === 'director';
        const userIsTeacherOfCourse = user?.uid === course.teacherId;
        return userIsAdminOrDirector || userIsTeacherOfCourse;
    }, [isCoreDataLoading, userProfile, course, user]);
    
    // El estudiante tiene permisos si está inscrito. (Lógica a futuro)
    const canViewCourse = React.useMemo(() => {
        if (isCoreDataLoading || !userProfile || !course) return false;
        if (canManageCourse) return true;
        // Aquí se agregaría la lógica para verificar si el estudiante está inscrito.
        // Por ahora, si no es manager, no puede ver.
        return false; 
    }, [isCoreDataLoading, userProfile, course, canManageCourse]);


    if (isCoreDataLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-9 w-1/2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }
    
    if (!course || !user || !userProfile) {
        return (
             <div className="flex flex-col items-center justify-center h-64 text-center">
                <ArrowLeft className="w-8 h-8 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold">No se encontró el curso</h2>
                <p className="text-muted-foreground">No se pudo cargar la información del curso o del usuario.</p>
                <Button variant="outline" asChild className="mt-4">
                    <Link href="/dashboard">Volver al Panel</Link>
                </Button>
            </div>
        )
    }
    
    const courseTitle = `${course.subjectName} - ${course.gradeName || ''} ${course.sectionName}`.replace(/ -  | - $/, ' - ').trim();


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">{courseTitle}</h1>
            <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="students">
                        <Users className="mr-2 h-4 w-4" />
                        Estudiantes
                    </TabsTrigger>
                     <TabsTrigger value="attendance">
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Asistencia
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Tareas
                    </TabsTrigger>
                    <TabsTrigger value="grades">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Calificaciones
                    </TabsTrigger>
                    <TabsTrigger value="announcements">
                        <Megaphone className="mr-2 h-4 w-4" />
                        Anuncios
                    </TabsTrigger>
                     <TabsTrigger value="materials">
                        <FileText className="mr-2 h-4 w-4" />
                        Material
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="students">
                     <Card>
                        <CardHeader>
                            <CardTitle>Estudiantes Inscritos</CardTitle>
                            <CardDescription>Lista de estudiantes que participan en este curso.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <StudentListTab courseId={course.id} hasPermission={canManageCourse} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="attendance">
                    <AttendanceTab courseId={course.id} hasPermission={canManageCourse} />
                </TabsContent>
                 <TabsContent value="tasks">
                    <TasksTab courseId={course.id} hasPermission={canManageCourse || userProfile.role === 'student'} />
                </TabsContent>
                <TabsContent value="grades">
                     <PlaceholderTab title="Registro de Calificaciones" />
                </TabsContent>
                <TabsContent value="announcements">
                     <PlaceholderTab title="Anuncios" />
                </TabsContent>
                 <TabsContent value="materials">
                     <PlaceholderTab title="Material de Clase" />
                </TabsContent>
            </Tabs>
        </div>
    );
}
