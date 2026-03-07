'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Scissors, Clock, FlaskConical, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
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
    .in('appointment_type', ['surgery', 'kapon'])
    .order('scheduled_start', { ascending: true });

  if (error) throw error;
  return data;
};

type BloodTestStatus = {
  consultationDone: boolean;
  medicalRecordId: string | null;
  bloodTest: {
    id: string;
    test_name: string;
    findings: string | null;
    is_abnormal: boolean;
  } | null;
};

export default function NeuterContent() {
  const { data: appointments = [], isLoading, error } = useSWR('surgery-queue', fetchQueue);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  // Blood test state
  const [bloodTestStatus, setBloodTestStatus] = useState<BloodTestStatus | null>(null);
  const [isLoadingBloodTest, setIsLoadingBloodTest] = useState(false);
  const [bloodTestForm, setBloodTestForm] = useState({
    test_name: 'Complete Blood Count (CBC)',
    findings: '',
    is_abnormal: false,
  });
  const [isSavingBloodTest, setIsSavingBloodTest] = useState(false);

  // Kapon procedure state
  const [procedure, setProcedure] = useState({
    operation_type: '',
    operation_cost: '',
    notes: '',
  });

  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  // Fetch blood test status whenever an appointment is selected
  useEffect(() => {
    if (!selectedAppt) {
      setBloodTestStatus(null);
      return;
    }
    const load = async () => {
      setIsLoadingBloodTest(true);
      try {
        const res = await fetch(`/api/medical-test-results?appointment_id=${selectedAppt.id}`);
        const data = await res.json();
        setBloodTestStatus(data);
      } catch {
        setBloodTestStatus(null);
      } finally {
        setIsLoadingBloodTest(false);
      }
    };
    load();
  }, [selectedAppt]);

  const handleSelect = (appt: any) => {
    setSelectedAppt(appt);
    const isFemale = appt.pets.gender?.toLowerCase() === 'female';
    setProcedure({
      operation_type: isFemale ? 'Spay' : 'Neuter',
      operation_cost: '',
      notes: appt.reason_for_visit || '',
    });
    setBloodTestForm({ test_name: 'Complete Blood Count (CBC)', findings: '', is_abnormal: false });
  };

  const handleSaveBloodTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for both camelCase and snake_case depending on what your API returns
    const recordId = bloodTestStatus?.medicalRecordId || (bloodTestStatus as any)?.medical_record_id;

    if (!recordId) {
      toast({ 
        title: 'Missing Record', 
        description: 'Could not find the medical record ID. Make sure the consultation is completely saved.', 
        variant: 'destructive' 
      });
      return;
    }

    setIsSavingBloodTest(true);
    try {
      const res = await fetch('/api/medical-test-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medical_record_id: recordId,
          test_name: bloodTestForm.test_name,
          findings: bloodTestForm.findings,
          is_abnormal: bloodTestForm.is_abnormal,
        }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save blood test');

      toast({ title: 'Blood Test Recorded', description: 'Blood test results have been saved.' });

      // Refresh blood test status
      const refreshed = await fetch(`/api/medical-test-results?appointment_id=${selectedAppt.id}`);
      setBloodTestStatus(await refreshed.json());
      
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingBloodTest(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppt) return;
    setIsCancelling(true);

    const apptToCancel = selectedAppt;

    // Optimistic update
    mutate(
      'surgery-queue',
      safeAppointments.filter((a: any) => a.id !== apptToCancel.id),
      false
    );

    setSelectedAppt(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apptToCancel.id,
          appointment_status: 'cancelled',
          cancellation_reason: 'Suspected Disease Detected in blood test results',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to cancel appointment');

      toast({
        title: 'Appointment Cancelled',
        description: `${apptToCancel.pets.name}'s Kapon appointment has been cancelled.`,
      });

      mutate('surgery-queue');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      mutate('surgery-queue');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt || !procedure.operation_type) {
      toast({ title: 'Validation Error', description: 'Please select the procedure type.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const apptToProcess = selectedAppt;
    const currentProcedure = procedure;

    // Optimistic update
    mutate(
      'surgery-queue',
      safeAppointments.filter((a: any) => a.id !== apptToProcess.id),
      false
    );

    setSelectedAppt(null);
    setProcedure({ operation_type: '', operation_cost: '', notes: '' });

    try {
      const response = await fetch('/api/neuter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: apptToProcess.id,
          pet_id: apptToProcess.pets.id,
          ...currentProcedure,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save procedure');

      toast({
        title: 'Procedure Completed',
        description: `Successfully recorded ${currentProcedure.operation_type} for ${apptToProcess.pets.name}.`,
      });

      mutate('surgery-queue');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      mutate('surgery-queue');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine current step
  const consultationDone = bloodTestStatus?.consultationDone ?? false;
  const bloodTestDone = !!bloodTestStatus?.bloodTest;
  const bloodTestAbnormal = bloodTestStatus?.bloodTest?.is_abnormal ?? false;

  return (
    <div className="space-y-6 flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">

        {/* ── LEFT: WAITING LIST ── */}
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

        {/* ── RIGHT: WORKFLOW PANEL ── */}
        <div className="md:col-span-8 lg:col-span-9">
          {!selectedAppt ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/30 min-h-[400px]">
              <Scissors size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No Patient Selected</h3>
              <p>Select a patient from the waiting room to begin.</p>
            </div>
          ) : (
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="bg-muted/50 pb-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">Kapon Procedure Workflow</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Patient: <span className="font-bold text-foreground">{selectedAppt.pets.name}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="px-3 py-1 bg-card">
                    {selectedAppt.pets.species} — {selectedAppt.pets.gender}
                  </Badge>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  <StepBadge step={1} label="Blood Test" done={bloodTestDone} active={!bloodTestDone} />
                  <div className="h-px flex-1 bg-border" />
                  <StepBadge step={2} label="Kapon Procedure" done={false} active={bloodTestDone && !bloodTestAbnormal} />
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {isLoadingBloodTest ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">Loading blood test status...</div>
                ) : (
                  <>
                    {/* ── STEP 1: Blood Test ── */}
                    {!bloodTestDone && (
                      <section className="space-y-4">
                        {!consultationDone ? (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Consultation Required</AlertTitle>
                            <AlertDescription>
                              Please complete the patient's consultation first. A medical record must be created before a blood test can be recorded.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <FlaskConical size={18} className="text-blue-600" />
                              <h3 className="font-semibold text-foreground">Step 1 — Record Blood Test Results</h3>
                            </div>
                            <form onSubmit={handleSaveBloodTest} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Test Name</Label>
                                <Input
                                  value={bloodTestForm.test_name}
                                  onChange={(e) => setBloodTestForm({ ...bloodTestForm, test_name: e.target.value })}
                                  placeholder="e.g. Complete Blood Count (CBC)"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Findings / Remarks</Label>
                                <Textarea
                                  value={bloodTestForm.findings}
                                  onChange={(e) => setBloodTestForm({ ...bloodTestForm, findings: e.target.value })}
                                  placeholder="Describe the blood test findings..."
                                  className="min-h-[100px]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Result Interpretation</Label>
                                <Select
                                  value={bloodTestForm.is_abnormal ? 'abnormal' : 'normal'}
                                  onValueChange={(val) =>
                                    setBloodTestForm({ ...bloodTestForm, is_abnormal: val === 'abnormal' })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="normal">Normal — No disease suspected</SelectItem>
                                    <SelectItem value="abnormal">Abnormal — Suspected Disease</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-3 pt-2 border-t">
                                <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>
                                  Back
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={isSavingBloodTest}
                                  className="min-w-[160px] bg-blue-600 hover:bg-blue-700"
                                >
                                  {isSavingBloodTest ? 'Saving...' : 'Save Blood Test'}
                                </Button>
                              </div>
                            </form>
                          </>
                        )}
                      </section>
                    )}

                    {/* ── BLOOD TEST RESULT SUMMARY (when already recorded) ── */}
                    {bloodTestDone && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2">
                          {bloodTestAbnormal ? (
                            <XCircle size={18} className="text-destructive" />
                          ) : (
                            <CheckCircle2 size={18} className="text-green-600" />
                          )}
                          <h3 className="font-semibold text-foreground">Step 1 — Blood Test</h3>
                          <Badge variant={bloodTestAbnormal ? 'destructive' : 'default'} className={!bloodTestAbnormal ? 'bg-green-600' : ''}>
                            {bloodTestAbnormal ? 'Abnormal' : 'Normal'}
                          </Badge>
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
                          <p><span className="font-medium">Test:</span> {bloodTestStatus?.bloodTest?.test_name}</p>
                          {bloodTestStatus?.bloodTest?.findings && (
                            <p><span className="font-medium">Findings:</span> {bloodTestStatus.bloodTest.findings}</p>
                          )}
                        </div>
                      </section>
                    )}

                    {/* ── SUSPECTED DISEASE BLOCK ── */}
                    {bloodTestDone && bloodTestAbnormal && (
                      <section className="space-y-4">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Suspected Disease Detected</AlertTitle>
                          <AlertDescription>
                            The blood test results indicate an abnormality. The Kapon procedure cannot be performed until the pet is cleared. The appointment must be cancelled.
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-end gap-3 border-t pt-4">
                          <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>
                            Back
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={isCancelling}
                            onClick={handleCancelAppointment}
                            className="min-w-[200px]"
                          >
                            {isCancelling ? 'Cancelling...' : 'Cancel Kapon Appointment'}
                          </Button>
                        </div>
                      </section>
                    )}

                    {/* ── STEP 2: Kapon Procedure (unlocked when blood test is normal) ── */}
                    {bloodTestDone && !bloodTestAbnormal && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Scissors size={18} className="text-green-600" />
                          <h3 className="font-semibold text-foreground">Step 2 — Kapon Procedure</h3>
                        </div>
                        <form onSubmit={handleSubmitProcedure} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label>Procedure Type</Label>
                              <Select
                                value={procedure.operation_type}
                                onValueChange={(val) => setProcedure({ ...procedure, operation_type: val })}
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
                                onChange={(e) => setProcedure({ ...procedure, operation_cost: e.target.value })}
                                placeholder="e.g. 2500"
                                min="0"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Operation Notes / Post-Op Instructions</Label>
                            <Textarea
                              value={procedure.notes}
                              onChange={(e) => setProcedure({ ...procedure, notes: e.target.value })}
                              placeholder="Record any complications, medication given, or post-op instructions..."
                              className="min-h-[120px]"
                            />
                          </div>
                          <div className="pt-4 flex justify-end gap-3 border-t">
                            <Button type="button" variant="ghost" onClick={() => setSelectedAppt(null)}>
                              Back
                            </Button>
                            <Button
                              type="submit"
                              disabled={isSaving}
                              className="min-w-[160px] bg-green-600 hover:bg-green-700"
                            >
                              {isSaving ? 'Saving...' : 'Complete Surgery'}
                            </Button>
                          </div>
                        </form>
                      </section>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StepBadge({ step, label, done, active }: { step: number; label: string; done: boolean; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${active ? 'text-primary' : done ? 'text-green-600' : 'text-muted-foreground'}`}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
        done ? 'bg-green-600 border-green-600 text-white' :
        active ? 'border-primary text-primary' :
        'border-muted-foreground text-muted-foreground'
      }`}>
        {done ? '✓' : step}
      </span>
      {label}
    </div>
  );
}