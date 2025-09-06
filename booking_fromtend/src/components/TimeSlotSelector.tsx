'use client';

import { TimeSlot } from '@/types';
import { format, startOfWeek, addDays, isSameDay, isAfter, isBefore, startOfDay, isWithinInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useState, useMemo, useEffect } from 'react';
import { getTaipeiNow } from '@/lib/timezone';

interface TimeSlotSelectorProps {
  selectedDate: Date;
  onSelect: (slot: any) => void; // 暫時使用 any
  bookedSlots?: string[];
  bookingDetails?: any[]; // 新增：詳細預約信息
  currentUserEmail?: string; // 新增：當前用戶郵箱
  onShowCancelConfirm?: (bookingDetail: any) => void; // 新增：顯示取消確認對話框
  cooldownSlots?: string[]; // 修改：直接從後端獲取的冷卻期時間段
  usageInfo?: any; // 修改：從後端獲取的使用情況信息
  dateRange: {
    min: Date;
    max: Date;
  };
}

export default function TimeSlotSelector({
  selectedDate,
  onSelect,
  bookedSlots = [],
  bookingDetails = [],
  currentUserEmail,
  onShowCancelConfirm,
  cooldownSlots,
  usageInfo,
  dateRange,
}: TimeSlotSelectorProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // 生成一週的日期，從週一開始
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // 從週一開始
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return startOfDay(date); // 確保每個日期都是從當天開始
    });
  }, [selectedDate]);

  // 當選擇的日期改變時，清除已選擇的時段
  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedDate]);

  // 生成固定的時段
  const timeSlots = [
    { time: '上午12:00', value: '00:00' },
    { time: '上午4:00', value: '04:00' },
    { time: '上午8:00', value: '08:00' },
    { time: '下午12:00', value: '12:00' },
    { time: '下午4:00', value: '16:00' },
    { time: '下午8:00', value: '20:00' },
  ];

  const handleSlotClick = (date: Date, timeSlot: { time: string; value: string }) => {
    const now = getTaipeiNow(); // 使用台北時間
    const slotDate = startOfDay(date); // 確保使用當天開始時間
    const [hours] = timeSlot.value.split(':').map(Number);
    slotDate.setHours(hours, 0, 0, 0);

    // 如果時段已過或超出範圍，則不允許點擊
    if (isBefore(slotDate, now)) return;
    if (!isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) return;

    // 檢查特定時間段是否在冷卻期內
    if (cooldownSlots && Array.isArray(cooldownSlots)) {
      // 轉換當前時間段為後端格式 (YYYY-MM-DD-HH:MM)
      const backendSlotFormat = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;
      
      if (cooldownSlots.includes(backendSlotFormat)) {
        return;
      }
    }

    const slotId = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;
    
    // 檢查是否是已預約的時段
    if (bookedSlots.includes(slotId)) {
      // 查找是否是自己的預約
      const bookingDetail = bookingDetails.find((detail: any) => 
        detail.time_slot === slotId
      );
      
      if (bookingDetail) {
        // 強化用戶郵箱比較 - 去除空格並轉為小寫
        const bookingUserEmail = (bookingDetail.user_email || '').trim().toLowerCase();
        const currentEmail = (currentUserEmail || '').trim().toLowerCase();
        const isOwnBooking = bookingUserEmail === currentEmail && currentEmail !== '';
        
        if (isOwnBooking) {
          // 是自己的預約，可以取消
          if (onShowCancelConfirm && bookingDetail) {
            onShowCancelConfirm(bookingDetail);
          }
          return;
        } else {
          // 不是自己的預約，不能點擊
          return;
        }
      } else {
        // 沒有找到詳細信息，為安全起見，拒絕點擊
        return;
      }
    }

    // 計算結束時間（4小時後）
    const endDate = new Date(slotDate);
    endDate.setHours(hours + 4, 0, 0, 0);

    setSelectedSlotId(slotId);
    onSelect({
      id: slotId,
      machineId: '1',
      startTime: timeSlot.value,
      endTime: format(endDate, 'HH:mm'),
      isBooked: false,
      status: '可預約'
    });
  };

  const getSlotStatus = (date: Date, timeSlot: { time: string; value: string }) => {
    const now = new Date();
    const slotDate = startOfDay(date); // 確保使用當天開始時間
    const [hours] = timeSlot.value.split(':').map(Number);
    slotDate.setHours(hours, 0, 0, 0);

    // 修正格式：確保與後端返回的格式一致 "YYYY-MM-DD-HH:MM"
    const slotId = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;

    if (!isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) {
      return { status: '未開放', disabled: true, isOwnBooking: false, isOthersBooking: false };
    }
    if (isBefore(slotDate, now)) {
      return { status: '已過期', disabled: true, isOwnBooking: false, isOthersBooking: false };
    }
    
    // 檢查特定時間段是否在冷卻期內
    if (cooldownSlots && Array.isArray(cooldownSlots)) {
      // 轉換當前時間段為後端格式 (YYYY-MM-DD-HH:MM)
      const backendSlotFormat = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;
      
      if (cooldownSlots.includes(backendSlotFormat)) {
        return { status: '冷卻', disabled: true, isOwnBooking: false, isOthersBooking: false };
      }
    }
    
    // 檢查是否已被預約
    if (bookedSlots.includes(slotId)) {
      // 查找詳細預約信息
      const bookingDetail = bookingDetails.find((detail: any) => 
        detail.time_slot === slotId
      );
      
      if (bookingDetail) {
        // 強化用戶郵箱比較 - 去除空格並轉為小寫
        const bookingUserEmail = (bookingDetail.user_email || '').trim().toLowerCase();
        const currentEmail = (currentUserEmail || '').trim().toLowerCase();
        const isOwnBooking = bookingUserEmail === currentEmail && currentEmail !== '';
        
        if (isOwnBooking) {
          return { 
            status: '已預約(可取消)', 
            disabled: false, // 自己的預約可以點擊取消
            isOwnBooking: true,
            isOthersBooking: false,
            bookingId: bookingDetail.id
          };
        } else {
          // 顯示其他用戶的格式化姓名
          const displayName = bookingDetail.user_display_name || '已預約';
          return { 
            status: displayName, 
            disabled: true, // 別人的預約不能點擊
            isOwnBooking: false,
            isOthersBooking: true
          };
        }
      } else {
        // 沒有找到詳細信息，為安全起見，設為不可點擊
        return { status: '已預約', disabled: true, isOwnBooking: false, isOthersBooking: false };
      }
    }
    
    return { status: '可預約', disabled: false, isOwnBooking: false, isOthersBooking: false };
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* 標題列 */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          <div className="font-medium text-gray-500 dark:text-dark-text-secondary">時段</div>
          {weekDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <div
                key={date.toISOString()}
                className={`text-center transition-all duration-300 ${
                  isSelected ? 'text-primary dark:text-dark-accent font-bold scale-105' : 'text-gray-900 dark:text-dark-text-primary'
                }`}
              >
                <div className="text-sm">{format(date, 'M/d')}</div>
                <div className="text-xs text-gray-500 dark:text-dark-text-secondary">{format(date, 'EEEE', { locale: zhTW })}</div>
              </div>
            );
          })}
        </div>

        {/* 時段格線 */}
        {timeSlots.map((timeSlot) => (
          <div key={timeSlot.value} className="grid grid-cols-8 gap-2 mb-2">
            <div className="text-sm text-gray-500 dark:text-dark-text-secondary py-2">
              {timeSlot.time}
            </div>
            {weekDates.map((date) => {
              const statusInfo = getSlotStatus(date, timeSlot);
              const { status, disabled, isOwnBooking, isOthersBooking } = statusInfo;
              const slotId = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;
              const isSelected = slotId === selectedSlotId;

              return (
                <button
                  key={`${date.toISOString()}-${timeSlot.value}`}
                  onClick={() => handleSlotClick(date, timeSlot)}
                  disabled={disabled}
                  className={`
                    relative py-2 px-4 rounded-lg text-xs font-medium
                    transform transition-all duration-200
                    ${
                      disabled
                        ? status === '冷卻'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 cursor-not-allowed hover:shadow-none border-2 border-orange-300 dark:border-orange-500'
                          : isOwnBooking
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/40 border-2 border-blue-300 dark:border-blue-400'
                          : isOthersBooking
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 cursor-not-allowed hover:shadow-none border-2 border-red-200 dark:border-red-400'
                          : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed hover:shadow-none border-2 border-gray-200 dark:border-gray-600'
                        : isSelected
                        ? 'bg-primary dark:bg-dark-accent text-white border-2 border-primary dark:border-dark-accent ring-2 ring-primary/30 dark:ring-dark-accent/50 ring-offset-1 dark:ring-offset-dark-bg-secondary scale-105 hover:bg-primary-dark dark:hover:bg-dark-accent-dark shadow-lg dark:shadow-dark-accent/25'
                        : 'bg-white dark:bg-dark-bg-tertiary border-2 border-gray-200 dark:border-dark-accent/30 hover:border-primary dark:hover:border-dark-accent hover:text-primary dark:hover:text-dark-accent hover:shadow-md dark:hover:shadow-dark-accent/20 hover:-translate-y-0.5 text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-bg-secondary'
                    }
                  `}
                  title={isOthersBooking ? `已被 ${status} 預約` : status}
                >
                  <span className="relative z-10 leading-tight">{status}</span>
                  {status === '冷卻' && (
                    <div className="absolute inset-0 bg-orange-200 dark:bg-orange-600/20 opacity-30 rounded-lg"></div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 