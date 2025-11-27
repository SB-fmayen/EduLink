
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
import { collection, query, where, doc, writeBatch, setDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp, deleteApp, FirebaseOptions } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  schoolId: string;
}

interface SchoolData {
  id: string;
  name: string;
}

const teacherFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' }),
  schoolId: z.string({ required_error: 'Debe seleccionar una escuela.'}).min(1, 'Debe seleccionar una escuela.'),
});

const newTeacherFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(2, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'El correo electrónico no es válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export default function TeachersPage() {
  const firestore = useFirestore();
  const mainAuth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string, role: Role }>(userDocRef);
  const userRole = userData?.role;
  const adminSchoolId = userData?.schoolId;

  const teachersQuery = useMemoFirebase(() => {
    if (userRole === 'admin' && adminSchoolId) {
      return query(collection(firestore, 'users'), where('schoolId', '==', adminSchoolId), where('role', '==', 'teacher'));
    }
    // Allow super admin to see all teachers if not scoped to a school
    if (userRole === 'admin' && !adminSchoolId) { 
      return query(collection(firestore, 'users'), where('role', '==', 'teacher'));
    }
    return null;
  }, [firestore, userRole, adminSchoolId]);

  const { data: teachers, isLoading } = useCollection<UserData>(teachersQuery);

  const schoolsRef = useMemoFirebase(() => collection(firestore, 'schools'), [firestore]);
  const activeSchoolsQuery = useMemoFirebase(() => query(schoolsRef, where('status', '==', 'active')), [schoolsRef]);
  const { data: schools } = useCollection<SchoolData>(activeSchoolsQuery);

  const schoolsMap = React.useMemo(() => {
    if (!schools) return {};
    return schools.reduce((acc, school) => {
        acc[school.id] = school.name;
        return acc;
    }, {} as Record<string, string>);
  }, [schools]);


  const [isModifyDialogOpen, setIsModifyDialogOpen] = React.useState(false);
  const [isNewTeacherDialogOpen, setIsNewTeacherDialogOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<UserData | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const modifyForm = useForm<z.infer<typeof teacherFormSchema>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      schoolId: '',
    },
  });

  const newTeacherForm = useForm<z.infer<typeof newTeacherFormSchema>>({
    resolver: zodResolver(newTeacherFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    if (selectedTeacher) {
      modifyForm.reset({
        firstName: selectedTeacher.firstName,
        lastName: selectedTeacher.lastName,
        schoolId: selectedTeacher.schoolId,
      });
    }
  }, [selectedTeacher, modifyForm]);
  
  const handleModifyClick = (teacher: UserData) => {
    setSelectedTeacher(teacher);
    setIsModifyDialogOpen(true);
  };
  
  const handleDetailsClick = (teacherId: string) => {
    router.push(`/dashboard/teachers/${teacherId}`);
  };

  const onModifySubmit = async (values: z.infer<typeof teacherFormSchema>) => {
    if (!selectedTeacher) return;

    const teacherDocRef = doc(firestore, 'users', selectedTeacher.id);
    const oldSchoolId = selectedTeacher.schoolId;
    const newSchoolId = values.schoolId;

    const batch = writeBatch(firestore);
    batch.update(teacherDocRef, values);

    if (oldSchoolId && oldSchoolId !== newSchoolId) {
        const oldTeacherRef = doc(firestore, `schools/${oldSchoolId}/teachers`, selectedTeacher.id);
        batch.delete(oldTeacherRef);
    }
    
    const newTeacherRef = doc(firestore, `schools/${newSchoolId}/teachers`, selectedTeacher.id);
    batch.set(newTeacherRef, { id: selectedTeacher.id }, { merge: true });

    try {
        await batch.commit();
        toast({
            title: "Profesor Actualizado",
            description: "Los datos del profesor han sido actualizados.",
        });
    } catch (error) {
        console.error("Error updating teacher:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la información del profesor." });
    }
    
    setIsModifyDialogOpen(false);
  };

  const onNewTeacherSubmit = async (values: z.infer<typeof newTeacherFormSchema>) => {
    if (!adminSchoolId) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se puede crear el usuario. Falta información de la escuela del administrador.' });
      return;
    }

    const secondaryAppName = `secondary-creation-app-${Date.now()}`;
    let secondaryApp;
    let newUserId = '';

    try {
      // 1. Crear una instancia de app secundaria para crear el usuario en Auth sin afectar la sesión actual del admin.
      secondaryApp = initializeApp(firebaseConfig as FirebaseOptions, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
      newUserId = userCredential.user.uid;

      // 2. El administrador (usando la instancia principal de Firestore) crea los documentos necesarios.
      const batch = writeBatch(firestore);

      // Crear el documento de perfil en /users
      const userPayload: Omit<UserData, 'id'> = {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          role: 'teacher',
          schoolId: adminSchoolId,
      };
      const userDocRef = doc(firestore, 'users', newUserId);
      batch.set(userDocRef, userPayload);
      
      // Crear la referencia en la subcolección de la escuela
      const schoolTeacherRef = doc(firestore, `schools/${adminSchoolId}/teachers`, newUserId);
      batch.set(schoolTeacherRef, { id: newUserId });

      // 3. Ejecutar las operaciones en Firestore.
      await batch.commit();
      
      toast({ 
          title: 'Profesor Creado', 
          description: 'La cuenta y el perfil del profesor han sido creados correctamente.' 
      });
      setIsNewTeacherDialogOpen(false);
      newTeacherForm.reset();

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        newTeacherForm.setError('email', { type: 'manual', message: 'Este correo ya está en uso.' });
      } else {
        console.error("Error al crear profesor:", error);
        toast({ variant: 'destructive', title: 'Error al crear profesor', description: error.message || 'Ocurrió un error inesperado.' });
      }
    } finally {
      // 4. Limpiar la app secundaria.
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Profesores</h1>
        {userRole === 'admin' && (
          <Button onClick={() => setIsNewTeacherDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Profesor
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Profesores</CardTitle>
          <CardDescription>
            Consulta y administra la información de los profesores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Escuela Asignada</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Cargando profesores...
                  </TableCell>
                </TableRow>
              ) : teachers && teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.firstName} {teacher.lastName}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      {schoolsMap[teacher.schoolId] || <span className="text-muted-foreground">No asignada</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{teacher.role}</Badge>
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
                          <DropdownMenuItem onClick={() => handleModifyClick(teacher)}>
                            Modificar datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDetailsClick(teacher.id)}>
                            Ver Detalles
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No hay profesores registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isModifyDialogOpen} onOpenChange={setIsModifyDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Modificar datos del Profesor</DialogTitle>
                <DialogDescription>
                    Actualiza la información y la escuela asignada para {selectedTeacher?.firstName} {selectedTeacher?.lastName}.
                </DialogDescription>
            </DialogHeader>
            <Form {...modifyForm}>
                <form onSubmit={modifyForm.handleSubmit(onModifySubmit)} className="grid gap-4 py-4">
                    <FormField
                        control={modifyForm.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                     <FormField
                        control={modifyForm.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                    />
                    <FormField
                        control={modifyForm.control}
                        name="schoolId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Escuela</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una escuela" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {schools?.map((school) => (<SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit">Guardar Cambios</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isNewTeacherDialogOpen} onOpenChange={setIsNewTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Profesor</DialogTitle>
            <DialogDescription>
              Introduce los datos para crear una nueva cuenta de profesor. El profesor será asignado a tu escuela.
            </DialogDescription>
          </DialogHeader>
          <Form {...newTeacherForm}>
            <form onSubmit={newTeacherForm.handleSubmit(onNewTeacherSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={newTeacherForm.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={newTeacherForm.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Apellido</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              </div>
              <FormField control={newTeacherForm.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={newTeacherForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <FormControl><Input type={showPassword ? 'text' : 'password'} {...field} /></FormControl>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={newTeacherForm.formState.isSubmitting}>
                  {newTeacherForm.formState.isSubmitting ? 'Creando...' : 'Crear Cuenta'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
