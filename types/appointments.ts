export interface Appointment {
  id: string;
  appointment_number: string;
  pet_id: string;
  veterinarian_id: string;
  booked_by: string;
  appointment_type: 'checkup' | 'vaccination' | 'surgery' | 'emergency' | 'consultation' | 'followup';
  appointment_status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  reason_for_visit: string;
  special_instructions?: string;
  cancellation_reason?: string;
  is_emergency: boolean;
  reminder_sent: boolean;
  checked_in_at?: string;
  checked_out_at?: string;
  created_at: string;
  updated_at: string;
  // Related data
  pet?: {
    id: string;
    name: string;
    species: string;
    breed?: string;
  };
  veterinarian?: {
    id: string;
    first_name: string;
    last_name: string;
    specializations?: string[];
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
}

export interface AppointmentFilters {
  status?: string;
  date?: string;
  veterinarian?: string;
  search?: string;
}
