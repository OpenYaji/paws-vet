"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/use-toast";

interface IssuePrescriptionProps {
  onPrescriptionIssued: () => void;
}

export default function IssuePrescription({
  onPrescriptionIssued,
}: IssuePrescriptionProps) {
  // --- UI States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Search States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any | null>(null);

  // --- Medical Record States ---
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    duration: "",
    notes: "",
  });

  // 1. The Debounce Effect for Pet Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/veterinarian/pets/search?q=${encodeURIComponent(searchTerm)}`
        );
        const data = await res.json();

        // FIX: Ensure 'data' is an array before setting it to results
        if (Array.isArray(data)) {
          setResults(data);
        } else if (data && Array.isArray(data.data)) {
          // Just in case your API returns { data: [...] }
          setResults(data.data);
        } else {
          // If it's an error object, fallback to an empty array
          setResults([]);
          console.error("API returned a non-array:", data);
        }
        
        setIsSearchDropdownOpen(true);
      } catch (error) {
        console.error("Failed to search pets:", error);
        setResults([]); // Fallback on catch
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 2. Fetch medical records when pet is selected
  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!selectedPet) {
        setMedicalRecords([]);
        setSelectedMedicalRecord(null);
        return;
      }

      setLoadingRecords(true);
      try {
        const res = await fetch(
          `/api/veterinarian/medical-records?pet_id=${selectedPet.id}`
        );
        const data = await res.json();

        if (Array.isArray(data)) {
          setMedicalRecords(data);
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

  // 3. Handle selecting a pet from the search dropdown
  const handleSelectPet = (pet: any) => {
    setSelectedPet(pet);
    setSearchTerm(pet.name); // Fill input with the selected pet's name
    setIsSearchDropdownOpen(false); // Close the search dropdown
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !selectedMedicalRecord) {
      toast({ title: 'Missing Selection', description: 'Please select both a patient and a medical record.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        medical_record_id: selectedMedicalRecord.id,
        prescribed_by: selectedMedicalRecord.veterinarian_id,
        ...formData,
        instructions: formData.notes,
      };

      const res = await fetch("/api/veterinarian/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast({ title: 'Error', description: errorData.error || 'Failed to issue prescription. Please try again.', variant: 'destructive' });
        return;
      }

      toast({ title: 'Prescription Issued', description: 'Prescription has been saved successfully.' });
      setIsModalOpen(false);
      resetForm();
      onPrescriptionIssued();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Error issuing prescription. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPet(null);
    setSearchTerm("");
    setResults([]);
    setIsSearchDropdownOpen(false);
    setSelectedMedicalRecord(null);
    setMedicalRecords([]);
    setFormData({
      medication_name: "",
      dosage: "",
      frequency: "",
      duration: "",
      notes: "",
    });
  };

  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(val) => {
        setIsModalOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus size={18} /> Issue Prescription
        </Button>
      </DialogTrigger>
      
      {/* Increased height so dropdown doesn't get cut off easily */}
      <DialogContent className="sm:max-w-[500px]"> 
        <DialogHeader>
          <DialogTitle>Issue New Prescription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          {/* --- Pet Search Field --- */}
          <div className="relative space-y-2">
            <Label>Select Patient</Label>
            <Input
              type="text"
              placeholder="Search pet by name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (selectedPet) setSelectedPet(null);
              }}
              onFocus={() => {
                if (results.length > 0) setIsSearchDropdownOpen(true);
              }}
            />

            {/* --- The Search Results Dropdown --- */}
            {isSearchDropdownOpen && (
              <div className="absolute top-full left-0 z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                {isSearching ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                ) : !Array.isArray(results) || results.length === 0 ? ( // FIX: Added Array check here
                  <div className="p-3 text-sm text-muted-foreground text-center">No pets found.</div>
                ) : (
                  results.map((pet) => (
                    <div
                      key={pet.id}
                      onClick={() => handleSelectPet(pet)}
                      className="p-3 text-sm cursor-pointer hover:bg-muted border-b last:border-0"
                    >
                      <div className="font-medium text-foreground">{pet.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pet.species} • {pet.breed} | Owner: {pet.client_profiles?.first_name}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* --- Medical Record Selection --- */}
          {selectedPet && (
            <div className="space-y-2">
              <Label>Select Medical Record / Visit</Label>
              {loadingRecords ? (
                <div className="flex items-center justify-center p-4 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">
                    Loading medical records...
                  </span>
                </div>
              ) : medicalRecords.length === 0 ? (
                <div className="p-4 border border-dashed rounded-md bg-amber-500/10 border-amber-500/30">
                  <p className="text-sm text-amber-600">
                    No medical records found for this patient. Prescriptions
                    must be linked to a completed consultation with a medical record.
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedMedicalRecord?.id?.toString()}
                  onValueChange={(val) => {
                    const record = medicalRecords.find(
                      (r) => r.id.toString() === val,
                    );
                    setSelectedMedicalRecord(record);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medical record..." />
                  </SelectTrigger>
                  <SelectContent>
                    {medicalRecords.map((record) => (
                      <SelectItem key={record.id} value={record.id.toString()}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">
                            {format(
                              new Date(record.visit_date || record.created_at),
                              "MMM dd, yyyy",
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {record.chief_complaint || "General Consultation"} •{" "}
                            {record.record_number}
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
                onChange={(e) =>
                  setFormData({ ...formData, medication_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input
                required
                placeholder="e.g. 50mg"
                value={formData.dosage}
                onChange={(e) =>
                  setFormData({ ...formData, dosage: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                onValueChange={(val) =>
                  setFormData({ ...formData, frequency: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
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
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instructions / Notes</Label>
            <Textarea
              placeholder="Give with food..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
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
                "Issue Prescription"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}