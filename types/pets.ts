export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'unknown';
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
  // Related data
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address_line1?: string;
    city?: string;
    state?: string;
  };
  image_url?: string;
}

export interface PetFilters {
  species?: string;
  search?: string;
  owner?: string;
}
