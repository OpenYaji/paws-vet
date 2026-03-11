"use client";

import useSWR from "swr";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, FileText, Stethoscope, Pill, Syringe, FlaskConical,
  Calendar, PawPrint, User, AlertCircle, CheckCircle2,
} from "lucide-react";

interface MedicalRecordDetail {
  id: string;
  record_number: string;
  visit_date: string;
  chief_complaint: string;
  examination_findings: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  follow_up_instructions: string | null;
  next_appointment_recommended: string | null;
  record_approved_by: string | null;
  approved_at: string | null;
  is_confidential: boolean;
  pets: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    date_of_birth: string | null;
    gender: string | null;
    weight: number | null;
  } | null;
  veterinarian: { id: string; first_name: string; last_name: string } | null;
  appointments: {
    id: string;
    appointment_number: string;
    scheduled_start: string;
    reason_for_visit: string;
    appointment_type: string;
    status: string;
  } | null;
  test_results: {
    id: string;
    test_type: string;
    test_name: string;
    test_date: string;
    findings: string | null;
    results: string | null;
    is_abnormal: boolean;
  }[];
  prescriptions: {
    id: string;
    medication_name: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
    status: string | null;
    prescribed_date: string | null;
  }[];
  vaccinations: {
    id: string;
    vaccine_name: string;
    administered_date: string | null;
    next_due_date: string | null;
    batch_number: string | null;
    notes: string | null;
  }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm">{value || <span className="text-muted-foreground italic">Not recorded</span>}</p>
    </div>
  );
}

export default function MedicalRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();

  const { data: record, isLoading, error } = useSWR<MedicalRecordDetail>(
    recordId ? `/api/veterinarian/medical-records/${recordId}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading record...</p>
        </div>
      </div>
    );
  }

  if (error || !record || (record as { error?: string }).error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Medical record not found.</p>
        <Button variant="outline" asChild>
          <Link href="/veterinarian/medical-records">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Records
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/veterinarian/medical-records">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">Medical Record</h1>
              <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                #{record.record_number}
              </span>
              {record.record_approved_by ? (
                <Badge className="gap-1 bg-green-500/10 text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3" /> Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  Pending Approval
                </Badge>
              )}
              {record.is_confidential && (
                <Badge variant="destructive" className="text-xs">Confidential</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visit date:{" "}
              {record.visit_date
                ? format(new Date(record.visit_date), "MMMM dd, yyyy")
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Patient + Vet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PawPrint className="h-4 w-4 text-primary" /> Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-base">{record.pets?.name ?? "—"}</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{record.pets?.species ?? "—"}</span>
              <span>{record.pets?.breed ?? "Mixed"}</span>
              <span className="capitalize">{record.pets?.gender ?? "—"}</span>
              <span>{record.pets?.weight ? `${record.pets.weight} kg` : "—"}</span>
            </div>
            {record.pets?.date_of_birth && (
              <p className="text-xs text-muted-foreground">
                DOB: {format(new Date(record.pets.date_of_birth), "MMM dd, yyyy")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Attending Veterinarian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-base">
              {record.veterinarian
                ? `Dr. ${record.veterinarian.first_name} ${record.veterinarian.last_name}`
                : "—"}
            </p>
            {record.appointments && (
              <>
                <p className="text-sm text-muted-foreground">
                  Appt #{record.appointments.appointment_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {record.appointments.scheduled_start
                    ? format(new Date(record.appointments.scheduled_start), "MMM dd, yyyy • h:mm a")
                    : "—"}
                </p>
                <Badge variant="outline" className="capitalize text-xs">
                  {record.appointments.appointment_type?.replace(/_/g, " ") ?? "—"}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SOAP Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" /> Clinical Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoField label="Chief Complaint" value={record.chief_complaint} />
          <InfoField label="Examination Findings" value={record.examination_findings} />
          <InfoField label="Diagnosis" value={record.diagnosis} />
          <InfoField label="Treatment Plan" value={record.treatment_plan} />
          <InfoField label="Follow-up Instructions" value={record.follow_up_instructions} />
          <InfoField
            label="Next Appointment Recommended"
            value={
              record.next_appointment_recommended
                ? format(new Date(record.next_appointment_recommended), "MMMM dd, yyyy")
                : null
            }
          />
        </CardContent>
      </Card>

      {/* Test Results */}
      {record.test_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> Medical Test Results
              <Badge variant="outline" className="ml-auto">{record.test_results.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {record.test_results.map((t) => (
              <div key={t.id} className="border rounded-md p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{t.test_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.test_type}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.is_abnormal && (
                      <Badge variant="destructive" className="text-xs">Abnormal</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t.test_date ? format(new Date(t.test_date), "MMM dd, yyyy") : "—"}
                    </span>
                  </div>
                </div>
                {t.findings && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Findings</p>
                    <p className="text-sm">{t.findings}</p>
                  </div>
                )}
                {t.results && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Results</p>
                    <p className="text-sm">{t.results}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Prescriptions */}
      {record.prescriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" /> Prescriptions
              <Badge variant="outline" className="ml-auto">{record.prescriptions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {record.prescriptions.map((rx) => (
                <div key={rx.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{rx.medication_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {rx.instructions && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{rx.instructions}</p>
                    )}
                  </div>
                  {rx.status && (
                    <Badge
                      variant="outline"
                      className={`shrink-0 capitalize text-xs ${
                        rx.status === "active" ? "text-green-600 border-green-300" : ""
                      }`}
                    >
                      {rx.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vaccinations */}
      {record.vaccinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" /> Vaccinations
              <Badge variant="outline" className="ml-auto">{record.vaccinations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {record.vaccinations.map((v) => (
                <div key={v.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{v.vaccine_name}</p>
                      {v.batch_number && (
                        <p className="text-xs text-muted-foreground">Batch: {v.batch_number}</p>
                      )}
                      {v.notes && (
                        <p className="text-xs text-muted-foreground italic">{v.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {v.administered_date && (
                        <p className="text-xs">
                          Given: {format(new Date(v.administered_date), "MMM dd, yyyy")}
                        </p>
                      )}
                      {v.next_due_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Calendar className="h-3 w-3" />
                          Next: {format(new Date(v.next_due_date), "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {record.approved_at && (
        <p className="text-xs text-center text-muted-foreground pb-4">
          Approved on {format(new Date(record.approved_at), "MMMM dd, yyyy 'at' h:mm a")}
        </p>
      )}
    </div>
  );
}
