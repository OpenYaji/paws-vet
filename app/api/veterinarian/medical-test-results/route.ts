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

  // Single joined query: medical record + its blood test results in one round-trip
  const { data: medRecord, error: mrError } = await supabase
    .from("medical_records")
    .select("id, medical_test_results(*)")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (mrError) return jsonError(mrError.message, 500);
  if (!medRecord) {
    return NextResponse.json({ bloodTest: null, consultationDone: false });
  }

  const bloodTest =
    (medRecord.medical_test_results as any[]).find((t) => t.test_type === "Blood Test") ?? null;

  return NextResponse.json({
    consultationDone: true,
    medicalRecordId: medRecord.id,
    bloodTest,
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

  const [insertResult, auditResult] = await Promise.all([
    supabase.from("medical_test_results").insert({
      medical_record_id,
      test_type: "Blood Test",
      test_name,
      test_date: new Date().toISOString().split("T")[0],
      ordered_by: vetProfile.id,
      findings: findings ?? null,
      is_abnormal: is_abnormal ?? false,
    }).select().single(),
    supabase.from("audit_logs").insert({
      user_id: user.id,
      action_type: "create",
      table_name: "medical_test_results",
      details: `Recorded blood test "${test_name}" for medical_record_id ${medical_record_id}`,
    }),
  ]);

  if (insertResult.error) return jsonError(insertResult.error.message, 500);
  if (auditResult.error) throw auditResult.error;

  return NextResponse.json(insertResult.data, { status: 201 });
}
