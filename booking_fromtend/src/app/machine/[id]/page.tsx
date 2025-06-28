'use client';

import BookingConfirmation from '@/components/BookingConfirmation';
import CancelBookingConfirmation from '@/components/CancelBookingConfirmation';
import NotificationManager from '@/components/NotificationManager';
import TimeSlotSelector from '@/components/TimeSlotSelector';
import { TimeSlot, Machine } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { format, addDays, startOfDay, endOfDay, isWithinInterval, addWeeks, subWeeks, startOfWeek, isSameDay, endOfWeek, isBefore, isAfter } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './calendar.css';
import { api } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { useMachineStore } from '@/store/machineStore';
import { useNotifications } from '@/hooks/useNotifications';
import { getTaipeiNow, formatTaipeiTime } from '@/lib/timezone';
import { useSession } from 'next-auth/react';
export const runtime = 'edge';
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        label: '可使用',
        bgColor: 'bg-status-available-bg',
        textColor: 'text-status-available-text',
        borderColor: 'border-status-available-border'
      };
    case 'maintenance':
      return {
        label: '維護模式',
        bgColor: 'bg-status-maintenance-bg',
        textColor: 'text-status-maintenance-text',
        borderColor: 'border-status-maintenance-border'
      };
    case 'limited':
      return {
        label: '限流中',
        bgColor: 'bg-status-limited-bg',
        textColor: 'text-status-limited-text',
        borderColor: 'border-status-limited-border'
      };
    default:
      return {
        label: '未知狀態',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300'
      };
  }
};

