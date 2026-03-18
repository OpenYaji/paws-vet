'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit2, Upload, X, PawPrint } from 'lucide-react';
import { supabase } from '@/lib/auth-client';
import { sendAdminNotification } from '@/lib/notifications';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  date_of_birth: string;
  gender: string;
  color: string;
  weight: number;
  microchip_number: string | null;
  is_spayed_neutered: boolean;
  special_needs: string | null;
  behavioral_notes: string | null;
  current_medical_status: string | null;
  photo_url: string | null;
}

interface FormData {
  name: string;
  species: string;
  breed: string;
  date_of_birth: string;
  gender: string;
  color: string;
  weight: string;
  microchip_number: string;
  is_spayed_neutered: boolean;
  special_needs: string;
  behavioral_notes: string;
  current_medical_status: string;
}

// FIX: PetForm defined OUTSIDE PetsPage so it's not recreated on every render
function PetForm({
  formData,
  setFormData,
  photoPreview,
  uploading,
  editingPet,
  handleSubmit,
  handleModalClose,
  handlePhotoChange,
  removePhoto,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
  photoPreview: string;
  uploading: boolean;
  editingPet: Pet | null;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleModalClose: () => void;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: () => void;
}) {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Pet Photo (Optional)</label>

        {photoPreview ? (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
            <img
              src={photoPreview}
              alt="Pet preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-2 hover:bg-destructive/90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-accent/20 transition-colors duration-150">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Click to upload pet photo</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Pet Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Buddy"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Species *</label>
          <select
            value={formData.species}
            onChange={(e) => setFormData({ ...formData, species: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            required
          >
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="rabbit">Rabbit</option>
            <option value="bird">Bird</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Breed</label>
          <Input
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            placeholder="e.g., Golden Retriever"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Date of Birth *</label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Gender *</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            required
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Color</label>
          <Input
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            placeholder="e.g., Brown, White"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Weight (kg) *</label>
          <Input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            placeholder="e.g., 25.5"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Microchip Number</label>
          <Input
            value={formData.microchip_number}
            onChange={(e) => setFormData({ ...formData, microchip_number: e.target.value })}
            placeholder="e.g., 123456789012345"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="spayedNeutered"
          checked={formData.is_spayed_neutered}
          onChange={(e) => setFormData({ ...formData, is_spayed_neutered: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="spayedNeutered" className="text-sm font-medium">
          Spayed/Neutered
        </label>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Behavioral Notes</label>
        <textarea
          value={formData.behavioral_notes}
          onChange={(e) => setFormData({ ...formData, behavioral_notes: e.target.value })}
          placeholder="Behavioral traits, temperament, training notes..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-24"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Special Needs</label>
        <textarea
          value={formData.special_needs}
          onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
          placeholder="Dietary restrictions, mobility issues, etc..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-24"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Current Medical Status</label>
        <textarea
          value={formData.current_medical_status}
          onChange={(e) => setFormData({ ...formData, current_medical_status: e.target.value })}
          placeholder="Current medications, allergies, ongoing treatments..."
          className="w-full px-3 py-2 border border-border rounded-md bg-background min-h-24"
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleModalClose}
          className="flex-1"
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-primary" disabled={uploading}>
          {uploading ? (editingPet ? 'Updating...' : 'Adding...') : (editingPet ? 'Update Pet' : 'Add Pet')}
        </Button>
      </div>
    </form>
  );
}

const calculateAge = (dob: string) => {
  const birthDate = new Date(dob);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth();
  if (ageInMonths < 0) return 'Newborn';
  if (ageInMonths < 12) return `${ageInMonths} months`;
  return `${Math.floor(ageInMonths / 12)} years`;
};

const emptyForm: FormData = {
  name: '',
  species: 'dog',
  breed: '',
  date_of_birth: '',
  gender: 'male',
  color: '',
  weight: '',
  microchip_number: '',
  is_spayed_neutered: false,
  special_needs: '',
  behavioral_notes: '',
  current_medical_status: '',
};

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchClientProfile();
  }, []);

  useEffect(() => {
    if (clientId) fetchPets();
  }, [clientId]);

  const fetchClientProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        setError('Error fetching profile: ' + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setClientId(data.id);
      } else {
        setError('No client profile found. Please contact support.');
        setLoading(false);
      }
    } catch (error) {
      setError('Unexpected error loading profile');
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    if (!clientId) { setLoading(false); return; }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/client/pets?client_id=${clientId}`);

      if (!response.ok) {
        const errorData = await response.json();
        setError(`Failed to load pets: ${errorData.error || 'Unknown error'}`);
        setPets([]);
        return;
      }

      const data = await response.json();
      setPets(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setError('Network error loading pets: ' + error.message);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { showToast('File size must be less than 5MB', 'error'); return; }
      if (!file.type.startsWith('image/')) { showToast('File must be an image', 'error'); return; }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !clientId) return null;
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('pet-images')
        .upload(fileName, photoFile, { cacheControl: '3600', upsert: false });
      if (error) return null;
      const { data: urlData } = supabase.storage.from('pet-images').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const handleEditClick = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed || '',
      date_of_birth: pet.date_of_birth,
      gender: pet.gender,
      color: pet.color || '',
      weight: pet.weight.toString(),
      microchip_number: pet.microchip_number || '',
      is_spayed_neutered: pet.is_spayed_neutered,
      special_needs: pet.special_needs || '',
      behavioral_notes: pet.behavioral_notes || '',
      current_medical_status: pet.current_medical_status || '',
    });
    setPhotoPreview(pet.photo_url || '');
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clientId) { showToast('Client ID not found. Please refresh.', 'error'); return; }

    const selectedDate = new Date(formData.date_of_birth);
    if (selectedDate > new Date()) { showToast('Date of birth cannot be in the future.', 'error'); return; }

    const weightNum = parseFloat(formData.weight);
    if (isNaN(weightNum) || weightNum <= 0) { showToast('Please enter a valid weight greater than 0.', 'error'); return; }

    try {
      setUploading(true);

      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      } else if (photoPreview && editingPet) {
        photoUrl = editingPet.photo_url;
      }

      const petData = {
        owner_id: clientId,
        name: formData.name,
        species: formData.species,
        breed: formData.breed || null,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        color: formData.color || null,
        weight: weightNum,
        microchip_number: formData.microchip_number || null,
        is_spayed_neutered: formData.is_spayed_neutered,
        special_needs: formData.special_needs || null,
        behavioral_notes: formData.behavioral_notes || null,
        current_medical_status: formData.current_medical_status || null,
        photo_url: photoUrl,
      };

      const isEdit = !!editingPet;
      const url = isEdit ? `/api/client/pets?id=${editingPet.id}` : '/api/client/pets';
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to ${isEdit ? 'update' : 'create'} pet`);

      handleModalClose();
      fetchPets();
      showToast(`Pet ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
      if (isEdit) {
        sendAdminNotification({ type: 'pet_updated', label: formData.name, petId: editingPet!.id }).catch(console.error);
      } else {
        sendAdminNotification({ type: 'pet_added', label: formData.name, petId: result.id }).catch(console.error);
      }
    } catch (error: any) {
      showToast(error.message || 'An error occurred while saving the pet.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingPet(null);
    setFormData(emptyForm);
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const sharedFormProps = {
    formData,
    setFormData,
    photoPreview,
    uploading,
    editingPet,
    handleSubmit,
    handleModalClose,
    handlePhotoChange,
    removePhoto,
  };

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-white text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-sm ${
          toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
            : toast.type === 'error'
            ? 'bg-gradient-to-r from-red-500 to-rose-500'
            : 'bg-gradient-to-r from-primary to-primary/80'
        }`}>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PawPrint size={24} className="text-primary" />
            My Pets
            {pets.length > 0 && (
              <span className="ml-2 bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
                {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your registered pet profiles</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-150 rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Pet
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm">
          <span className="font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading pets…</p>
          </div>
        </div>
      ) : pets.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint size={32} className="text-primary" />
          </div>
          <h3 className="text-lg font-bold mb-2">No pets registered yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Add your first pet to start booking appointments and tracking their health.
          </p>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 active:scale-95 transition-all duration-150 rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Pet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className={`bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 group ${pet.species === 'dog' ? 'border-t-4 border-t-amber-400' : pet.species === 'cat' ? 'border-t-4 border-t-purple-400' : 'border-t-4 border-t-primary'}`}
            >
              {pet.photo_url ? (
                <div className="aspect-video bg-accent/20 relative overflow-hidden">
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="aspect-video bg-accent/20 flex items-center justify-center">
                  <span className="text-6xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </span>
                </div>
              )}

              <div className="p-5">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-foreground">{pet.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="capitalize bg-accent text-foreground text-xs rounded-full px-2 py-0.5">{pet.species}</span>
                    <span className="capitalize bg-accent text-foreground text-xs rounded-full px-2 py-0.5">{pet.gender}</span>
                    {pet.is_spayed_neutered ? (
                      <span className="bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">✓ {pet.gender === 'female' ? 'Spayed' : 'Neutered'}</span>
                    ) : (
                      <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">Intact</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Age</p>
                    <p className="font-semibold text-foreground text-xs">{calculateAge(pet.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Breed</p>
                    <p className="font-semibold text-foreground text-xs">{pet.breed || 'Mixed'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Weight</p>
                    <p className="font-semibold text-foreground text-xs">{pet.weight} kg</p>
                  </div>
                  {pet.color && (
                    <div>
                      <p className="text-muted-foreground text-xs">Color</p>
                      <p className="font-semibold text-foreground text-xs">{pet.color}</p>
                    </div>
                  )}
                </div>

                {pet.behavioral_notes && (
                  <div className="bg-accent/30 rounded-lg px-3 py-2 text-xs text-muted-foreground mb-4 border-l-2 border-primary">
                    {pet.behavioral_notes}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(pet)}
                  className="w-full flex items-center justify-center gap-2 mt-2 rounded-lg hover:bg-accent border-border active:scale-95 transition-all duration-150"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pet Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PawPrint size={18} className="text-primary" />Add New Pet</DialogTitle>
            <DialogDescription>Fill in your pet&apos;s details below. Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <PetForm {...sharedFormProps} />
        </DialogContent>
      </Dialog>

      {/* Edit Pet Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PawPrint size={18} className="text-primary" />Edit Pet Profile</DialogTitle>
            <DialogDescription>Fill in your pet&apos;s details below. Fields marked * are required.</DialogDescription>
          </DialogHeader>
          <PetForm {...sharedFormProps} />
        </DialogContent>
      </Dialog>
    </main>
  );
}