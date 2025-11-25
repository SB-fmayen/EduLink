import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function FinancesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Gestión Financiera</h1>
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta y Pagos</CardTitle>
          <CardDescription>
            Administra los pagos de matrícula y consulta los estados de cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Módulo en construcción.</p>
        </CardContent>
      </Card>
    </div>
  );
}