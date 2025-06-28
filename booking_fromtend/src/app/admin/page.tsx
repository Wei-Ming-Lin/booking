'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  format, 
  parseISO,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay 
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  UserIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  PencilIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { api } from '@/services/api';
import { getTaipeiNow, formatTaipeiTime } from '@/lib/timezone';
import NotificationManager from '@/components/NotificationManager';
import { useNotifications } from '@/hooks/useNotifications';
import { API_ENDPOINTS } from '@/config/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'manager' | 'admin';
  created_at?: string;
}

interface BookingDetail {
  id: string;
  user_email: string;
  user_name: string;
  machine_id: string;
  machine_name: string;
  machine_description: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled';
  created_at: string;
}

interface Notification {
  id: string;
  content: string;
  level: '低' | '中' | '高';
  start_time: string | null;
  end_time: string | null;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  created_at: string;
  updated_at: string | null;
}

interface Machine {
  id: string;
  name: string;
  description: string;
  status: string;
  restriction_status: string;
  restriction_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface MachineRestriction {
  id: string;
  restriction_type: string;
  restriction_rule: string;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'notifications' | 'machines'>('users');
  
  // 用戶管理相關狀態
  const [users, setUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  
  // 預約管理相關狀態
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [bookingSearchTerm, setBookingSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState<{[key: string]: any}>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateBookings, setSelectedDateBookings] = useState<BookingDetail[]>([]);
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(currentYear);
  const [tempMonth, setTempMonth] = useState(currentMonth);

  // 通知管理相關狀態
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  
  // 機器管理相關狀態
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [isCreateMachineModalOpen, setIsCreateMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineRestrictions, setMachineRestrictions] = useState<MachineRestriction[]>([]);
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);

  // 計算預設時間
  const getDefaultTimes = () => {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      start_time: now.toISOString().slice(0, 16),
      end_time: sevenDaysLater.toISOString().slice(0, 16)
    };
  };
  
  const [notificationForm, setNotificationForm] = useState({
    content: '',
    level: '中' as '低' | '中' | '高',
    ...getDefaultTimes()
  });

  const [isLoading, setIsLoading] = useState(true);
  const { notifications: useNotificationsNotifications, removeNotification, showSuccess, showError } = useNotifications();

