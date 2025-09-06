'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface BookingDetail {
  id: string;
  user_email: string;
  time_slot: string;
  status: string;
  machine_id: string;
  created_at: string;
}

interface CancelBookingConfirmationProps {
  bookingDetail: BookingDetail;
  machineName: string;
  onCancel: () => void;
  onConfirm: (bookingId: string) => void;
}

export default function CancelBookingConfirmation({
  bookingDetail,
  machineName,
  onCancel,
  onConfirm,
}: CancelBookingConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(bookingDetail.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 解析並格式化時間顯示
  const getDisplayDateTime = () => {
    try {
      // time_slot 格式: "2025-06-01-08:00"
      const parts = bookingDetail.time_slot.split('-');
      if (parts.length >= 4) {
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const timeStr = parts[3];
        const dateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
        
        const date = format(dateTime, 'yyyy年MM月dd日 (EEEE)', { locale: zhTW });
        const time = format(dateTime, 'HH:mm', { locale: zhTW });
        const endTime = format(new Date(dateTime.getTime() + 4 * 60 * 60 * 1000), 'HH:mm', { locale: zhTW });
        
        return { date, time, endTime };
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return { date: bookingDetail.time_slot, time: '', endTime: '' };
  };

  const { date, time, endTime } = getDisplayDateTime();

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-dark-bg-secondary p-6 text-left align-middle shadow-xl dark:shadow-dark-bg-primary/20 transition-all border dark:border-dark-border">
                {/* 標題區域 */}
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-4"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="ml-3 text-lg font-medium leading-6 text-gray-900 dark:text-dark-text-primary">
                      取消預約確認
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    onClick={onCancel}
                  >
                    <XMarkIcon className="h-6 w-6 text-red-500" />
                  </button>
                </Dialog.Title>

                {/* 警告訊息 */}
                <div className="mt-2 mb-4">
                  <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    您確定要取消以下預約嗎？此操作無法復原。
                  </p>
                </div>

                {/* 預約詳情表格 */}
                <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-4 mb-6">
                  <div className="overflow-hidden">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                            機器名稱
                          </td>
                          <td className="py-2 text-sm text-gray-900 dark:text-dark-text-primary">
                            {machineName}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                            預約日期
                          </td>
                          <td className="py-2 text-sm text-gray-900 dark:text-dark-text-primary">
                            {date}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                            預約時間
                          </td>
                          <td className="py-2 text-sm text-gray-900 dark:text-dark-text-primary">
                            {time} - {endTime} (4小時)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 dark:text-dark-text-secondary whitespace-nowrap">
                            狀態
                          </td>
                          <td className="py-2">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                              {bookingDetail.status === 'active' ? '進行中' : bookingDetail.status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 按鈕區域 */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg-tertiary px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={onCancel}
                  >
                    保留預約
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-md border border-transparent bg-red-600 dark:bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                      isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        取消中...
                      </div>
                    ) : (
                      '確認取消'
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 