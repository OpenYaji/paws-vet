'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {   Stethoscope, Thermometer, Weight, Activity, Heart,   FileText, ClipboardCheck, AlertCircle, CheckCircle, User
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ConsultationPage() {
  const { data: queue = [], isLoading } = useSWR('/api/consultations', fetcher);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Ensure queue is always an array
  const safeQueue = Array.isArray(queue) ? queue : [];

  // SOAP Form State
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const handleSelectPatient = (appt: any) => {
    setSelectedAppt(appt);
    // Pre-fill subjective with chief complaint from tri age if available
    if (appt.triage_records && appt.triage_records[0]?.chief_complaint) {
      setSoap(prev => ({
        ...prev,
        subjective: appt.triage_records[0].chief_complaint
      }));
    } else {
      // Reset form
      setSoap({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    // Validation
    if (!soap.assessment) {
      toast({
        title: "Validation Error",
        description: "Assessment (Diagnosis) is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get veterinarian profile ID
      const { data: { user } } = await supabase.auth.getUser();
      const { data: vetProfile } = await supabase
        .from('veterinarian_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vetProfile) {
        throw new Error("Veterinarian profile not found");
      }

      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedAppt.id,
          pet_id: selectedAppt.pets.id,
          veterinarian_id: vetProfile.id,
          ...soap
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save consultation');
      }

      toast({
        title: "Consultation Complete",
        description: result.message || "You may now issue prescriptions for this patient.",
      });

      // Refresh the queue
      mutate('/api/consultations');
      
      // Reset
      setSelectedAppt(null);
      setSoap({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to save consultation',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Get triage data for display
  const getTriageData = () => {
    if (!selectedAppt?.triage_records || selectedAppt.triage_records.length === 0) {
      return null;
    }
    return selectedAppt.triage_records[0];
  };

  const triageData = getTriageData();

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultation Room</h1>
        <p className="text-muted-foreground">Examine patients and create medical records (SOAP Notes)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        
        {/* --- LEFT: PATIENT QUEUE --- */}
        <div className="lg:col-span-3 flex flex-col gap-3 overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardCheck size={18} /> Triaged Patients
            </h3>
            <Badge variant="secondary">{safeQueue.length}</Badge>
          </div>
          
          {isLoading ? (
            <div className="text-sm text-gray-400">Loading queue...</div>
          ) : safeQueue.length === 0 ? (
            <div className="p-4 text-center border border-dashed rounded bg-gray-50 text-gray-400 text-sm">
              No patients ready for consultation.
            </div>
          ) : (
            safeQueue.map((appt: any) => (
              <div 
                key={appt.id}
                onClick={() => handleSelectPatient(appt)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedAppt?.id === appt.id 
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500 shadow-md' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-gray-800">{appt.pets?.name}</span>
                  <Badge variant="outline" className="text-[10px] h-5 bg-green-50">
                    <CheckCircle size={10} className="mr-1" /> Triaged
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {appt.pets?.species} • {appt.pets?.breed}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <User size={10} />
                  {appt.pets?.client_profiles?.first_name} {appt.pets?.client_profiles?.last_name}
                </div>
                {appt.triage_records && appt.triage_records[0]?.triage_level && (
                  <Badge 
                    variant="secondary" 
                    className={`mt-2 text-[10px] ${
                      appt.triage_records[0].triage_level === 'Critical' ? 'bg-red-100 text-red-700' :
                      appt.triage_records[0].triage_level === 'Urgent' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {appt.triage_records[0].triage_level}
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT: CONSULTATION WORKSPACE --- */}
        <div className="lg:col-span-9 flex flex-col overflow-y-auto">
          {selectedAppt ? (
            <div className="space-y-4">
              {/* Patient Header */}
              <Card className="border-t-4 border-t-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{selectedAppt.pets?.name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedAppt.pets?.species} • {selectedAppt.pets?.breed} • {selectedAppt.pets?.gender}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Owner: {selectedAppt.pets?.client_profiles?.first_name} {selectedAppt.pets?.client_profiles?.last_name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {format(new Date(selectedAppt.scheduled_start), 'h:mm a')}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Triage Vitals (Read-Only Reference) */}
              {triageData && (
                <Card>
                  <CardHeader className="pb-3 bg-gray-50/50">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity size={16} className="text-green-600" />
                      Vitals from Triage
                      <Badge variant="secondary" className="text-xs">
                        {format(new Date(triageData.created_at), 'h:mm a')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Weight size={18} className="mx-auto text-blue-600 mb-1" />
                        <div className="text-2xl font-bold text-gray-900">{triageData.weight || 'N/A'}</div>
                        <div className="text-xs text-gray-500">kg</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <Thermometer size={18} className="mx-auto text-red-600 mb-1" />
                        <div className="text-2xl font-bold text-gray-900">{triageData.temperature || 'N/A'}</div>
                        <div className="text-xs text-gray-500">°C</div>
                      </div>
                      <div className="text-center p-3 bg-pink-50 rounded-lg">
                        <Heart size={18} className="mx-auto text-pink-600 mb-1" />
                        <div className="text-2xl font-bold text-gray-900">{triageData.heart_rate || 'N/A'}</div>
                        <div className="text-xs text-gray-500">bpm</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <Activity size={18} className="mx-auto text-purple-600 mb-1" />
                        <div className="text-2xl font-bold text-gray-900">{triageData.respiratory_rate || 'N/A'}</div>
                        <div className="text-xs text-gray-500">bpm</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <Stethoscope size={18} className="mx-auto text-gray-600 mb-1" />
                        <div className="text-sm font-bold text-gray-900">{triageData.mucous_membrane || 'N/A'}</div>
                        <div className="text-xs text-gray-500">MM</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SOAP Notes Form */}
              <Card>
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    SOAP Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Subjective */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">S</span>
                        Subjective
                      </Label>
                      <p className="text-xs text-gray-500 ml-8">Patient history, owner's report, chief complaint</p>
                      <Textarea 
                        value={soap.subjective}
                        onChange={(e) => setSoap({...soap, subjective: e.target.value})}
                        placeholder="e.g., Owner reports pet has been vomiting for 2 days, not eating well..."
                        rows={3}
                        className="ml-8 resize-none"
                      />
                    </div>

                    <Separator />

                    {/* Objective */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">O</span>
                        Objective
                      </Label>
                      <p className="text-xs text-gray-500 ml-8">Physical examination findings, observable facts</p>
                      <Textarea 
                        value={soap.objective}
                        onChange={(e) => setSoap({...soap, objective: e.target.value})}
                        placeholder="e.g., Abdomen slightly distended, mild dehydration noted, heart and lungs clear..."
                        rows={4}
                        className="ml-8 resize-none"
                      />
                    </div>

                    <Separator />

                    {/* Assessment */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">A</span>
                        Assessment (Diagnosis) <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-xs text-gray-500 ml-8">Diagnosis, differential diagnoses</p>
                      <Textarea 
                        value={soap.assessment}
                        onChange={(e) => setSoap({...soap, assessment: e.target.value})}
                        placeholder="e.g., Acute gastroenteritis, rule out dietary indiscretion..."
                        rows={3}
                        className="ml-8 resize-none"
                        required
                      />
                    </div>

                    <Separator />

                    {/* Plan */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">P</span>
                        Plan (Treatment)
                      </Label>
                      <p className="text-xs text-gray-500 ml-8">Treatment plan, medications, follow-up instructions</p>
                      <Textarea 
                        value={soap.plan}
                        onChange={(e) => setSoap({...soap, plan: e.target.value})}
                        placeholder="e.g., Prescribe anti-emetic, bland diet for 3 days, recheck in 1 week if no improvement..."
                        rows={4}
                        className="ml-8 resize-none"
                      />
                    </div>

                    <Separator className="my-6" />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setSelectedAppt(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSaving || !soap.assessment}
                        className="bg-blue-600 hover:bg-blue-700 w-64"
                      >
                        {isSaving ? 'Saving...' : '✓ Finish Consultation'}
                      </Button>
                    </div>

                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-xl bg-gray-50/50">
              <Stethoscope size={64} className="mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-gray-600">No Patient Selected</h3>
              <p className="text-sm mt-2">Select a patient from the queue to begin consultation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
