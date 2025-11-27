'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function SignupPage() {
  return (
    <Card className="mx-auto max-w-sm w-full">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <Logo />
        </div>
        <CardTitle className="text-2xl text-center">Creación de Cuentas</CardTitle>
        <CardDescription className="text-center">
          Para garantizar la integridad y seguridad de la comunidad escolar, la creación de nuevas cuentas de usuario (profesores, estudiantes, padres) debe ser realizada por un administrador de la escuela.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm">
        Si ya tienes una cuenta, por favor, inicia sesión. Si eres un nuevo miembro, contacta al administrador de tu institución para que cree tu cuenta.
        <div className="mt-4">
          <Link href="/login" className="underline">
            Ir a Iniciar Sesión
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
