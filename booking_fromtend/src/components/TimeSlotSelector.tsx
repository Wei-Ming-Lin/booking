'use client';

import { TimeSlot } from '@/types';
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { getTaipeiNow } from '@/lib/timezone';

interface TimeSlotSelectorProps {
  selectedDate: Date;
  onSelect: (slot: TimeSlot | any) => void;
  bookedSlots?: string[];
  bookingDetails?: any[];
  currentUserEmail?: string;
  onShowCancelConfirm?: (bookingDetail: any) => void;
  cooldownSlots?: string[];
  usageInfo?: any;
  dateRange: {
    min: Date;
    max: Date;
  };
}

const TIME_SLOTS = [
  { time: '凌晨 12:00', value: '00:00' },
  { time: '凌晨 4:00', value: '04:00' },
  { time: '早上 8:00', value: '08:00' },
  { time: '中午 12:00', value: '12:00' },
  { time: '下午 4:00', value: '16:00' },
  { time: '晚上 8:00', value: '20:00' },
];

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

  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => startOfDay(addDays(start, index)));
  }, [selectedDate]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedDate]);

  const getSlotDateRange = (date: Date, value: string) => {
    const start = startOfDay(date);
    const [hours] = value.split(':').map(Number);
    start.setHours(hours, 0, 0, 0);

    const end = new Date(start);
    end.setHours(hours + 4, 0, 0, 0);

    return { start, end };
  };

  const handleSlotClick = (date: Date, timeSlot: { time: string; value: string }) => {
    const now = getTaipeiNow();
    const { start, end } = getSlotDateRange(date, timeSlot.value);

    // 只要時段還沒結束，就允許預約當前區塊
    if (isBefore(end, now) || end.getTime() <= now.getTime()) return;
    if (!isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) return;

    if (cooldownSlots?.includes(`${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`)) {
      return;
    }

    const slotId = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;

    if (bookedSlots.includes(slotId)) {
      const bookingDetail = bookingDetails.find((detail: any) => detail.time_slot === slotId);
      if (!bookingDetail) return;

      const bookingUserEmail = (bookingDetail.user_email || '').trim().toLowerCase();
      const currentEmail = (currentUserEmail || '').trim().toLowerCase();
      const isOwnBooking = bookingUserEmail === currentEmail && currentEmail !== '';

      if (isOwnBooking && onShowCancelConfirm) {
        onShowCancelConfirm(bookingDetail);
      }
      return;
    }

    setSelectedSlotId(slotId);
    onSelect({
      id: slotId,
      machineId: '1',
      startTime: timeSlot.value,
      endTime: format(end, 'HH:mm'),
      isBooked: false,
      status: '可預約',
    });
  };

  const getSlotStatus = (date: Date, timeSlot: { time: string; value: string }) => {
    const now = getTaipeiNow();
    const { end } = getSlotDateRange(date, timeSlot.value);
    const slotId = `${format(date, 'yyyy-MM-dd')}-${timeSlot.value}`;

    if (!isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) {
      return { status: '不可選', disabled: true, isOwnBooking: false, isOthersBooking: false };
    }

    if (isBefore(end, now) || end.getTime() <= now.getTime()) {
      return { status: '已過期', disabled: true, isOwnBooking: false, isOthersBooking: false };
    }

    if (cooldownSlots?.includes(slotId)) {
      return { status: '冷卻中', disabled: true, isOwnBooking: false, isOthersBooking: false };
    }

    if (bookedSlots.includes(slotId)) {
      const bookingDetail = bookingDetails.find((detail: any) => detail.time_slot === slotId);
      if (!bookingDetail) {
        return { status: '已預約', disabled: true, isOwnBooking: false, isOthersBooking: false };
      }

      const bookingUserEmail = (bookingDetail.user_email || '').trim().toLowerCase();
      const currentEmail = (currentUserEmail || '').trim().toLowerCase();
      const isOwnBooking = bookingUserEmail === currentEmail && currentEmail !== '';

      if (isOwnBooking) {
        return {
          status: '我的預約',
          disabled: false,
          isOwnBooking: true,
          isOthersBooking: false,
          bookingId: bookingDetail.id,
        };
      }

      return {
        status: bookingDetail.user_display_name || '已預約',
        disabled: true,
        isOwnBooking: false,
        isOthersBooking: true,
      };
    }

    return { status: '可預約', disabled: false, isOwnBooking: false, isOthersBooking: false };
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
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
                <div className="text-xs text-gray-500 dark:text-dark-text-secondary">
                  {format(date, 'EEEE', { locale: zhTW })}
                </div>
              </div>
            );
          })}
        </div>

        {TIME_SLOTS.map((timeSlot) => (
          <div key={timeSlot.value} className="grid grid-cols-8 gap-2 mb-2">
            <div className="py-2 text-sm text-gray-500 dark:text-dark-text-secondary">{timeSlot.time}</div>
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
                    relative rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200
                    ${
                      disabled
                        ? status === '冷卻中'
                          ? 'cursor-not-allowed border-2 border-orange-300 bg-orange-100 text-orange-600 dark:border-orange-500 dark:bg-orange-900/30 dark:text-orange-300'
                          : isOwnBooking
                          ? 'cursor-pointer border-2 border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                          : isOthersBooking
                          ? 'cursor-not-allowed border-2 border-red-200 bg-red-50 text-red-600 dark:border-red-400 dark:bg-red-900/30 dark:text-red-300'
                          : 'cursor-not-allowed border-2 border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-500'
                        : isSelected
                        ? 'scale-105 border-2 border-primary bg-primary text-white shadow-lg ring-2 ring-primary/30 ring-offset-1 dark:border-dark-accent dark:bg-dark-accent dark:ring-dark-accent/50 dark:ring-offset-dark-bg-secondary'
                        : 'border-2 border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-primary hover:bg-gray-50 hover:text-primary hover:shadow-md dark:border-dark-accent/30 dark:bg-dark-bg-tertiary dark:text-dark-text-primary dark:hover:border-dark-accent dark:hover:bg-dark-bg-secondary dark:hover:text-dark-accent dark:hover:shadow-dark-accent/20'
                    }
                  `}
                  title={isOthersBooking ? `由 ${status} 預約` : status}
                >
                  <span className="relative z-10 leading-tight">{status}</span>
                  {status === '冷卻中' && (
                    <div className="absolute inset-0 rounded-lg bg-orange-200 opacity-30 dark:bg-orange-600/20" />
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {usageInfo?.has_usage_limit && (
          <div className="mt-4 text-xs text-gray-500 dark:text-dark-text-secondary">
            目前機器有使用次數限制，部分時段可能因冷卻規則而無法預約。
          </div>
        )}
      </div>
    </div>
  );
}
