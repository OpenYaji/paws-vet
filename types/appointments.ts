// Import comprehensive types from database.ts
import type {
  Appointment,
  AppointmentWithRelations,
  AppointmentType,
  AppointmentStatus,
  AppointmentFilters,
  CreateAppointmentRequest,
  UpdateAppointmentRequest
} from './database';

// Additional appointment-specific utility types
export interface AppointmentCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    appointment: AppointmentWithRelations;
    status: AppointmentStatus;
    type: AppointmentType;
  };
}

export interface AppointmentTimeSlot {
  date: string;
  time: string;
  available: boolean;
  veterinarian_id: string;
}

export interface VeterinarianSchedule {
  veterinarian_id: string;
  date: string;
  available_slots: AppointmentTimeSlot[];
  booked_appointments: Appointment[];
}
