export type Role = 'admin' | 'teacher' | 'student' | 'parent';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
};

export const menuItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Panel',
    icon: 'LayoutDashboard',
    roles: ['admin', 'teacher', 'student', 'parent'],
  },
  {
    href: '/dashboard/schools',
    label: 'Escuelas',
    icon: 'School',
    roles: ['admin'],
  },
  {
    href: '/dashboard/academics',
    label: 'Académico',
    icon: 'BookOpen',
    roles: ['admin', 'teacher', 'student'],
  },
  {
    href: '/dashboard/students',
    label: 'Estudiantes',
    icon: 'Users',
    roles: ['admin', 'teacher', 'parent'],
  },
  {
    href: '/dashboard/teachers',
    label: 'Profesores',
    icon: 'GraduationCap',
    roles: ['admin'],
  },
  {
    href: '/dashboard/grades',
    label: 'Calificaciones',
    icon: 'ClipboardList',
    roles: ['admin', 'teacher', 'student', 'parent'],
  },
  {
    href: '/dashboard/finances',
    label: 'Finanzas',
    icon: 'Banknote',
    roles: ['admin', 'student', 'parent'],
  },
  {
    href: '/dashboard/communication',
    label: 'Comunicación',
    icon: 'MessageSquare',
    roles: ['admin', 'teacher', 'student', 'parent'],
  },
  {
    href: '/dashboard/settings',
    label: 'Configuración',
    icon: 'Settings',
    roles: ['admin'],
  },
];