export default function MachinePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  
  // 所有 state hooks 必須在任何條件返回之前調用
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(getTaipeiNow()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(startOfDay(getTaipeiNow()));
  const machines = useMachineStore((state) => state.machines);
  const setMachines = useMachineStore((state) => state.setMachines);
  const [isLoading, setIsLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(getTaipeiNow());
  const [nextRefreshCountdown, setNextRefreshCountdown] = useState<number>(10 * 60); // 10分鐘倒計時（秒）
  const [cancelBookingDetail, setCancelBookingDetail] = useState<any>(null); // 要取消的預約詳情
  const [accessDenied, setAccessDenied] = useState<string | null>(null); // 權限檢查結果
  const [accessCheckCompleted, setAccessCheckCompleted] = useState(false); // 新增：權限檢查是否完成
  const [cooldownSlots, setCooldownSlots] = useState<string[]>([]); // 新增：冷卻期時間段
  const [usageInfo, setUsageInfo] = useState<any>(null); // 修改：使用情況信息
  const [machineRestrictions, setMachineRestrictions] = useState<any[]>([]); // 新增：機器限制規則
  
  // 使用新的通知管理系統
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  // 計算日期範圍 - 移到這裡確保在所有條件返回之前調用
  const dateRange = useMemo(() => {
    const now = startOfDay(new Date());
    const maxDate = endOfDay(addDays(now, 59));
    return {
      min: now,
      max: maxDate,
    };
  }, []);

  // 根據 ID 獲取對應的機器資料 - 移到這裡
  const machine = machines.find((m) => m.id === params.id);
  const machineByString = machines.find((m) => String(m.id) === String(params.id));
  const machineByNumber = machines.find((m) => Number(m.id) === Number(params.id));
  const finalMachine = machine || machineByString || machineByNumber;
  
  console.log('Looking for machine with ID:', params.id, 'Type:', typeof params.id);
  console.log('Available machines:', machines.map(m => ({ id: m.id, idType: typeof m.id, name: m.name })));
  console.log('Found machine:', finalMachine);

  // 獲取機器的預約時段
  const fetchBookedSlots = async (showRefreshIndicator = false) => {
    if (finalMachine) {
      try {
        if (showRefreshIndicator) {
          setIsRefreshing(true);
        }
        
        console.log('Fetching booked slots for machine:', finalMachine.id);
        
        // 獲取當前用戶郵箱
        const userEmail = session?.user?.email || '';
        
        const response = await api.bookings.getMachineBookings(finalMachine.id, userEmail);
        console.log('Raw bookings response:', response);
        
        // 處理新的API響應格式
        if (response && typeof response === 'object' && !Array.isArray(response) && 
            'bookedSlots' in response && 'bookingDetails' in response) {
          // 新格式：包含詳細預約信息和冷卻期數據
          const typedResponse = response as any;
          setBookedSlots(typedResponse.bookedSlots || []);
          setBookingDetails(typedResponse.bookingDetails || []);
          setCurrentUserEmail(typedResponse.currentUserEmail || userEmail);
          setCooldownSlots(typedResponse.cooldownSlots || []); // 新增：設置冷卻期時間段
          setUsageInfo(typedResponse.usageInfo || null); // 新增：設置使用情況信息
          console.log('Using new format with booking details and cooldown data');
          console.log('Current user email from API:', typedResponse.currentUserEmail);
          console.log('Cooldown slots:', typedResponse.cooldownSlots);
          console.log('Usage info:', typedResponse.usageInfo);
        } else if (Array.isArray(response)) {
          // 舊格式：只有時間段數組
          const slots = response.map((booking: any) => {
            if (typeof booking === 'object' && booking.time_slot) {
              return booking.time_slot;
            }
            return booking;
          });
          console.log('Final processed slots:', slots);
          setBookedSlots(slots);
          setBookingDetails([]);
          setCooldownSlots([]);
          setUsageInfo(null);
          setCurrentUserEmail(userEmail);
          console.log('Using legacy format - slots only');
        } else {
          console.log('Unknown response format:', response);
          setBookedSlots([]);
          setBookingDetails([]);
          setCooldownSlots([]);
          setUsageInfo(null);
          setCurrentUserEmail(userEmail);
        }
        
        // 更新最後刷新時間
        setLastRefreshTime(getTaipeiNow());
        setNextRefreshCountdown(10 * 60); // 重置10分鐘倒計時
        
      } catch (error) {
        console.error('Failed to fetch booked slots:', error);
        setBookedSlots([]);
        setBookingDetails([]);
      } finally {
        if (showRefreshIndicator) {
          setIsRefreshing(false);
        }
      }
    }
  };

  // 處理預約成功後的刷新
  const handleBookingSuccess = () => {
    console.log('Booking successful, refreshing data...');
    fetchBookedSlots(true); // 重新獲取預約數據，並顯示刷新指示器
  };

  // 處理取消預約
  const handleCancelBooking = async (bookingId: string) => {
    try {
      setIsRefreshing(true);
      console.log('Cancelling booking:', bookingId);
      
      // 獲取當前用戶的郵箱
      if (!currentUserEmail) {
        console.error('No current user email available');
        return;
      }
      
      // 調用取消預約API，傳遞用戶郵箱進行驗證
      await api.bookings.cancel(bookingId, currentUserEmail);
      
      // 刷新預約數據
      fetchBookedSlots();
      
      // 顯示成功通知
      showSuccess('取消預約成功');
      
      console.log('Booking cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      
      let errorMessage = '取消預約失敗，請稍後再試';
      
      // 檢查是否為我們的自定義API錯誤
      if (error instanceof Error && 'error_type' in error) {
        const apiError = error as any;
        
        // 根據錯誤類型提供不同的訊息
        switch (apiError.error_type) {
          case 'booking_not_found':
            errorMessage = '預約不存在';
            break;
          case 'permission_denied':
            errorMessage = '您只能取消自己的預約';
            break;
          case 'invalid_status':
            errorMessage = apiError.message;
            break;
          case 'booking_started':
            errorMessage = '預約時間已開始，無法取消';
            break;
          default:
            errorMessage = apiError.message || '取消預約失敗，請稍後再試';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || '取消預約失敗，請稍後再試';
      }
      
      // 顯示失敗通知
      showError(`取消預約失敗\n原因: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 格式化倒計時顯示
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 顯示取消預約確認對話框
  const handleShowCancelConfirm = (bookingDetail: any) => {
    console.log('Showing cancel confirmation for booking:', bookingDetail);
    setCancelBookingDetail(bookingDetail);
  };

  // 確認取消預約
  const handleConfirmCancel = async (bookingId: string) => {
    try {
      setIsRefreshing(true);
      console.log('Confirming cancellation for booking:', bookingId);
      
      // 獲取當前用戶的郵箱
      if (!currentUserEmail) {
        console.error('No current user email available');
        return;
      }
      
      // 調用取消預約API，傳遞用戶郵箱進行驗證
      await api.bookings.cancel(bookingId, currentUserEmail);
      
      // 關閉確認對話框
      setCancelBookingDetail(null);
      
      // 刷新預約數據
      fetchBookedSlots();
      
      // 顯示成功通知
      showSuccess('取消預約成功');
      
      console.log('Booking cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      
      let errorMessage = '取消預約失敗，請稍後再試';
      
      // 檢查是否為我們的自定義API錯誤
      if (error instanceof Error && 'error_type' in error) {
        const apiError = error as any;
        
        // 根據錯誤類型提供不同的訊息
        switch (apiError.error_type) {
          case 'booking_not_found':
            errorMessage = '預約不存在';
            break;
          case 'permission_denied':
            errorMessage = '您只能取消自己的預約';
            break;
          case 'invalid_status':
            errorMessage = apiError.message;
            break;
          case 'booking_started':
            errorMessage = '預約時間已開始，無法取消';
            break;
          default:
            errorMessage = apiError.message || '取消預約失敗，請稍後再試';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || '取消預約失敗，請稍後再試';
      }
      
      // 顯示失敗通知
      showError(`取消預約失敗\n原因: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 獲取機器限制規則
  const fetchMachineRestrictions = async () => {
    if (finalMachine) {
      try {
        const userEmail = session?.user?.email || '';
        console.log('Fetching machine restrictions for machine:', finalMachine.id);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/machines/${finalMachine.id}/restrictions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': userEmail, // 以管理員身份請求
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          const restrictions = result.restrictions || [];
          setMachineRestrictions(restrictions);
          console.log('Machine restrictions loaded:', restrictions);
        } else {
          // 非管理員或無權限，嘗試從使用狀態API獲取基本限制信息
          console.log('No admin access, trying usage status API...');
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/machines/${finalMachine.id}/usage-status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Email': userEmail,
            },
          });
          
          if (statusResponse.ok) {
            const statusResult = await statusResponse.json();
            if (statusResult.has_usage_limit) {
              // 從使用狀態API構建限制信息
              const usageLimitInfo = {
                restriction_type: 'usage_limit',
                restriction_rule: JSON.stringify({
                  max_usages: statusResult.max_usages,
                  cooldown_period_hours: statusResult.cooldown_period_hours,
                  description: `連續使用${statusResult.max_usages}次後冷卻${statusResult.cooldown_period_slots}個時間段（${statusResult.cooldown_period_hours}小時），期間完全無法使用`
                }),
                is_active: true
              };
              setMachineRestrictions([usageLimitInfo]);
              console.log('Usage limit info from status API:', usageLimitInfo);
            } else {
              setMachineRestrictions([]);
            }
          } else {
            setMachineRestrictions([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch machine restrictions:', error);
        setMachineRestrictions([]);
      }
    }
  };

  const isWeekWithinRange = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    
    // 只要這週有任何一天在允許範圍內，就允許切換
    return (
      isWithinInterval(weekStart, { start: dateRange.min, end: dateRange.max }) ||
      isWithinInterval(weekEnd, { start: dateRange.min, end: dateRange.max }) ||
      (isBefore(weekStart, dateRange.max) && isAfter(weekEnd, dateRange.min))
    );
  };

  const handlePrevWeek = () => {
    const prevWeekDate = addDays(selectedDate, -7);
    if (isWeekWithinRange(prevWeekDate)) {
      setSelectedDate(prevWeekDate);
      setCalendarDate(prevWeekDate);
      setSelectedSlot(null);
    }
  };

  const handleNextWeek = () => {
    const nextWeekDate = addDays(selectedDate, 7);
    if (isWeekWithinRange(nextWeekDate)) {
      setSelectedDate(nextWeekDate);
      setCalendarDate(nextWeekDate);
      setSelectedSlot(null);
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date && isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) {
      const newDate = startOfDay(date);
      setSelectedDate(newDate);
      setCalendarDate(newDate);
      setSelectedSlot(null);
    }
  };

  // 判斷日期是否可選
  const isDateSelectable = (date: Date) => {
    return isWithinInterval(date, {
      start: dateRange.min,
      end: dateRange.max,
    });
  };

  // 獲取日期狀態文字
  const getDateStatusText = (date: Date) => {
    if (isWithinInterval(date, { start: dateRange.min, end: dateRange.max })) {
      return undefined; // 可選擇的日期不需要顯示文字
    }
    return '未開放';
  };

  // 權限檢查
  useEffect(() => {
    async function checkAccess() {
      console.log('=== Access Check Started ===');
      console.log('Session status:', session === undefined ? 'loading' : session === null ? 'not logged in' : 'logged in');
      console.log('Machine ID:', params.id);
      
      const userEmail = session?.user?.email;
      console.log('User email from session:', userEmail);
      
      // 如果session还在加载中，等待加载完成
      if (session === undefined) {
        console.log('Session is still loading, waiting...');
        setAccessCheckCompleted(false);
        return;
      }
      
      // 如果用戶未登入，阻止訪問
      if (session === null || !userEmail) {
        console.log('User not logged in, denying access');
        setAccessDenied('請先登入才能使用此功能');
        setAccessCheckCompleted(true);
        
        setTimeout(() => {
          router.push('/');
        }, 1500);
        return;
      }

      try {
        setAccessCheckCompleted(false); // 開始檢查權限
        console.log('Checking access for machine:', params.id, 'user:', userEmail);
        
        // 第一層檢查：API權限檢查
        const accessResult = await api.machines.checkAccess(params.id, userEmail);
        console.log('API access check result:', accessResult);
        
        if (!accessResult.allowed) {
          console.log('Access denied by API:', accessResult.reason);
          setAccessDenied(accessResult.reason || '您沒有權限使用此機器');
          showError(`無法訪問此機器：${accessResult.reason || '權限不足'}`);
          
          setTimeout(() => {
            router.push('/');
          }, 1500);
          
          setAccessCheckCompleted(true);
          return;
        }
        
        // 第二層檢查：客戶端restrictions檢查（雙重保護）
        console.log('API check passed, performing client-side restrictions check...');
        
        try {
          // 獲取機器及其restrictions資訊
          const machinesWithRestrictions = await api.machines.getAllWithRestrictions(userEmail);
          const targetMachine = machinesWithRestrictions.find(m => 
            String(m.id) === String(params.id) || 
            Number(m.id) === Number(params.id)
          );
          
          if (!targetMachine) {
            console.log('Machine not found in restrictions check');
            setAccessDenied('找不到指定的機器，可能已被移除或ID無效');
            showError('機器不存在或已被移除');
            setTimeout(() => router.push('/'), 2000);
            setAccessCheckCompleted(true);
            return;
          }
          
          // 進行客戶端限制檢查 - 只有在restriction_status為"limited"時才應用限制
          console.log('Machine restriction status:', targetMachine.restriction_status);
          
          if (targetMachine.restriction_status === 'blocked') {
            // 機器完全被阻止
            console.log('Machine is completely blocked');
            setAccessDenied('此機器目前被管理員完全封鎖');
            showError('此機器目前被管理員完全封鎖');
            setTimeout(() => router.push('/'), 2000);
            setAccessCheckCompleted(true);
            return;
          } else if (targetMachine.restriction_status === 'limited' && targetMachine.restrictions && targetMachine.restrictions.length > 0) {
            // 只有在restricted狀態且有限制規則時才檢查限制
            const { checkUserRestrictions } = await import('@/lib/userRestrictions');
            const restrictionCheck = checkUserRestrictions(userEmail, targetMachine.restrictions, targetMachine.restriction_status);
            
            console.log('Client-side restriction check result:', restrictionCheck);
            
            // 只有年份限制等嚴格限制才會阻擋進入，使用次數限制只顯示警告
            if (restrictionCheck.blockedRestrictions.length > 0) {
              const reason = restrictionCheck.reasons[0] || '您無法使用此機器';
              console.log('Access denied by client-side check:', reason);
              setAccessDenied(reason);
              showError(`無法訪問此機器：${reason}`);
              setTimeout(() => router.push('/'), 2000);
              setAccessCheckCompleted(true);
              return;
            }
            
            // 如果有警告限制（如使用次數限制），顯示警告但允許進入
            // if (restrictionCheck.warningRestrictions.length > 0) {
            //   console.log('Warning restrictions detected, allowing access with warning');
            //   showError('注意：此機器有使用限制，詳細信息請查看機器頁面');
            // }
          } else {
            // restriction_status為"none"或沒有限制規則時，不應用任何限制
            console.log('Machine has no restrictions or restriction_status is "none", allowing full access');
          }
          
          console.log('Both API and client-side checks passed');
          
        } catch (clientCheckError) {
          console.error('Client-side restriction check failed:', clientCheckError);
          // 如果客戶端檢查失敗但API檢查通過，給予警告但允許訪問
          showError('權限驗證警告：無法完全驗證機器限制，請注意使用');
        }
        
        // 權限檢查通過
        setAccessDenied(null);
        setAccessCheckCompleted(true);
        console.log('Access granted for machine:', params.id);
      } catch (error) {
        console.error('Access check failed:', error);
        
        // 安全起見：任何權限檢查失敗都直接拒絕訪問
        console.log('API access check failed, denying access for security reasons');
        setAccessDenied('權限驗證失敗，無法確認您的訪問權限');
        showError('權限驗證失敗，請刷新頁面重試或檢查網絡連接');
        
        setTimeout(() => {
          router.push('/');
        }, 2000);
        
        setAccessCheckCompleted(true);
      }
    }

    // 只要session状态有变化就重新检查权限
    checkAccess();
  }, [session, params.id, router, showError]);

  // 如果權限檢查完成但沒有找到機器，且機器列表為空，重新觸發載入
  useEffect(() => {
    if (accessCheckCompleted && !accessDenied && machines.length === 0 && !isLoading) {
      console.log('Access check completed but no machines loaded, triggering load...');
      setIsLoading(true);
    }
  }, [accessCheckCompleted, accessDenied, machines.length, isLoading]);

  // 如果 machines 是空的，就獲取機器列表
  useEffect(() => {
    async function fetchMachines() {
      try {
        console.log('Current machines length:', machines.length);
        if (machines.length === 0) {
          console.log('Fetching machines from API...');
          const userEmail = session?.user?.email;
          const machineList = await api.machines.getAll(userEmail);
          console.log('Fetched machines:', machineList);
          console.log('Machine page - User email:', userEmail);
          setMachines(machineList);
        } else {
          console.log('Using existing machines:', machines);
        }
      } catch (error) {
        console.error('Failed to fetch machines:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // 只有在權限檢查完成後才載入機器列表
    if (accessCheckCompleted && !accessDenied) {
      fetchMachines();
    }
  }, [machines.length, setMachines, session?.user?.email, accessCheckCompleted, accessDenied]);

  // 自動刷新功能 - 每10分鐘更新一次
  useEffect(() => {
    if (!finalMachine?.id) return;

    const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10分鐘（毫秒）
    
    console.log('Setting up auto-refresh every 10 minutes');
    
    const intervalId = setInterval(() => {
      console.log('Auto-refreshing booking data...');
      fetchBookedSlots(true); // 顯示刷新指示器
    }, AUTO_REFRESH_INTERVAL);

    // 清理函數：組件卸載時清除定時器
    return () => {
      console.log('Clearing auto-refresh interval');
      clearInterval(intervalId);
    };
  }, [finalMachine?.id]);

  // 倒計時更新 - 每秒更新一次
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setNextRefreshCountdown(prev => {
        if (prev <= 1) {
          return 10 * 60; // 重置為10分鐘
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  // 頁面可見性變化時刷新（當用戶切換回標籤頁時）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && finalMachine?.id) {
        // 頁面變為可見時，檢查是否需要刷新
        const timeSinceLastRefresh = (new Date().getTime() - lastRefreshTime.getTime()) / 1000;
        if (timeSinceLastRefresh > 5 * 60) { // 如果超過5分鐘沒刷新
          console.log('Page became visible, refreshing data...');
          fetchBookedSlots(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [finalMachine?.id, lastRefreshTime]);

  useEffect(() => {
    fetchBookedSlots();
  }, [finalMachine?.id]);

  // 當選中日期改變時，重新獲取預約數據
  useEffect(() => {
    if (finalMachine?.id) {
      console.log('Selected date changed, refreshing booking data...');
      fetchBookedSlots(false); // 不顯示刷新指示器，避免過於頻繁的視覺變化
    }
  }, [selectedDate, finalMachine?.id]);

  // 獲取機器限制規則
  useEffect(() => {
    fetchMachineRestrictions();
  }, [finalMachine?.id]);

  // 如果權限檢查未完成，顯示載入狀態
  if (!accessCheckCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">驗證權限中</h1>
            <p className="text-gray-600">正在檢查您的訪問權限，請稍候...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果權限被拒絕，顯示錯誤頁面
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">訪問被拒絕</h1>
            <p className="text-gray-600 mb-6">{accessDenied}</p>
            <div className="text-sm text-gray-500 mb-4">
              正在返回首頁...
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              立即返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 如果還在載入中或權限檢查未完成，顯示載入頁面
  if (isLoading || !accessCheckCompleted) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-muted">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="ml-4 text-text-secondary">
              {!accessCheckCompleted ? '檢查權限中...' : (isLoading ? '載入機器資料中...' : '載入中...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!finalMachine) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-muted">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-text-primary mb-4">找不到機器</h1>
            <p className="text-text-secondary mb-4">
              抱歉，找不到ID為 {params.id} 的機器。
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-primary text-white hover:bg-primary-dark focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-20 pb-10 bg-muted">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* 機器資訊 */}
        <div className="bg-surface rounded-lg shadow-sm p-6 mb-8 transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-text-primary group">
                  {finalMachine.name}
                  <div className="h-0.5 w-0 group-hover:w-full bg-secondary transition-all duration-300" />
                </h1>
                {/* 狀態標籤 */}
                {(() => {
                  const statusConfig = getStatusConfig(finalMachine.status);
                  return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                      {statusConfig.label}
                    </span>
                  );
                })()}
              </div>
              <p className="text-text-secondary whitespace-pre-line">{finalMachine.description}</p>
              
              {/* 維護模式說明 */}
              {finalMachine.status === 'maintenance' && (
                <div className="mt-4 bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium text-amber-800">維護模式</span>
                  </div>
                  <p className="text-amber-700 text-sm mt-2">
                    此機器目前處於維護模式，仍可正常預約使用。管理員可能會預約特定時段進行維護工作，請留意相關通知。
                  </p>
                </div>
              )}
              
              {/* 機器限制規則說明 - 只有在 restriction_status 為 "limited" 時才顯示 */}
              {finalMachine.restriction_status === 'limited' && machineRestrictions && machineRestrictions.length > 0 && (
                <div className="mt-6">
                  {machineRestrictions.map((restriction, index) => {
                    // 檢查限制是否在當前時間生效
                    const isActiveNow = (() => {
                      if (!restriction.start_time || !restriction.end_time) {
                        return restriction.is_active; // 如果沒有時間限制，只看 is_active 狀態
                      }

                      const now = new Date();
                      const startTime = new Date(restriction.start_time);
                      const endTime = new Date(restriction.end_time);

                      // 檢查當前時間是否在限制的有效時間範圍內
                      return restriction.is_active && now >= startTime && now <= endTime;
                    })();

                    // 如果限制未生效或不活躍，不顯示
                    if (!isActiveNow || restriction.restriction_type !== 'usage_limit') {
                      return null;
                    }

                    try {
                      const rule = typeof restriction.restriction_rule === 'string' 
                        ? JSON.parse(restriction.restriction_rule) 
                        : restriction.restriction_rule;
                      
                      // 檢查是否是新的滾動窗口格式
                      if (rule.restriction_type === 'rolling_window_limit') {
                        return (
                          <div key={index} className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              滾動窗口使用限制
                            </h3>
                            <div className="text-green-700 space-y-2">
                              <p className="font-medium">
                                {rule.description || `任意連續${rule.window_size}個時段內，最多只能預約${rule.max_bookings}次`}
                              </p>
                              <div className="text-sm text-green-600 bg-green-100 rounded p-2">
                                <div>• 滾動窗口大小：<span className="font-medium">{rule.window_size} 個時段</span> （{rule.window_size * 4} 小時）</div>
                                <div>• 窗口內最大預約：<span className="font-medium">{rule.max_bookings} 次</span></div>
                                <div>• 限制類型：<span className="font-medium">滾動窗口（更公平的限制機制）</span></div>
                              </div>
                              <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                                <strong>說明：</strong>系統會檢查任意連續{rule.window_size}個時段內的預約次數，
                                如果達到{rule.max_bookings}次上限則暫時無法預約，直到滾動窗口內的預約次數降低。
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // 舊格式的顯示（為了兼容性保留）
                        return (
                          <div key={index} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center">
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              使用限制規則（舊格式）
                            </h3>
                            <div className="text-amber-700 space-y-2">
                              <p className="font-medium">
                                {rule.description || `連續使用${rule.max_usages}次後需要冷卻${Math.ceil(rule.cooldown_period_hours / 4)}個時間段（${rule.cooldown_period_hours}小時）`}
                              </p>
                              <div className="text-sm text-amber-600 bg-amber-100 rounded p-2">
                                <div>• 連續使用上限：<span className="font-medium">{rule.max_usages} 次</span></div>
                                <div>• 冷卻期時長：<span className="font-medium">{rule.cooldown_period_hours} 小時</span></div>
                                <div>• 冷卻期間：<span className="font-medium">完全無法預約使用</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } catch (parseError) {
                      console.error('Error parsing restriction rule:', parseError);
                      return null;
                    }
                  })}
                </div>
              )}
              
              {/* 使用狀態信息 - 只有在 restriction_status 為 "limited" 時才顯示 */}
              {finalMachine.restriction_status === 'limited' && usageInfo && usageInfo.has_usage_limit && (
                <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    使用限制信息
                  </h3>
                  <div className="space-y-3">
                    <div className="text-blue-800">
                      連續使用上限：
                      <span className="font-medium text-blue-900">{usageInfo.max_usages} 次</span>
                    </div>
                    <div className="text-blue-800">
                      達到上限後冷卻期：
                      <span className="font-medium text-blue-900">{usageInfo.cooldown_period_slots} 個時間段 ({usageInfo.cooldown_period_hours || (usageInfo.cooldown_period_slots * 4)} 小時)</span>
                    </div>
                    
                    {cooldownSlots && cooldownSlots.length > 0 && (
                      <div className="mt-3 p-3 rounded-md bg-orange-100 border border-orange-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-orange-800">部分時間段處於冷卻期</span>
                        </div>
                        <p className="text-orange-700 text-xs mt-2">
                          您已達到連續使用上限，接下來 {cooldownSlots.length} 個時間段將顯示為"冷卻"狀態，無法預約
                        </p>
                        <p className="text-orange-700 text-xs mt-1">
                          冷卻期過後您可以重新開始預約使用
                        </p>
                      </div>
                    )}
                    
                    {(!cooldownSlots || cooldownSlots.length === 0) && usageInfo.usage_info && (
                      <div className="mt-3 p-3 rounded-md bg-green-100 border border-green-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-green-800">可以正常使用</span>
                        </div>
                        {usageInfo.usage_info.consecutive_usage_count !== undefined && (
                          <p className="text-green-700 text-xs mt-2">
                            當前連續使用次數：{usageInfo.usage_info.consecutive_usage_count} / {usageInfo.max_usages}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 預約區塊 */}
        <div className="bg-surface rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-text-primary mb-6 relative inline-block">
            選擇預約時段
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
          </h2>
          
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 選擇日期區塊 */}
            <div className="w-full lg:w-1/4">
              <div className="bg-surface rounded-lg border border-primary/20 p-4 transition-all duration-300 hover:border-primary hover:shadow-md">
                <h3 className="text-lg font-medium text-text-primary mb-4 relative inline-block group">
                  選擇日期
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                </h3>
                <div className="calendar-container">
                  <DatePicker
                    key={selectedDate.getTime()}
                    selected={selectedDate}
                    onChange={handleDateChange}
                    minDate={dateRange.min}
                    maxDate={dateRange.max}
                    dateFormat="yyyy年MM月dd日 (EEEE)"
                    locale={zhTW}
                    inline
                    calendarStartDay={1}
                    showWeekNumbers={false}
                    openToDate={selectedDate}
                    dayClassName={(date) => {
                      const normalizedDate = startOfDay(date);
                      const normalizedSelectedDate = startOfDay(selectedDate);
                      
                      if (!isWithinInterval(normalizedDate, { start: dateRange.min, end: dateRange.max })) {
                        return "text-gray-300";
                      }
                      if (isSameDay(normalizedDate, normalizedSelectedDate)) {
                        return "bg-primary text-white hover:bg-primary-dark rounded";
                      }
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      if (isWeekend) {
                        return "text-red-500";
                      }
                      return "";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 時段選擇區塊 - 在手機版時會在下方 */}
            <div className="w-full lg:w-3/4">
              <div className="bg-surface rounded-lg border border-primary/20 p-4 transition-all duration-300 hover:border-primary hover:shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-text-primary relative inline-block group">
                    可用時段
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
                  </h3>
                  <div className="flex items-center gap-4">
                    {isRefreshing && (
                      <div className="flex items-center text-primary">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm">更新中...</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      <div>最後更新：{formatTaipeiTime(lastRefreshTime, 'HH:mm:ss')}</div>
                      <div>下次更新：{formatCountdown(nextRefreshCountdown)}</div>
                    </div>
                    <button
                      onClick={() => fetchBookedSlots(true)}
                      disabled={isRefreshing}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md transition-all duration-200 hover:bg-gray-50 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      title="手動刷新預約狀態"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={handlePrevWeek}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md transition-all duration-200 hover:bg-gray-50 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                      disabled={!isWeekWithinRange(addDays(selectedDate, -7))}
                    >
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 transform transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        上一週
                      </span>
                    </button>
                    <div className="text-sm text-gray-600 font-medium">
                      {format(selectedDate, 'yyyy年MM月', { locale: zhTW })}
                    </div>
                    <button
                      onClick={handleNextWeek}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-surface border border-gray-300 rounded-md transition-all duration-200 hover:bg-gray-50 hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                      disabled={!isWeekWithinRange(addDays(selectedDate, 7))}
                    >
                      <span className="flex items-center">
                        下一週
                        <svg className="w-4 h-4 ml-1 transform transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
                <TimeSlotSelector
                  selectedDate={selectedDate}
                  onSelect={setSelectedSlot}
                  bookedSlots={bookedSlots}
                  bookingDetails={bookingDetails}
                  currentUserEmail={currentUserEmail}
                  onShowCancelConfirm={handleShowCancelConfirm}
                  dateRange={dateRange}
                  cooldownSlots={cooldownSlots}
                  usageInfo={usageInfo}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 預約確認 Modal */}
      {selectedSlot && (
        <BookingConfirmation
          machine={finalMachine}
          selectedSlot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onBookingSuccess={handleBookingSuccess}
          onShowNotification={(type, message) => {
            if (type === 'success') {
              showSuccess(message);
            } else {
              showError(message);
            }
          }}
        />
      )}

      {/* 取消預約確認 Modal */}
      {cancelBookingDetail && (
        <CancelBookingConfirmation
          bookingDetail={cancelBookingDetail}
          machineName={finalMachine.name}
          onCancel={() => setCancelBookingDetail(null)}
          onConfirm={handleConfirmCancel}
        />
      )}

      {/* 通知管理器 */}
      <NotificationManager
        notifications={notifications}
        onRemove={removeNotification}
      />
    </main>
  );
} 