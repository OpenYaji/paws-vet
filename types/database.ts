// =====================================================
// COMPREHENSIVE DATABASE TYPES
// Generated from Supabase schema
// =====================================================

// Enums matching database enums
export type UserRole = 'client' | 'veterinarian' | 'admin';
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'wellness' | 'emergency' | 'follow_up' | 'surgery' | 'vaccination' | 'dental' | 'consultation';
export type AccountStatus = 'active' | 'inactive' | 'suspended';
export type EmploymentStatus = 'full_time' | 'part_time' | 'contract' | 'terminated';
export type Gender = 'male' | 'female' | 'unknown';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'refunded';
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'online' | 'insurance' | 'check';
export type NotificationType = 'appointment_reminder' | 'test_results' | 'payment_due' | 'appointment_confirmed' | 'appointment_cancelled' | 'general';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type CommunicationPreference = 'email' | 'sms' | 'phone' | 'any';
export type ActionType = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';

// Base User table
export interface User {
  id: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
}

// Client profiles (pet owners)
export interface ClientProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  alternate_phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  communication_preference: CommunicationPreference;
  registration_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Veterinarian profiles
export interface VeterinarianProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  phone: string;
  specializations?: string[];
  certifications?: string[];
  years_of_experience?: number;
  biography?: string;
  consultation_fee?: number;
  employment_status: EmploymentStatus;
  hire_date: string;
  termination_date?: string;
  created_at: string;
  updated_at: string;
}

// Admin profiles
export interface AdminProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  phone: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

// Pets table
export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  date_of_birth?: string;
  gender?: Gender;
  color?: string;
  weight?: number;
  microchip_number?: string;
  is_spayed_neutered: boolean;
  special_needs?: string;
  behavioral_notes?: string;
  current_medical_status?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

// Pet insurance information
export interface PetInsurance {
  id: string;
  pet_id: string;
  provider_name: string;
  policy_number: string;
  coverage_details?: string;
  effective_date: string;
  expiration_date: string;
  requires_preauth: boolean;
  preauth_phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Appointments table
export interface Appointment {
  id: string;
  appointment_number: string;
  pet_id: string;
  veterinarian_id: string;
  booked_by: string;
  appointment_type: AppointmentType;
  appointment_status: AppointmentStatus;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  reason_for_visit: string;
  special_instructions?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  is_emergency: boolean;
  reminder_sent: boolean;
  reminder_sent_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Extended types with relationships
export interface AppointmentWithRelations extends Appointment {
  pets?: Pet & {
    client_profiles?: ClientProfile;
  };
  veterinarian_profiles?: VeterinarianProfile;
  booked_by_user?: User;
}

export interface PetWithRelations extends Pet {
  client_profiles?: ClientProfile;
  pet_insurance?: PetInsurance[];
}

// Utility types for forms and filtering
export interface AppointmentFilters {
  status?: AppointmentStatus[];
  type?: AppointmentType[];
  date_from?: string;
  date_to?: string;
  veterinarian_id?: string;
  pet_id?: string;
  search?: string;
  is_emergency?: boolean;
}

export interface PetFilters {
  species?: string[];
  owner_id?: string;
  search?: string;
  is_active?: boolean;
}

// Form types for creating/updating
export interface CreateAppointmentRequest {
  pet_id: string;
  veterinarian_id: string;
  appointment_type: AppointmentType;
  scheduled_start: string;
  scheduled_end: string;
  reason_for_visit: string;
  special_instructions?: string;
  is_emergency?: boolean;
}

export interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  appointment_status?: AppointmentStatus;
  actual_start?: string;
  actual_end?: string;
  cancellation_reason?: string;
  checked_in_at?: string;
  checked_out_at?: string;
}

export interface CreatePetRequest {
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  date_of_birth?: string;
  gender?: Gender;
  color?: string;
  weight?: number;
  microchip_number?: string;
  is_spayed_neutered?: boolean;
  special_needs?: string;
  behavioral_notes?: string;
  current_medical_status?: string;
}

export interface UpdatePetRequest extends Partial<CreatePetRequest> {
  is_active?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}