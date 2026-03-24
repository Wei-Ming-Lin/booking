'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CalendarDaysIcon, 
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import { useMachineStore } from '@/store/machineStore';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface BookingWithMachine {
  id: string;
  user_email: string;
  user_display_name?: string;
  machine_id: string;
  machine_name?: string;
  time_slot: string;
  status: 'active' | 'cancelled';
  created_at: string;
}

export default function BookingsPage() {
  const { data: session } = useSession();
  const machines = useMachineStore((state) => state.machines);
  const setMachines = useMachineStore((state) => state.setMachines);
  
  const [bookings, setBookings] = useState<BookingWithMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<{date: Date, bookings: BookingWithMachine[]} | null>(null);

  // 載入機器列表
  useEffect(() => {
    async function fetchMachines() {
      if (machines.length === 0) {
        try {
          const machineList = await api.machines.getAll();
          setMachines(machineList);
        } catch (error) {
          console.error('Failed to fetch machines:', error);
        }
      }
    }
    fetchMachines();
  }, [machines.length, setMachines]);

  // 不強制選擇所有機器 - 允許用戶自由選擇（包括選擇0個機器）

  // 載入指定月份的所有機器預約
  useEffect(() => {
    async function fetchMonthlyBookings() {
      if (!session?.user?.email) return;
      
            try {
        setIsLoading(true);
        
        // 如果沒有選擇任何機器，設為空陣列
        if (selectedMachines.size === 0) {
          setBookings([]);
          return;
        }

        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const startDate = format(monthStart, 'yyyy-MM-dd');
        const endDate = format(monthEnd, 'yyyy-MM-dd');
        
        console.log(`Loading bookings for ${startDate} to ${endDate}`);
        console.log('Selected machines:', Array.from(selectedMachines));
        
        // 使用日曆專用API獲取預約資料（包含格式化用戶姓名）
        const response = await api.bookings.getCalendarViewBookings({
          startDate,
          endDate,
          machineIds: selectedMachines.size > 0 ? Array.from(selectedMachines) : undefined
        });
        
        console.log(`Total bookings loaded: ${response.total}`);
        
        // 轉換API回傳格式為前端需要的格式
        const formattedBookings: BookingWithMachine[] = response.bookings.map(booking => ({
          id: booking.id,
          user_email: booking.user_email,  // 這裡是 'hidden'
          user_display_name: booking.user_display_name,  // 格式化的姓名如 '趙O勳'
          machine_id: booking.machine_id,
          machine_name: booking.machine_name,
          time_slot: booking.time_slot,
          status: booking.status as 'active' | 'cancelled',
          created_at: booking.created_at
        }));
        
        setBookings(formattedBookings);
      } catch (error) {
        console.error('Failed to fetch machine bookings:', error);
        setError('無法載入預約資料');
        setBookings([]); // 設為空陣列
      } finally {
        setIsLoading(false);
      }
    }

    // 載入預約（不論有沒有選擇機器）
    fetchMonthlyBookings();
  }, [session?.user?.email, selectedDate, selectedMachines]);

  // 取消預約
  const handleCancelBooking = async (bookingId: string) => {
    if (!session?.user?.email) return;
    
    try {
      setCancellingBookingId(bookingId);
      await api.bookings.cancel(bookingId, session.user.email);
      
      // 更新本地狀態
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' as const }
          : booking
      ));
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('取消預約失敗，請稍後再試');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // 解析時間槽格式
  const parseTimeSlot = (timeSlot: string): Date => {
    // 處理新格式 "YYYY-MM-DD-HH:MM"
    if (timeSlot.includes('-') && timeSlot.split('-').length >= 3) {
      const [year, month, day, time] = timeSlot.split('-');
      const [hour, minute] = (time || '00:00').split(':');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute || '0'));
    }
    
    // 處理舊格式 "YYYY/MM/DD/HH"
    const parts = timeSlot.split('/');
    if (parts.length >= 4) {
      const [year, month, day, hour] = parts.map(Number);
      return new Date(year, month - 1, day, hour);
    }
    
    // 回退到ISO格式
    return parseISO(timeSlot);
  };

  // 格式化時間段顯示
  const formatTimeSlot = (timeSlot: string): string => {
    const date = parseTimeSlot(timeSlot);
    const endDate = new Date(date.getTime() + 4 * 60 * 60 * 1000); // 加4小時
    return `${format(date, 'HH:mm')}-${format(endDate, 'HH:mm')}`;
  };

  // 月份導航
  const handlePrevMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  // 機器選擇切換
  const toggleMachine = (machineId: string) => {
    setSelectedMachines(prev => {
      const newSet = new Set(prev);
      const wasSelected = newSet.has(machineId);
      if (wasSelected) {
        newSet.delete(machineId);
        console.log('Removed machine:', machineId, 'New size:', newSet.size);
      } else {
        newSet.add(machineId);
        console.log('Added machine:', machineId, 'New size:', newSet.size);
      }
      return newSet;
    });
  };

  // 全選/全不選機器
  const toggleAllMachines = () => {
    console.log('Current selected machines:', selectedMachines.size, 'Total machines:', machines.length);
    if (selectedMachines.size === machines.length) {
      console.log('Deselecting all machines');
      setSelectedMachines(new Set());
    } else {
      console.log('Selecting all machines');
      setSelectedMachines(new Set(machines.map(m => m.id)));
    }
  };

  // 展開/收起日期
  const toggleDayExpanded = (dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  // 生成日曆日期
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // 週一開始
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days = [];
    let currentDay = calendarStart;
    
    while (currentDay <= calendarEnd) {
      days.push(new Date(currentDay));
      currentDay = addDays(currentDay, 1);
    }
    
    return days;
  };

  // 獲取特定日期的預約（機器篩選已在API層面處理）
  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => {
      const bookingDate = parseTimeSlot(booking.time_slot);
      return isSameDay(bookingDate, date) && booking.status === 'active';
    }).sort((a, b) => {
      const timeA = parseTimeSlot(a.time_slot).getTime();
      const timeB = parseTimeSlot(b.time_slot).getTime();
      return timeA - timeB;
    });
  };

  // 獲取機器顏色
  const getMachineColor = (machineId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
    ];
    
    const machineIndex = machines.findIndex(m => m.id === machineId);
    return colors[machineIndex % colors.length];
  };

  if (!session) {
    return (
      <main className="min-h-screen pt-20 pb-10 bg-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary mb-4">請先登入</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary">您需要登入才能查看預約情況</p>
          </div>
        </div>
      </main>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <main className="min-h-screen pt-5 pb-10 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col space-y-6">
          {/* 頁面標題和月份選擇器 */}
          <div className="flex flex-col space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-text-primary dark:text-dark-text-primary group relative inline-block">
              機器預約行事曆
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary dark:bg-dark-accent transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />
            </h1>
            <p className="text-text-secondary dark:text-dark-text-secondary">查看所有機器的預約狀況，了解誰在什麼時候使用哪台機器</p>
            
            {/* 月份選擇器 */}
            <div className="bg-surface dark:bg-dark-bg-secondary rounded-lg p-4 shadow-sm dark:shadow-dark-bg-primary/20 border dark:border-dark-border">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handlePrevMonth}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-primary bg-surface dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border rounded-md transition-all duration-200 hover:bg-gray-50 dark:hover:bg-dark-bg-secondary hover:border-primary dark:hover:border-dark-accent"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-1" />
                  上個月
                </button>
                
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="w-5 h-5 text-primary dark:text-dark-accent" />
                  <h2 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
                    {format(selectedDate, 'yyyy年MM月', { locale: zhTW })}
                  </h2>
                </div>
                
                <button
                  onClick={handleNextMonth}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-primary bg-surface dark:bg-dark-bg-tertiary border border-gray-300 dark:border-dark-border rounded-md transition-all duration-200 hover:bg-gray-50 dark:hover:bg-dark-bg-secondary hover:border-primary dark:hover:border-dark-accent"
                >
                  下個月
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>

          {/* 載入狀態 */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary dark:border-dark-accent border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">載入中...</p>
            </div>
          )}

          {/* 錯誤狀態 */}
          {error && (
            <div className="bg-destructive/10 dark:bg-red-900/20 border-l-4 border-destructive dark:border-red-600 p-4 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive dark:text-red-400">錯誤</h3>
                  <div className="mt-2 text-sm text-destructive/80 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 機器選擇器 */}
          {!isLoading && !error && machines.length > 0 && (
            <div className="bg-surface dark:bg-dark-bg-secondary rounded-lg p-4 shadow-sm dark:shadow-dark-bg-primary/20 border-2 border-gray-200 dark:border-dark-border">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary dark:text-dark-text-primary">機器篩選</h3>
                <button
                  onClick={toggleAllMachines}
                  className="text-xs text-primary dark:text-dark-accent hover:text-primary-dark dark:hover:text-dark-accent/80 font-medium transition-colors duration-200"
                >
                  {selectedMachines.size === machines.length ? '全部取消' : '全部選取'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {machines.map((machine) => {
                  const isSelected = selectedMachines.has(machine.id);
                  const machineColorClass = getMachineColor(machine.id);
                  return (
                    <button
                      key={machine.id}
                      onClick={() => {
                        console.log('Toggling machine:', machine.id, 'Current state:', isSelected);
                        toggleMachine(machine.id);
                      }}
                      className={`px-3 py-1 text-xs rounded border-2 transition-all duration-200 ${
                        isSelected
                          ? `${machineColorClass} ring-2 ring-blue-500 dark:ring-dark-accent ring-offset-1 dark:ring-offset-dark-bg-secondary shadow-md`
                          : 'bg-gray-100 dark:bg-dark-bg-primary text-gray-500 dark:text-dark-text-secondary border-gray-300 dark:border-dark-border hover:bg-gray-200 dark:hover:bg-dark-bg-secondary hover:border-primary dark:hover:border-dark-accent'
                      }`}
                    >
                      <span className="flex items-center space-x-1">
                        <span>{machine.name}</span>
                        {isSelected && <span className="text-xs">✓</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">
                已選擇 {selectedMachines.size} / {machines.length} 台機器
              </div>
            </div>
          )}

          {/* 日曆 */}
          {!isLoading && !error && (
            <div className="bg-surface dark:bg-dark-bg-secondary rounded-lg shadow-sm dark:shadow-dark-bg-primary/20 overflow-hidden border-2 border-gray-200 dark:border-dark-border">
              {/* 當沒有選擇機器時的提示 */}
              {selectedMachines.size === 0 ? (
                <div className="p-12 text-center text-gray-500 dark:text-dark-text-secondary">
                  <div className="text-4xl mb-4">🔧</div>
                  <div className="text-lg font-medium mb-2 text-gray-700 dark:text-dark-text-primary">請選擇要查看的機器</div>
                  <div className="text-sm text-gray-400 dark:text-dark-text-secondary">使用上方的機器篩選器選擇您想查看預約狀況的機器</div>
                </div>
              ) : (
                <>
                  {/* 星期標題 */}
                  <div className="overflow-x-auto apple-scrollbar">
                    <div className="min-w-[52rem]">
                      <div className="grid grid-cols-7 bg-gray-50 dark:bg-dark-bg-primary border-b-2 border-gray-200 dark:border-dark-border">
                        {['週一', '週二', '週三', '週四', '週五', '週六', '週日'].map((day) => (
                          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-dark-text-primary border-r border-gray-200 dark:border-dark-border last:border-r-0">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7">
                        {calendarDays.map((day, index) => {
                  const dayBookings = getBookingsForDate(day);
                  const isCurrentMonth = isSameMonth(day, selectedDate);
                  const isDayToday = isToday(day);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-32 p-2 border-r border-b border-gray-100 dark:border-dark-border cursor-pointer transition-all duration-200 ${
                        !isCurrentMonth 
                          ? 'bg-gray-50 dark:bg-dark-bg-primary/50 text-gray-400 dark:text-dark-text-secondary' 
                          : isDayToday 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                          : 'bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-primary'
                      }`}
                      onClick={() => {
                        if (isCurrentMonth) {
                          setSelectedDateDetails({ date: day, bookings: getBookingsForDate(day) });
                          setShowDateDetails(true);
                        }
                      }}
                    >
                      {/* 日期 */}
                      <div className={`text-sm font-medium mb-2 ${
                        isDayToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : isCurrentMonth 
                          ? 'text-gray-900 dark:text-dark-text-primary' 
                          : 'text-gray-400 dark:text-dark-text-secondary'
                      }`}>
                        {format(day, 'd')}
                      </div>

                                             {/* 預約項目 */}
                       <div className="space-y-1">
                         {(() => {
                           const dateKey = format(day, 'yyyy-MM-dd');
                           const isExpanded = expandedDays.has(dateKey);
                           const displayBookings = isExpanded ? dayBookings : dayBookings.slice(0, 3);
                           
                           return (
                             <>
                               {displayBookings.map((booking) => {
                                 const isOwnBooking = booking.user_email !== 'hidden' && 
                                                    session?.user?.email && 
                                                    booking.user_email.toLowerCase().trim() === session.user.email.toLowerCase().trim();
                                 
                                 return (
                                   <div
                                     key={booking.id}
                                     className={`text-xs p-1 rounded border-2 cursor-pointer hover:shadow-sm dark:hover:shadow-dark-bg-primary/20 transition-all duration-200 ${
                                       getMachineColor(booking.machine_id)
                                     } ${isOwnBooking ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''}`}
                                     title={`${booking.machine_name} - ${booking.user_display_name} - ${formatTimeSlot(booking.time_slot)}`}
                                     onClick={() => {
                                       if (isOwnBooking && parseTimeSlot(booking.time_slot) > new Date()) {
                                         if (confirm(`確定要取消這個預約嗎？\n${booking.machine_name}\n${formatTimeSlot(booking.time_slot)}`)) {
                                           handleCancelBooking(booking.id);
                                         }
                                       }
                                     }}
                                   >
                                     <div className="font-medium truncate">
                                       {booking.machine_name}
                                     </div>
                                     <div className="truncate">
                                       {formatTimeSlot(booking.time_slot)}
                                     </div>
                                     <div className="truncate font-medium">
                                       {booking.user_display_name}
                                     </div>
                                     {isOwnBooking && (
                                       <div className="text-blue-600 dark:text-blue-400 font-medium">
                                         (您的預約)
                                       </div>
                                     )}
                                   </div>
                                 );
                               })}
                               
                               {/* 展開/收起按鈕 */}
                               {dayBookings.length > 3 && (
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     toggleDayExpanded(dateKey);
                                   }}
                                   className="w-full text-xs text-gray-500 dark:text-dark-text-secondary hover:text-gray-700 dark:hover:text-dark-text-primary p-1 text-center border-2 border-dashed border-gray-300 dark:border-dark-border rounded hover:border-gray-400 dark:hover:border-dark-accent transition-all duration-200 bg-gray-50 dark:bg-dark-bg-primary"
                                 >
                                   {isExpanded 
                                     ? '收起' 
                                     : `查看更多 (+${dayBookings.length - 3})`
                                   }
                                 </button>
                               )}
                             </>
                           );
                         })()}
                       </div>
                    </div>
                  );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {showDateDetails && selectedDateDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => setShowDateDetails(false)}
        >
          <div
            className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-gray-200 dark:border-dark-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b-2 border-gray-200 dark:border-dark-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50 dark:bg-dark-bg-primary">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">
                  {format(selectedDateDetails.date, 'yyyy年M月d日 (EEEE)', { locale: zhTW })} 預約詳情
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  共 {selectedDateDetails.bookings.length} 筆預約
                </p>
              </div>
              <button
                onClick={() => setShowDateDetails(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-md text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary transition-all duration-200"
              >
                <span className="sr-only">關閉</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] bg-white dark:bg-dark-bg-secondary">
              {selectedDateDetails.bookings.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl mb-4">📅</span>
                  <p className="text-lg text-gray-500 dark:text-dark-text-secondary">該日無預約</p>
                  <p className="text-sm text-gray-400 dark:text-dark-text-secondary mt-2">選擇的日期沒有任何預約記錄</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateDetails.bookings.map((booking) => (
                    <div key={booking.id} className="bg-gray-50 dark:bg-dark-bg-primary rounded-lg p-4 border-2 border-gray-200 dark:border-dark-border hover:border-dark-accent/30 transition-all duration-200 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-dark-text-primary">{booking.machine_name}</div>
                          <div className="text-sm text-gray-600 dark:text-dark-text-secondary">{formatTimeSlot(booking.time_slot)}</div>
                          <div className="text-sm text-gray-600 dark:text-dark-text-secondary">{booking.user_display_name}</div>
                          <div className="text-xs text-gray-400 dark:text-dark-text-secondary">{booking.user_email !== 'hidden' ? booking.user_email : ''}</div>
                        </div>
                        {/* 你的預約可顯示取消按鈕 */}
                        {booking.user_email !== 'hidden' && session?.user?.email && booking.user_email.toLowerCase().trim() === session.user.email.toLowerCase().trim() && parseTimeSlot(booking.time_slot) > new Date() && (
                          <button
                            onClick={() => {
                              if (confirm(`確定要取消這個預約嗎？\n${booking.machine_name}\n${formatTimeSlot(booking.time_slot)}`)) {
                                handleCancelBooking(booking.id);
                              }
                            }}
                            className="ml-4 p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all duration-200 border border-transparent hover:border-red-200 dark:hover:border-red-700"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 
