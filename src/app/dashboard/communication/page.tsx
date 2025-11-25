import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function CommunicationPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Comunicación</h1>
      <Card>
        <CardHeader>
          <CardTitle>Mensajería Interna</CardTitle>
          <CardDescription>
            Comunícate con otros miembros de la comunidad escolar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}