
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RecycleBinPage() {

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Papelera de Reciclaje</h1>
       <Card>
        <CardHeader>
          <CardTitle>Módulo Desactivado</CardTitle>
          <CardDescription>
            La papelera de reciclaje ha sido desactivada.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p>Esta funcionalidad estaba ligada a la gestión multi-escuela y fue eliminada para simplificar la aplicación.</p>
        </CardContent>
      </Card>
    </div>
  );
}
