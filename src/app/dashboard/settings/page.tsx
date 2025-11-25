import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Configuración</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ajustes del Sistema</CardTitle>
          <CardDescription>
            Configura las opciones generales de la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}