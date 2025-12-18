'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useDoc } from '@/firebase';
import { useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { menuItems, NavItem } from '@/lib/roles';
import { useMemoFirebase } from '@/firebase';


export function MainNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    // CORRECCIÓN: Si el usuario no existe, no intentes crear una referencia.
    if (!user) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [user, firestore]);
  
  const { data: userData } = useDoc<{ role: string }>(userDocRef);
  const userRole = userData?.role;

  const accessibleMenuItems = menuItems.filter(item => 
    userRole && item.roles.includes(userRole as any)
  );

  // Si el usuario no ha iniciado sesión, no renderices nada.
  if (!user) {
    return null;
  }

  return (
    <SidebarMenu>
      {accessibleMenuItems.map((item) => {
        const Icon = (Icons as any)[item.icon];
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <a href={item.href}>
                {Icon && <Icon />}
                <span>{item.label}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
