'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CreditCard, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { SidebarMenuButton } from './ui/sidebar';
import { getAuth, signOut } from 'firebase/auth';

export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="w-full" tooltip="Cuenta de usuario">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.photoURL || userAvatar?.imageUrl}
              alt="User avatar"
              data-ai-hint={userAvatar?.imageHint}
            />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-left">{user?.displayName || user?.email}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName || 'Usuario'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Facturación
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Configuración
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
