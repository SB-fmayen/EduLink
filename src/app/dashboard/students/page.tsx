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
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Role } from '@/lib/roles';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  schoolId: string;
}

interface SectionData {
    id: string;
    name: string;
    gradeId: string;
}

interface GradeData {
    id: string;
    name: string;
}

interface CourseData {
    id: string;
    sectionId: string;
}

export default function StudentsPage() {
    const firestore = useFirestore();
    const { user } = useUser();

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, `users/${user.uid}`) : null, [user, firestore]);
    const { data: userData } = useDoc<{ schoolId: string, role: Role }>(userDocRef);
    const schoolId = userData?.schoolId;
    const userRole = userData?.role;

    const studentsQuery = useMemoFirebase(() => {
        if (!schoolId) return null;
        if (userRole === 'admin') {
             return query(collection(firestore, 'users'), where('role', '==', 'student'));
        }
        return query(collection(firestore, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student'));
    }, [schoolId, userRole, firestore]);
    
    const { data: students, isLoading } = useCollection<UserData>(studentsQuery);

    const sectionsRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/sections`) : null, [schoolId, firestore]);
    const { data: sections } = useCollection<SectionData>(sectionsRef);
    
    const gradesRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/grades`) : null, [schoolId, firestore]);
    const { data: grades } = useCollection<GradeData>(gradesRef);
    
    const coursesRef = useMemoFirebase(() => schoolId ? collection(firestore, `schools/${schoolId}/courses`) : null, [schoolId, firestore]);
    const { data: courses } = useCollection<CourseData>(coursesRef);
    
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
    const [selectedStudent, setSelectedStudent] = React.useState<UserData | null>(null);
    const [selectedSection, setSelectedSection] = React.useState<string>('');

    const gradesMap = React.useMemo(() => grades?.reduce((acc, grade) => ({ ...acc, [grade.id]: grade.name }), {} as Record<string, string>) || {}, [grades]);

    const handleAssignClick = (student: UserData) => {
        setSelectedStudent(student);
        setIsAssignDialogOpen(true);
    };

    const handleAssignToSection = async () => {
        if (!selectedStudent || !selectedSection || !courses) {
            toast({ variant: "destructive", title: "Error", description: "Por favor selecciona un estudiante y una sección." });
            return;
        }

        const coursesInSection = courses.filter(course => course.sectionId === selectedSection);
        if (coursesInSection.length === 0) {
            toast({ variant: "destructive", title: "Sin cursos", description: "Esta sección no tiene cursos asignados. Asigna cursos primero." });
            setIsAssignDialogOpen(false);
            return;
        }

        const studentCoursesRef = collection(firestore, 'users', selectedStudent.id, 'studentCourses');

        for (const course of coursesInSection) {
            await addDocumentNonBlocking(studentCoursesRef, {
                studentId: selectedStudent.id,
                courseId: course.id,
            });
        }
        
        toast({ title: "Estudiante Asignado", description: `${selectedStudent.firstName} ha sido inscrito en todos los cursos de la sección.` });
        setIsAssignDialogOpen(false);
        setSelectedSection('');
        setSelectedStudent(null);
    };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestión de Estudiantes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Estudiantes</CardTitle>
          <CardDescription>
            Consulta y administra la información de los estudiantes.
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
                    Cargando estudiantes...
                  </TableCell>
                </TableRow>
              ) : students && students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{student.role}</Badge>
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
                          <DropdownMenuItem onClick={() => handleAssignClick(student)}>
                            Asignar a Sección
                          </DropdownMenuItem>
                          <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No hay estudiantes registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Asignar Estudiante a Sección</DialogTitle>
                <DialogDescription>
                    Selecciona la sección a la que quieres asignar a {selectedStudent?.firstName} {selectedStudent?.lastName}. El estudiante será inscrito en todos los cursos de esa sección.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="section">Sección</Label>
                    <Select onValueChange={setSelectedSection} value={selectedSection}>
                        <SelectTrigger id="section">
                            <SelectValue placeholder="Selecciona una sección" />
                        </SelectTrigger>
                        <SelectContent>
                            {sections?.map(section => (
                                <SelectItem key={section.id} value={section.id}>
                                    {gradesMap[section.gradeId] || 'Grado desconocido'} - {section.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAssignToSection}>Asignar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
