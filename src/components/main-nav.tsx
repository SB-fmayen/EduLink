'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  School,
  Users,
  GraduationCap,
  BookOpen,
  Banknote,
  MessageSquare,
  ClipboardList,
  Settings,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { href: '/dashboard/schools', label: 'Escuelas', icon: School },
  { href: '/dashboard/academics', label: 'Académico', icon: BookOpen },
  { href: '/dashboard/students', label: 'Estudiantes', icon: Users },
  { href: '/dashboard/teachers', label: 'Profesores', icon: GraduationCap },
  { href: '/dashboard/grades', label: 'Calificaciones', icon: ClipboardList },
  { href: '/dashboard/finances', label: 'Finanzas', icon: Banknote },
  { href: '/dashboard/communication', label: 'Comunicación', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <a href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
