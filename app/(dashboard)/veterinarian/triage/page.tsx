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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Activity, Thermometer, Weight, Heart, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

// Fetch appointments scheduled for TODAY that are pending/confirmed
const fetcher = async () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      reason_for_visit,
      appointment_status,
      pets (
        id,
        name,
        species,
        breed,
        client_profiles (first_name, last_name)
      )
    `)
    // Filter for TODAY's appointments only
    .gte('scheduled_start', `${today}T00:00:00`)
    .lt('scheduled_start', `${today}T23:59:59`)
    .in('appointment_status', ['pending', 'confirmed']) // Only show waiting patients
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

export default function TriagePage() {
  const { data: appointments = [], isLoading } = useSWR('triage-queue', fetcher);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [vitals, setVitals] = useState({
    weight: '',
    temperature: '',
    heart_rate: '',
    respiratory_rate: '',
    mucous_membrane: 'Pink',
    triage_level: 'Non-Urgent',
    chief_complaint: '',
  });

  const handleSelect = (appt: any) => {
    setSelectedAppt(appt);
    // Pre-fill chief complaint from appointment reason
    setVitals(prev => ({ ...prev, chief_complaint: appt.reason_for_visit || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Create Triage Record
      const { error: triageError } = await supabase
        .from('triage_records')
        .insert([{
          appointment_id: selectedAppt.id,
          pet_id: selectedAppt.pets.id,
          weight: Number(vitals.weight),
          temperature: Number(vitals.temperature),
          heart_rate: Number(vitals.heart_rate),
          respiratory_rate: Number(vitals.respiratory_rate),
          mucous_membrane: vitals.mucous_membrane,
          triage_level: vitals.triage_level,
          chief_complaint: vitals.chief_complaint,
          created_by: user?.id
        }]);

      if (triageError) throw triageError;

      // 2. Optional: Update Appointment Status to "checked-in" or "in-progress"
      // This removes them from the "Pending" list in future fetches
      await supabase
        .from('appointments')
        .update({ appointment_status: 'checked-in' }) // Ensure this status exists in your enum/DB
        .eq('id', selectedAppt.id);

      // 3. Reset
      mutate('triage-queue'); // Refresh list
      setSelectedAppt(null);
      setVitals({
        weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
        mucous_membrane: 'Pink', triage_level: 'Non-Urgent', chief_complaint: ''
      });

    } catch (error: any) {
      alert('Error saving triage: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Triage & Intake</h1>
        <p className="text-muted-foreground">Assess patient vitals and prioritize care</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 h-full">
        
        {/* --- LEFT COLUMN: WAITING LIST --- */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={18} /> Waiting Room ({appointments.length})
          </h2>
          
          {isLoading ? (
            <div className="text-sm text-gray-400">Loading queue...</div>
          ) : appointments.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-lg bg-gray-50 text-gray-400">
              No patients waiting.
            </div>
          ) : (
            appointments.map((appt: any) => (
              <div 
                key={appt.id}
                onClick={() => handleSelect(appt)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedAppt?.id === appt.id 
                    ? 'bg-green-50 border-green-500 ring-1 ring-green-500' 
                    : 'bg-white border-gray-200 hover:border-green-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800">{appt.pets.name}</span>
                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                    {format(new Date(appt.scheduled_start), 'h:mm a')}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-1">
                  {appt.pets.species} • {appt.pets.breed}
                </div>
                <div className="text-xs text-gray-400">
                  Owner: {appt.pets.client_profiles?.first_name} {appt.pets.client_profiles?.last_name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT COLUMN: ASSESSMENT FORM --- */}
        <div className="md:col-span-8 lg:col-span-9">
          {selectedAppt ? (
            <Card className="h-full border-t-4 border-t-green-500">
              <CardHeader className="bg-gray-50/50 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Vitals Assessment</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Patient: <span className="font-bold text-gray-900">{selectedAppt.pets.name}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 bg-white">
                    {selectedAppt.pets.species}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Priority Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Triage Priority Level</Label>
                      <Select 
                        value={vitals.triage_level} 
                        onValueChange={(val) => setVitals({...vitals, triage_level: val})}
                      >
                        <SelectTrigger className={
                          vitals.triage_level === 'Critical' ? 'border-red-500 text-red-600 bg-red-50' : 
                          vitals.triage_level === 'Urgent' ? 'border-orange-500 text-orange-600 bg-orange-50' : ''
                        }>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non-Urgent">🟢 Non-Urgent (Routine)</SelectItem>
                          <SelectItem value="Urgent">🟡 Urgent (Stable but serious)</SelectItem>
                          <SelectItem value="Critical">🔴 Critical (Life threatening)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Chief Complaint</Label>
                      <Input 
                        value={vitals.chief_complaint}
                        onChange={(e) => setVitals({...vitals, chief_complaint: e.target.value})}
                        placeholder="e.g. Vomiting, Limping..." 
                      />
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-gray-500">
                        <Weight size={14} /> Weight (kg)
                      </Label>
                      <Input 
                        type="number" step="0.1" 
                        value={vitals.weight}
                        onChange={(e) => setVitals({...vitals, weight: e.target.value})}
                        placeholder="0.0" 
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-gray-500">
                        <Thermometer size={14} /> Temp (°C)
                      </Label>
                      <Input 
                        type="number" step="0.1" 
                        value={vitals.temperature}
                        onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                        placeholder="38.0" 
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-gray-500">
                        <Heart size={14} /> HR (bpm)
                      </Label>
                      <Input 
                        type="number"
                        value={vitals.heart_rate}
                        onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})}
                        placeholder="0" 
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-gray-500">
                        <Activity size={14} /> RR (bpm)
                      </Label>
                      <Input 
                        type="number"
                        value={vitals.respiratory_rate}
                        onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})}
                        placeholder="0" 
                        className="bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mucous Membrane Color</Label>
                    <div className="flex gap-2">
                      {['Pink', 'Pale', 'Cyanotic', 'Jaundiced', 'Injected'].map((color) => (
                        <div 
                          key={color}
                          onClick={() => setVitals({...vitals, mucous_membrane: color})}
                          className={`px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${
                            vitals.mucous_membrane === color 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' 
                            : 'hover:bg-gray-50'
                          }`}
                        >
                          {color}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 w-40">
                      {isSaving ? 'Saving...' : 'Submit Assessment'}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed rounded-xl bg-gray-50/50">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-gray-600">No Patient Selected</h3>
              <p>Select a patient from the waiting room to start triage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}