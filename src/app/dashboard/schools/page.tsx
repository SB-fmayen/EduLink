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
    name: 'Innovate Academy',
    director: 'Dr. Evelyn Reed',
    created: '2023-01-15',
  },
  {
    id: '2',
    name: 'North Star High',
    director: 'Mr. David Chen',
    created: '2023-02-20',
  },
  {
    id: '3',
    name: 'Horizon Elementary',
    director: 'Ms. Maria Garcia',
    created: '2023-03-10',
  },
];

export default function SchoolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create School
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>School Management</CardTitle>
          <CardDescription>
            A list of all registered schools in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Director</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
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
                      Edit
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
