import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
  const { data: { user }, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (error || !user) return { user: null, role: null, supabase };
  const role =
    user?.user_metadata?.role?.toLowerCase() ||
    user?.app_metadata?.role?.toLowerCase() ||
    "client";
  return { user, role, supabase };
}

// GET /api/veterinarian/vet-reports
// Returns aggregated medical record, prescription, and vaccination stats
export async function GET(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser(request);
  if (!user || role !== "veterinarian") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [medicalRecords, prescriptions, vaccinations] = await Promise.all([
      // Medical records in last 30 days
      supabase
        .from("medical_records")
        .select("id, visit_date, diagnosis, pets(name, species)")
        .gte("visit_date", thirtyDaysAgo)
        .order("visit_date", { ascending: false }),

      // Active prescriptions
      supabase
        .from("prescriptions")
        .select("id, medication_name, status, prescribed_date, pets(name, species)")
        .order("prescribed_date", { ascending: false }),

      // Vaccination records with next_due_date info
      supabase
        .from("vaccination_records")
        .select("id, vaccine_name, next_due_date, administered_date, pets(name, species)")
        .order("next_due_date", { ascending: true }),
    ]);

    // Medical records summary
    const records = medicalRecords.data || [];
    const recordsByDay: Record<string, number> = {};
    const diagnosisCounts: Record<string, number> = {};
    for (const r of records) {
      const day = r.visit_date?.substring(0, 10) ?? "unknown";
      recordsByDay[day] = (recordsByDay[day] ?? 0) + 1;
      if (r.diagnosis) {
        diagnosisCounts[r.diagnosis] = (diagnosisCounts[r.diagnosis] ?? 0) + 1;
      }
    }
    const topDiagnoses = Object.entries(diagnosisCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Prescription summary
    const rxList = prescriptions.data || [];
    const rxByStatus: Record<string, number> = {};
    const rxByMed: Record<string, number> = {};
    for (const rx of rxList) {
      const status = rx.status ?? "unknown";
      rxByStatus[status] = (rxByStatus[status] ?? 0) + 1;
      if (rx.medication_name) {
        rxByMed[rx.medication_name] = (rxByMed[rx.medication_name] ?? 0) + 1;
      }
    }
    const topMedications = Object.entries(rxByMed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Vaccination compliance
    const vaccs = vaccinations.data || [];
    const overdue = vaccs.filter(
      (v) => v.next_due_date && v.next_due_date < today
    );
    const upcomingDue = vaccs.filter(
      (v) =>
        v.next_due_date &&
        v.next_due_date >= today &&
        v.next_due_date <= ninetyDaysFromNow
    );
    const vaccByType: Record<string, number> = {};
    for (const v of vaccs) {
      if (v.vaccine_name) {
        vaccByType[v.vaccine_name] = (vaccByType[v.vaccine_name] ?? 0) + 1;
      }
    }
    const topVaccines = Object.entries(vaccByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      period: { from: thirtyDaysAgo, to: today },
      medical_records: {
        total_last_30_days: records.length,
        by_day: recordsByDay,
        top_diagnoses: topDiagnoses,
      },
      prescriptions: {
        total: rxList.length,
        by_status: rxByStatus,
        top_medications: topMedications,
      },
      vaccinations: {
        total: vaccs.length,
        overdue_count: overdue.length,
        upcoming_due_count: upcomingDue.length,
        overdue: overdue.slice(0, 20).map((v) => ({
          vaccine_name: v.vaccine_name,
          next_due_date: v.next_due_date,
          pet: (v.pets as { name?: string; species?: string } | null),
        })),
        upcoming_due: upcomingDue.slice(0, 20).map((v) => ({
          vaccine_name: v.vaccine_name,
          next_due_date: v.next_due_date,
          pet: (v.pets as { name?: string; species?: string } | null),
        })),
        top_vaccines: topVaccines,
      },
    });
  } catch (error) {
    console.error("Vet reports API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
