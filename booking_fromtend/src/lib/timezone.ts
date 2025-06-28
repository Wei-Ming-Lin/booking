import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// 台北時區
export const TAIPEI_TIMEZONE = 'Asia/Taipei';

/**
 * 將時間轉換為台北時間
 */
export function toTaipeiTime(date: Date): Date {
  return toZonedTime(date, TAIPEI_TIMEZONE);
}

/**
 * 獲取當前台北時間
 */
export function getTaipeiNow(): Date {
  return toTaipeiTime(new Date());
}

/**
 * 格式化台北時間 - 統一的格式化函數
 */
export function formatTaipeiTime(date: Date, formatString: string): string {
  const taipeiTime = toTaipeiTime(date);
  return format(taipeiTime, formatString);
}

// 後端格式化的便利函數（向下兼容）
export const formatTimeSlotForBackend = (date: Date) => formatTaipeiTime(date, 'yyyy/MM/dd/HH');
export const formatDateTimeForBackend = (date: Date) => formatTaipeiTime(date, 'yyyy-MM-dd HH:mm:ss'); 