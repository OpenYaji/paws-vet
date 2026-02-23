'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Camera, Thermometer, Weight, Heart, Activity, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const fetchQueue = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_start,
      appointment_status,
      appointment_type,
      reason_for_visit,
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
    .in('appointment_status', ['confirmed', 'pending'])
    .eq('appointment_type', 'surgery')
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

export default function NeuterContent() {
  const { data: appointments = [], isLoading, error } = useSWR('capture-queue', fetchQueue);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

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
      await mutate('capture-queue');
      
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
    <div className="space-y-6 flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">

        {/* --- LEFT COLUMN: WAITING LIST --- */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} /> Waiting Room ({safeAppointments.length})
          </h2>

          {error ? (
            <div className="text-sm text-destructive">Error loading queue.</div>
          ) : isLoading ? (
            <div className="text-sm text-muted-foreground">Loading queue...</div>
          ) : safeAppointments.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-lg bg-muted/50 text-muted-foreground">
              No patients waiting.
            </div>
          ) : (
            safeAppointments.map((appt: any) => (
              <div
                key={appt.id}
                onClick={() => handleSelect(appt)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  selectedAppt?.id === appt.id
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-foreground">{appt.pets.name}</span>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                    {format(new Date(appt.scheduled_start), 'h:mm a')}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {appt.pets.species} • {appt.pets.breed}
                </div>
                <div className="text-xs text-muted-foreground">
                  Owner: {appt.pets.client_profiles?.first_name} {appt.pets.client_profiles?.last_name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT COLUMN: CAPTURE FORM --- */}
        <div className="md:col-span-8 lg:col-span-9">
          {selectedAppt ? (
            <Card className="h-full border-t-4 border-t-primary">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Vitals Capture</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient: <span className="font-bold text-foreground">{selectedAppt.pets.name}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 bg-card">
                    {selectedAppt.pets.species}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select
                        value={vitals.triage_level}
                        onValueChange={(val) => setVitals({...vitals, triage_level: val})}
                      >
                        <SelectTrigger className={
                          vitals.triage_level === 'Critical' ? 'border-destructive text-destructive bg-destructive/10' :
                          vitals.triage_level === 'Urgent' ? 'border-orange-500 text-orange-600 bg-orange-50' : ''
                        }>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non-Urgent">Non-Urgent (Routine)</SelectItem>
                          <SelectItem value="Urgent">Urgent (Stable but serious)</SelectItem>
                          <SelectItem value="Critical">Critical (Life threatening)</SelectItem>
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Weight size={14} /> Weight (kg)
                      </Label>
                      <Input
                        type="number" step="0.1"
                        value={vitals.weight}
                        onChange={(e) => setVitals({...vitals, weight: e.target.value})}
                        placeholder="0.0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Thermometer size={14} /> Temp (°C)
                      </Label>
                      <Input
                        type="number" step="0.1"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                        placeholder="38.0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Heart size={14} /> HR (bpm)
                      </Label>
                      <Input
                        type="number"
                        value={vitals.heart_rate}
                        onChange={(e) => setVitals({...vitals, heart_rate: e.target.value})}
                        placeholder="0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Activity size={14} /> RR (bpm)
                      </Label>
                      <Input
                        type="number"
                        value={vitals.respiratory_rate}
                        onChange={(e) => setVitals({...vitals, respiratory_rate: e.target.value})}
                        placeholder="0"
                        className="bg-card"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mucous Membrane Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {['Pink', 'Pale', 'Cyanotic', 'Jaundiced', 'Injected'].map((color) => (
                        <div
                          key={color}
                          onClick={() => setVitals({...vitals, mucous_membrane: color})}
                          className={`px-3 py-2 rounded-md border text-sm cursor-pointer transition-all ${
                            vitals.mucous_membrane === color
                            ? 'bg-primary/10 border-primary text-primary font-medium'
                            : 'hover:bg-muted'
                          }`}
                        >
                          {color}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[160px]">
                      {isSaving ? 'Saving...' : 'Submit Capture'}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30 min-h-[400px]">
              <Camera size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Patient Selected</h3>
              <p>Select a patient from the waiting room to start capture.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
