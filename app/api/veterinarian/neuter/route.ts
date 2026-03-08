import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { appointment_id, pet_id, operation_type, notes, operation_cost } = body;

    if (!pet_id || !appointment_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Blood test pre-check ─────────────────────────────────────────────────
    // 1. Find medical record for this appointment
    const { data: medRecord, error: mrError } = await supabase
      .from("medical_records")
      .select("id")
      .eq("appointment_id", appointment_id)
      .maybeSingle();

    if (mrError) throw mrError;

    if (!medRecord) {
      return NextResponse.json(
        { error: "Consultation must be completed before performing the Kapon procedure." },
        { status: 400 }
      );
    }

    // 2. Check for a blood test result
    const { data: bloodTest, error: btError } = await supabase
      .from("medical_test_results")
      .select("id, is_abnormal")
      .eq("medical_record_id", medRecord.id)
      .eq("test_type", "Blood Test")
      .maybeSingle();

    if (btError) throw btError;

    if (!bloodTest) {
      return NextResponse.json(
        { error: "Blood test is required before the Kapon procedure can be performed." },
        { status: 400 }
      );
    }

    if (bloodTest.is_abnormal) {
      return NextResponse.json(
        { error: "Kapon procedure is blocked: Suspected Disease Detected in blood test results." },
        { status: 400 }
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Resolve vet profile id
    const { data: vetProfile, error: vetError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (vetError || !vetProfile) {
      return NextResponse.json({ error: "Vet profile not found" }, { status: 403 });
    }

    // Insert the neuter record
    const { data: neuterData, error: neuterError } = await supabase
      .from("neuter_pet")
      .insert({
        pet_id,
        veterinarian_id: vetProfile.id,
        appointment_id,
        operation_date: new Date().toISOString(),
        procedure_type: operation_type,
        notes: notes || null,
        cost: operation_cost || null,
      })
      .select()
      .single();

    if (neuterError) throw neuterError;

    // Update the pet's spay/neuter status
    const { error: petError } = await supabase
      .from("pets")
      .update({ is_spayed_neutered: true })
      .eq("id", pet_id);

    if (petError) throw petError;

    // Mark the appointment as completed
    const { error: apptError } = await supabase
      .from("appointments")
      .update({ appointment_status: "completed" })
      .eq("id", appointment_id);

    if (apptError) throw apptError;

    return NextResponse.json(neuterData, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create neuter record" },
      { status: 500 }
    );
  }
}