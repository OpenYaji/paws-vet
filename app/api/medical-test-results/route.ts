import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/medical-test-results?appointment_id=<uuid>
 * Returns the blood test result for a given appointment (via medical_records).
 * Requires a valid vet session.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointment_id");

  if (!appointmentId) return jsonError("appointment_id is required", 400);

  // Find the medical record for this appointment
  const { data: medRecord, error: mrError } = await supabase
    .from("medical_records")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (mrError) return jsonError(mrError.message, 500);
  if (!medRecord) {
    // No consultation done yet
    return NextResponse.json({ bloodTest: null, consultationDone: false });
  }

  // Find the blood test result linked to that medical record
  const { data: bloodTest, error: btError } = await supabase
    .from("medical_test_results")
    .select("*")
    .eq("medical_record_id", medRecord.id)
    .eq("test_type", "Blood Test")
    .maybeSingle();

  if (btError) return jsonError(btError.message, 500);

  return NextResponse.json({
    consultationDone: true,
    medicalRecordId: medRecord.id,
    bloodTest: bloodTest ?? null,
  });
}

/**
 * POST /api/medical-test-results
 * Records a blood test result under the given medical record.
 * Body: { medical_record_id, test_name, findings, is_abnormal }
 * Requires a valid vet session.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Unauthorized", 401);

  const body = await request.json();
  const { medical_record_id, test_name, findings, is_abnormal } = body;

  if (!medical_record_id || !test_name) {
    return jsonError("medical_record_id and test_name are required", 400);
  }

  // Resolve vet profile id
  const { data: vetProfile, error: vetError } = await supabase
    .from("veterinarian_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (vetError || !vetProfile) return jsonError("Vet profile not found", 403);

  const { data, error } = await supabase
    .from("medical_test_results")
    .insert({
      medical_record_id,
      test_type: "Blood Test",
      test_name,
      test_date: new Date().toISOString().split("T")[0],
      ordered_by: vetProfile.id,
      findings: findings ?? null,
      is_abnormal: is_abnormal ?? false,
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(data, { status: 201 });
}
