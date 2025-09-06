'use client';

import { useTheme } from './ThemeProvider';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    {
      name: '淺色',
      value: 'light' as const,
      icon: SunIcon,
    },
    {
      name: '深色',
      value: 'dark' as const,
      icon: MoonIcon,
    },
    {
      name: '跟隨系統',
      value: 'system' as const,
      icon: ComputerDesktopIcon,
    },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[2];
  const CurrentIcon = currentTheme.icon;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center justify-center w-10 h-10 text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors duration-200">
          <CurrentIcon className="w-5 h-5" />
          <span className="sr-only">切換主題</span>
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-32 origin-top-right bg-white dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg shadow-lg dark:shadow-xl focus:outline-none z-50">
          <div className="py-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              return (
                <Menu.Item key={themeOption.value}>
                  {({ active }) => (
                    <button
                      onClick={() => setTheme(themeOption.value)}
                      className={`
                        ${active ? 'bg-gray-100 dark:bg-dark-bg-tertiary' : ''}
                        ${theme === themeOption.value ? 'text-primary dark:text-dark-text-accent font-medium' : 'text-gray-700 dark:text-dark-text-primary'}
                        group flex w-full items-center px-3 py-2 text-sm transition-colors
                      `}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {themeOption.name}
                    </button>
                  )}
                </Menu.Item>
              );
            })}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
