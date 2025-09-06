'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Cog6ToothIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '@/store/userStore';
import ThemeToggle from './ThemeToggle';

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
    <nav className="fixed top-0 left-0 right-0 bg-surface dark:bg-dark-bg-primary shadow-md z-50 border-b border-gray-200 dark:border-dark-border">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary dark:text-dark-text-accent">機器預約系統</span>
            </Link>
            
            {/* 查看預約情況按鈕，所有登入用戶都可見 */}
            <Link
              href="/bookings"
              className="flex items-center space-x-1 text-gray-600 dark:text-dark-text-secondary hover:text-primary dark:hover:text-dark-text-accent transition-colors px-3 py-2 rounded-md text-sm font-medium"
            >
              <CalendarDaysIcon className="h-5 w-5" />
              <span>查看預約情況</span>
            </Link>
            
            {/* 管理按鈕，只有管理員和經理可見 */}
            {(isAdmin || isManager) && (
              <Link
                href="/admin"
                className="flex items-center space-x-1 text-gray-600 dark:text-dark-text-secondary hover:text-primary dark:hover:text-dark-text-accent transition-colors px-3 py-2 rounded-md text-sm font-medium"
              >
                <Cog6ToothIcon className="h-5 w-5" />
                <span>管理</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* 主題切換器 */}
            <ThemeToggle />
            
            <Link
              href="/profile"
              className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg px-3 py-2 transition-colors duration-200"
            >
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-transparent dark:ring-dark-text-accent"
                />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-secondary dark:text-dark-text-primary">
                  {session.user?.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  {roleText}
                </span>
              </div>
            </Link>
            <button
              onClick={() => signOut()}
              className="bg-secondary dark:bg-dark-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary-dark dark:hover:bg-dark-accent-dark transition-colors duration-200"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 