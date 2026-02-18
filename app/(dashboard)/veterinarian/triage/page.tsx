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
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Activity, Thermometer, Weight, Heart, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TriagePage() {
  const { data: appointments = [], isLoading, error, mutate: mutateQueue } = useSWR('/api/triage', fetcher, {
    refreshInterval: 5000, // Auto-refresh every 5 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Ensure appointments is always an array
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  // Debug log
  useEffect(() => {
    console.log('=== TRIAGE QUEUE DEBUG ===');
    console.log('Raw response:', appointments);
    console.log('Is array?', Array.isArray(appointments));
    console.log('Queue length:', safeAppointments.length);
    if (safeAppointments.length > 0) {
      console.log('Patients in queue:');
      safeAppointments.forEach((appt: any) => {
        console.log('  -', appt.id, '|', appt.pets?.name, '| Checked in:', appt.checked_in_at);
      });
    } else {
      console.log('Queue is empty');
    }
    if (error) {
      console.error('Triage error:', error);
    }
  }, [appointments, safeAppointments, error]);

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

    // Validation
    if (!vitals.weight || !vitals.temperature) {
      toast({
        title: "Validation Error",
        description: "Weight and Temperature are required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedAppt.id,
          pet_id: selectedAppt.pets.id,
          ...vitals
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save triage');
      }

      toast({
        title: "Success",
        description: `Triage completed for ${selectedAppt.pets.name}. Patient ready for consultation.`,
      });

      // Refresh the queue
      await mutateQueue();
      
      // Reset form
      setSelectedAppt(null);
      setVitals({
        weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
        mucous_membrane: 'Pink', triage_level: 'Non-Urgent', chief_complaint: ''
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to save triage assessment',
        variant: "destructive"
      });
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
            <Clock size={18} /> Waiting Room ({safeAppointments.length})
          </h2>
          
          {error ? (
            <div className="text-sm text-red-400">Error loading queue: {error.message}</div>
          ) : isLoading ? (
            <div className="text-sm text-gray-400">Loading queue...</div>
          ) : safeAppointments.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-lg bg-gray-50 text-gray-400">
              No patients waiting.
            </div>
          ) : (
            safeAppointments.map((appt: any) => (
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
                  <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">
                    {format(new Date(appt.checked_in_at || appt.scheduled_start), 'h:mm a')}
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
                    <Button 
                      type="submit" 
                      disabled={isSaving || !vitals.weight || !vitals.temperature} 
                      className="bg-green-600 hover:bg-green-700 w-48"
                    >
                      {isSaving ? 'Saving...' : '✓ Ready for Consult'}
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