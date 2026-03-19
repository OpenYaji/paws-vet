'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import {
  Stethoscope, FileText, ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { Fetcher } from '@/lib/fetcher';
import { toast } from '@/components/ui/use-toast';

export default function ConsultationContent() {
  // SWR for fetching the consultation queue (appointments ready for exam)
  const { data: queue = [] } = useSWR<any[]>('/api/veterinarian/consultations', Fetcher);

  // Local state for selected appointment and form inputs
  const isLoading = false;
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for the medical record being created/edited
  const [record, setRecord] = useState({
    chief_complaint: '',
    examination_findings: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    next_appointment: ''
  });

  // When a patient is selected from the queue, pre-fill the chief complaint with the reason for visit
  const handleSelectPatient = (appt: any) => {
    setSelectedAppt(appt);
    setRecord({
      chief_complaint: appt.reason_for_visit || '',
      examination_findings: '',
      diagnosis: '',
      treatment_plan: '',
      follow_up_instructions: '',
      next_appointment: ''
    });
  };

  // Submit Consultation: Used Promise to allow parallel DB operations and centralized error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Get the vet's profile to link in the medical record
      const { data: { user } } = await supabase.auth.getUser();
      const { data: vetProfile } = await supabase
        .from('veterinarian_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vetProfile) throw new Error("Vet profile not found");

      // Prepare payload for the API route
      const payload = {
        appointment_id: selectedAppt.id,
        pet_id: selectedAppt.pets.id,
        veterinarian_id: vetProfile.id,
        subjective: record.chief_complaint,
        objective: record.examination_findings,
        assessment: record.diagnosis,
        plan: record.treatment_plan
      };

      // Call the API route to save the consultation and create the medical record
      const res = await fetch('/api/veterinarian/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Response handling with centralized error management
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save consultation');
      }
      toast({ title: 'Consultation Saved', description: 'Medical record has been created.' });
      mutate('api/veterinarian/consultations');
      setSelectedAppt(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">

        {/* --- LEFT: PATIENT QUEUE --- */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto pr-2 border-r">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardCheck size={18} /> Ready for Exam ({queue.length})
          </h3>

          {isLoading ? (
            <div className="text-sm text-gray-400">Loading queue...</div>
          ) : queue.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded bg-gray-50 text-gray-400 text-sm">
              No patients waiting.
            </div>
          ) : (
            queue.map((appt: any) => (
              <div
                key={appt.id}
                onClick={() => handleSelectPatient(appt)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedAppt?.id === appt.id
                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-800">{appt.pets.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {format(new Date(appt.scheduled_start), 'h:mm a')}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {appt.pets.species} ({appt.pets.gender})
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT: WORKSPACE --- */}
        <div className="lg:col-span-9 flex flex-col overflow-y-auto pb-10">
          {selectedAppt ? (
            <div className="space-y-6">

              {/* Patient Card */}
              <Card className="bg-blue-900 text-white border-none">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedAppt.pets.name}</h2>
                      <p className="opacity-80 text-sm">
                        {selectedAppt.pets.breed} • {selectedAppt.pets.gender}
                      </p>
                    </div>
                    <Stethoscope size={32} className="opacity-20" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-700/50 flex gap-6 text-sm">
                    <div>
                      <span className="block opacity-60 text-xs">Owner</span>
                      {selectedAppt.pets.client_profiles?.first_name} {selectedAppt.pets.client_profiles?.last_name}
                    </div>
                    <div>
                       <span className="block opacity-60 text-xs">Date</span>
                       {format(new Date(), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* The Medical Record Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-blue-600" /> Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="space-y-2">
                      <Label className="text-blue-800 font-semibold">Chief Complaint / History (Subjective)</Label>
                      <Textarea
                        placeholder="Why is the patient here? History of illness..."
                        className="min-h-[80px]"
                        value={record.chief_complaint}
                        onChange={e => setRecord({...record, chief_complaint: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-blue-800 font-semibold">Examination Findings (Objective)</Label>
                      <Textarea
                        placeholder="EENT, Heart/Lungs, Abdomen palpation, Musculoskeletal..."
                        className="min-h-[100px]"
                        value={record.examination_findings}
                        onChange={e => setRecord({...record, examination_findings: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-blue-800 font-semibold">Diagnosis (Assessment)</Label>
                      <Input
                        placeholder="Primary diagnosis..."
                        className="font-medium"
                        value={record.diagnosis}
                        onChange={e => setRecord({...record, diagnosis: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-blue-800 font-semibold">Treatment Plan (Plan)</Label>
                      <Textarea
                        placeholder="Medications given, procedures performed, tests ordered..."
                        className="min-h-[80px]"
                        value={record.treatment_plan}
                        onChange={e => setRecord({...record, treatment_plan: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Follow-up Instructions</Label>
                        <Input
                          placeholder="e.g. Monitor appetite"
                          value={record.follow_up_instructions}
                          onChange={e => setRecord({...record, follow_up_instructions: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Next Appointment Recommended</Label>
                        <Input
                          type="date"
                          value={record.next_appointment}
                          onChange={e => setRecord({...record, next_appointment: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t">
                      <Button type="button" variant="outline">Save Draft</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[200px]" disabled={isSaving}>
                        {isSaving ? 'Finalizing...' : 'Finalize Record'}
                      </Button>
                    </div>

                  </form>
                </CardContent>
              </Card>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
               <Stethoscope size={64} className="mb-4 opacity-10" />
               <h2 className="text-xl font-semibold text-gray-600">No Patient Selected</h2>
               <p>Select a patient from the queue to start the consultation.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
