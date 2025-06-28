export interface Machine {
  id: string;
  name: string;
  description: string;
  shortDesc: string;
  status: 'active' | 'maintenance' | 'limited';
  restriction_status?: 'none' | 'limited' | 'blocked';
  is_restricted?: boolean;
  restriction_reason?: string;
  restrictions?: MachineRestriction[];
}

export interface MachineRestriction {
  id: string;
  restriction_type: string;
  restriction_rule: string;
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
  machineId: string;
  id?: string;
  reason?: string;
}

export interface Booking {
  id: number;
  user_email: string;
  machine_id: string;
  time_slot: string; // Format: "YYYY/MM/DD/HH"
  created_at: string; // Format: "YYYY-MM-DD HH:mm:ss"
  status: 'active' | 'cancelled';
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface BookingDetail {
  id: string;
  user_email: string;
  time_slot: string;
  status: 'active' | 'cancelled';
  machine_id: string;
  created_at: string | null;
} 