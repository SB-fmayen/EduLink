import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AcademicsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Gestión Académica</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cursos y Asignaturas</CardTitle>
          <CardDescription>
            Administra los cursos, asignaturas y secciones de la escuela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}