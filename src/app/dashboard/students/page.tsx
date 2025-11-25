import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function StudentsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Gestión de Estudiantes</h1>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Estudiantes</CardTitle>
          <CardDescription>
            Consulta y administra la información de los estudiantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}