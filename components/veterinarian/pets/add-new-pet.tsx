'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Define props to notify parent when a pet is added
interface AddNewPetProps {
  onPetAdded: () => void;
}

export default function AddNewPet({ onPetAdded }: AddNewPetProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [newPet, setNewPet] = useState({
    name: '',
    species: '',
    breed: '',
    color: '',
    weight: '',
    photo_url: '',
  });

  // Image State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Handle Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        alert("File is too large. Max 5MB.");
        return;
      }
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Handle Form Submission
  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (!newPet.name || !newPet.species) {
        alert("Please fill in Name and Species");
        setIsSaving(false);
        return;
      }

      let uploadedImageUrl = null;

      // 1. Upload Image (if selected)
      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('pet-images')
          .upload(fileName, selectedImageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pet-images')
          .getPublicUrl(fileName);
        
        uploadedImageUrl = urlData.publicUrl;
      }

      // 2. Insert Pet Data
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name: newPet.name,
          species: newPet.species,
          breed: newPet.breed,
          color: newPet.color,
          weight: newPet.weight,
          photo_url: uploadedImageUrl,
        }),
      });

      const result = await response.json();

      if(!response.ok){
        throw new Error(result.error || 'Failed to add pet');
      }

      // 3. Success
      onPetAdded(); // Notify parent to refresh list
      setIsAddOpen(false);
      setNewPet({ name: '', species: '', breed: '', color: '', weight: '', photo_url: '' });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);

    } catch (error: any) {
      alert('Error adding pet: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
      <DialogTrigger asChild>
        <Button size="default" className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add New Pet
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Pet</DialogTitle>
          <DialogDescription>
            Enter details and upload a photo below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddPet} className="grid gap-4 py-4">
          
          {/* Image Upload Area */}
          <div className="flex flex-col items-center justify-center gap-4 mb-2">
            <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group hover:border-green-500 transition-colors">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-8 w-8 text-gray-400 group-hover:text-green-500 transition-colors" />
              )}
              <Input
                id="image_url"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <Label 
                htmlFor="image_url" 
                className="absolute inset-0 bg-black/0 hover:bg-black/10 cursor-pointer" 
                title="Upload Photo"
              />
            </div>
            <Label htmlFor="image_url" className="text-sm text-green-600 cursor-pointer hover:underline">
              {imagePreviewUrl ? "Change Photo" : "Upload Photo"}
            </Label>
          </div>

          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              value={newPet.name}
              onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
              className="col-span-3"
              required
            />
          </div>

          {/* Species */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="species" className="text-right">Species</Label>
            <Select 
              value={newPet.species} 
              onValueChange={(val) => setNewPet({ ...newPet, species: val })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
                <SelectItem value="Bird">Bird</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Breed */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="breed" className="text-right">Breed</Label>
            <Input
              id="breed"
              value={newPet.breed}
              onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
              className="col-span-3"
            />
          </div>

          {/* Age & Weight */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right">Color</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="color"
                type="text"
                placeholder="Color"
                value={newPet.color}
                onChange={(e) => setNewPet({ ...newPet, color: e.target.value })}
              />
              <Input
                id="weight"
                placeholder="Weight (kg)"
                value={newPet.weight}
                onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Pet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}