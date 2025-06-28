export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export const API_ENDPOINTS = {
  // Auth
  AUTH_GOOGLE: `${API_URL}/auth/google`,
  
  // Users
  USERS: `${API_URL}/users`,
  
  // Machines
  MACHINES: `${API_URL}/machines`,
  MACHINE_RESTRICTIONS_ALL: `${API_URL}/machines/restrictions/all`,
  
  // Bookings
  BOOKINGS: `${API_URL}/bookings`,
  BOOKING_BY_ID: (id: string) => `${API_URL}/bookings/${id}`,
  MACHINE_BOOKINGS: (machineId: string, startDate: string, endDate: string) => 
    `${API_URL}/bookings/machine/${machineId}?start_date=${startDate}&end_date=${endDate}`,
  
  // Time slots
  AVAILABLE_TIME_SLOTS: (machineId: string, startDate: string, endDate: string) => 
    `${API_URL}/time-slots/available/${machineId}?startDate=${startDate}&endDate=${endDate}`,
  
  // Admin
  ADMIN_DELETE_BOOKING: (id: string) => `${API_URL}/admin/bookings/${id}`,
}; 