'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Stethoscope, Thermometer, Weight, Heart, Activity, Clock, AlertTriangle, Pencil, Loader2,
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
  const { data: queue = [], isLoading, error } = useSWR('/api/veterinarian/triage', fetcher);
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
    
    const apptToProcess = selectedAppt;

    mutate(
      '/api/veterinarian/triage', 
      safeQueue.filter((a: any) => a.id !== apptToProcess.id), 
      false
    );

    setSelectedAppt(null);
    setVitals({
      weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
      mucous_membrane: 'Pink', triage_level: 'Non-Urgent', chief_complaint: '',
    });

    try {
      const response = await fetch('/api/veterinarian/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: apptToProcess.id,
          pet_id: apptToProcess.pets.id,
          ...vitals,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save triage');

      toast({
        title: 'Triage Completed',
        description: `${apptToProcess.pets.name} is ready for consultation.`,
      });

      mutate('/api/veterinarian/triage');
      mutate('/api/veterinarian/consultations');
      mutate('surgery-queue');
      mutate('/api/veterinarian/appointments');  

    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save triage assessment',
        variant: 'destructive',
      });

      mutate('/api/veterinarian/triage');
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
                      className="bg-green-600 hover:bg-green-700 min-w-40"
                    >
                      {isSaving ? 'Saving…' : 'Complete Triage'}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-105 border-2 border-dashed rounded-xl bg-muted/30 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Patient Selected</h3>
              <p className="text-sm mt-1">Select a patient from the waiting room to start triage.</p>
            </div>
          )}
        </div>

      </div>

      {/* Completed Triage Records (for vitals correction) */}
      <CompletedTriageSection />
    </div>
  );
}

function CompletedTriageSection() {
  const { data: completed = [], mutate: refetch } = useSWR(
    '/api/veterinarian/triage?completed=true',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );

  const [editRec, setEditRec] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    weight: '', temperature: '', heart_rate: '', respiratory_rate: '',
    mucous_membrane: 'Pink', triage_level: 'Non-Urgent', chief_complaint: '',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const openEdit = (rec: any) => {
    setEditRec(rec);
    setEditForm({
      weight: rec.weight?.toString() ?? '',
      temperature: rec.temperature?.toString() ?? '',
      heart_rate: rec.heart_rate?.toString() ?? '',
      respiratory_rate: rec.respiratory_rate?.toString() ?? '',
      mucous_membrane: rec.mucous_membrane ?? 'Pink',
      triage_level: rec.triage_level ?? 'Non-Urgent',
      chief_complaint: rec.chief_complaint ?? '',
    });
  };

  const handleSave = async () => {
    if (!editRec) return;
    setSaving(true);
    try {
      const res = await fetch('/api/veterinarian/triage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editRec.id, ...editForm }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditRec(null);
      refetch();
      toast({ title: 'Vitals Updated', description: `${editRec.pets?.name}'s triage record has been corrected.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!Array.isArray(completed) || completed.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <Clock size={14} /> Today's Completed Triage — <span className="text-foreground">{completed.length} record{completed.length !== 1 ? 's' : ''}</span>
        <span className="text-xs font-normal">(click pencil to correct vitals)</span>
      </h3>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">Patient</th>
              <th className="px-3 py-2 text-left">Weight</th>
              <th className="px-3 py-2 text-left">Temp</th>
              <th className="px-3 py-2 text-left">HR</th>
              <th className="px-3 py-2 text-left">RR</th>
              <th className="px-3 py-2 text-left">Priority</th>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((rec: any) => (
              <tr key={rec.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{rec.pets?.name ?? '—'}</td>
                <td className="px-3 py-2">{rec.weight ?? '—'} kg</td>
                <td className="px-3 py-2">{rec.temperature ?? '—'} °C</td>
                <td className="px-3 py-2">{rec.heart_rate ?? '—'}</td>
                <td className="px-3 py-2">{rec.respiratory_rate ?? '—'}</td>
                <td className="px-3 py-2">
                  <Badge variant={rec.triage_level === 'Critical' ? 'destructive' : rec.triage_level === 'Urgent' ? 'secondary' : 'outline'} className="text-xs">
                    {rec.triage_level}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {rec.created_at ? format(new Date(rec.created_at), 'h:mm a') : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(rec)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Vitals Dialog */}
      <Dialog open={!!editRec} onOpenChange={(open) => !open && setEditRec(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct Vitals — {editRec?.pets?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" value={editForm.weight}
                  onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Temperature (°C)</Label>
                <Input type="number" step="0.1" value={editForm.temperature}
                  onChange={e => setEditForm(f => ({ ...f, temperature: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Heart Rate (bpm)</Label>
                <Input type="number" value={editForm.heart_rate}
                  onChange={e => setEditForm(f => ({ ...f, heart_rate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Respiratory Rate (bpm)</Label>
                <Input type="number" value={editForm.respiratory_rate}
                  onChange={e => setEditForm(f => ({ ...f, respiratory_rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Priority Level</Label>
              <Select value={editForm.triage_level} onValueChange={v => setEditForm(f => ({ ...f, triage_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non-Urgent">Non-Urgent</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Chief Complaint</Label>
              <Input value={editForm.chief_complaint}
                onChange={e => setEditForm(f => ({ ...f, chief_complaint: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Mucous Membrane</Label>
              <div className="flex flex-wrap gap-2">
                {['Pink', 'Pale', 'Cyanotic', 'Jaundiced', 'Injected'].map(color => (
                  <button key={color} type="button"
                    onClick={() => setEditForm(f => ({ ...f, mucous_membrane: color }))}
                    className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                      editForm.mucous_membrane === color
                        ? 'bg-primary/10 border-primary text-primary font-medium'
                        : 'hover:bg-muted border-border'
                    }`}>
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRec(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
