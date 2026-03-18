import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Panel de Administracion</h1>
      <p className="text-muted-foreground">
        El proyecto se reinicio para trabajar desde una base limpia. Desde aqui podras
        reconstruir los modulos que necesites.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Volver a iniciar sesion
      </Link>
    </main>
  );
}
