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
import { Plus, Edit, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/auth-client';

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

  const [formData, setFormData] = useState({
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
  });

  useEffect(() => {
    fetchClientProfile();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchPets();
    }
  }, [clientId]);

  const fetchClientProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error or no user found:', authError);
        setError('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Current user:', user.id);

      const { data, error } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Database error fetching client profile:', error);
        setError('Error fetching profile: ' + error.message);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('Client profile ID:', data.id);
        setClientId(data.id);
      } else {
        console.log('No client profile found for user');
        setError('No client profile found. Please contact support.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Unexpected error in fetchClientProfile:', error);
      setError('Unexpected error loading profile');
      setLoading(false);
    }
  };

  const fetchPets = async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      console.log('Fetching pets for client_id:', clientId);
      const response = await fetch(`/api/client/pets?client_id=${clientId}`);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setError(`Failed to load pets: ${errorData.error || 'Unknown error'}`);
        setPets([]);
        return;
      }

      const data = await response.json();
      console.log('Fetched pets:', data);
      setPets(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching pets:', error);
      setError('Network error loading pets: ' + error.message);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert('File must be an image');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
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
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading photo:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('pet-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadPhoto:', error);
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
    
    if (!clientId) {
      alert('Client ID not found. Please refresh and try again.');
      return;
    }

    const selectedDate = new Date(formData.date_of_birth);
    if (selectedDate > new Date()) {
      alert("Date of Birth cannot be in the future.");
      return;
    }

    const weightNum = parseFloat(formData.weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert("Please enter a valid weight greater than 0.");
      return;
    }

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

      console.log('Submitting pet data:', petData);

      const isEditing = !!editingPet;
      const url = isEditing ? `/api/client/pets?id=${editingPet.id}` : '/api/client/pets';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'create'} pet`);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingPet(null);
      setFormData({
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
      });
      setPhotoFile(null);
      setPhotoPreview('');
      
      fetchPets();
      alert(`Pet ${isEditing ? 'updated' : 'added'} successfully!`);
    } catch (error: any) {
      console.error('Error saving pet:', error);
      alert(error.message || 'An error occurred while saving the pet.');
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingPet(null);
    setFormData({
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
    });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth();
    
    if (ageInMonths < 0) return "Newborn";
    if (ageInMonths < 12) return `${ageInMonths} months`;
    return `${Math.floor(ageInMonths / 12)} years`;
  };

  const PetForm = () => (
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
          <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload pet photo</p>
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

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Pets</h1>
          <p className="text-muted-foreground">Manage your pet profiles</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Pet
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading pets...</div>
      ) : pets.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No pets registered yet</p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Pet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-card border border-border rounded-lg overflow-hidden">
              {pet.photo_url ? (
                <div className="aspect-video bg-secondary/20 relative">
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-secondary/20 flex items-center justify-center">
                  <span className="text-6xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{pet.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{pet.species}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditClick(pet)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Age:</span> {calculateAge(pet.date_of_birth)}</p>
                  <p><span className="font-medium">Breed:</span> {pet.breed || 'Mixed'}</p>
                  <p><span className="font-medium">Gender:</span> <span className="capitalize">{pet.gender}</span></p>
                  {pet.color && <p><span className="font-medium">Color:</span> {pet.color}</p>}
                  <p><span className="font-medium">Weight:</span> {pet.weight} kg</p>
                  <p><span className="font-medium">Spayed/Neutered:</span> {pet.is_spayed_neutered ? 'Yes' : 'No'}</p>
                  
                  {pet.behavioral_notes && (
                    <div>
                      <p className="font-medium">Behavioral Notes:</p>
                      <p className="text-muted-foreground text-xs mt-1">{pet.behavioral_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pet Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
            <DialogDescription>
              Register your pet to book appointments
            </DialogDescription>
          </DialogHeader>
          <PetForm />
        </DialogContent>
      </Dialog>

      {/* Edit Pet Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
            <DialogDescription>
              Update your pet's information
            </DialogDescription>
          </DialogHeader>
          <PetForm />
        </DialogContent>
      </Dialog>
    </main>
  );
}