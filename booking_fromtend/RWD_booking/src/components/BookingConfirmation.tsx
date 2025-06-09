'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Machine, TimeSlot } from '@/types';
import { format, parse } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { api, ApiError } from '@/services/api';
import { useSession } from 'next-auth/react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toTaipeiTime } from '@/lib/timezone';

interface BookingConfirmationProps {
  machine: Machine;
  selectedSlot: any; // 暫時使用 any 來繞過類型問題
  onClose: () => void;
  onBookingSuccess?: () => void; // 新增：預約成功後的回調
  onShowNotification?: (type: 'success' | 'error', message: string) => void; // 新增：顯示通知的回調
}

export default function BookingConfirmation({
  machine,
  selectedSlot,
  onClose,
  onBookingSuccess,
  onShowNotification,
}: BookingConfirmationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session } = useSession();

  const handleConfirm = async () => {
    if (!session?.user?.email) {
      onShowNotification?.('error', '請先登入');
      return;
    }

    setIsSubmitting(true);
    try {
      // 預約前再次檢查機器訪問權限（雙重保護）
      console.log('Pre-booking access check for machine:', machine.id);
      try {
        const accessResult = await api.machines.checkAccess(machine.id, session.user.email);
        if (!accessResult.allowed) {
          console.log('Pre-booking access denied:', accessResult.reason);
          onShowNotification?.('error', `預約失敗：${accessResult.reason || '您沒有權限使用此機器'}`);
          onClose();
          return;
        }
        console.log('Pre-booking access check passed');
      } catch (accessError) {
        console.error('Pre-booking access check failed:', accessError);
        onShowNotification?.('error', '預約失敗：無法驗證機器訪問權限');
        onClose();
        return;
      }

      // 從 selectedSlot.id 解析日期和時間 (格式: "2025-01-01-12:00")
      const parts = selectedSlot.id.split('-');
      
      // 重新組合日期和時間
      const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`; // "2025-01-01"
      const timeStr = parts[3]; // "12:00"
      
      const slotDate = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());

      const requestData = {
        user_email: session.user.email,
        machine_id: machine.id,
        time_slot: slotDate,
      };

      const result = await api.bookings.create(requestData);

      // 使用回調函數顯示成功通知
      onShowNotification?.('success', '預約成功');

      // 預約成功後先關閉彈窗，然後刷新數據
      onClose();
      
      // 稍微延遲後刷新數據，讓用戶看到成功提示
      setTimeout(() => {
        onBookingSuccess?.();
      }, 500);
      
    } catch (error) {
      console.error('預約失敗:', error);
      
      let errorMessage = '預約失敗，請稍後再試';
      
      // 檢查是否為我們的自定義API錯誤
      if (error instanceof ApiError) {
        // 根據錯誤類型提供不同的訊息
        switch (error.error_type) {
          case 'time_slot_occupied':
            errorMessage = '此時段已被預約';
            break;
          case 'usage_limit_exceeded':
            errorMessage = error.message;
            break;
          case 'machine_unavailable':
            errorMessage = error.message;
            break;
          case 'machine_restricted':
            errorMessage = error.message;
            break;
          case 'past_time_slot':
            errorMessage = '無法預約過去的時段';
            break;
          case 'invalid_time_slot':
            errorMessage = '無效的預約時段';
            break;
          case 'machine_not_found':
            errorMessage = '機器不存在';
            break;
          default:
            // 使用後端返回的訊息
            errorMessage = error.message || '預約失敗，請稍後再試';
        }
      } else if (error instanceof Error) {
        // 處理其他類型的錯誤
        errorMessage = error.message || '預約失敗，請稍後再試';
      }
      
      // 使用回調函數顯示失敗通知
      onShowNotification?.('error', `預約失敗\n原因: ${errorMessage}`);
      
      // 預約失敗後也要關閉彈窗並刷新數據
      onClose();
      
      // 稍微延遲後刷新數據，讓用戶看到失敗提示，然後看到最新狀態
      setTimeout(() => {
        onBookingSuccess?.();
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 解析並格式化時間顯示
  const getDisplayDateTime = () => {
    try {
      // selectedSlot.id 格式: "2025-06-01-08:00"
      const parts = selectedSlot.id.split('-');
      if (parts.length >= 4) {
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
        const timeStr = parts[3];
        const dateTime = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
        
        // 確保時間顯示為台北時間
        const taipeiDateTime = toTaipeiTime(dateTime);
        
        const date = format(taipeiDateTime, 'yyyy年MM月dd日 (EEEE)', { locale: zhTW });
        const time = format(taipeiDateTime, 'HH:mm', { locale: zhTW });
        const endTime = format(new Date(taipeiDateTime.getTime() + 4 * 60 * 60 * 1000), 'HH:mm', { locale: zhTW });
        
        return { date, time, endTime };
      }
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    return { date: selectedSlot.id, time: '', endTime: '' };
  };

  const { date, time, endTime } = getDisplayDateTime();

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* 標題區域 */}
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-4"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-green-100">
                      <CheckCircleIcon className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="ml-3 text-lg font-medium leading-6 text-gray-900">
                      確認預約
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6 text-green-500" />
                  </button>
                </Dialog.Title>

                {/* 確認訊息 */}
                <div className="mt-2 mb-4">
                  <p className="text-sm text-gray-500">
                    您即將預約以下時段，請確認預約資訊無誤。
                  </p>
                </div>

                {/* 預約詳情表格 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="overflow-hidden">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                            機器名稱
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {machine.name}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                            預約日期
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {date}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                            預約時間
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {time} - {endTime} (4小時)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                            機器狀態
                          </td>
                          <td className="py-2">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              可使用
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                            使用者
                          </td>
                          <td className="py-2 text-sm text-gray-900">
                            {session?.user?.email}
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
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    重新選擇
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                      isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        預約中...
                      </div>
                    ) : (
                      '確認預約'
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