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
import { Button } from '@/components/ui/button';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, documentId, setDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, FileText, Megaphone, ShieldAlert, Users, CalendarCheck, PlusCircle, MoreHorizontal } from 'lucide-react';
import { Role } from '@/lib/roles';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';


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
    isGroupTask: boolean;
    dueDate: {
        toDate: () => Date;
    };
    createdAt: {
        toDate: () => Date;
    };
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

const taskFormSchema = z.object({
  title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres.' }),
  dueDate: z.date({ required_error: 'La fecha de entrega es obligatoria.' }),
  dueTime: z.string({ required_error: 'La hora de entrega es obligatoria.' }),
  isGroupTask: z.boolean().default(false),
});

function TasksTab({ courseId, hasPermission }: { courseId: string; hasPermission: boolean }) {
    const firestore = useFirestore();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingTask, setEditingTask] = React.useState<Task | null>(null);

    const tasksRef = useMemoFirebase(() => {
        if (courseId) { // Permitir lectura a todos, las reglas de seguridad controlan la escritura
            return collection(firestore, `courses/${courseId}/tasks`);
        }
        return null;
    }, [firestore, courseId]);
    const { data: tasks, isLoading } = useCollection<Task>(tasksRef);

    const form = useForm<z.infer<typeof taskFormSchema>>({
        resolver: zodResolver(taskFormSchema),
        defaultValues: {
            title: '',
            description: '',
            isGroupTask: false,
        },
    });

    React.useEffect(() => {
        if (editingTask) {
            form.reset({
                title: editingTask.title,
                description: editingTask.description,
                dueDate: editingTask.dueDate.toDate(),
                dueTime: format(editingTask.dueDate.toDate(), 'HH:mm'),
                isGroupTask: editingTask.isGroupTask || false,
            });
        } else {
            form.reset({
                title: '',
                description: '',
                dueDate: undefined,
                dueTime: '23:59',
                isGroupTask: false
            });
        }
    }, [editingTask, form]);


    const handleCreateClick = () => {
        setEditingTask(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof taskFormSchema>) => {
        if (!tasksRef) return;

        const [hours, minutes] = values.dueTime.split(':').map(Number);
        const finalDueDate = new Date(values.dueDate);
        finalDueDate.setHours(hours, minutes);

        const payload = {
            ...values,
            dueDate: finalDueDate,
        };
        delete (payload as any).dueTime; // No guardar dueTime en Firestore
        
        try {
             if (editingTask) {
                const taskDocRef = doc(firestore, `courses/${courseId}/tasks`, editingTask.id);
                await updateDoc(taskDocRef, payload);
                 toast({
                    title: 'Tarea Actualizada',
                    description: 'La tarea ha sido actualizada exitosamente.',
                });
            } else {
                await addDoc(tasksRef, {
                    ...payload,
                    createdAt: serverTimestamp(),
                });
                toast({
                    title: 'Tarea Creada',
                    description: 'La nueva tarea ha sido creada exitosamente.',
                });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error('Error saving task:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo guardar la tarea. Revisa tus permisos.',
            });
        }
    };

    if (!hasPermission && (isLoading || (tasks && tasks.length > 0))) {
        // Show restricted access only if teacher, otherwise show student view (later)
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestión de Tareas</CardTitle>
                        <CardDescription>Crea y administra las tareas para este curso.</CardDescription>
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
                                <TableHead>Tipo</TableHead>
                                <TableHead>Fecha de Entrega</TableHead>
                                <TableHead>Entregas</TableHead>
                                {hasPermission && <TableHead><span className="sr-only">Acciones</span></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={hasPermission ? 5 : 4} className="text-center h-24">Cargando tareas...</TableCell></TableRow>
                            ) : tasks && tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.isGroupTask ? 'Grupal' : 'Individual'}</TableCell>
                                        <TableCell>{task.dueDate ? format(task.dueDate.toDate(), 'PPP p', { locale: es }) : 'Pendiente...'}</TableCell>
                                        <TableCell>0/30</TableCell>
                                         {hasPermission && (
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditClick(task)}>Editar</DropdownMenuItem>
                                                        <DropdownMenuItem>Eliminar</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={hasPermission ? 5 : 4} className="text-center h-24">No hay tareas creadas para este curso.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
                        <DialogDescription>Completa los detalles para la tarea.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título de la Tarea</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Ensayo sobre la Revolución Industrial" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe las instrucciones, los requisitos y los criterios de evaluación de la tarea." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="dueDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Fecha Límite</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dueTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Hora Límite</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="isGroupTask"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>Tarea Grupal</FormLabel>
                                            <FormDescription>
                                                Si se marca, la calificación se aplicará a todo el grupo.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Guardando...' : (editingTask ? 'Guardar Cambios' : 'Crear Tarea')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
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


export default function CourseDetailsPage({ params }: { params: { id: string } }) {
    const courseId = params.id;
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
        return userProfile.role === 'admin' || userProfile.role === 'director' || user?.uid === course.teacherId;
    }, [isCoreDataLoading, userProfile, course, user]);


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
        return <p>No se pudo cargar la información del curso o del usuario.</p>
    }
    
    const courseTitle = `${course.subjectName} - ${course.gradeName || ''} ${course.sectionName}`.replace(/ -  | - $/, ' - ').trim();


    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">{courseTitle}</h1>
            <Tabs defaultValue="assignments" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="students">
                        <Users className="mr-2 h-4 w-4" />
                        Estudiantes
                    </TabsTrigger>
                     <TabsTrigger value="attendance">
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Asistencia
                    </TabsTrigger>
                    <TabsTrigger value="assignments">
                        <FileText className="mr-2 h-4 w-4" />
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
                 <TabsContent value="assignments">
                    <TasksTab courseId={course.id} hasPermission={canManageCourse} />
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

    