'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Stethoscope, Thermometer, Weight, Heart, Activity, Clock, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const TRIAGE_LEVEL_STYLES: Record<string, string> = {
  Critical:  'border-red-500 text-red-600 bg-red-50',
  Urgent:    'border-orange-500 text-orange-600 bg-orange-50',
  'Non-Urgent': '',
};

const TRIAGE_BADGE: Record<string, string> = {
  Critical:  'bg-red-600',
  Urgent:    'bg-orange-500',
  'Non-Urgent': 'bg-green-600',
};

export default function TriageContent() {
  const { data: queue = [], isLoading, error } = useSWR('/api/triage', fetcher);
  const safeQueue = Array.isArray(queue) ? queue : [];

  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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
    setVitals((prev) => ({ ...prev, chief_complaint: appt.reason_for_visit || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    if (!vitals.weight || !vitals.temperature) {
      toast({
        title: 'Validation Error',
        description: 'Weight and Temperature are required fields',
        variant: 'destructive',
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
          ...vitals,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save triage');

      toast({
        title: 'Triage Completed',
        description: `${selectedAppt.pets.name} is ready for consultation.`,
      });

      await mutate('/api/triage');
      await mutate('/api/appointments');
      setSelectedAppt(null);
      setVitals({
        weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
        mucous_membrane: 'Pink', triage_level: 'Non-Urgent', chief_complaint: '',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save triage assessment',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ── LEFT: Waiting Queue ── */}
        <div className="md:col-span-4 lg:col-span-3 space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Clock size={18} className="text-green-600" />
            Waiting Room
            <Badge variant="secondary" className="ml-auto">{safeQueue.length}</Badge>
          </h2>

          {error ? (
            <p className="text-sm text-destructive">Failed to load triage queue.</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Loading queue…</p>
          ) : safeQueue.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-xl bg-muted/30 text-muted-foreground">
              <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No patients in queue.</p>
            </div>
          ) : (
            safeQueue.map((appt: any) => (
              <div
                key={appt.id}
                onClick={() => handleSelect(appt)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  selectedAppt?.id === appt.id
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-foreground">{appt.pets?.name}</span>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {appt.scheduled_start
                      ? format(new Date(appt.scheduled_start), 'h:mm a')
                      : '—'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {appt.pets?.species} • {appt.pets?.breed}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Owner: {appt.pets?.client_profiles?.first_name}{' '}
                  {appt.pets?.client_profiles?.last_name}
                </p>
                {appt.checked_in_at && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Checked in {format(new Date(appt.checked_in_at), 'h:mm a')}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── RIGHT: Vitals Form ── */}
        <div className="md:col-span-8 lg:col-span-9">
          {selectedAppt ? (
            <Card className="border-t-4 border-t-green-600">
              <CardHeader className="bg-muted/40 border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">Triage Assessment</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient:{' '}
                      <span className="font-bold text-foreground">{selectedAppt.pets?.name}</span>
                      {' · '}
                      {selectedAppt.pets?.species} · {selectedAppt.pets?.breed}
                    </p>
                  </div>
                  <Badge variant="outline">{selectedAppt.appointment_number || selectedAppt.appointment_type}</Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Priority & Chief Complaint */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select
                        value={vitals.triage_level}
                        onValueChange={(val) => setVitals({ ...vitals, triage_level: val })}
                      >
                        <SelectTrigger className={TRIAGE_LEVEL_STYLES[vitals.triage_level] ?? ''}>
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
                        onChange={(e) => setVitals({ ...vitals, chief_complaint: e.target.value })}
                        placeholder="e.g. Vomiting, Lethargy…"
                      />
                    </div>
                  </div>

                  {/* Vital signs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 p-4 rounded-xl border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Weight size={13} /> Weight (kg) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number" step="0.1" required
                        value={vitals.weight}
                        onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                        placeholder="0.0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Thermometer size={13} /> Temp (°C) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number" step="0.1" required
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        placeholder="38.0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Heart size={13} /> HR (bpm)
                      </Label>
                      <Input
                        type="number"
                        value={vitals.heart_rate}
                        onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
                        placeholder="0"
                        className="bg-card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs uppercase text-muted-foreground">
                        <Activity size={13} /> RR (bpm)
                      </Label>
                      <Input
                        type="number"
                        value={vitals.respiratory_rate}
                        onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                        placeholder="0"
                        className="bg-card"
                      />
                    </div>
                  </div>

                  {/* Mucous membrane */}
                  <div className="space-y-2">
                    <Label>Mucous Membrane Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Pink', 'Pale', 'Cyanotic', 'Jaundiced', 'Injected'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setVitals({ ...vitals, mucous_membrane: color })}
                          className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                            vitals.mucous_membrane === color
                              ? 'bg-primary/10 border-primary text-primary font-medium'
                              : 'hover:bg-muted border-border'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 min-w-[160px]"
                    >
                      {isSaving ? 'Saving…' : 'Complete Triage'}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[420px] border-2 border-dashed rounded-xl bg-muted/30 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Patient Selected</h3>
              <p className="text-sm mt-1">Select a patient from the waiting room to start triage.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
