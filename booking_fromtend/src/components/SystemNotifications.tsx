'use client';

import { useState, useEffect } from 'react';
import { BellIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LiquidCard } from './ui/LiquidGlass';

interface Notification {
  id: string;
  content: string;
  level: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

interface NotificationResponse {
  admin_role: string;
  notifications: Notification[];
  total: number;
}

// 自定義滾動條樣式
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
  }
`;

const SystemNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        console.log('Fetching notifications from API...');
        const response = await fetch('https://dev.ntubids.college/notifications/active', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data: NotificationResponse = await response.json();
          console.log('Raw API data:', data);
          
          // 過濾有效的通知（在時間範圍內）
          const currentTime = new Date();
          const validNotifications = data.notifications.filter(notification => {
            const startTime = new Date(notification.start_time);
            const endTime = new Date(notification.end_time);
            const isValid = currentTime >= startTime && currentTime <= endTime;
            console.log(`Notification ${notification.id}: ${isValid ? 'valid' : 'invalid'} (${startTime.toLocaleString()} - ${endTime.toLocaleString()})`);
            return isValid;
          });
          
          console.log('Valid notifications:', validNotifications);
          setNotifications(validNotifications);
        } else {
          console.error('Failed to fetch notifications:', response.status, response.statusText);
          setNotifications([]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const closeDetailModal = () => {
    setSelectedNotification(null);
  };

  const getNotificationIcon = (level: string) => {
    const iconClass = "w-5 h-5 flex-shrink-0 mt-0.5";
    switch (level) {
      case '高':
        return <XCircleIcon className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case '中':
        return <ExclamationTriangleIcon className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case '低':
      default:
        return <InformationCircleIcon className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
    }
  };

  const getNotificationBgColor = (level: string) => {
    switch (level) {
      case '高':
        return 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800';
      case '中':
        return 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800';
      case '低':
      default:
        return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800';
    }
  };

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case '高':
        return 'bg-red-600 text-white dark:bg-red-500';
      case '中':
        return 'bg-amber-600 text-white dark:bg-amber-500';
      case '低':
      default:
        return 'bg-blue-600 text-white dark:bg-blue-500';
    }
  };

  if (isLoading) {
    return (
      <LiquidCard className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <BellIcon className="w-6 h-6 text-primary" />
          <h3 className="font-display font-semibold text-lg text-text-primary dark:text-dark-text-primary">
            系統通知
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-text-secondary">載入通知中...</span>
        </div>
      </LiquidCard>
    );
  }

  // 如果沒有有效通知，不顯示整個組件
  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* 自定義滾動條樣式 */}
      <style jsx>{scrollbarStyles}</style>
      
      {/* 通知網格 - 25%寬度，一行最多4個 */}
      <div className="w-full mb-6">
        <div className="flex items-center gap-3 mb-4">
          <BellIcon className="w-6 h-6 text-primary" />
          <h3 className="font-display font-semibold text-lg text-text-primary dark:text-dark-text-primary">
            系統通知
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {notifications.map((notification) => (
            <LiquidCard
              key={notification.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${getNotificationBgColor(notification.level)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-center justify-between mb-2">
                {getNotificationIcon(notification.level)}
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityBadge(notification.level)}`}>
                  {notification.level}
                </span>
              </div>
              <p className="text-sm text-text-primary dark:text-white line-clamp-3 font-medium">
                {notification.content}
              </p>
            </LiquidCard>
          ))}
        </div>
      </div>

      {/* 詳細通知彈出視窗 */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetailModal}>
          <LiquidCard 
            className="max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                {getNotificationIcon(selectedNotification.level)}
                <h3 className="font-display font-semibold text-lg text-text-primary dark:text-dark-text-primary">
                  系統通知詳情
                </h3>
              </div>
              <button
                onClick={closeDetailModal}
                className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent' }}>
              <div>
                <h4 className="font-medium text-text-primary dark:text-dark-text-primary mb-2">通知內容</h4>
                <p className="text-text-primary dark:text-dark-text-primary whitespace-pre-line break-words">
                  {selectedNotification.content}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-text-secondary">優先級:</span>
                  <span className="ml-2 text-text-primary dark:text-dark-text-primary">{selectedNotification.level}</span>
                </div>
                <div>
                  <span className="font-medium text-text-secondary">開始時間:</span>
                  <span className="ml-2 text-text-primary dark:text-dark-text-primary">
                    {new Date(selectedNotification.start_time).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-secondary">結束時間:</span>
                  <span className="ml-2 text-text-primary dark:text-dark-text-primary">
                    {new Date(selectedNotification.end_time).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-secondary">建立時間:</span>
                  <span className="ml-2 text-text-primary dark:text-dark-text-primary">
                    {new Date(selectedNotification.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </LiquidCard>
        </div>
      )}
    </>
  );
};

export default SystemNotifications;
