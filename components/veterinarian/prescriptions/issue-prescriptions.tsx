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

interface IssuePrescriptionProps {
  onPrescriptionIssued: () => void;
}

export default function IssuePrescription({
  onPrescriptionIssued,
}: IssuePrescriptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [petsList, setPetsList] = useState<any[]>([]);
  const [isLoadingPets, setIsLoadingPets] = useState(false);

  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [formData, setFormData] = useState({
    medication_name: "",
    dosage: "",
    frequency: "",
    duration: "",
    notes: "",
  });

  // Fetch all pets when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchPets = async () => {
      setIsLoadingPets(true);
      try {
        const res = await fetch("/api/veterinarian/pets?page=1&limit=1000");
        const data = await res.json();
        setPetsList(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error("Failed to fetch pets", error);
      } finally {
        setIsLoadingPets(false);
      }
    };
    fetchPets();
  }, [isOpen]);

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
        const res = await fetch(
          `/api/veterinarian/medical-records?pet_id=${selectedPet.id}`,
        );
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
      alert("Please select both a patient and a medical record.");
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
        alert(
          errorData.error || "Failed to issue prescription. Please try again.",
        );
        return;
      }

      setIsOpen(false);
      resetForm();
      onPrescriptionIssued();
    } catch (error) {
      console.error(error);
      alert("Error issuing prescription. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPet(null);
    setSelectedMedicalRecord(null);
    setMedicalRecords([]);
    setPetsList([]);
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
      open={isOpen}
      onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus size={18} /> Issue Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Issue New Prescription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* --- Pet Selection --- */}
          <div className="space-y-2">
            <Label>Select Patient</Label>
            <Select
              onValueChange={(val) => {
                const pet = petsList.find((p) => p.id === val);
                setSelectedPet(pet || null);
                setSelectedMedicalRecord(null);
                setMedicalRecords([]);
              }}
            >
              <SelectTrigger disabled={isLoadingPets}>
                <SelectValue
                  placeholder={
                    isLoadingPets ? "Loading pets..." : "Select a patient..."
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-50">
                {petsList.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species}) —{" "}
                    {pet.client_profiles?.last_name || "N/A"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    must be linked to a completed consultation with a medical
                    record.
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
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(
                              new Date(record.visit_date || record.created_at),
                              "MMM dd, yyyy",
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
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
                  <SelectItem value="Thrice daily">
                    Thrice daily (TID)
                  </SelectItem>
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
              onClick={() => setIsOpen(false)}
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
