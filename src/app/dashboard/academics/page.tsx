import { Book, GraduationCap, Users, Component } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function AcademicsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestión Académica</h1>
      <Tabs defaultValue="subjects">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subjects">
            <Book className="mr-2 h-4 w-4" />
            Asignaturas
          </TabsTrigger>
          <TabsTrigger value="grades">
            <GraduationCap className="mr-2 h-4 w-4" />
            Grados
          </TabsTrigger>
          <TabsTrigger value="sections">
            <Users className="mr-2 h-4 w-4" />
            Secciones
          </TabsTrigger>
          <TabsTrigger value="courses">
            <Component className="mr-2 h-4 w-4" />
            Cursos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Asignaturas</CardTitle>
              <CardDescription>
                Crea, edita y elimina las asignaturas que se imparten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Grados</CardTitle>
              <CardDescription>
                Administra los niveles educativos de la escuela.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Secciones</CardTitle>
              <CardDescription>
                Organiza los grupos de estudiantes dentro de cada grado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Cursos</CardTitle>
              <CardDescription>
                Asigna materias, profesores y horarios a cada sección.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funcionalidad en construcción.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
