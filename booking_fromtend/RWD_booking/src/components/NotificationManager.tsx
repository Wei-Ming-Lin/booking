'use client';

import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration?: number;
}

interface NotificationManagerProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

export default function NotificationManager({
  notifications,
  onRemove,
}: NotificationManagerProps) {
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <Transition
          key={notification.id}
          show={true}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-[-100%] opacity-0"
          enterTo="translate-y-0 opacity-100"
          leave="transition ease-in duration-200"
          leaveFrom="translate-y-0 opacity-100"
          leaveTo="translate-y-[-100%] opacity-0"
        >
          <div 
            className={`min-w-max max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-200 ${
              notification.type === 'success' ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'
            }`}
            style={{
              transform: `translateY(${index * 4}px)`,
              zIndex: 50 - index
            }}
          >
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium whitespace-nowrap ${
                    notification.type === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    className={`bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      notification.type === 'success' ? 'focus:ring-green-500' : 'focus:ring-red-500'
                    }`}
                    onClick={() => onRemove(notification.id)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      ))}
    </div>
  );
} 