  // 檢查用戶權限
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (session?.user?.email) {
      // 獲取當前用戶角色
      fetchCurrentUserRole();
    }
  }, [session, status, router]);

  // 監聽標籤切換時加載對應數據
  useEffect(() => {
    if (currentUserRole && ['manager', 'admin'].includes(currentUserRole)) {
      if (activeTab === 'notifications') {
        fetchNotifications();
      } else if (activeTab === 'machines') {
        fetchMachines();
      } else if (activeTab === 'bookings') {
        fetchBookings();
        fetchMonthlyStats(currentYear, currentMonth);
      }
    }
  }, [activeTab, currentUserRole, currentYear, currentMonth]);

  // 監聽月份/年份變化
  useEffect(() => {
    if (activeTab === 'bookings' && currentUserRole && ['manager', 'admin'].includes(currentUserRole)) {
      fetchMonthlyStats(currentYear, currentMonth);
    }
  }, [currentYear, currentMonth]);

  // 獲取當前用戶角色
  const fetchCurrentUserRole = async () => {
    try {
      const response = await api.users.createOrGet({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
      });
      
      const userRole = response.role;
      setCurrentUserRole(userRole);
      
      if (!['manager', 'admin'].includes(userRole)) {
        showError('您沒有權限訪問管理介面');
        router.push('/');
        return;
      }

      // 權限驗證通過，加載數據
      await Promise.all([
        fetchUsers(),
        fetchBookings(),
        fetchNotifications(),
        fetchMachines()
      ]);
      
    } catch (error) {
      console.error('獲取用戶角色失敗:', error);
      showError('權限驗證失敗');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  // 獲取所有用戶
  const fetchUsers = async () => {
    try {
      // 這裡需要新的API端點來獲取所有用戶
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/users`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('獲取用戶列表失敗');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('獲取用戶列表失敗:', error);
      showError('獲取用戶列表失敗');
    }
  };

  // 獲取所有預約
  const fetchBookings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/bookings`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('獲取預約列表失敗');
      }
      
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('獲取預約列表失敗:', error);
      showError('獲取預約列表失敗');
    }
  };

  // 獲取月度統計
  const fetchMonthlyStats = async (year: number, month: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/bookings/monthly?year=${year}&month=${month}`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('獲取月度統計失敗');
      }
      
      const data = await response.json();
      setMonthlyStats(data.daily_stats || {});
    } catch (error) {
      console.error('獲取月度統計失敗:', error);
      showError('獲取月度統計失敗');
    }
  };

  // 獲取所有通知
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/notifications`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('獲取通知列表失敗');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('獲取通知列表失敗:', error);
      showError('獲取通知列表失敗');
    }
  };

  // 獲取所有機器
  const fetchMachines = async () => {
    setLoadingMachines(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/machines`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error('獲取機器列表失敗');
      }

      const data = await response.json();
      // 使用管理員API返回的格式
      setMachines(data.machines || []);
    } catch (error) {
      console.error('獲取機器列表失敗:', error);
      showError('獲取機器列表失敗');
    } finally {
      setLoadingMachines(false);
    }
  };

  // 獲取機器限制
  const fetchMachineRestrictions = async (machineId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/machines/${machineId}/restrictions`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error('獲取機器限制失敗');
      }

      const data = await response.json();
      setMachineRestrictions(data.restrictions || []);
    } catch (error) {
      console.error('獲取機器限制失敗:', error);
      showError('獲取機器限制失敗');
    }
  };

  // 創建或更新通知
  const handleNotificationSubmit = async () => {
    try {
      const method = editingNotification ? 'PUT' : 'POST';
      const url = editingNotification 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/notifications/${editingNotification.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/notifications`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': session?.user?.email || '',
        },
        body: JSON.stringify({
          content: notificationForm.content,
          level: notificationForm.level,
          start_time: notificationForm.start_time || null,
          end_time: notificationForm.end_time || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '保存通知失敗');
      }

      showSuccess(editingNotification ? '通知已成功更新' : '通知已成功創建');
      setShowNotificationForm(false);
      setEditingNotification(null);
      resetNotificationForm();
      await fetchNotifications();
    } catch (error) {
      console.error('保存通知失敗:', error);
      showError(error instanceof Error ? error.message : '保存通知失敗');
    }
  };

  // 刪除通知
  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('確定要刪除這個通知嗎？')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '刪除通知失敗');
      }

      showSuccess('通知已成功刪除');
      await fetchNotifications();
    } catch (error) {
      console.error('刪除通知失敗:', error);
      showError(error instanceof Error ? error.message : '刪除通知失敗');
    }
  };

  // 重置通知表單
  const resetNotificationForm = () => {
    setNotificationForm({
      content: '',
      level: '中',
      ...getDefaultTimes()
    });
  };

  // 開始編輯通知
  const startEditNotification = (notification: Notification) => {
    setEditingNotification(notification);
    setNotificationForm({
      content: notification.content,
      level: notification.level,
      start_time: notification.start_time ? new Date(notification.start_time).toISOString().slice(0, 16) : '',
      end_time: notification.end_time ? new Date(notification.end_time).toISOString().slice(0, 16) : ''
    });
    setShowNotificationForm(true);
  };

  // 獲取等級樣式
  const getLevelStyle = (level: string) => {
    switch (level) {
      case '高':
        return 'bg-red-100 text-red-800';
      case '中':
        return 'bg-yellow-100 text-yellow-800';
      case '低':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 更新用戶角色
  const handleRoleChange = async (userEmail: string, newRole: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/users/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': session?.user?.email || '',
        },
        body: JSON.stringify({
          email: userEmail,
          role: newRole,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '更新角色失敗');
      }

      showSuccess('用戶角色已成功更新');
      fetchUsers(); // 重新獲取用戶列表
    } catch (error) {
      console.error('更新用戶角色失敗:', error);
      showError(error instanceof Error ? error.message : '更新角色失敗');
    }
  };

  // 檢查是否可以修改角色
  const canModifyRole = (targetUserRole: string) => {
    if (currentUserRole === 'admin') {
      return true; // admin可以修改所有人
    }
    if (currentUserRole === 'manager') {
      return targetUserRole !== 'admin'; // manager不能修改admin
    }
    return false;
  };

  // 獲取可選擇的角色
  const getAvailableRoles = (targetUserRole: string) => {
    if (currentUserRole === 'admin') {
      return ['user', 'manager', 'admin'];
    }
    if (currentUserRole === 'manager') {
      return ['user', 'manager'];
    }
    return [];
  };

  // 過濾用戶
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // 過濾預約
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.user_name.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
                         booking.user_email.toLowerCase().includes(bookingSearchTerm.toLowerCase()) ||
                         booking.machine_name.toLowerCase().includes(bookingSearchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 獲取預約狀態配置
  const getBookingStatusConfig = (booking: BookingDetail) => {
    const now = getTaipeiNow();
    const startTime = parseISO(booking.start_time);
    const endTime = parseISO(booking.end_time);
    
    if (booking.status === 'cancelled') {
      return {
        text: '已取消',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        icon: XMarkIcon
      };
    }
    
    if (isBefore(endTime, now)) {
      return {
        text: '已完成',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        icon: CheckCircleIcon
      };
    }
    
    if (isBefore(startTime, now) && !isBefore(endTime, now)) {
      return {
        text: '進行中',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: ClockIcon
      };
    }
    
    return {
      text: '待開始',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      icon: CalendarIcon
    };
  };

  // 切換月份
  const changeMonth = async (monthDelta: number) => {
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

  // 開啟年月選擇器
  const openYearMonthPicker = () => {
    setTempYear(currentYear);
    setTempMonth(currentMonth);
    setShowYearMonthPicker(true);
  };

  // 確認年月選擇
  const confirmYearMonth = async () => {
    setCurrentYear(tempYear);
    setCurrentMonth(tempMonth);
    setShowYearMonthPicker(false);
    await fetchMonthlyStats(tempYear, tempMonth);
  };

  // 生成年份選項
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear - 5; year <= currentYear + 5; year++) {
      years.push(year);
    }
    return years;
  };

  // 生成月曆格子
  const generateCalendar = () => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
    const calendar = [];
    
    // 補齊前面的空格子
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendar.push(null);
    }
    
    // 添加每一天
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }
    
    return calendar;
  };

  // 獲取日期的預約統計樣式
  const getDayStatsStyle = (day: number) => {
    const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const stats = monthlyStats[dateStr];
    
    if (!stats || stats.total_bookings === 0) {
      return {
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-400',
        borderColor: 'border-gray-200'
      };
    }
    
    const activeRatio = stats.active_bookings / stats.total_bookings;
    
    if (activeRatio >= 0.8) {
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
      };
    } else if (activeRatio >= 0.5) {
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-300'
      };
    } else {
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300'
      };
    }
  };

  // 顯示日期詳情
  const showDayDetails = (day: number) => {
    const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayBookings = filteredBookings.filter(booking => {
      const bookingDate = booking.start_time.split('T')[0];
      return bookingDate === dateStr;
    });
    
    setSelectedDate(dateStr);
    setSelectedDateBookings(dayBookings);
    setShowDateDetails(true);
  };

  // 獲取選中日期的詳細預約信息
  const getSelectedDateBookings = () => {
    if (!selectedDate) return [];
    const stats = monthlyStats[selectedDate];
    if (!stats || !stats.bookings) return [];
    
    // 按時段分組預約（6個4小時時段）
    const timeSlots = [
      { label: '00:00-04:00', hour: 0 },
      { label: '04:00-08:00', hour: 4 },
      { label: '08:00-12:00', hour: 8 },
      { label: '12:00-16:00', hour: 12 },
      { label: '16:00-20:00', hour: 16 },
      { label: '20:00-24:00', hour: 20 }
    ];
    
    return timeSlots.map(slot => {
      const bookingsInSlot = stats.bookings.filter((booking: any) => {
        const hour = parseInt(booking.time_slot.split(':')[0]);
        return hour === slot.hour;
      });
      
      return {
        ...slot,
        bookings: bookingsInSlot
      };
    });
  };

  const deleteMachineRestriction = async (machineId: string, restrictionId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/machines/${machineId}/restrictions/${restrictionId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error('刪除機器限制失敗');
      }

      await fetchMachineRestrictions(machineId);
      await fetchMachines(); // 更新限制計數
    } catch (error) {
      console.error('刪除機器限制失敗:', error);
      showError('刪除機器限制失敗');
    }
  };

  // 機器編輯/創建處理函數
  const handleMachineSubmit = async (formData: {
    name: string;
    description: string;
    status: string;
    restriction_status: string;
  }) => {
    try {
      if (editingMachine) {
        // 更新現有機器
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/machines/${editingMachine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': session?.user?.email || '',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '更新機器失敗');
        }

        showSuccess('機器更新成功');
      } else {
        // 創建新機器
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/machines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': session?.user?.email || '',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '創建機器失敗');
        }

        showSuccess('機器創建成功');
      }

      setEditingMachine(null);
      setIsCreateMachineModalOpen(false);
      await fetchMachines();
    } catch (error) {
      console.error('機器操作失敗:', error);
      showError(error instanceof Error ? error.message : '機器操作失敗');
    }
  };

  // 刪除機器處理函數
  const handleDeleteMachine = async (machine: Machine) => {
    // 確認刪除
    const confirmDelete = window.confirm(
      `確定要刪除機器「${machine.name}」嗎？\n\n注意：這會：\n- 取消所有相關的預約\n- 刪除所有限制規則\n- 刪除所有使用記錄\n\n此操作無法撤銷！`
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/admin/machines/${machine.id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '刪除機器失敗');
      }

      const result = await response.json();
      showSuccess(`機器「${result.machine_name}」刪除成功`);
      
      if (result.cancelled_bookings > 0) {
        showSuccess(`已取消 ${result.cancelled_bookings} 個相關預約`);
      }
      
      await fetchMachines();
    } catch (error) {
      console.error('刪除機器失敗:', error);
      showError(error instanceof Error ? error.message : '刪除機器失敗');
    }
  };

  // 刪除預約
  const handleDeleteBooking = async (booking: BookingDetail) => {
    const confirmMessage = `確定要刪除以下預約嗎？

預約編號: #${booking.id}
用戶: ${booking.user_name} (${booking.user_email})
機器: ${booking.machine_name}
時間: ${formatTaipeiTime(parseISO(booking.start_time), 'yyyy/MM/dd HH:mm')} - ${formatTaipeiTime(parseISO(booking.end_time), 'HH:mm')}
狀態: ${booking.status === 'active' ? '有效' : '已取消'}

注意：此操作將完全刪除預約記錄，無法復原！`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.ADMIN_DELETE_BOOKING(booking.id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '刪除預約失敗');
      }

      const result = await response.json();
      
      showSuccess(`預約已成功刪除！\n${result.details.machine_name} - ${result.details.user_name}`);
      
      // 重新獲取資料
      await fetchBookings();
      await fetchMonthlyStats(currentYear, currentMonth);
      
      // 如果當前有選中日期和打開的詳情弹窗，立即更新該日期的預約詳情
      if (selectedDate && showDateDetails) {
        // 刪除成功後，直接从 selectedDateBookings 中移除被刪除的預約
        setSelectedDateBookings(prev => prev.filter(b => b.id !== booking.id));
      }
      
    } catch (error) {
      console.error('刪除預約失敗:', error);
      showError(error instanceof Error ? error.message : '刪除預約失敗');
    }
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

  if (!['manager', 'admin'].includes(currentUserRole)) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm mb-6">
          {/* 頁面標題 */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">管理介面</h1>
            <p className="text-gray-600 mt-1">當前角色：{currentUserRole === 'admin' ? '管理員' : '經理'}</p>
          </div>

          {/* 導航標籤 */}
          <div className="px-6">
            <div className="flex space-x-1 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserIcon className="h-5 w-5 mr-2" />
                用戶管理
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'bookings'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarIcon className="h-5 w-5 mr-2" />
                預約管理
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BellIcon className="h-5 w-5 mr-2" />
                通知管理
              </button>
              <button
                onClick={() => setActiveTab('machines')}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'machines'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <EyeIcon className="h-5 w-5 mr-2" />
                機器管理
              </button>
            </div>
          </div>

          {/* 內容區域 */}
          <div className="p-6">
            {/* 用戶管理標籤 */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* 搜尋和篩選 */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜尋用戶姓名或email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
              </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">所有角色</option>
                    <option value="user">使用者</option>
                    <option value="manager">經理</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>

                {/* 用戶列表 */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            用戶信息
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            當前角色
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-red-100 text-red-800'
                                  : user.role === 'manager'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'admin' ? '管理員' : user.role === 'manager' ? '經理' : '使用者'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {canModifyRole(user.role) ? (
                                <select
                            value={user.role}
                                  onChange={(e) => handleRoleChange(user.email, e.target.value)}
                                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                  {getAvailableRoles(user.role).map(role => (
                                    <option key={role} value={role}>
                                      {role === 'admin' ? '管理員' : role === 'manager' ? '經理' : '使用者'}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm text-gray-500">無權限修改</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">沒有找到符合條件的用戶</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 預約管理標籤 */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                {/* 頁面標題和搜尋過濾 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">預約管理</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentYear}年{currentMonth}月的預約統計
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

                {/* 搜尋過濾區域 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="搜尋用戶姓名、email或機器名稱..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={bookingSearchTerm}
                          onChange={(e) => setBookingSearchTerm(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      </div>
                    </div>
                    <div className="sm:w-48">
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">所有狀態</option>
                        <option value="active">有效預約</option>
                        <option value="cancelled">已取消</option>
                      </select>
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
                        const dayBookings = filteredBookings.filter(booking => {
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
                                
                                const bgColor = booking.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
                                const textColor = booking.status === 'active' ? 'text-green-700' : 'text-gray-500';
                                
                                return (
                                  <div key={bookingIndex} className={`text-xs ${bgColor} border rounded p-1`}>
                                    <div className={`${textColor} truncate`} title={`${startTime} | ${booking.machine_name} | ${booking.user_name}`}>
                                      {startTime} | {booking.machine_name} | {booking.user_name}
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
                            {selectedDate && format(parseISO(selectedDate + 'T00:00:00'), 'yyyy年M月d日 (EEEE)', { locale: zhTW })} 預約詳情
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
                            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg text-gray-500">該日無預約</p>
                            <p className="text-sm text-gray-400 mt-2">選擇的日期沒有任何預約記錄</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedDateBookings.map((booking) => {
                              const statusConfig = getBookingStatusConfig(booking);
                              const IconComponent = statusConfig.icon;
                              
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
                                        </div>
                                        
                                        <div>
                                          <h4 className="text-sm font-medium text-gray-900 mb-1">使用者資訊</h4>
                                          <p className="text-sm text-gray-600">
                                            {booking.user_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {booking.user_email}
                                          </p>
                                        </div>
                                        
                                        <div>
                                          <h4 className="text-sm font-medium text-gray-900 mb-1">預約時間</h4>
                                          <p className="text-sm text-gray-600">
                                            {formatTaipeiTime(parseISO(booking.created_at), 'yyyy/MM/dd HH:mm')}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* 操作按鈕 */}
                                    <div className="flex items-start">
                                      <button
                                        onClick={() => handleDeleteBooking(booking)}
                                        className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                                        title="刪除預約"
                                      >
                                        <TrashIcon className="h-5 w-5" />
                                      </button>
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
            )}

            {/* 通知管理標籤 */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* 頁面標題和操作按鈕 */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">通知管理</h3>
                  <button
                    onClick={() => {
                      resetNotificationForm();
                      setEditingNotification(null);
                      setShowNotificationForm(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    創建通知
                  </button>
                </div>

                {/* 通知列表 */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {notifications.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              內容
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              等級
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              有效時間
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              創建者
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {notifications.map((notification) => (
                            <tr key={notification.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs whitespace-pre-line">
                                  {notification.content}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelStyle(notification.level)}`}>
                                  {notification.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {notification.start_time && notification.end_time ? (
                                  <div>
                                    <div>{format(parseISO(notification.start_time), 'yyyy/MM/dd HH:mm', { locale: zhTW })}</div>
                                    <div className="text-xs text-gray-400">
                                      至 {format(parseISO(notification.end_time), 'yyyy/MM/dd HH:mm', { locale: zhTW })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">無限期</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{notification.creator_name}</div>
                                  <div className="text-sm text-gray-500">{notification.creator_email}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => startEditNotification(notification)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNotification(notification.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">尚無通知</p>
                    </div>
                  )}
                </div>

                {/* 通知表單彈窗 */}
                {showNotificationForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                      {/* 彈窗標題 */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {editingNotification ? '編輯通知' : '創建通知'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowNotificationForm(false);
                            setEditingNotification(null);
                            resetNotificationForm();
                          }}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      {/* 表單內容 */}
                      <div className="p-6">
                        <div className="space-y-4">
                          {/* 通知內容 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              通知內容 <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 font-normal ml-2">(支持換行顯示)</span>
                            </label>
                            <textarea
                              value={notificationForm.content}
                              onChange={(e) => setNotificationForm({...notificationForm, content: e.target.value})}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="輸入通知內容，可以換行輸入多行說明..."
                            />
                          </div>

                          {/* 等級選擇 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              等級 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex space-x-3">
                              {(['低', '中', '高'] as const).map(level => (
                                <button
                                  key={level}
                                  onClick={() => setNotificationForm({...notificationForm, level})}
                                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                    notificationForm.level === level
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 開始時間 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              開始時間 (預設：當前時間)
                            </label>
                            <input
                              type="datetime-local"
                              value={notificationForm.start_time}
                              onChange={(e) => setNotificationForm({...notificationForm, start_time: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* 結束時間 */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              結束時間 (預設：7天後)
                            </label>
                            <input
                              type="datetime-local"
                              value={notificationForm.end_time}
                              onChange={(e) => setNotificationForm({...notificationForm, end_time: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 彈窗底部 */}
                      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => {
                              setShowNotificationForm(false);
                              setEditingNotification(null);
                              resetNotificationForm();
                            }}
                            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleNotificationSubmit}
                            disabled={!notificationForm.content.trim()}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {editingNotification ? '更新' : '創建'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 機器管理標籤 */}
            {activeTab === 'machines' && (
              <div className="space-y-6">
                {/* 使用說明和新增按鈕 */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <EyeIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">
                          <strong>使用說明：</strong>點擊機器行可直接編輯機器信息，點擊右側按鈕管理限制規則。
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 新增機器按鈕 - 只有管理員可見 */}
                  {currentUserRole === 'admin' && (
                    <button
                      onClick={() => setIsCreateMachineModalOpen(true)}
                      className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      新增機器
                    </button>
                  )}
                </div>

                {/* 機器列表 */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            機器信息
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            狀態
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {machines.map((machine) => (
                          <tr 
                            key={machine.id} 
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => {
                              setEditingMachine(machine);
                            }}
                          >
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{machine.name}</div>
                                <div className="text-sm text-gray-500 whitespace-pre-line">{machine.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  machine.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {machine.status === 'active' ? '啟用中' : 
                                   machine.status === 'maintenance' ? '維護中' : 
                                   machine.status === 'limited' ? '限制使用' : '已停用'}
                                </span>
                                {machine.restriction_status !== 'none' && (
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    machine.restriction_status === 'blocked' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {machine.restriction_status === 'blocked' ? '已封鎖' : '有限制'}
                                  </span>
                                )}
                                {machine.restriction_count > 0 && (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {machine.restriction_count} 個限制規則
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // 防止觸發行點擊事件
                                    setEditingMachine(machine);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                                  title="編輯機器"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // 防止觸發行點擊事件
                                    setSelectedMachine(machine);
                                    fetchMachineRestrictions(machine.id);
                                  }}
                                  className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                                  title="管理限制"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                {/* 刪除按鈕 - 只有管理員可見 */}
                                {currentUserRole === 'admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // 防止觸發行點擊事件
                                      handleDeleteMachine(machine);
                                    }}
                                    className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                                    title="刪除機器"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {machines.length === 0 && (
                    <div className="text-center py-12">
                      <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">沒有找到符合條件的機器</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 通知管理器 */}
      <NotificationManager
        notifications={useNotificationsNotifications}
        onRemove={removeNotification}
      />

      {/* 編輯通知彈窗 */}
      {(isCreateMachineModalOpen || editingMachine) && (
        <MachineEditModal
          machine={editingMachine}
          isOpen={isCreateMachineModalOpen || !!editingMachine}
          onClose={() => {
            setIsCreateMachineModalOpen(false);
            setEditingMachine(null);
          }}
          onSubmit={handleMachineSubmit}
        />
      )}

      {/* 機器限制管理彈窗 */}
      {(isRestrictionModalOpen || selectedMachine) && (
        <MachineRestrictionsModal
          machine={selectedMachine}
          isOpen={isRestrictionModalOpen || !!selectedMachine}
          onClose={() => {
            setIsRestrictionModalOpen(false);
            setSelectedMachine(null);
            setMachineRestrictions([]);
          }}
          onUpdate={async () => {
            if (selectedMachine) {
              await fetchMachineRestrictions(selectedMachine.id);
              await fetchMachines();
            }
          }}
        />
      )}
              </div>
  );
}

// 機器限制管理彈窗組件
function MachineRestrictionsModal({ 
  machine, 
  isOpen, 
  onClose, 
  onUpdate 
}: { 
  machine: Machine | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onUpdate: () => void; 
}) {
  const { data: session } = useSession();
  const [restrictions, setRestrictions] = useState<MachineRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRestriction, setNewRestriction] = useState({
    restriction_type: 'year_limit',
    restriction_rule: '',
    year_operator: 'lte', // 年份限制：比較運算子 (lt, lte, eq, gte, gt)
    year_value: '', // 年份限制：年份值
    // 滾動窗口限制相關欄位
    window_size: '', // 滾動窗口大小（時段數）
    max_bookings: '', // 窗口內最大預約次數
    start_time: '',
    end_time: ''
  });

  const fetchRestrictions = async () => {
    if (!machine) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/machines/${machine.id}/restrictions`, {
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error('獲取機器限制失敗');
      }

      const data = await response.json();
      setRestrictions(data.restrictions || []);
    } catch (error) {
      console.error('獲取機器限制失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestriction = async () => {
    if (!machine) return;

    try {
      let ruleObject = {};

      // 驗證必填欄位
      if (!newRestriction.start_time || !newRestriction.end_time) {
        alert('請填寫開始時間和結束時間');
        return;
      }

      if (newRestriction.restriction_type === 'year_limit') {
        const yearValue = parseInt(newRestriction.year_value);
        if (!yearValue || yearValue < 100 || yearValue > 150) {
          alert('請輸入有效的民國年份 (100-150)');
          return;
        }
        
        // 轉換民國年為西元年
        const westernYear = yearValue + 1911;
        const currentYear = new Date().getFullYear();
        
        // 生成運算子描述
        const operatorDescriptions = {
          'lt': '小於',
          'lte': '小於等於', 
          'eq': '等於',
          'gte': '大於等於',
          'gt': '大於'
        };
        
        ruleObject = {
          restriction_type: 'year_limit',
          operator: newRestriction.year_operator,
          target_year: yearValue, // 民國年
          target_year_western: westernYear, // 西元年
          current_year: currentYear,
          description: `限制民國${operatorDescriptions[newRestriction.year_operator as keyof typeof operatorDescriptions]}${yearValue}年入學的用戶 (西元${westernYear}年)`
        };
      } else if (newRestriction.restriction_type === 'usage_limit') {
        // 只支援新的滾動窗口格式
        if (newRestriction.window_size && newRestriction.max_bookings) {
          // 新的滾動窗口格式
          const windowSize = parseInt(newRestriction.window_size);
          const maxBookings = parseInt(newRestriction.max_bookings);
          
          if (!windowSize || windowSize < 1) {
            alert('請輸入有效的滾動窗口大小 (最少1個時段)');
            return;
          }
          
          if (!maxBookings || maxBookings < 1) {
            alert('請輸入有效的最大預約次數 (最少1次)');
            return;
          }
          
          if (maxBookings >= windowSize) {
            alert('最大預約次數應該小於窗口大小，否則限制無效');
            return;
          }
          
          ruleObject = {
            restriction_type: 'rolling_window_limit',
            window_size: windowSize,
            max_bookings: maxBookings,
            description: `任意連續${windowSize}個時段內，最多只能預約${maxBookings}次（窗口大小：${windowSize * 4}小時）`
          };
        } else {
          alert('請填寫滾動窗口參數：窗口大小和最大預約次數');
          return;
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/machines/${machine.id}/restrictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': session?.user?.email || '',
        },
        body: JSON.stringify({
          restriction_type: newRestriction.restriction_type,
          restriction_rule: JSON.stringify(ruleObject),
          start_time: newRestriction.start_time,
          end_time: newRestriction.end_time,
        }),
      });

      if (!response.ok) {
        throw new Error('創建限制規則失敗');
      }

      setNewRestriction({
        restriction_type: 'year_limit',
        restriction_rule: '',
        year_operator: 'lte',
        year_value: '',
        window_size: '',
        max_bookings: '',
        start_time: '',
        end_time: ''
      });
      setShowCreateForm(false);
      await fetchRestrictions();
      await onUpdate();
    } catch (error) {
      console.error('創建限制規則失敗:', error);
    }
  };

  const handleDeleteRestriction = async (restrictionId: string) => {
    if (!machine) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/machines/${machine.id}/restrictions/${restrictionId}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Email': session?.user?.email || '',
        },
      });

      if (!response.ok) {
        throw new Error('刪除限制規則失敗');
      }

      await fetchRestrictions();
      await onUpdate();
    } catch (error) {
      console.error('刪除限制規則失敗:', error);
    }
  };

  useEffect(() => {
    if (isOpen && machine) {
      fetchRestrictions();
    }
  }, [isOpen, machine]);

  if (!isOpen || !machine) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto touch-manipulation">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">機器限制管理 - {machine.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 -m-2 touch-manipulation"
            aria-label="關閉"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 創建限制表單 */}
        {showCreateForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-md font-medium mb-4">創建限制規則</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  限制類型
                </label>
                <select
                  value={newRestriction.restriction_type}
                  onChange={(e) => setNewRestriction({...newRestriction, restriction_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="year_limit">年份限制</option>
                  <option value="usage_limit">使用次數限制</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  限制規則
                </label>
                {newRestriction.restriction_type === 'year_limit' ? (
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <select
                          value={newRestriction.year_operator}
                          onChange={(e) => setNewRestriction({...newRestriction, year_operator: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="lt">小於</option>
                          <option value="lte">小於等於</option>
                          <option value="eq">等於</option>
                          <option value="gte">大於等於</option>
                          <option value="gt">大於</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          value={newRestriction.year_value}
                          onChange={(e) => setNewRestriction({...newRestriction, year_value: e.target.value})}
                          placeholder="民國年份 (如: 113)"
                          min="100"
                          max="150"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center px-2 text-sm text-gray-600">
                        年
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      例如：選擇「小於等於 113」表示限制民國113年以前入學的用戶
                    </div>
                    {newRestriction.year_value && (
                      <div className="text-xs text-blue-600">
                        民國{newRestriction.year_value}年 = 西元{parseInt(newRestriction.year_value) + 1911}年
                      </div>
                    )}
                  </div>
                ) : newRestriction.restriction_type === 'usage_limit' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          滾動窗口大小（時段數）
                        </label>
                        <input
                          type="number"
                          value={newRestriction.window_size}
                          onChange={(e) => setNewRestriction({...newRestriction, window_size: e.target.value})}
                          placeholder="例如: 13"
                          min="1"
                          max="50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          檢查窗口的時段數量
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          窗口內最大預約次數
                        </label>
                        <input
                          type="number"
                          value={newRestriction.max_bookings}
                          onChange={(e) => setNewRestriction({...newRestriction, max_bookings: e.target.value})}
                          placeholder="例如: 12"
                          min="1"
                          max="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          在滾動窗口內允許的最大預約次數
              </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-md">
                      <div className="text-xs text-green-800 font-medium mb-2">✨ 新滾動窗口限制機制說明：</div>
                      <div className="text-xs text-green-700 space-y-1">
                        <div>• 一天分為6個時間段：0-4時、4-8時、8-12時、12-16時、16-20時、20-24時</div>
                        <div>• 檢查任意連續N個時段內，是否超過最大預約次數</div>
                        <div>• 不需要連續使用才觸發，更靈活和公平</div>
                        <div>• 例如：13個時段內最多12次，任何時候都會檢查前12個時段的使用情況</div>
                      </div>
                    </div>
                    {newRestriction.window_size && newRestriction.max_bookings && (
                      <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                        <strong>規則預覽：</strong>任意連續{newRestriction.window_size}個時段內，
                        最多只能預約{newRestriction.max_bookings}次。
                        窗口大小：{parseInt(newRestriction.window_size) * 4}小時
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newRestriction.start_time}
                  onChange={(e) => setNewRestriction({...newRestriction, start_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  結束時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={newRestriction.end_time}
                  onChange={(e) => setNewRestriction({...newRestriction, end_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  限制規則只在此時間範圍內生效
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 touch-manipulation min-h-[44px] flex items-center justify-center"
              >
                取消
              </button>
              <button
                onClick={handleCreateRestriction}
                disabled={
                  !newRestriction.start_time || 
                  !newRestriction.end_time ||
                  (newRestriction.restriction_type === 'year_limit' 
                    ? !newRestriction.year_value 
                    : newRestriction.restriction_type === 'usage_limit'
                    ? // 只支援滾動窗口格式驗證
                      !newRestriction.window_size || !newRestriction.max_bookings
                    : false)
                }
                className="px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] flex items-center justify-center"
              >
                創建
              </button>
            </div>
          </div>
        )}

        {/* 限制列表 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">當前限制規則</h4>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px] flex items-center justify-center"
            >
              {showCreateForm ? '取消' : '新增限制'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : restrictions.length > 0 ? (
            <div className="space-y-3">
              {restrictions.map((restriction) => (
                <div key={restriction.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {restriction.restriction_type === 'year_limit' ? '年份限制' : 
                          restriction.restriction_type === 'usage_limit' ? '使用次數限制' : '未知類型'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          restriction.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {restriction.is_active ? '生效中' : '已停用'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{restriction.restriction_rule}</p>
                      {(restriction.start_time || restriction.end_time) && (
                        <div className="text-xs text-gray-500">
                          {restriction.start_time && restriction.end_time ? (
                            <span>有效期間：{new Date(restriction.start_time).toLocaleString('zh-TW')} 至 {new Date(restriction.end_time).toLocaleString('zh-TW')}</span>
                          ) : restriction.start_time ? (
                            <span>開始時間：{new Date(restriction.start_time).toLocaleString('zh-TW')}</span>
                          ) : restriction.end_time ? (
                            <span>結束時間：{new Date(restriction.end_time).toLocaleString('zh-TW')}</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteRestriction(restriction.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              尚未設定限制規則
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 機器編輯彈窗組件
function MachineEditModal({ 
  machine, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  machine: Machine | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    restriction_status: 'none'
  });

  useEffect(() => {
    if (machine) {
      setFormData({
        name: machine.name,
        description: machine.description,
        status: machine.status,
        restriction_status: machine.restriction_status
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'active',
        restriction_status: 'none'
      });
    }
  }, [machine]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">
            {machine ? '編輯機器' : '新增機器'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              機器名稱 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              機器描述 * 
              <span className="text-xs text-gray-500 font-normal ml-2">(支持換行顯示)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              placeholder="請輸入機器描述，可以換行輸入多行說明..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              機器狀態
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">啟用中</option>
              <option value="maintenance">維護中</option>
              <option value="limited">限制使用</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              限制狀態
            </label>
            <select
              value={formData.restriction_status}
              onChange={(e) => setFormData({...formData, restriction_status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">無限制</option>
              <option value="limited">部分限制</option>
              <option value="blocked">完全封鎖</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {machine ? '更新' : '創建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 