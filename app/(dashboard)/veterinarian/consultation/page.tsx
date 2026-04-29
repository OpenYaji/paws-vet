"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope, Users, ClipboardList, CheckCircle2, PawPrint, Thermometer,
  Heart, Wind, Activity, Scale, RefreshCw, ChevronRight,
} from "lucide-react";
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

interface QueueItem {
  id: string;
  appointment_number: string;
  scheduled_start: string;
  checked_in_at: string;
  appointment_status: string;
  reason_for_visit: string;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    gender: string | null;
    date_of_birth: string | null;
    photo_url: string | null;
    weight: number | null;
    color: string | null;
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

export default function ConsultationPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: queue = [], isLoading, isValidating } = useSWR<QueueItem[]>(
    "/api/veterinarian/consultations",
    fetcher,
    { refreshInterval: 30000 }
  );

  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const handleSelect = (item: QueueItem) => {
    setSelected(item);
    const triage = item.triage_records?.[0];
    setForm({
      subjective: triage?.chief_complaint || item.reason_for_visit || "",
      objective: "",
      assessment: "",
      plan: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    if (!form.assessment.trim()) {
      toast({ title: "Diagnosis required", description: "Please enter a diagnosis/assessment.", variant: "destructive" });
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
          appointment_id: selected.id,
          pet_id: selected.pets?.id,
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
        description: result.next_step === "neuter"
          ? `Medical record ${result.record_number} saved. Redirecting to Neuter queue...`
          : `Medical record ${result.record_number} created successfully.`,
      });

      mutate("/api/veterinarian/consultations");
      setSelected(null);
      setForm({ subjective: "", objective: "", assessment: "", plan: "" });

      if (result.next_step === "neuter") {
        router.push("/veterinarian/appointments?tab=neuter");
      } else {
        router.push("/veterinarian/medical-records");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const triage = selected?.triage_records?.[0];
  const pet = selected?.pets;

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Consultation Queue</h1>
            <p className="text-sm text-muted-foreground">
              {queue.length} patient{queue.length !== 1 ? "s" : ""} awaiting consultation today
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate("/api/veterinarian/consultations")}
          disabled={isValidating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left — Queue */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <Card className="py-10">
              <CardContent className="text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No patients in queue</p>
                <p className="text-xs">Queue refreshes every 30s</p>
              </CardContent>
            </Card>
          ) : (
            queue.map((item) => {
              const t = item.triage_records?.[0];
              const isActive = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`text-left w-full rounded-lg border p-4 transition-all hover:bg-accent/30 ${
                    isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">{item.pets?.name ?? "—"}</span>
                    </div>
                    {t?.triage_level && (
                      <Badge
                        className={`text-xs capitalize px-1.5 ${TRIAGE_COLORS[t.triage_level] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {t.triage_level}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {item.pets?.species} · {item.pets?.breed ?? "Mixed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.reason_for_visit || t?.chief_complaint || "—"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      #{item.appointment_number}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right — Consultation Form */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2 border rounded-lg">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select a patient to begin consultation</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Patient Banner */}
              <Card className="bg-accent/30">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1">
                      <h2 className="font-bold text-lg">{pet?.name}</h2>
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
                    <Badge className="capitalize">{selected.reason_for_visit}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Triage Vitals */}
              {triage && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Triage Vitals
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                  disabled={submitting}
                >
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
          )}
        </div>
      </div>
    </div>
  );
}

