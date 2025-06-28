'use client';

import { useState, useCallback, useRef } from 'react';
import { NotificationItem } from '@/components/NotificationManager';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const addNotification = useCallback((
    type: 'success' | 'error',
    message: string,
    duration: number = 3000
  ) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newNotification: NotificationItem = {
      id,
      type,
      message,
      duration,
    };

    setNotifications(prev => [...prev, newNotification]);

    // 設置自動移除定時器
    if (duration > 0) {
      timerRef.current[id] = setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // 清除定時器
    if (timerRef.current[id]) {
      clearTimeout(timerRef.current[id]);
      delete timerRef.current[id];
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    // 清除所有定時器
    Object.values(timerRef.current).forEach(timer => {
      clearTimeout(timer);
    });
    timerRef.current = {};
    
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return addNotification('success', message, duration);
  }, [addNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    return addNotification('error', message, duration);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
  };
} 