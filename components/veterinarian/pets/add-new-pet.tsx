"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Upload } from "lucide-react";
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

interface AddNewPetProps {
  onPetAdded: () => void;
}

export default function AddNewPet({ onPetAdded }: AddNewPetProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pet Form State
  const [newPet, setNewPet] = useState({
    name: "",
    species: "",
    breed: "",
    date_of_birth: "",
    gender: "",
    color: "",
    weight: "",
    microchip_number: "",
    photo_url: "",
    owner_first_name: "",
    owner_last_name: "",
    owner_phone: "",
    owner_email: "",
    owner_address: "",
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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

      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(fileName, selectedImageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(fileName);

        uploadedImageUrl = urlData.publicUrl;
      }

      const response = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newPet.name,
          species: newPet.species,
          breed: newPet.breed,
          date_of_birth: newPet.date_of_birth,
          gender: newPet.gender,
          color: newPet.color,
          weight: newPet.weight,
          microchip_number: newPet.microchip_number, // NEW: Added to API payload
          owner_first_name: newPet.owner_first_name,
          owner_last_name: newPet.owner_last_name,
          owner_phone: newPet.owner_phone,
          owner_email: newPet.owner_email,
          owner_address: newPet.owner_address,
          photo_url: uploadedImageUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add pet");
      }

      onPetAdded();
      setIsAddOpen(false);
      setNewPet({
        name: "",
        species: "",
        breed: "",
        date_of_birth: "",
        gender: "",
        color: "",
        weight: "",
        microchip_number: "", // NEW: Reset state
        photo_url: "",
        owner_first_name: "",
        owner_last_name: "",
        owner_phone: "",
        owner_email: "",
        owner_address: "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    } catch (error: any) {
      alert("Error adding pet: " + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
      <DialogTrigger asChild>
        <Button
          size="default"
          className="shrink-0 bg-green-700 hover:bg-green-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Pet
        </Button>
      </DialogTrigger>

      {/* Increased max-width slightly to accommodate more fields */}
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Pet</DialogTitle>
          <DialogDescription>
            Enter details and upload a photo below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddPet} className="grid gap-4 py-4">
          {/* Image Upload Area (Unchanged) */}
          <div className="flex flex-col items-center justify-center gap-4 mb-2">
            <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden group hover:border-green-500 transition-colors">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
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
            <Label
              htmlFor="image_url"
              className="text-sm text-green-600 cursor-pointer hover:underline"
            >
              {imagePreviewUrl ? "Change Photo" : "Upload Photo"}
            </Label>
          </div>

          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
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
            <Label htmlFor="species" className="text-right">
              Species
            </Label>
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

          {/* NEW: Gender */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">
              Gender
            </Label>
            <Select
              value={newPet.gender}
              onValueChange={(val) => setNewPet({ ...newPet, gender: val })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Breed */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="breed" className="text-right">
              Breed
            </Label>
            <Input
              id="breed"
              value={newPet.breed}
              onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
              className="col-span-3"
            />
          </div>

          {/* NEW: Date of Birth */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dob" className="text-right">
              Birthday
            </Label>
            <Input
              id="dob"
              type="date"
              value={newPet.date_of_birth}
              onChange={(e) =>
                setNewPet({ ...newPet, date_of_birth: e.target.value })
              }
              className="col-span-3"
            />
          </div>

          {/* Color & Weight */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Details</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                placeholder="Color"
                value={newPet.color}
                onChange={(e) =>
                  setNewPet({ ...newPet, color: e.target.value })
                }
              />
              <Input
                placeholder="Weight (kg)"
                value={newPet.weight}
                onChange={(e) =>
                  setNewPet({ ...newPet, weight: e.target.value })
                }
              />
            </div>
          </div>

          {/* NEW: Microchip Number */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="microchip" className="text-right">
              Microchip
            </Label>
            <Input
              id="microchip"
              placeholder="Microchip Number"
              value={newPet.microchip_number}
              onChange={(e) =>
                setNewPet({ ...newPet, microchip_number: e.target.value })
              }
              className="col-span-3"
            />
          </div>

          {/* Owner Details Section */}
          <div className="pt-4 border-t border-gray-200 mt-2">
            <h4 className="text-sm font-semibold mb-3 text-gray-600">
              Owner Details (Optional)
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="First Name"
                value={newPet.owner_first_name}
                onChange={(e) =>
                  setNewPet({ ...newPet, owner_first_name: e.target.value })
                }
              />
              <Input
                placeholder="Last Name"
                value={newPet.owner_last_name}
                onChange={(e) =>
                  setNewPet({ ...newPet, owner_last_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <Input
                placeholder="Address"
                value={newPet.owner_address}
                onChange={(e) =>
                  setNewPet({ ...newPet, owner_address: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input
                placeholder="Phone Number"
                value={newPet.owner_phone}
                onChange={(e) =>
                  setNewPet({ ...newPet, owner_phone: e.target.value })
                }
              />
              <Input
                placeholder="Email"
                type="email"
                value={newPet.owner_email}
                onChange={(e) =>
                  setNewPet({ ...newPet, owner_email: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-green-700 hover:bg-green-800"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Pet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
