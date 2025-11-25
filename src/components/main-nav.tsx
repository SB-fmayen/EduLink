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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/schools', label: 'Schools', icon: School },
  { href: '/dashboard/academics', label: 'Academics', icon: BookOpen },
  { href: '/dashboard/students', label: 'Students', icon: Users },
  { href: '/dashboard/teachers', label: 'Teachers', icon: GraduationCap },
  { href: '/dashboard/grades', label: 'Grades', icon: ClipboardList },
  { href: '/dashboard/finances', label: 'Finances', icon: Banknote },
  { href: '/dashboard/communication', label: 'Communication', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
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
