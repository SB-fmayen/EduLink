
'use client';

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface SchoolData {
  id: string;
  name: string;
  address: string;
  createdAt: {
    toDate: () => Date;
  };
}

const formSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  address: z.string().min(5, { message: 'La dirección debe tener al menos 5 caracteres.' }),
});

export default function SchoolsPage() {
  const firestore = useFirestore();
  const schoolsRef = useMemoFirebase(() => collection(firestore, 'schools'), [firestore]);
  const { data: schools, isLoading } = useCollection<SchoolData>(schoolsRef);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingSchool, setEditingSchool] = React.useState<SchoolData | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });

  React.useEffect(() => {
    if (editingSchool) {
      form.reset({
        name: editingSchool.name,
        address: editingSchool.address,
      });
    } else {
      form.reset({
        name: '',
        address: '',
      });
    }
  }, [editingSchool, form]);

  const handleEditClick = (school: SchoolData) => {
    setEditingSchool(school);
    setIsDialogOpen(true);
  };

  const handleCreateClick = () => {
    setEditingSchool(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (schoolId: string) => {
    const schoolDocRef = doc(firestore, 'schools', schoolId);
    deleteDocumentNonBlocking(schoolDocRef);
    toast({
        title: "Escuela Eliminada",
        description: "La escuela ha sido eliminada correctamente."
    })
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingSchool) {
      // Update existing school
      const schoolDocRef = doc(firestore, 'schools', editingSchool.id);
      updateDocumentNonBlocking(schoolDocRef, values);
       toast({
        title: "Escuela Actualizada",
        description: "La información de la escuela ha sido actualizada."
      })
    } else {
      // Create new school
      addDocumentNonBlocking(schoolsRef, { ...values, createdAt: serverTimestamp() });
       toast({
        title: "Escuela Creada",
        description: "La nueva escuela ha sido creada correctamente."
      })
    }
    setIsDialogOpen(false);
    setEditingSchool(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Escuelas</h1>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Escuela
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Escuelas</CardTitle>
          <CardDescription>
            Una lista de todas las escuelas registradas en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Escuela</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Cargando escuelas...
                  </TableCell>
                </TableRow>
              ) : schools && schools.length > 0 ? (
                schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.address}</TableCell>
                    <TableCell>
                      {school.createdAt ? new Date(school.createdAt.toDate()).toLocaleDateString() : 'N/A'}
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
                          <DropdownMenuItem onClick={() => handleEditClick(school)}>
                            Editar
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Eliminar
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente la escuela y todos sus datos asociados.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(school.id)}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No hay escuelas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSchool ? 'Editar Escuela' : 'Crear Nueva Escuela'}</DialogTitle>
            <DialogDescription>
              {editingSchool ? 'Modifica los detalles de la escuela.' : 'Completa los detalles para crear una nueva escuela.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Escuela</FormLabel>
                    <FormControl>
                      <Input placeholder="Academia Innovate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Calle Principal, Ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingSchool ? 'Guardar Cambios' : 'Crear Escuela'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
