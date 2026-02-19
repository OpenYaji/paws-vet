'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Search, Loader2, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface IssuePrescriptionProps {
  onPrescriptionIssued: () => void;
}

export default function IssuePrescription({ onPrescriptionIssued }: IssuePrescriptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [petSearch, setPetSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    notes: ''
  });

  useEffect(() => {
    const runSearch = async () => {

      if (!petSearch.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/pets?search=${encodeURIComponent(petSearch)}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => {
      runSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [petSearch]);

  // Fetch medical records when pet is selected
  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!selectedPet) {
        setMedicalRecords([]);
        setSelectedMedicalRecord(null);
        return;
      }

      setLoadingRecords(true);
      try {
        const res = await fetch(`/api/medical-records?pet_id=${selectedPet.id}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setMedicalRecords(data);
          
          // Auto-select if only one medical record exists
          if (data.length === 1) {
            setSelectedMedicalRecord(data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch medical records", error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchMedicalRecords();
  }, [selectedPet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !selectedMedicalRecord) {
      alert('Please select both a patient and a medical record.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        medical_record_id: selectedMedicalRecord.id,
        prescribed_by: selectedMedicalRecord.veterinarian_id,
        ...formData,
        instructions: formData.notes // Map notes to instructions as API expects
      };

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if(!res.ok){
        const errorData = await res.json();
        alert(errorData.error || 'Failed to issue prescription. Please try again.');
        return;
      }

      setIsOpen(false);
      resetForm();
      onPrescriptionIssued();

    } catch (error) {
      console.error(error);
      alert('Error issuing prescription. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPet(null);
    setSelectedMedicalRecord(null);
    setMedicalRecords([]);
    setPetSearch('');
    setFormData({
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      notes: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { setIsOpen(val); if(!val) resetForm(); }}>
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
          
          {/* --- Pet Selection Section --- */}
          <div className="space-y-2 relative">
            <Label>Select Patient</Label>
            
            {selectedPet ? (
              // STATE A: Pet Selected (Show Card)
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div>
                  <div className="font-bold text-green-800">{selectedPet.name}</div>
                  <div className="text-xs text-green-600">
                    {selectedPet.species} • Owner: {selectedPet.client_profiles?.last_name || 'N/A'}
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="text-green-700 hover:text-green-900 hover:bg-green-100"
                  onClick={() => setSelectedPet(null)}
                >
                  <X size={16} />
                </Button>
              </div>
            ) : (
              // STATE B: Search Input
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search pet name..." 
                  className="pl-9"
                  value={petSearch}
                  onChange={e => setPetSearch(e.target.value)}
                />
                
                {/* Search Spinner */}
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}

                {/* Dropdown Results */}
                {!selectedPet && searchResults.length > 0 && petSearch.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border rounded-md shadow-xl mt-1 max-h-48 overflow-y-auto">
                    {searchResults.map((pet) => (
                      <div 
                        key={pet.id} 
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0"
                        onClick={() => {
                          setSelectedPet(pet); // Set selected
                          setPetSearch('');    // Clear search text
                          setSearchResults([]); // Hide dropdown
                        }}
                      >
                        <div className="font-medium text-gray-800">{pet.name}</div>
                        <div className="text-xs text-gray-500">
                          {pet.species} • {pet.breed} • Owner: {pet.client_profiles?.last_name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No Results Message */}
                {!isSearching && petSearch.length > 0 && searchResults.length === 0 && (
                   <div className="absolute z-50 w-full bg-white border rounded-md shadow-lg mt-1 p-3 text-sm text-gray-500 text-center">
                     No pets found.
                   </div>
                )}
              </div>
            )}
          </div>

          {/* --- Medical Record Selection (Only show if pet is selected) --- */}
          {selectedPet && (
            <div className="space-y-2">
              <Label>Select Medical Record / Visit</Label>
              {loadingRecords ? (
                <div className="flex items-center justify-center p-4 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading medical records...</span>
                </div>
              ) : medicalRecords.length === 0 ? (
                <div className="p-4 border border-dashed rounded-md bg-amber-50 border-amber-200">
                  <p className="text-sm text-amber-800">
                    No medical records found for this patient. Prescriptions must be linked to a completed consultation with a medical record.
                  </p>
                </div>
              ) : (
                <Select 
                  value={selectedMedicalRecord?.id?.toString()} 
                  onValueChange={(val) => {
                    const record = medicalRecords.find(r => r.id.toString() === val);
                    setSelectedMedicalRecord(record);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medical record..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicalRecords.map((record) => (
                      <SelectItem key={record.id} value={record.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(record.visit_date || record.created_at), 'MMM dd, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {record.chief_complaint || 'General Consultation'} • {record.record_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* --- Form Fields --- */}
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={isSaving || !selectedPet || !selectedMedicalRecord} 
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing...
                </>
              ) : (
                'Issue Prescription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}