'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  format,
  parseISO,
  isBefore,
  addHours,
  startOfDay,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  getDaysInMonth,
  getDay
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  CalendarDaysIcon, 
  XMarkIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/services/api';
import { getTaipeiNow, formatTaipeiTime } from '@/lib/timezone';
import NotificationManager from '@/components/NotificationManager';
import { useNotifications } from '@/hooks/useNotifications';

interface Booking {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_description: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

interface GroupedBookings {
  [date: string]: Booking[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [groupedBookings, setGroupedBookings] = useState<GroupedBookings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('active');
  
  // 月曆視圖相關狀態
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateBookings, setSelectedDateBookings] = useState<Booking[]>([]);
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { notifications, removeNotification, showSuccess, showError } = useNotifications();

  // 檢查登入狀態
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // 獲取預約數據
  useEffect(() => {
    const fetchBookings = async () => {
      if (!session?.user?.email) return;
      
      try {
        setIsLoading(true);
        
        // 檢查或創建使用者
        await api.users.createOrGet({
          name: session.user.name || '',
          email: session.user.email || '',
        });

        // 獲取當前月份的預約數據
        const response = await api.bookings.getUserMonthlyBookings(
          session.user.email, 
          currentYear, 
          currentMonth
        );
        const bookingsData = response.bookings || [];
        
        console.log('Fetched monthly bookings:', bookingsData);
        setBookings(bookingsData);
        
        // 按日期分組預約
        const grouped = groupBookingsByDate(bookingsData);
        setGroupedBookings(grouped);
        
      } catch (error) {
        console.error('獲取預約數據時發生錯誤:', error);
        showError('獲取預約數據失敗');
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.email) {
      fetchBookings();
    }
  }, [session?.user?.email, currentYear, currentMonth]);

  // 按日期分組預約
  const groupBookingsByDate = (bookings: Booking[]): GroupedBookings => {
    const filteredBookings = bookings.filter(booking => {
      const matchesFilter = filter === 'all' || booking.status === filter;
      const matchesSearch = searchTerm === '' || 
        booking.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.machine_description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });

    return filteredBookings.reduce((groups: GroupedBookings, booking) => {
      const date = format(parseISO(booking.start_time), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(booking);
      return groups;
    }, {});
  };

  // 重新分組當篩選條件改變時
  useEffect(() => {
    const grouped = groupBookingsByDate(bookings);
    setGroupedBookings(grouped);
  }, [filter, bookings, searchTerm]);

  // 檢查預約是否可以取消
  const canCancelBooking = (startTime: string) => {
    const now = getTaipeiNow();
    const bookingStart = parseISO(startTime);
    // 只要還未到預約開始時間就可以取消
    return !isBefore(bookingStart, now);
  };

  // 取消預約
  const handleCancelBooking = async (booking: Booking) => {
    if (!session?.user?.email) return;
    
    try {
      console.log('取消預約:', booking.id);
      await api.bookings.cancel(booking.id, session.user.email);
      
      // 重新獲取當前月份的預約數據
      const response = await api.bookings.getUserMonthlyBookings(
        session.user.email, 
        currentYear, 
        currentMonth
      );
      const bookingsData = response.bookings || [];
      setBookings(bookingsData);
      
      setShowCancelModal(false);
      setSelectedBooking(null);
      showSuccess('預約已取消');
      
    } catch (error) {
      console.error('取消預約時發生錯誤:', error);
      
      let errorMessage = '取消預約失敗，請稍後再試';
      
      // 檢查是否為我們的自定義API錯誤
      if (error instanceof ApiError) {
        // 根據錯誤類型提供不同的訊息
        switch (error.error_type) {
          case 'booking_not_found':
            errorMessage = '預約不存在';
            break;
          case 'permission_denied':
            errorMessage = '您只能取消自己的預約';
            break;
          case 'invalid_status':
            errorMessage = error.message;
            break;
          case 'booking_started':
            errorMessage = '預約時間已開始，無法取消';
            break;
          default:
            errorMessage = error.message || '取消預約失敗，請稍後再試';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || '取消預約失敗，請稍後再試';
      }
      
      showError(`取消預約失敗\n原因: ${errorMessage}`);
    }
  };

  // 獲取日期顯示文字
  const getDateDisplayText = (dateStr: string) => {
    const date = parseISO(dateStr + 'T00:00:00');
    if (isToday(date)) return '今天';
    if (isTomorrow(date)) return '明天';
    if (isYesterday(date)) return '昨天';
    return format(date, 'M月d日 (EEEE)', { locale: zhTW });
  };

  // 獲取狀態配置
  const getStatusConfig = (booking: Booking) => {
    const now = getTaipeiNow();
    const startTime = parseISO(booking.start_time);
    const endTime = parseISO(booking.end_time);
    
    if (booking.status === 'cancelled') {
      return {
        text: '已取消',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-300',
        icon: XMarkIcon
      };
    }
    
    if (isBefore(endTime, now)) {
      return {
        text: '已完成',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        icon: CheckCircleIcon
      };
    }
    
    if (isBefore(startTime, now) && !isBefore(endTime, now)) {
      return {
        text: '進行中',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: ClockIcon
      };
    }
    
    return {
      text: '待開始',
      bgColor: 'bg-primary/5',
      textColor: 'text-primary',
      borderColor: 'border-primary/20',
      icon: CalendarDaysIcon
    };
  };

  // 確認取消預約的彈窗
  const CancelModal = () => {
    if (!selectedBooking) return null;

    const canCancel = canCancelBooking(selectedBooking.start_time);
    const statusConfig = getStatusConfig(selectedBooking);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {canCancel ? '確認取消預約' : '預約詳情'}
            </h3>
            <button
              onClick={() => setShowCancelModal(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {!canCancel && selectedBooking.status === 'active' && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                此預約已無法取消（預約時間已開始或已過期）
              </p>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-3">
            <div>
              <p className="font-medium text-gray-900">{selectedBooking.machine_name}</p>
              <p className="text-sm text-gray-600">{selectedBooking.machine_description}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                {format(parseISO(selectedBooking.start_time), 'yyyy年M月d日', { locale: zhTW })}
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              {formatTaipeiTime(parseISO(selectedBooking.start_time), 'HH:mm')} - 
              {formatTaipeiTime(parseISO(selectedBooking.end_time), 'HH:mm')}
              <span className="ml-2 text-gray-500">(4小時)</span>
            </div>
            
            <div className="flex items-center">
              <statusConfig.icon className="h-4 w-4 mr-1 text-gray-600" />
              <span className={`text-sm ${statusConfig.textColor}`}>
                {statusConfig.text}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              {canCancel ? '返回' : '關閉'}
            </button>
            {canCancel && selectedBooking.status === 'active' && (
              <button
                onClick={() => handleCancelBooking(selectedBooking)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                確認取消
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 月曆相關函數
  const changeMonth = (monthDelta: number) => {
    let newMonth = currentMonth + monthDelta;
    let newYear = currentYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const openYearMonthPicker = () => {
    setTempYear(currentYear);
    setTempMonth(currentMonth);
    setShowYearMonthPicker(true);
  };

  const confirmYearMonth = () => {
    setCurrentYear(tempYear);
    setCurrentMonth(tempMonth);
    setShowYearMonthPicker(false);
  };

  const generateYearOptions = () => {
    const currentYearNum = new Date().getFullYear();
    const years = [];
    for (let i = currentYearNum - 2; i <= currentYearNum + 2; i++) {
      years.push(i);
    }
    return years;
  };

  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth - 1));
    const firstDayOfMonth = getDay(new Date(currentYear, currentMonth - 1, 1));
    
    const calendar = [];
    
    // 添加空白日期（上個月的尾部）
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendar.push(null);
    }
    
    // 添加當月日期
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }
    
    return calendar;
  };

  const showDayDetails = (day: number) => {
    const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayBookings = getFilteredBookings().filter(booking => {
      const bookingDate = booking.start_time.split('T')[0];
      return bookingDate === dateStr;
    });
    
    setSelectedDate(dateStr);
    setSelectedDateBookings(dayBookings);
    setShowDateDetails(true);
  };

  const getFilteredBookings = () => {
    return bookings.filter(booking => {
      const matchesFilter = filter === 'all' || booking.status === filter;
      const matchesSearch = searchTerm === '' || 
        booking.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.machine_description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-10 bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const sortedDates = Object.keys(groupedBookings).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen pt-20 pb-10 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* 頁面標題與月份導航 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">我的預約記錄</h1>
              <p className="text-gray-600">
                {currentYear}年{currentMonth}月的預約記錄（共 {getFilteredBookings().length} 筆）
              </p>
            </div>
            
            {/* 月份選擇器 */}
            <div className="mt-4 sm:mt-0 flex items-center space-x-2">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={openYearMonthPicker}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
              >
                {currentYear}年{currentMonth}月
              </button>
              
              <button 
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 搜尋和篩選區域 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜尋機器名稱或描述..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
              <div className="sm:w-48">
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilter('active')}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                      filter === 'active'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    有效
                  </button>
                  <button
                    onClick={() => setFilter('cancelled')}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                      filter === 'cancelled'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    已取消
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 月曆視圖 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* 星期標題 */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div key={day} className="p-4 text-center text-sm font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 日期網格 */}
            <div className="grid grid-cols-7">
              {generateCalendar().map((dayOrEmpty, index) => {
                if (typeof dayOrEmpty === 'number') {
                  const day = dayOrEmpty;
                  const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const dayBookings = getFilteredBookings().filter(booking => {
                    const bookingDate = booking.start_time.split('T')[0];
                    return bookingDate === dateStr;
                  });
                  
                  return (
                    <div key={index} className="min-h-[120px] border-r border-b border-gray-200 p-2 hover:bg-gray-50 cursor-pointer" onClick={() => showDayDetails(day)}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-900">{day}</span>
                        {dayBookings.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {dayBookings.length}
                          </span>
                        )}
                      </div>
                      
                      {/* 顯示該日的預約詳情 - 單行顯示 */}
                      <div className="space-y-1">
                        {dayBookings.slice(0, 4).map((booking, bookingIndex) => {
                          const startTime = new Date(booking.start_time).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });
                          
                          const statusConfig = getStatusConfig(booking);
                          const bgColor = booking.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
                          const textColor = booking.status === 'active' ? 'text-green-700' : 'text-gray-500';
                          
                          return (
                            <div key={bookingIndex} className={`text-xs ${bgColor} border rounded p-1`}>
                              <div className={`${textColor} truncate`} title={`${startTime} | ${booking.machine_name}`}>
                                {startTime} | {booking.machine_name}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* 如果有更多預約，顯示省略號 */}
                        {dayBookings.length > 4 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{dayBookings.length - 4} 更多
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // 空白日期
                  return (
                    <div key={index} className="min-h-[120px] border-r border-b border-gray-200 bg-gray-50">
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* 年月選擇器彈窗 */}
          {showYearMonthPicker && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-80">
                <h3 className="text-lg font-medium mb-4">選擇年月</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">年份</label>
                    <select 
                      value={tempYear} 
                      onChange={(e) => setTempYear(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}年</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">月份</label>
                    <select 
                      value={tempMonth} 
                      onChange={(e) => setTempMonth(parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                        <option key={month} value={month}>{month}月</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button 
                    onClick={() => setShowYearMonthPicker(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button 
                    onClick={confirmYearMonth}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    確認
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 日期詳細預約模態框 */}
          {showDateDetails && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
                {/* 模態框標題 */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedDate && format(parseISO(selectedDate + 'T00:00:00'), 'yyyy年M月d日 (EEEE)', { locale: zhTW })} 我的預約
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      共 {selectedDateBookings.length} 筆預約
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDateDetails(false)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                {/* 預約列表 */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                  {selectedDateBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarDaysIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg text-gray-500">該日無預約</p>
                      <p className="text-sm text-gray-400 mt-2">選擇的日期沒有任何預約記錄</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedDateBookings.map((booking) => {
                        const statusConfig = getStatusConfig(booking);
                        const IconComponent = statusConfig.icon;
                        const canCancel = canCancelBooking(booking.start_time);
                        
                        return (
                          <div key={booking.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                    <IconComponent className="h-3 w-3 mr-1" />
                                    {statusConfig.text}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    預約編號: #{booking.id}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">時段資訊</h4>
                                    <p className="text-sm text-gray-600">
                                      {formatTaipeiTime(parseISO(booking.start_time), 'HH:mm')} - 
                                      {formatTaipeiTime(parseISO(booking.end_time), 'HH:mm')}
                                      <span className="text-gray-400 ml-2">(4小時)</span>
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">機器資訊</h4>
                                    <p className="text-sm text-gray-600">
                                      {booking.machine_name}
                                      <span className="text-gray-400 ml-2">#{booking.machine_id}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {booking.machine_description}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">預約時間</h4>
                                    <p className="text-sm text-gray-600">
                                      {formatTaipeiTime(parseISO(booking.created_at), 'yyyy/MM/dd HH:mm')}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-1">操作</h4>
                                    {booking.status === 'active' && canCancel ? (
                                      <button
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowCancelModal(true);
                                          setShowDateDetails(false);
                                        }}
                                        className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                                      >
                                        取消預約
                                      </button>
                                    ) : (
                                      <span className="text-sm text-gray-500">
                                        {booking.status === 'cancelled' ? '已取消' : '無法取消'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 取消預約確認彈窗 */}
      {showCancelModal && <CancelModal />}

      {/* 通知管理器 */}
      <NotificationManager
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
} 