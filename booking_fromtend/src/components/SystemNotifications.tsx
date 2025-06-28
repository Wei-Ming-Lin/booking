'use client';

import { useEffect, useState } from 'react';
import { BellIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  content: string;
  level: '低' | '中' | '高';
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

const getLevelStyle = (level: string) => {
  switch (level) {
    case '高':
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        iconColor: 'text-red-500',
        textColor: 'text-red-800',
        contentColor: 'text-red-700'
      };
    case '中':
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        iconColor: 'text-yellow-500',
        textColor: 'text-yellow-800',
        contentColor: 'text-yellow-700'
      };
    case '低':
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-500',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-800',
        contentColor: 'text-blue-700'
      };
    default:
      return {
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-500',
        iconColor: 'text-gray-500',
        textColor: 'text-gray-800',
        contentColor: 'text-gray-700'
      };
  }
};

export default function SystemNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveNotifications();
  }, []);

  const fetchActiveNotifications = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/notifications/active`);
      
      if (!response.ok) {
        throw new Error('獲取通知失敗');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('獲取系統通知失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNotification = (notificationId: string) => {
    setDismissedNotifications(prev => new Set([...Array.from(prev), notificationId]));
  };

  const openNotificationModal = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const closeNotificationModal = () => {
    setSelectedNotification(null);
  };

  // 檢查內容是否需要展開功能（超過3行）
  const isContentLong = (content: string) => {
    const lines = content.split('\n');
    return lines.length > 3 || content.length > 150;
  };

  // 過濾掉已關閉的通知
  const visibleNotifications = notifications.filter(notification => 
    !dismissedNotifications.has(notification.id)
  );

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-3">
        {visibleNotifications.map((notification) => {
          const style = getLevelStyle(notification.level);
          const needsExpansion = isContentLong(notification.content);
          
          return (
            <div
              key={notification.id}
              className={`md:flex-1 md:min-w-0 ${style.bgColor} border-l-4 ${style.borderColor} rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => openNotificationModal(notification)}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <BellIcon className={`h-6 w-6 ${style.iconColor}`} aria-hidden="true" />
                  </div>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${style.textColor} truncate`}>
                        系統公告
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className={`ml-2 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-600 active:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-md p-1 min-h-[32px] min-w-[32px] touch-manipulation`}
                        aria-label="關閉通知"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className={`mt-2 text-sm ${style.contentColor}`}>
                      <p 
                        className="whitespace-pre-line overflow-hidden" 
                        style={needsExpansion ? { 
                          display: '-webkit-box', 
                          WebkitLineClamp: 3, 
                          WebkitBoxOrient: 'vertical' 
                        } : {}}
                      >
                        {notification.content}
                      </p>
                      
                      {needsExpansion && (
                        <div className={`mt-2 text-xs ${style.contentColor} opacity-60`}>
                          點擊查看完整內容...
                        </div>
                      )}
                    </div>
                    
                    {(notification.start_time || notification.end_time) && (
                      <div className={`mt-2 text-xs ${style.contentColor} opacity-80 truncate`}>
                        {notification.start_time && notification.end_time ? (
                          <span>
                            有效期間：{new Date(notification.start_time).toLocaleString('zh-TW')} 至 {new Date(notification.end_time).toLocaleString('zh-TW')}
                          </span>
                        ) : notification.start_time ? (
                          <span>開始時間：{new Date(notification.start_time).toLocaleString('zh-TW')}</span>
                        ) : notification.end_time ? (
                          <span>結束時間：{new Date(notification.end_time).toLocaleString('zh-TW')}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 通知詳情模態框 */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <BellIcon className={`h-6 w-6 ${getLevelStyle(selectedNotification.level).iconColor} mr-2`} />
                <h3 className="text-lg font-medium text-gray-900">系統公告</h3>
                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded ${
                  selectedNotification.level === '高' ? 'bg-red-100 text-red-800' :
                  selectedNotification.level === '中' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedNotification.level}等級
                </span>
              </div>
              <button
                onClick={closeNotificationModal}
                className="text-gray-400 hover:text-gray-600 active:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded-md p-2 touch-manipulation"
                aria-label="關閉"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className={`text-sm ${getLevelStyle(selectedNotification.level).contentColor} whitespace-pre-line leading-6`}>
                {selectedNotification.content}
              </div>
              
              {(selectedNotification.start_time || selectedNotification.end_time) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {selectedNotification.start_time && selectedNotification.end_time ? (
                      <span>
                        有效期間：{new Date(selectedNotification.start_time).toLocaleString('zh-TW')} 至 {new Date(selectedNotification.end_time).toLocaleString('zh-TW')}
                      </span>
                    ) : selectedNotification.start_time ? (
                      <span>開始時間：{new Date(selectedNotification.start_time).toLocaleString('zh-TW')}</span>
                    ) : selectedNotification.end_time ? (
                      <span>結束時間：{new Date(selectedNotification.end_time).toLocaleString('zh-TW')}</span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={closeNotificationModal}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 touch-manipulation min-h-[44px]"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 