import { Machine, TimeSlot, MachineRestriction } from '@/types';
import { API_ENDPOINTS } from '@/config/api';
import { addDays, subDays, format } from 'date-fns';
import { 
  getTaipeiNow, 
  formatTimeSlotForBackend, 
  formatDateTimeForBackend 
} from '@/lib/timezone';

// 自定義API錯誤類
export class ApiError extends Error {
  public success: boolean;
  public error_type: string;
  public details?: any;
  public status: number;

  constructor(
    message: string, 
    errorType: string = 'unknown', 
    success: boolean = false, 
    details?: any,
    status: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
    this.success = success;
    this.error_type = errorType;
    this.details = details;
    this.status = status;
  }
}

// API 請求輔助函數
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      
      // 如果後端返回了結構化的錯誤信息
      if (errorData.success === false && errorData.error_type && errorData.message) {
        throw new ApiError(
          errorData.message,
          errorData.error_type,
          errorData.success,
          errorData.details,
          response.status
        );
      }
      
      // 兼容舊的錯誤格式
      const message = errorData.message || errorData.error || '請求失敗';
      throw new ApiError(message, 'unknown', false, errorData, response.status);
      
    } catch (parseError) {
      // 如果無法解析JSON，使用默認錯誤
      if (parseError instanceof ApiError) {
        throw parseError;
      }
      throw new ApiError(`請求失敗 (${response.status})`, 'network_error', false, null, response.status);
    }
  }

  return response.json();
};

// 格式化日期時間為 "YYYY-MM-DD HH:mm:ss" (已棄用，使用台北時區版本)
const formatDateTime = (date: Date): string => {
  return formatDateTimeForBackend(date);
};

// 格式化時段為 "YYYY/MM/DD/HH" (已棄用，使用台北時區版本)
const formatTimeSlot = (date: Date): string => {
  return formatTimeSlotForBackend(date);
};

