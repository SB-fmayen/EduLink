'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useState } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdminRole = async () => {
      if (isUserLoading) return;

      if (!user) {
        if (isMounted) setIsCheckingRole(false);
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult(true);
        if (!isMounted) return;

        if (tokenResult.claims.role === 'admin') {
          router.push('/admin');
          return;
        }
      } catch {
        // Ignore token errors and allow the user to continue in auth pages.
      }

      if (isMounted) setIsCheckingRole(false);
    };

    checkAdminRole();

    return () => {
      isMounted = false;
    };
  }, [user, isUserLoading, router]);

  if (isUserLoading || isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="book">
          <div className="book__pg-shadow"></div>
          <div className="book__pg"></div>
          <div className="book__pg book__pg--2"></div>
          <div className="book__pg book__pg--3"></div>
          <div className="book__pg book__pg--4"></div>
          <div className="book__pg book__pg--5"></div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 p-4">
      {children}
    </main>
  );
}
