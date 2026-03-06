'use client';

import { useState } from 'react';
import { supabase } from '@/lib/auth-client';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Scissors, Clock } from 'lucide-react';
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
    .in('appointment_status', ['confirmed', 'pending', 'in_progress'])
    .eq('appointment_type', 'surgery')
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

export default function NeuterContent() {
  const { data: appointments = [], isLoading, error } = useSWR('surgery-queue', fetchQueue);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  // Replaced vitals with surgery-specific fields
  const [procedure, setProcedure] = useState({
    operation_type: '',
    operation_cost: '',
    notes: '',
  });

  const handleSelect = (appt: any) => {
    setSelectedAppt(appt);
    // Auto-select Spay or Neuter based on pet gender if available
    const isFemale = appt.pets.gender?.toLowerCase() === 'female';
    setProcedure({
      operation_type: isFemale ? 'Spay' : 'Neuter',
      operation_cost: '',
      notes: appt.reason_for_visit || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;

    if (!procedure.operation_type) {
      toast({
        title: "Validation Error",
        description: "Please select the procedure type.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/neuter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedAppt.id,
          pet_id: selectedAppt.pets.id,
          ...procedure
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save procedure');
      }

      toast({
        title: "Procedure Completed",
        description: `Successfully recorded ${procedure.operation_type} for ${selectedAppt.pets.name}.`,
      });

      // Refresh the waiting list
      await mutate('surgery-queue');
      
      // Reset form
      setSelectedAppt(null);
      setProcedure({ operation_type: '', operation_cost: '', notes: '' });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to save procedure record',
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
              No surgery patients waiting.
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
                  {appt.pets.species} • {appt.pets.breed} ({appt.pets.gender})
                </div>
                <div className="text-xs text-muted-foreground">
                  Owner: {appt.pets.client_profiles?.first_name} {appt.pets.client_profiles?.last_name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- RIGHT COLUMN: PROCEDURE FORM --- */}
        <div className="md:col-span-8 lg:col-span-9">
          {selectedAppt ? (
            <Card className="h-full border-t-4 border-t-primary">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Surgical Procedure Record</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient: <span className="font-bold text-foreground">{selectedAppt.pets.name}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 bg-card">
                    {selectedAppt.pets.species} - {selectedAppt.pets.gender}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Procedure Type</Label>
                      <Select
                        value={procedure.operation_type}
                        onValueChange={(val) => setProcedure({...procedure, operation_type: val})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select procedure..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spay">Spay (Female)</SelectItem>
                          <SelectItem value="Neuter">Neuter (Male)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Procedure Cost (₱)</Label>
                      <Input
                        type="number"
                        value={procedure.operation_cost}
                        onChange={(e) => setProcedure({...procedure, operation_cost: e.target.value})}
                        placeholder="e.g. 2500"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Operation Notes / Post-Op Instructions</Label>
                    <Textarea
                      value={procedure.notes}
                      onChange={(e) => setProcedure({...procedure, notes: e.target.value})}
                      placeholder="Record any complications, medication given, or instructions for the owner..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t">
                    <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving} className="min-w-[160px] bg-green-600 hover:bg-green-700">
                      {isSaving ? 'Saving...' : 'Complete Surgery'}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30 min-h-[400px]">
              <Scissors size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Patient Selected</h3>
              <p>Select a patient from the waiting room to record the surgery.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}