export const api = {
  // 機器相關
  machines: {
    // 獲取所有機器
    getAll: async (userEmail?: string): Promise<Machine[]> => {
      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['X-User-Email'] = userEmail;
      }
      return fetchWithAuth(API_ENDPOINTS.MACHINES, { headers });
    },

    // 獲取單個機器
    getById: async (id: string): Promise<Machine | null> => {
      const { API_URL } = await import('@/config/api');
      return fetchWithAuth(`${API_URL}/machines/${id}`);
    },

    // 檢查機器訪問權限
    checkAccess: async (machineId: string, userEmail: string): Promise<{
      allowed: boolean;
      reason?: string;
      machine_name?: string;
    }> => {
      const { API_URL } = await import('@/config/api');
      return fetchWithAuth(`${API_URL}/machines/${machineId}/check-access`, {
        headers: {
          'X-User-Email': userEmail,
        },
      });
    },

    // 獲取單個機器限制規則
    getRestrictions: async (machineId: string, userEmail?: string): Promise<MachineRestriction[]> => {
      const { API_URL } = await import('@/config/api');
      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['X-User-Email'] = userEmail;
      }
      
      try {
        const response = await fetchWithAuth(`${API_URL}/machines/${machineId}/restrictions`, { 
          headers 
        });
        return response.restrictions || [];
      } catch (error) {
        console.warn(`Failed to fetch restrictions for machine ${machineId}:`, error);
        return [];
      }
    },

    // 新增：批量獲取所有機器限制規則
    getAllRestrictions: async (userEmail?: string): Promise<Record<string, MachineRestriction[]>> => {
      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['X-User-Email'] = userEmail;
      }
      
      try {
        // 嘗試使用批量API端點（如果後端有提供）
        const response = await fetchWithAuth(API_ENDPOINTS.MACHINE_RESTRICTIONS_ALL, { 
          headers 
        });
        return response.restrictions || {};
      } catch (error) {
        console.warn('Batch restrictions API not available, falling back to individual requests');
        
        // 回退到逐個獲取（為了向後兼容）
        const machines = await api.machines.getAll(userEmail);
        const restrictionsMap: Record<string, MachineRestriction[]> = {};
        
        // 並行獲取所有機器的限制資訊
        const results = await Promise.allSettled(
          machines.map(async (machine) => {
            const restrictions = await api.machines.getRestrictions(machine.id, userEmail);
            return { machineId: machine.id, restrictions };
          })
        );
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            restrictionsMap[result.value.machineId] = result.value.restrictions;
          }
        });
        
        return restrictionsMap;
      }
    },

    // 修改：優化的批量獲取所有機器及其限制資訊
    getAllWithRestrictions: async (userEmail?: string): Promise<Machine[]> => {
      try {
        // 並行獲取機器列表和限制資訊
        const [machines, restrictionsMap] = await Promise.all([
          api.machines.getAll(userEmail),
          api.machines.getAllRestrictions(userEmail)
        ]);
        
        // 合併機器和限制資訊
        const machinesWithRestrictions = machines.map((machine) => ({
          ...machine,
          restrictions: (restrictionsMap[machine.id] || []).filter(r => r.is_active) // 只返回啟用的限制
        }));
        
        return machinesWithRestrictions;
      } catch (error) {
        console.error('Failed to fetch machines with restrictions:', error);
        // 回退到只獲取機器列表
        const machines = await api.machines.getAll(userEmail);
        return machines.map(machine => ({ ...machine, restrictions: [] }));
      }
    },
  },

  // 預約相關
  bookings: {
    // 獲取日曆視圖專用的預約資料 (包含格式化用戶姓名)
    getCalendarViewBookings: async (params: {
      startDate: string;
      endDate: string;
      machineIds?: string[];
    }): Promise<{
      bookings: Array<{
        id: string;
        machine_id: string;
        machine_name: string;
        user_email: string;
        user_display_name: string;
        time_slot: string;
        status: string;
        created_at: string;
      }>;
      total: number;
    }> => {
      const { API_URL } = await import('@/config/api');
      const url = new URL(`${API_URL}/bookings/calendar-view`);
      
      // 添加查詢參數
      url.searchParams.append('start_date', params.startDate);
      url.searchParams.append('end_date', params.endDate);
      
      // 添加機器ID參數（支援多個）
      if (params.machineIds && params.machineIds.length > 0) {
        params.machineIds.forEach(id => {
          url.searchParams.append('machine_ids', id);
        });
      }
      
      return fetchWithAuth(url.toString());
    },

    // 創建預約
    create: async (params: {
      user_email: string;
      machine_id: string;
      time_slot: Date;
    }): Promise<{ booking_id: number; status: string }> => {
      // 驗證時段是否為有效的 4 小時區塊
      const hour = params.time_slot.getHours();
      if (![0, 4, 8, 12, 16, 20].includes(hour)) {
        throw new Error('時段必須為 4 小時區塊：00:00, 04:00, 08:00, 12:00, 16:00, 20:00');
      }

      const now = getTaipeiNow(); // 使用台北時間
      const requestBody = {
        user_email: params.user_email,
        machine_id: params.machine_id,
        time_slot: formatTimeSlotForBackend(params.time_slot), // 使用台北時區格式化
        created_at: formatDateTimeForBackend(now), // 使用台北時區格式化
        status: 'active',
      };
      
      return fetchWithAuth(API_ENDPOINTS.BOOKINGS, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },

    // 取消預約
    cancel: async (bookingId: string, userEmail: string): Promise<void> => {
      return fetchWithAuth(API_ENDPOINTS.BOOKING_BY_ID(bookingId), {
        method: 'DELETE',
        body: JSON.stringify({
          user_email: userEmail
        }),
      });
    },

    // 獲取使用者的所有預約
    getUserBookings: async (): Promise<any[]> => {
      return fetchWithAuth(API_ENDPOINTS.BOOKINGS);
    },

    // 獲取特定用戶的所有預約
    getUserBookingsByEmail: async (userEmail: string): Promise<any> => {
      const { API_URL } = await import('@/config/api');
      return fetchWithAuth(`${API_URL}/users/${encodeURIComponent(userEmail)}/bookings`);
    },

    // 獲取特定用戶的月度預約
    getUserMonthlyBookings: async (userEmail: string, year: number, month: number): Promise<any> => {
      const { API_URL } = await import('@/config/api');
      return fetchWithAuth(`${API_URL}/users/${encodeURIComponent(userEmail)}/bookings/monthly?year=${year}&month=${month}`);
    },

    // 獲取機器的預約時段
    getMachineBookings: async (machineId: string, userEmail?: string): Promise<any[]> => {
      const today = getTaipeiNow(); // 使用台北時間
      const startDate = format(subDays(today, 1), 'yyyy-MM-dd');
      const endDate = format(addDays(today, 60), 'yyyy-MM-dd');

      const headers: Record<string, string> = {};
      if (userEmail) {
        headers['X-User-Email'] = userEmail;
      }

      return fetchWithAuth(
        API_ENDPOINTS.MACHINE_BOOKINGS(machineId, startDate, endDate),
        {
          headers
        }
      );
    },
  },

  // 使用者相關
  users: {
    // 創建或獲取使用者資料
    createOrGet: async (userData: { name: string; email: string }): Promise<{ role: string }> => {
      return fetchWithAuth(API_ENDPOINTS.USERS, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
  },
}; 