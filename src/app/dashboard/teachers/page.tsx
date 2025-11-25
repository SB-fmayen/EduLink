import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function TeachersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Gestión de Profesores</h1>
      <Card>
        <CardHeader>
          <CardTitle>Listado de Profesores</CardTitle>
          <CardDescription>
            Administra los perfiles y asignaciones de los profesores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}