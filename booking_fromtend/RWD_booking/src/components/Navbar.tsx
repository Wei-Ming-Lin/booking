'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '@/store/userStore';

export default function Navbar() {
  const { data: session } = useSession();
  const role = useUserStore((state) => state.role);
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  if (!session) return null;

  // 根據角色顯示對應的文字
  const roleText = (() => {
    switch (role) {
      case 'admin':
        return '管理員';
      case 'manager':
        return '經理';
      default:
        return '使用者';
    }
  })();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-surface shadow-md z-50">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">機器預約系統</span>
            </Link>
            {/* 管理按鈕，只有管理員和經理可見 */}
            {(isAdmin || isManager) && (
              <Link
                href="/admin"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                <span>管理</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/profile"
              className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors duration-200"
            >
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-secondary">
                  {session.user?.name}
                </span>
                <span className="text-xs text-gray-500">
                  {roleText}
                </span>
              </div>
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-secondary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary-dark transition-colors duration-200"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 