
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
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import React from 'react';
import { toast } from '@/hooks/use-toast';

interface SchoolData {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
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
  const activeSchoolsQuery = useMemoFirebase(() => query(schoolsRef, where('status', '!=', 'inactive')), [schoolsRef]);
  const { data: schools, isLoading } = useCollection<SchoolData>(activeSchoolsQuery);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingSchool, setEditingSchool] = React.useState<SchoolData | null>(null);
  const [schoolToDeactivate, setSchoolToDeactivate] = React.useState<SchoolData | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [alertContent, setAlertContent] = React.useState({ title: '', description: '' });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', address: '' },
  });

  React.useEffect(() => {
    if (editingSchool) {
      form.reset({
        name: editingSchool.name,
        address: editingSchool.address,
      });
    } else {
      form.reset({ name: '', address: '' });
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

  const handleDeactivateAttempt = async (school: SchoolData) => {
    if (school.id === 'default-school-id') {
        setAlertContent({
            title: 'Acción no permitida',
            description: 'La escuela por defecto no puede ser desactivada. Es necesaria para el registro de nuevos usuarios.',
        });
        setIsAlertOpen(true);
        return;
    }
    
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('schoolId', '==', school.id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setAlertContent({
        title: 'No se puede desactivar la escuela',
        description: `Esta escuela tiene ${snapshot.size} usuario(s) asignado(s) y no puede ser desactivada. Por favor, reasigna los usuarios a otra escuela antes de continuar.`,
      });
      setIsAlertOpen(true);
    } else {
      setSchoolToDeactivate(school);
    }
  };

  const executeDeactivate = () => {
    if (!schoolToDeactivate) return;
    const schoolDocRef = doc(firestore, 'schools', schoolToDeactivate.id);
    updateDocumentNonBlocking(schoolDocRef, { status: 'inactive', deletedAt: serverTimestamp() });
    toast({
        title: "Escuela Desactivada",
        description: "La escuela ha sido movida a la papelera de reciclaje."
    });
    setSchoolToDeactivate(null);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingSchool) {
      const schoolDocRef = doc(firestore, 'schools', editingSchool.id);
      updateDocumentNonBlocking(schoolDocRef, values);
       toast({
        title: "Escuela Actualizada",
        description: "La información de la escuela ha sido actualizada."
      });
    } else {
      addDocumentNonBlocking(schoolsRef, { ...values, status: 'active', createdAt: serverTimestamp() });
       toast({
        title: "Escuela Creada",
        description: "La nueva escuela ha sido creada correctamente."
      });
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
            Una lista de todas las escuelas activas en el sistema.
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
                          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleDeactivateAttempt(school); }}>
                            Desactivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No hay escuelas activas.
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
      
      <AlertDialog open={schoolToDeactivate !== null} onOpenChange={(open) => !open && setSchoolToDeactivate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar Escuela?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción moverá la escuela a la papelera de reciclaje. Podrás restaurarla más tarde.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeactivate}>Desactivar</AlertDialogAction>
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
    </div>
  );
}

    