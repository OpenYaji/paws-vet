// lib/auth-helpers.ts
import { supabase } from '@/lib/auth-client';

export type UserRole = 'client' | 'veterinarian' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  account_status: 'active' | 'inactive' | 'suspended';
}

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
  communication_preference: 'email' | 'sms' | 'phone' | 'any';
}

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
  consultation_fee?: number;
  employment_status: 'full_time' | 'part_time' | 'contract' | 'terminated';
}

export interface AdminProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  phone: string;
  department?: string;
  position: string;
  access_level: number;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get user profile from the users table
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, account_status')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data as UserProfile;
}

/**
 * Get client profile
 */
export async function getClientProfile(userId: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching client profile:', error);
    return null;
  }

  return data as ClientProfile;
}

/**
 * Get veterinarian profile
 */
export async function getVeterinarianProfile(userId: string): Promise<VeterinarianProfile | null> {
  const { data, error } = await supabase
    .from('veterinarian_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching veterinarian profile:', error);
    return null;
  }

  return data as VeterinarianProfile;
}

/**
 * Get admin profile
 */
export async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching admin profile:', error);
    return null;
  }

  return data as AdminProfile;
}

/**
 * Get full user data including role-specific profile
 */
export async function getFullUserProfile(userId: string) {
  const userProfile = await getUserProfile(userId);

  if (!userProfile) {
    return null;
  }

  let roleProfile = null;

  switch (userProfile.role) {
    case 'client':
      roleProfile = await getClientProfile(userId);
      break;
    case 'veterinarian':
      roleProfile = await getVeterinarianProfile(userId);
      break;
    case 'admin':
      roleProfile = await getAdminProfile(userId);
      break;
  }

  return {
    user: userProfile,
    profile: roleProfile,
  };
}

/**
 * Check if user has specific role
 */
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const userProfile = await getUserProfile(userId);
  return userProfile?.role === role;
}

/**
 * Check if user is active
 */
export async function isUserActive(userId: string): Promise<boolean> {
  const userProfile = await getUserProfile(userId);
  return userProfile?.account_status === 'active';
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating last login:', error);
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get user's display name based on their profile
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  const fullProfile = await getFullUserProfile(userId);

  if (!fullProfile || !fullProfile.profile) {
    return 'User';
  }

  const profile = fullProfile.profile as any;
  
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`;
  }

  return fullProfile.user.email;
}