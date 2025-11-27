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
import { collection, query, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  schoolId: string;
}

const teacherFormSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres.' }),
});


export default function TeachersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
  const { data: userData } = useDoc<{ schoolId: string, role: Role }>(userDocRef);
  const schoolId = userData?.schoolId;
  const userRole = userData?.role;

  const teachersQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(collection(firestore, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'teacher'));
  }, [schoolId, firestore]);

  const { data: teachers, isLoading } = useCollection<UserData>(teachersQuery);

  const [isModifyDialogOpen, setIsModifyDialogOpen] = React.useState(false);
  const [selectedTeacher, setSelectedTeacher] = React.useState<UserData | null>(null);

  const form = useForm<z.infer<typeof teacherFormSchema>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  React.useEffect(() => {
    if (selectedTeacher) {
      form.reset({
        firstName: selectedTeacher.firstName,
        lastName: selectedTeacher.lastName,
      });
    }
  }, [selectedTeacher, form]);
  
  const handleModifyClick = (teacher: UserData) => {
    setSelectedTeacher(teacher);
    setIsModifyDialogOpen(true);
  };
  
  const handleDetailsClick = (teacherId: string) => {
    router.push(`/dashboard/teachers/${teacherId}`);
  };

  const onSubmit = (values: z.infer<typeof teacherFormSchema>) => {
    if (!selectedTeacher) return;
    const teacherDocRef = doc(firestore, 'users', selectedTeacher.id);
    updateDocumentNonBlocking(teacherDocRef, values);
    toast({
        title: "Profesor Actualizado",
        description: "Los datos del profesor han sido actualizados.",
    });
    setIsModifyDialogOpen(false);
  };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestión de Profesores</h1>
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
                  <TableCell colSpan={4} className="text-center">
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
                    Actualiza el nombre y apellido de {selectedTeacher?.firstName} {selectedTeacher?.lastName}.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Apellido</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
    </div>
  );
}