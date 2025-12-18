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
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
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
import { createUserAction } from '@/app/actions/create-user-action';


interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

const teacherFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' }),
});

const newTeacherFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre es requerido.' }),
  lastName: z.string().min(2, { message: 'El apellido es requerido.' }),
  email: z.string().email({ message: 'El correo electrónico no es válido.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

export default function TeachersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ role: Role }>(userDocRef);
  const userRole = userData?.role;

  const teachersQuery = useMemoFirebase(() => {
    // Only admins and directors can see all teachers
    if (userRole === 'admin' || userRole === 'director') { 
      return query(collection(firestore, 'users'), where('role', '==', 'teacher'));
    }
    return null;
  }, [firestore, userRole]);

  const { data: teachers, isLoading } = useCollection<UserData>(teachersQuery);

  const [isModifyDialogOpen, setIsModifyDialogOpen] = React.useState(false);
  const [isNewTeacherDialogOpen, setIsNewTeacherDialogOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<UserData | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const modifyForm = useForm<z.infer<typeof teacherFormSchema>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
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
    const batch = writeBatch(firestore);
    batch.update(teacherDocRef, values);

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
    try {
      // 1. Llama a la Server Action para crear el usuario en Firebase Auth
      const { uid, error: authError } = await createUserAction(values.email, values.password);
  
      if (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          newTeacherForm.setError('email', { type: 'manual', message: 'Este correo ya está en uso.' });
        } else {
           toast({ variant: 'destructive', title: 'Error de Autenticación', description: authError.message });
        }
        return;
      }
  
      if (!uid) {
        toast({ variant: 'destructive', title: 'Error de Creación', description: 'No se pudo obtener el ID del nuevo usuario.' });
        return;
      }
      
      // 2. Si la autenticación es exitosa, crea los documentos en Firestore
      const batch = writeBatch(firestore);
      const userPayload: Omit<UserData, 'id' | 'schoolId'> & {role: 'teacher', schoolId: string} = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: 'teacher',
        schoolId: 'default-school-id',
      };
      
      const userDocRef = doc(firestore, 'users', uid);
      batch.set(userDocRef, userPayload);
      
      await batch.commit();
      
      toast({
        title: 'Profesor Creado',
        description: 'La cuenta y el perfil del profesor han sido creados correctamente.'
      });
      setIsNewTeacherDialogOpen(false);
      newTeacherForm.reset();
  
    } catch (dbError: any) {
      console.error("Error al escribir en Firestore:", dbError);
      toast({ variant: 'destructive', title: 'Error de Base de Datos', description: 'El usuario fue autenticado pero no se pudo guardar su perfil. Contacta a soporte.' });
    }
  };

  const canManageTeachers = userRole === 'admin' || userRole === 'director';
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Profesores</h1>
        {canManageTeachers && (
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
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
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
                      <Badge variant="default">{teacher.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageTeachers && (
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
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No hay profesores registrados o no tienes permiso para verlos.
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
                    Actualiza la información para {selectedTeacher?.firstName} {selectedTeacher?.lastName}.
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
              Introduce los datos para crear una nueva cuenta de profesor.
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
