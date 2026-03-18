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
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, documentId, writeBatch, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Interfaces ---
interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: {
    toDate: () => Date;
  };
  totalPoints?: number;
}

interface Course {
  id: string;
  sectionId: string;
}

interface EnrolledStudent {
  id: string; // Document ID from the enrollment subcollection
  studentId: string; // The actual UID of the student
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
}

interface Submission {
  id: string; // studentId
  studentId: string;
  submittedAt: {
    toDate: () => Date;
  };
  score?: number;
}

interface StudentSubmission {
  student: StudentProfile;
  submission: Submission | null;
}

export default function TaskSubmissionsPage({ params }: { params: { courseId: string; taskId: string } }) {
  const { courseId, taskId } = params;
  const firestore = useFirestore();

  // --- State for Grading Dialog ---
  const [isGradingDialogOpen, setIsGradingDialogOpen] = React.useState(false);
  const [currentSubmission, setCurrentSubmission] = React.useState<StudentSubmission | null>(null);
  const [currentScore, setCurrentScore] = React.useState<string>('');

  // 1. Fetch Task Details
  const taskRef = useMemoFirebase(() => doc(firestore, `courses/${courseId}/tasks`, taskId), [firestore, courseId, taskId]);
  const { data: task, isLoading: isLoadingTask } = useDoc<Task>(taskRef);

  // 2. Fetch Course Details (to get sectionId)
  const courseRef = useMemoFirebase(() => doc(firestore, 'courses', courseId), [firestore, courseId]);
  const { data: course, isLoading: isLoadingCourse } = useDoc<Course>(courseRef);

  // 3. Fetch all students enrolled in the course's section
  const enrolledStudentsQuery = useMemoFirebase(() => {
    if (!course) return null;
    return collection(firestore, `courses/${courseId}/students`);
  }, [firestore, courseId, course]);
  const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsQuery);

  const studentIds = React.useMemo(() => enrolledStudents?.map(s => s.studentId), [enrolledStudents]);

  // 4. Fetch profiles for all enrolled students
  const studentProfilesQuery = useMemoFirebase(() => {
    if (!studentIds || studentIds.length === 0) return null;
    return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
  }, [firestore, studentIds]);
  const { data: studentProfiles, isLoading: isLoadingProfiles } = useCollection<StudentProfile>(studentProfilesQuery);

  // 5. Fetch all submissions for this task
  const submissionsQuery = useMemoFirebase(() => {
    return collection(firestore, `courses/${courseId}/tasks/${taskId}/submissions`);
  }, [firestore, courseId, taskId]);
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissionsMap = React.useMemo(() => {
    if (!submissions) return new Map<string, Submission>();
    return new Map(submissions.map(sub => [sub.studentId, sub]));
  }, [submissions]);

  // --- Combined Data & Status Calculation ---
  const studentSubmissions: StudentSubmission[] = React.useMemo(() => {
    if (!studentProfiles) return [];
    return studentProfiles.map(student => ({
      student,
      submission: submissionsMap.get(student.id) || null,
    }));
  }, [studentProfiles, submissionsMap]);

  const getSubmissionStatus = (submission: Submission | null, dueDate: Date): { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
    if (submission) {
      if (submission.submittedAt.toDate() <= dueDate) {
        return { text: 'Entregada a tiempo', variant: 'secondary' };
      } else {
        return { text: 'Entregada fuera de tiempo', variant: 'secondary' };
      }
    } else {
      if (new Date() > dueDate) {
        return { text: 'No entregó', variant: 'destructive' };
      } else {
        return { text: 'Pendiente', variant: 'outline' };
      }
    }
  };

  const getGradingStatus = (submission: Submission | null): { text: string; variant: 'default' | 'outline' } => {
    if (submission && submission.score !== undefined && submission.score !== null) {
      return { text: 'Calificado', variant: 'default' };
    }
    // Si hay entrega pero no hay nota, o si no hay entrega, está pendiente de calificación.
    return { text: 'Pendiente de Calificación', variant: 'outline' };
  };


  const handleGradeClick = (studentSubmission: StudentSubmission) => {
    setCurrentSubmission(studentSubmission);
    setCurrentScore(studentSubmission.submission?.score?.toString() ?? '');
    setIsGradingDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!currentSubmission || !task) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha seleccionado ninguna entrega para calificar.' });
      return;
    }
  
    const studentId = currentSubmission.student.id;
    const score = Number(currentScore);
    const totalPoints = task.totalPoints || 100;
  
    if (isNaN(score) || score < 0 || score > totalPoints) {
      toast({ variant: 'destructive', title: 'Punteo Inválido', description: `El punteo debe ser un número entre 0 y ${totalPoints}.` });
      return;
    }
  
    const submissionRef = doc(firestore, `courses/${courseId}/tasks/${taskId}/submissions`, studentId);
  
    try {
      if (currentSubmission.submission) {
        // If submission exists, update score
        await updateDoc(submissionRef, { score });
      } else {
        // This case is for grading a non-submitted task.
        // In a real app, you might want a different flow, but here we'll create a submission doc.
        const batch = writeBatch(firestore);
        batch.set(submissionRef, {
            studentId,
            submittedAt: new Date(), // Or another placeholder
            score,
            status: 'graded_without_submission' // Custom status
        });
        await batch.commit();
      }
      
      toast({ title: 'Calificación Guardada', description: `Se guardó el punteo para ${currentSubmission.student.firstName}.` });
      setIsGradingDialogOpen(false);
      setCurrentSubmission(null);
  
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({ variant: 'destructive', title: 'Error al Guardar', description: 'No se pudo guardar la calificación.' });
    }
  };


  const isLoading = isLoadingTask || isLoadingCourse || isLoadingEnrolled || isLoadingProfiles || isLoadingSubmissions;
  const dueDate = task?.dueDate.toDate();
  const totalPoints = task?.totalPoints || 100;

  return (
    <div className="flex flex-col gap-6">
      {isLoading ? (
        <Skeleton className="h-9 w-3/4" />
      ) : task ? (
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
                <Link href={`/dashboard/courses/${courseId}`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
                <p className="text-muted-foreground">Fecha de entrega: {dueDate ? format(dueDate, 'PPP p', { locale: es }) : 'N/A'}</p>
            </div>
        </div>
      ) : (
        <h1 className="text-3xl font-bold tracking-tight">Tarea no encontrada</h1>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Entregas de Estudiantes</CardTitle>
          <CardDescription>
            Lista de estudiantes de la sección y el estado de sus entregas para esta tarea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Alumno</TableHead>
                <TableHead>Estado de Entrega</TableHead>
                <TableHead>Estado de Calificación</TableHead>
                <TableHead>Punteo Obtenido</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : studentSubmissions.length > 0 ? (
                studentSubmissions.map((item) => {
                  const submissionStatus = dueDate ? getSubmissionStatus(item.submission, dueDate) : { text: 'Error de fecha', variant: 'destructive' as const };
                  const gradingStatus = getGradingStatus(item.submission);
                  return (
                    <TableRow key={item.student.id}>
                      <TableCell className="font-medium">
                        {item.student.firstName} {item.student.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={submissionStatus.variant}>{submissionStatus.text}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gradingStatus.variant}>{gradingStatus.text}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.submission?.score !== undefined ? `${item.submission.score} / ${totalPoints}` : `- / ${totalPoints}`}
                      </TableCell>
                       <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleGradeClick(item)}>
                            <Edit className="mr-2 h-3 w-3" />
                            Calificar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay estudiantes en esta sección para mostrar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Grading Dialog */}
       <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Calificar Tarea</DialogTitle>
                <DialogDescription>
                    Asigna un punteo a {currentSubmission?.student.firstName} {currentSubmission?.student.lastName} sobre {totalPoints} puntos.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 grid gap-4">
                <Label htmlFor="score">Punteo</Label>
                <Input 
                    id="score"
                    type="number"
                    value={currentScore}
                    onChange={(e) => setCurrentScore(e.target.value)}
                    placeholder={`0 - ${totalPoints}`}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsGradingDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveGrade}>Guardar Calificación</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>

    </div>
  );
}
