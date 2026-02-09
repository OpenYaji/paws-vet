'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from 'lucide-react';

interface IssuePrescriptionProps {
  onPrescriptionIssued: () => void;
}

export default function IssuePrescription({ onPrescriptionIssued }: IssuePrescriptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search State for Pets
  const [petSearch, setPetSearch] = useState('');
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    notes: ''
  });

  // Fetch pets when user types in search
  useEffect(() => {
    const fetchPets = async () => {
      if (petSearch.length < 1) return;
      const { data } = await supabase
        .from('pets')
        .select('id, name, breed, species')
        .ilike('name', `%${petSearch}%`)
        .limit(5);
      if (data) setPets(data);
    };
    const timer = setTimeout(fetchPets, 300); // Debounce
    return () => clearTimeout(timer);
  }, [petSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('prescriptions')
        .insert([{
          pet_id: selectedPetId,
          vet_id: user.id,
          ...formData
        }]);

      if (error) throw error;

      onPrescriptionIssued();
      setIsOpen(false);
      // Reset form
      setFormData({ medication_name: '', dosage: '', frequency: '', duration: '', notes: '' });
      setSelectedPetId('');
      setPetSearch('');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus size={18} /> Issue Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue New Prescription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          {/* 1. Pet Selection */}
          <div className="space-y-2">
            <Label>Select Patient</Label>
            {selectedPetId ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <span className="font-medium text-green-800">
                  {pets.find(p => p.id === selectedPetId)?.name || 'Selected Pet'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPetId('')}>Change</Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search pet by name..." 
                  className="pl-9"
                  value={petSearch}
                  onChange={e => setPetSearch(e.target.value)}
                />
                {pets.length > 0 && petSearch.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {pets.map(pet => (
                      <div 
                        key={pet.id} 
                        className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                        onClick={() => setSelectedPetId(pet.id)}
                      >
                        <span className="font-medium">{pet.name}</span>
                        <span className="text-xs text-gray-500">{pet.species} • {pet.breed}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Medication Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medication Name</Label>
              <Input 
                required 
                placeholder="e.g. Amoxicillin" 
                value={formData.medication_name}
                onChange={e => setFormData({...formData, medication_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input 
                required 
                placeholder="e.g. 50mg" 
                value={formData.dosage}
                onChange={e => setFormData({...formData, dosage: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select onValueChange={val => setFormData({...formData, frequency: val})}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Once daily">Once daily (SID)</SelectItem>
                  <SelectItem value="Twice daily">Twice daily (BID)</SelectItem>
                  <SelectItem value="Thrice daily">Thrice daily (TID)</SelectItem>
                  <SelectItem value="As needed">As needed (PRN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input 
                required 
                placeholder="e.g. 7 days" 
                value={formData.duration}
                onChange={e => setFormData({...formData, duration: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instructions / Notes</Label>
            <Textarea 
              placeholder="Give with food..." 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving || !selectedPetId}>
              {isSaving ? 'Issuing...' : 'Issue Prescription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}