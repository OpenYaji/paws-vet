// Import comprehensive types from database.ts
export type {
  Pet,
  PetWithRelations,
  PetInsurance,
  Gender,
  PetFilters,
  CreatePetRequest,
  UpdatePetRequest
} from './database';

// Additional pet-specific utility types
export interface PetMedicalHistory {
  pet_id: string;
  appointments: Array<{
    id: string;
    date: string;
    veterinarian_name: string;
    reason_for_visit: string;
    notes?: string;
  }>;
  vaccinations: Array<{
    id: string;
    vaccine_name: string;
    date_administered: string;
    next_due_date?: string;
  }>;
  allergies: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    start_date: string;
    end_date?: string;
  }>;
}

export interface PetVitals {
  weight: number;
  temperature?: number;
  heart_rate?: number;
  recorded_at: string;
  recorded_by: string;
}
