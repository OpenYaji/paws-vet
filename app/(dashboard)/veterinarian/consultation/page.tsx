'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Stethoscope, Thermometer, Weight, Activity, Heart, 
  FileText, ClipboardCheck, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';

// 1. Fetcher: Get today's patients who are ready (Checked In or Confirmed)
const fetchQueue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      appointment_status,
      pets (
        id,
        name,
        species,
        breed,
        gender,
        date_of_birth,
        client_profiles (first_name, last_name)
      )
    `)
    .gte('scheduled_start', `${today}T00:00:00`)
    .lt('scheduled_start', `${today}T23:59:59`)
    // We look for 'checked-in' (passed triage) or 'confirmed' (skipped triage)
    .in('appointment_status', ['checked-in', 'confirmed', 'in-consultation']) 
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

export default function ConsultationPage() {
  const { data: queue = [], isLoading } = useSWR('consultation-queue', fetchQueue);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [triageData, setTriageData] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for Medical Record
  const [record, setRecord] = useState({
    chief_complaint: '',
    examination_findings: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_instructions: '',
    next_appointment: ''
  });

  // 2. When a patient is selected, fetch their Triage Data
  useEffect(() => {
    if (!selectedAppt) return;

    const loadTriage = async () => {
      const { data } = await supabase
        .from('triage_records')
        .select('*')
        .eq('appointment_id', selectedAppt.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setTriageData(data || null);
      
      // Auto-fill complaint if available
      if (data?.chief_complaint) {
        setRecord(prev => ({ ...prev, chief_complaint: data.chief_complaint }));
      }
    };
    
    loadTriage();
    // Reset form
    setRecord({
       chief_complaint: '', examination_findings: '', diagnosis: '', 
       treatment_plan: '', follow_up_instructions: '', next_appointment: ''
    });
  }, [selectedAppt]);

  // 3. Save Medical Record
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // A. Get Vet Profile ID (Required by Schema)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: vetProfile } = await supabase
        .from('veterinarian_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vetProfile) throw new Error("Vet profile not found");

      // B. Create Medical Record
      const recordNumber = `MR-${Date.now().toString().slice(-6)}`; // Simple ID Gen
      
      const { error } = await supabase
        .from('medical_records')
        .insert([{
          record_number: recordNumber,
          appointment_id: selectedAppt.id,
          pet_id: selectedAppt.pets.id,
          veterinarian_id: vetProfile.id,
          visit_date: new Date().toISOString(),
          chief_complaint: record.chief_complaint,
          examination_findings: record.examination_findings,
          diagnosis: record.diagnosis,
          treatment_plan: record.treatment_plan,
          follow_up_instructions: record.follow_up_instructions,
          next_appointment_recommended: record.next_appointment || null,
          record_created_by: vetProfile.id,
        }]);

      if (error) throw error;

      // C. Update Appointment to "Completed"
      await supabase
        .from('appointments')
        .update({ appointment_status: 'completed' })
        .eq('id', selectedAppt.id);

      alert("Consultation saved successfully!");
      mutate('consultation-queue');
      setSelectedAppt(null);

    } catch (error: any) {
      alert('Error saving record: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col gap-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Consultation Room</h1>
        <p className="text-muted-foreground">Examine patients and create medical records</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 h-full overflow-hidden">
        
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
                onClick={() => setSelectedAppt(appt)}
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
                {appt.appointment_status === 'checked-in' && (
                   <span className="text-[10px] text-green-600 font-medium flex items-center gap-1 mt-1">
                     <CheckCircle2 size={10} /> Triaged
                   </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT: WORKSPACE --- */}
        <div className="lg:col-span-9 flex flex-col h-full overflow-y-auto pb-10">
          {selectedAppt ? (
            <div className="space-y-6">
              
              {/* 1. Header & Triage Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Triage/Vitals Card */}
                <Card className={`${triageData ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-dashed'}`}>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-600">
                       <Activity size={16} /> Triage Vitals
                       {!triageData && <span className="text-xs font-normal text-red-400">(Not recorded)</span>}
                     </CardTitle>
                   </CardHeader>
                   <CardContent>
                     {triageData ? (
                       <div className="grid grid-cols-3 gap-4 text-center">
                         <div>
                            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1"><Weight size={12}/> Wt</div>
                            <span className="font-bold text-lg">{triageData.weight}kg</span>
                         </div>
                         <div>
                            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1"><Thermometer size={12}/> Temp</div>
                            <span className={`font-bold text-lg ${triageData.temperature > 39 ? 'text-red-600' : ''}`}>
                                {triageData.temperature}°C
                            </span>
                         </div>
                         <div>
                            <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1"><Heart size={12}/> HR</div>
                            <span className="font-bold text-lg">{triageData.heart_rate}</span>
                         </div>
                         <div className="col-span-3 text-left mt-2 text-xs bg-white p-2 rounded border">
                           <span className="font-semibold">Notes:</span> {triageData.notes || 'No triage notes.'}
                         </div>
                       </div>
                     ) : (
                       <div className="text-sm text-gray-400 text-center py-2">
                         Nurse has not entered vitals yet.
                       </div>
                     )}
                   </CardContent>
                </Card>
              </div>

              {/* 2. The Medical Record Form */}
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
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
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

// Helper icon for missing CheckedIn
function CheckCircle2({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="3" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}