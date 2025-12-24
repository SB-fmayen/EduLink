'use client';

import React from 'react';
import Link from 'next/link';
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
import { collection, query, where, doc, documentId } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface Task {
  id: string;
  title: string;
  description: string;
}

interface EnrolledStudent {
  id: string;
  studentId: string;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
}

interface Submission {
  id: string;
  studentId: string;
  submittedAt: {
    toDate: () => Date;
  };
  fileUrl: string;
  grade?: number;
}

export default function TaskSubmissionsPage({ params }: { params: { courseId: string; taskId: string } }) {
  const { courseId, taskId } = params;
  const firestore = useFirestore();

  const [grades, setGrades] = React.useState<Record<string, number | string>>({});

  const taskRef = useMemoFirebase(() => doc(firestore, `courses/${courseId}/tasks`, taskId), [firestore, courseId, taskId]);
  const { data: task, isLoading: isLoadingTask } = useDoc<Task>(taskRef);

  const enrolledStudentsRef = useMemoFirebase(() => collection(firestore, `courses/${courseId}/students`), [firestore, courseId]);
  const { data: enrolledStudents, isLoading: isLoadingEnrolled } = useCollection<EnrolledStudent>(enrolledStudentsRef);

  const submissionsRef = useMemoFirebase(() => collection(firestore, `courses/${courseId}/tasks/${taskId}/submissions`), [firestore, courseId, taskId]);
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsRef);

  const enrolledStudentIds = React.useMemo(() => enrolledStudents?.map(s => s.studentId) || [], [enrolledStudents]);

  const studentProfilesQuery = useMemoFirebase(() => {
    if (enrolledStudentIds.length > 0) {
      return query(collection(firestore, 'users'), where(documentId(), 'in', enrolledStudentIds.slice(0, 30)));
    }
    return null;
  }, [firestore, enrolledStudentIds]);
  const { data: studentProfiles, isLoading: isLoadingProfiles } = useCollection<StudentProfile>(studentProfilesQuery);

  const submissionsMap = React.useMemo(() => {
    return submissions?.reduce((acc, sub) => {
      acc[sub.studentId] = sub;
      return acc;
    }, {} as Record<string, Submission>) || {};
  }, [submissions]);

  React.useEffect(() => {
    if (submissions) {
        const initialGrades = submissions.reduce((acc, sub) => {
            if (sub.grade !== undefined) {
                acc[sub.studentId] = sub.grade;
            }
            return acc;
        }, {} as Record<string, number>);
        setGrades(initialGrades);
    }
  }, [submissions]);


  const handleGradeChange = (studentId: string, value: string) => {
    const score = value === '' ? '' : Number(value);
    if (score === '' || (score >= 0 && score <= 100)) {
        setGrades(prev => ({ ...prev, [studentId]: score }));
    }
  };

  const handleSaveGrade = (studentId: string) => {
    const grade = grades[studentId];
    if (grade === '' || typeof grade !== 'number') {
        toast({
            variant: 'destructive',
            title: 'Calificación inválida',
            description: 'Por favor, introduce un número entre 0 y 100.',
        });
        return;
    }
    
    const submission = submissionsMap[studentId];
    if (!submission) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se puede calificar una tarea que no ha sido entregada.',
        });
        return;
    }
    
    const submissionRef = doc(firestore, `courses/${courseId}/tasks/${taskId}/submissions`, submission.id);
    updateDocumentNonBlocking(submissionRef, { grade });

    toast({
        title: 'Calificación Guardada',
        description: `Se ha guardado la calificación para el estudiante.`,
    });
  };

  const isLoading = isLoadingTask || isLoadingEnrolled || isLoadingSubmissions || isLoadingProfiles;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {isLoadingTask ? <Skeleton className="h-8 w-1/2" /> : <h1 className="text-3xl font-bold tracking-tight">{task?.title}</h1>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entregas de Estudiantes</CardTitle>
          <CardDescription>Revisa las entregas, descarga los archivos y asigna una calificación a cada estudiante.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead className="w-[150px]">Calificación (0-100)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : studentProfiles && studentProfiles.length > 0 ? (
                studentProfiles.map(student => {
                  const submission = submissionsMap[student.id];
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell>
                        {submission ? (
                          <Badge variant="default">Entregado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendiente</Badge>
                        )}
                      </TableCell>
                       <TableCell>
                        {submission ? (
                           <Button variant="outline" size="icon" asChild>
                               <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                                   <Download className="h-4 w-4" />
                               </a>
                           </Button>
                        ) : (
                           '-'
                        )}
                      </TableCell>
                      <TableCell>
                         <Input 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="N/A"
                            value={grades[student.id] ?? ''}
                            onChange={e => handleGradeChange(student.id, e.target.value)}
                            disabled={!submission}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            onClick={() => handleSaveGrade(student.id)}
                            disabled={grades[student.id] === undefined || grades[student.id] === '' || !submission}
                        >
                            Guardar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No hay estudiantes en este curso.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
