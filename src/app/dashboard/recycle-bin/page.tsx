
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
import { RotateCcw, Trash2, Search } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';


interface SoftDeletedItem {
  id: string;
  name: string;
  deletedAt?: {
    toDate: () => Date;
  };
}

function InactiveSchools() {
    const firestore = useFirestore();
    const schoolsRef = useMemoFirebase(() => collection(firestore, 'schools'), [firestore]);
    const inactiveSchoolsQuery = useMemoFirebase(() => query(schoolsRef, where('status', '==', 'inactive')), [schoolsRef]);
    const { data: inactiveSchools, isLoading } = useCollection<SoftDeletedItem>(inactiveSchoolsQuery);

    const [schoolToPermanentlyDelete, setSchoolToPermanentlyDelete] = React.useState<SoftDeletedItem | null>(null);
    const [isAlertOpen, setIsAlertOpen] = React.useState(false);
    const [alertContent, setAlertContent] = React.useState({ title: '', description: '' });
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleRestore = (schoolId: string) => {
        const schoolDocRef = doc(firestore, 'schools', schoolId);
        updateDocumentNonBlocking(schoolDocRef, { status: 'active', deletedAt: null });
        toast({
            title: "Escuela Restaurada",
            description: "La escuela ha sido restaurada y ahora está activa."
        });
    };
    
    const handleDeleteAttempt = async (school: SoftDeletedItem) => {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('schoolId', '==', school.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            setAlertContent({
                title: 'No se puede eliminar permanentemente la escuela',
                description: `Esta escuela tiene ${snapshot.size} usuario(s) asociado(s). Para poder eliminarla, primero reasigna o elimina estos usuarios.`,
            });
            setIsAlertOpen(true);
        } else {
            setSchoolToPermanentlyDelete(school);
        }
    };


    const executePermanentDelete = () => {
        if (!schoolToPermanentlyDelete) return;
        const schoolDocRef = doc(firestore, 'schools', schoolToPermanentlyDelete.id);
        deleteDocumentNonBlocking(schoolDocRef);
        toast({
            variant: 'destructive',
            title: "Eliminación Permanente",
            description: "La escuela ha sido eliminada permanentemente del sistema."
        });
        setSchoolToPermanentlyDelete(null);
    };
    
    const filteredSchools = React.useMemo(() => {
        if (!inactiveSchools) return [];
        return inactiveSchools.filter(school => school.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [inactiveSchools, searchTerm]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Escuelas Inactivas</CardTitle>
                <CardDescription>
                    Lista de escuelas desactivadas. Pueden ser restauradas o eliminadas permanentemente.
                </CardDescription>
                 <div className="relative pt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar escuela por nombre..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Fecha de Eliminación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {isLoading ? (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center">Cargando...</TableCell>
                        </TableRow>
                    ) : filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                        <TableRow key={school.id}>
                            <TableCell>{school.name}</TableCell>
                            <TableCell>{school.deletedAt ? new Date(school.deletedAt.toDate()).toLocaleString() : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleRestore(school.id)} className="mr-2">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restaurar
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteAttempt(school)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                </Button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="text-center">No hay escuelas en la papelera.</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
            <AlertDialog open={schoolToPermanentlyDelete !== null} onOpenChange={(open) => !open && setSchoolToPermanentlyDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción es irreversible. La escuela y todos sus datos asociados serán eliminados para siempre.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executePermanentDelete} className="bg-destructive hover:bg-destructive/90">Eliminar Permanentemente</AlertDialogAction>
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
    )
}


export default function RecycleBinPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Papelera de Reciclaje</h1>
      <Tabs defaultValue="schools">
        <TabsList>
            <TabsTrigger value="schools">Escuelas</TabsTrigger>
            {/* Se pueden agregar más triggers para otros tipos de datos en el futuro */}
        </TabsList>
        <TabsContent value="schools">
            <InactiveSchools />
        </TabsContent>
      </Tabs>
    </div>
  );
}
