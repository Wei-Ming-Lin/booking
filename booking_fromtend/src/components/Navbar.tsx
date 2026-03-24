'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  Bars3Icon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useUserStore } from '@/store/userStore';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { data: session } = useSession();
  const role = useUserStore((state) => state.role);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  if (!session) return null;

  const roleText = (() => {
    switch (role) {
      case 'admin':
        return '管理員';
      case 'manager':
        return '管理者';
      default:
        return '使用者';
    }
  })();

  const navLinks = [
    {
      href: '/bookings',
      label: '預約總覽',
      icon: CalendarDaysIcon,
      show: true,
    },
    {
      href: '/admin',
      label: '後台',
      icon: Cog6ToothIcon,
      show: isAdmin || isManager,
    },
  ].filter((item) => item.show);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-lg dark:shadow-slate-950/30">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link href="/" className="truncate text-base font-bold text-slate-900 sm:text-xl dark:text-sky-200">
              預約系統
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-sky-200"
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />

            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-sky-400/20"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{session.user?.name}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">{roleText}</div>
              </div>
            </Link>

            <button
              onClick={() => signOut()}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-sky-400"
            >
              登出
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-label="切換選單"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-200 py-3 md:hidden dark:border-white/10">
            <div className="flex flex-col gap-2">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}

              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={36}
                    height={36}
                    className="rounded-full ring-2 ring-sky-400/20"
                  />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{session.user?.name}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{roleText}</div>
                </div>
              </Link>

              <button
                onClick={() => signOut()}
                className="rounded-lg bg-sky-500 px-3 py-3 text-left text-sm font-medium text-white transition-colors hover:bg-sky-400"
              >
                登出
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
