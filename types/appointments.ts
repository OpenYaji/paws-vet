// Import comprehensive types from database.ts
import type {
  Appointment,
  AppointmentWithRelations,
  AppointmentStatus,
  AppointmentType
} from './database';

export type {
  Appointment,
  AppointmentWithRelations,
  AppointmentStatus,
  AppointmentType
};

// Type that matches the shape returned by /api/appointments
// (uses Supabase query aliases: pet, veterinarian, pet.client)
export interface AppointmentApiResponse extends Appointment {
  pet?: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    owner_id: string;
    client?: {
      id: string;
      first_name: string;
      last_name: string;
      phone: string;
      email?: { email: string }; // nested from users join
    };
  };
  veterinarian?: {
    id: string;
    first_name: string;
    last_name: string;
    specializations?: string[];
  };
}

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
