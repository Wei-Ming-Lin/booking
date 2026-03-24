'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '@/services/api';
import { useUserStore } from '@/store/userStore';

export default function RoleSync() {
  const { data: session, status } = useSession();
  const setRole = useUserStore((state) => state.setRole);

  useEffect(() => {
    let isActive = true;

    async function syncRole() {
      if (status === 'loading') return;

      if (!session?.user?.email || !session.user.name) {
        setRole(undefined);
        return;
      }

      try {
        const userData = await api.users.createOrGet({
          email: session.user.email,
          name: session.user.name,
        });

        if (isActive) {
          setRole(userData.role as 'user' | 'manager' | 'admin');
        }
      } catch (error) {
        console.error('Failed to sync user role:', error);
      }
    }

    syncRole();

    return () => {
      isActive = false;
    };
  }, [session?.user?.email, session?.user?.name, setRole, status]);

  return null;
}
