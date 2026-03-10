"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useParams, useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope, ClipboardList, CheckCircle2, PawPrint, Thermometer,
  Heart, Wind, Activity, Scale, ArrowLeft, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/auth-client";

interface TriageRecord {
  id: string;
  weight: number | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  mucous_membrane: string | null;
  triage_level: string | null;
  chief_complaint: string | null;
  created_at: string;
}

interface AppointmentDetail {
  id: string;
  appointment_number: string;
  scheduled_start: string;
  appointment_status: string;
  reason_for_visit: string;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    gender: string | null;
    date_of_birth: string | null;
    weight: number | null;
    client_profiles: {
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
  } | null;
  triage_records: TriageRecord[];
}

const TRIAGE_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  urgent: "bg-orange-100 text-orange-800 border-orange-300",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-300",
  stable: "bg-green-100 text-green-800 border-green-300",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConsultationDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  // Pull this appointment from the consultation queue
  const { data: queue = [], isLoading } = useSWR<AppointmentDetail[]>(
    "/api/veterinarian/consultations",
    fetcher
  );

  const appointment = queue.find((a) => a.id === appointmentId) ?? null;

  const [form, setForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (appointment) {
      const triage = appointment.triage_records?.[0];
      setForm({
        subjective: triage?.chief_complaint || appointment.reason_for_visit || "",
        objective: "",
        assessment: "",
        plan: "",
      });
    }
  }, [appointment]);

  // Once loaded, if not found in queue mark it
  useEffect(() => {
    if (!isLoading && queue.length >= 0 && !appointment) {
      setNotFound(true);
    }
  }, [isLoading, queue, appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    if (!form.assessment.trim()) {
      toast({
        title: "Diagnosis required",
        description: "Please enter a diagnosis/assessment.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("veterinarian_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      const res = await fetch("/api/veterinarian/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: appointment.id,
          pet_id: appointment.pets?.id,
          veterinarian_id: profile?.id,
          subjective: form.subjective,
          objective: form.objective,
          assessment: form.assessment,
          plan: form.plan,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      toast({
        title: "Consultation completed",
        description: `Medical record ${result.record_number} created.`,
      });

      mutate("/api/veterinarian/consultations");
      router.push("/veterinarian/medical-records");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading appointment...</p>
        </div>
      </div>
    );
  }

  if (notFound && !appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">
          This appointment is not in the consultation queue.
        </p>
        <p className="text-xs text-muted-foreground">
          It may have already been completed or is not yet triaged.
        </p>
        <Button variant="outline" asChild>
          <Link href="/veterinarian/consultation">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Queue
          </Link>
        </Button>
      </div>
    );
  }

  const triage = appointment?.triage_records?.[0];
  const pet = appointment?.pets;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild>
          <Link href="/veterinarian/consultation">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Consultation</h1>
          <span className="text-sm text-muted-foreground">
            Appt #{appointment?.appointment_number}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient Banner */}
        <Card className="bg-accent/30">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-bold text-lg">{pet?.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {pet?.species} · {pet?.breed ?? "Mixed"} · {pet?.gender ?? "—"}
                  {pet?.date_of_birth
                    ? ` · ${differenceInYears(new Date(), new Date(pet.date_of_birth))}y old`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Owner:{" "}
                  {pet?.client_profiles
                    ? `${pet.client_profiles.first_name} ${pet.client_profiles.last_name}`
                    : "—"}
                  {pet?.client_profiles?.phone ? ` · ${pet.client_profiles.phone}` : ""}
                </p>
              </div>
              {appointment && (
                <div className="text-right">
                  <Badge className="capitalize mb-1 block">
                    {appointment.reason_for_visit}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {appointment.scheduled_start
                      ? format(new Date(appointment.scheduled_start), "MMM dd • h:mm a")
                      : "—"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Triage Vitals */}
        {triage && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Triage Vitals
                {triage.triage_level && (
                  <Badge
                    className={`ml-2 text-xs capitalize ${TRIAGE_COLORS[triage.triage_level] ?? ""}`}
                  >
                    {triage.triage_level}
                  </Badge>
                )}
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {format(new Date(triage.created_at), "h:mm a")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {triage.weight != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span>{triage.weight} kg</span>
                  </div>
                )}
                {triage.temperature != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span>{triage.temperature} °C</span>
                  </div>
                )}
                {triage.heart_rate != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>{triage.heart_rate} bpm</span>
                  </div>
                )}
                {triage.respiratory_rate != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wind className="h-4 w-4 text-muted-foreground" />
                    <span>{triage.respiratory_rate} rpm</span>
                  </div>
                )}
                {triage.mucous_membrane && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <span className="text-muted-foreground text-xs">Mucous:</span>
                    <span className="capitalize">{triage.mucous_membrane}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SOAP Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" /> SOAP Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subjective">
                S — Subjective{" "}
                <span className="text-muted-foreground text-xs">(Chief Complaint)</span>
              </Label>
              <Textarea
                id="subjective"
                rows={2}
                placeholder="What the owner reports..."
                value={form.subjective}
                onChange={(e) => setForm({ ...form, subjective: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective">
                O — Objective{" "}
                <span className="text-muted-foreground text-xs">(Examination Findings)</span>
              </Label>
              <Textarea
                id="objective"
                rows={3}
                placeholder="Physical examination observations..."
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assessment">
                A — Assessment <span className="text-destructive">*</span>{" "}
                <span className="text-muted-foreground text-xs">(Diagnosis)</span>
              </Label>
              <Textarea
                id="assessment"
                rows={2}
                placeholder="Diagnosis or differential diagnoses..."
                value={form.assessment}
                onChange={(e) => setForm({ ...form, assessment: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan">
                P — Plan{" "}
                <span className="text-muted-foreground text-xs">(Treatment Plan)</span>
              </Label>
              <Textarea
                id="plan"
                rows={3}
                placeholder="Treatment, prescriptions, follow-up..."
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white inline-block" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Complete Consultation
          </Button>
        </div>
      </form>
    </div>
  );
}
