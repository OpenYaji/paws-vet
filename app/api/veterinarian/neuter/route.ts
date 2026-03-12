import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/veterinarian/neuter
 * Returns today's kapon/surgery appointments that have NOT yet had a neuter
 * procedure recorded. Includes all statuses so already-completed consultations
 * are still visible in the queue.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch all kapon/surgery appointments for today regardless of status
    const { data: appointments, error: apptError } = await supabase
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
      .in('appointment_type', ['surgery', 'kapon'])
      .in('appointment_status', ['confirmed', 'pending', 'in_progress', 'completed'])
      .order('scheduled_start', { ascending: true });

    if (apptError) throw apptError;

    if (!appointments || appointments.length === 0) {
      return NextResponse.json([]);
    }

    // Exclude appointments that already have a neuter record
    const { data: neuterRecords } = await supabase
      .from('neuter_pet')
      .select('appointment_id')
      .in('appointment_id', appointments.map((a: any) => a.id));

    const neuteredIds = new Set((neuterRecords || []).map((n: any) => n.appointment_id));

    const queue = appointments.filter((a: any) => !neuteredIds.has(a.id));

    return NextResponse.json(queue);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch neuter queue' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // FIX 1: Extract owner_id from the incoming request body
    const { appointment_id, pet_id, owner_id, operation_type, notes, operation_cost } = body;

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
        // FIX 2: Explicitly pass owner_id. If it's an empty string or undefined, it becomes null.
        owner_id: owner_id || null, 
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