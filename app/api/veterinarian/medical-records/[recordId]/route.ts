import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params;

    const { data: record, error } = await supabase
      .from("medical_records")
      .select(
        `
        *,
        appointments (
          id,
          appointment_number,
          scheduled_start,
          reason_for_visit,
          appointment_type,
          appointment_status
        ),
        pets (
          id,
          name,
          species,
          breed,
          date_of_birth,
          gender,
          weight
        ),
        veterinarian:veterinarian_profiles!medical_records_veterinarian_id_fkey (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("id", recordId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Fetch related data in parallel
    const [testResults, prescriptions, vaccinations] = await Promise.all([
      supabase
        .from("medical_test_results")
        .select("*")
        .eq("medical_record_id", recordId)
        .order("created_at", { ascending: false }),
      supabase
        .from("prescriptions")
        .select("id, medication_name, dosage, frequency, duration, instructions, status, prescribed_date")
        .eq("medical_record_id", recordId)
        .order("prescribed_date", { ascending: false }),
      supabase
        .from("vaccination_records")
        .select("id, vaccine_name, administered_date, next_due_date, batch_number, notes")
        .eq("medical_record_id", recordId)
        .order("administered_date", { ascending: false }),
    ]);

    return NextResponse.json({
      ...record,
      test_results: testResults.data || [],
      prescriptions: prescriptions.data || [],
      vaccinations: vaccinations.data || [],
    });
  } catch (error) {
    console.error("Medical record detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
