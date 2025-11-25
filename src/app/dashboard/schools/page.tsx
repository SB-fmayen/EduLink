import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';

const schools = [
  {
    id: '1',
    name: 'Academia Innovate',
    director: 'Dr. Evelyn Reed',
    created: '2023-01-15',
  },
  {
    id: '2',
    name: 'Secundaria North Star',
    director: 'Sr. David Chen',
    created: '2023-02-20',
  },
  {
    id: '3',
    name: 'Primaria Horizon',
    director: 'Sra. Maria Garcia',
    created: '2023-03-10',
  },
];

export default function SchoolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Escuelas</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Escuela
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Escuelas</CardTitle>
          <CardDescription>
            Una lista de todas las escuelas registradas en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre de la Escuela</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.director}</TableCell>
                  <TableCell>{school.created}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
