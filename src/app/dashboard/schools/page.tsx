
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SchoolsPage() {
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Escuelas</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Módulo Desactivado</CardTitle>
          <CardDescription>
            La gestión multi-escuela ha sido desactivada.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Esta funcionalidad fue eliminada para simplificar la aplicación a una sola institución.</p>
        </CardContent>
      </Card>
    </div>
  );
}
