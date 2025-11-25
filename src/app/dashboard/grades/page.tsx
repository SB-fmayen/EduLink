import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function GradesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Gestión de Calificaciones</h1>
      <Card>
        <CardHeader>
          <CardTitle>Registro de Calificaciones</CardTitle>
          <CardDescription>
            Consulta y registra las calificaciones de los estudiantes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}