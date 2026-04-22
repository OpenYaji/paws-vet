import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendSms } from "@/utils/sms";

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Fetch all kapon/surgery appointments for today regardless of status
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(
        `
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
      `,
      )
      .in("appointment_type", ["surgery", "kapon"])
      .in("appointment_status", [
        "confirmed",
        "pending",
        "in_progress",
        "completed",
      ])
      .gte("scheduled_start", todayStart.toISOString())
      .lt("scheduled_start", todayEnd.toISOString())
      .order("scheduled_start", { ascending: true });

    if (apptError) throw apptError;

    if (!appointments || appointments.length === 0) {
      return NextResponse.json([]);
    }

    const apptIds = appointments.map((a: any) => a.id);

    // Fetch neuter records and medical records in parallel (avoids FK ambiguity in nested joins)
    const [neuterResult, medRecordsResult] = await Promise.all([
      supabase
        .from("neuter_pet")
        .select("appointment_id")
        .in("appointment_id", apptIds),
      supabase
        .from("medical_records")
        .select(
          "id, appointment_id, medical_test_results (id, test_name, findings, is_abnormal, test_type)",
        )
        .in("appointment_id", apptIds),
    ]);

    const neuteredIds = new Set(
      (neuterResult.data || []).map((n: any) => n.appointment_id),
    );

    // Build a map of appointment_id -> medical_record for quick lookup
    const medRecordMap = new Map<string, any>();
    for (const rec of medRecordsResult.data || []) {
      medRecordMap.set(rec.appointment_id, rec);
    }

    // Only show appointments that have completed consultation and are not yet neutered
    const queue = appointments
      .filter((a: any) => !neuteredIds.has(a.id) && medRecordMap.has(a.id))
      .map((a: any) => ({
        ...a,
        medical_records: [medRecordMap.get(a.id)],
      }));

    return NextResponse.json(queue);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch neuter queue" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      appointment_id,
      pet_id,
      owner_id,
      operation_type,
      notes,
      operation_cost,
    } = body;

    if (!pet_id || !appointment_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const [medRecordResult, vetProfileResult, petInfoResult] =
      await Promise.all([
        supabase
          .from("medical_records")
          .select("id")
          .eq("appointment_id", appointment_id)
          .maybeSingle(),
        supabase
          .from("veterinarian_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("pets")
          .select("name, client:client_profiles!pets_owner_id_fkey(phone)")
          .eq("id", pet_id)
          .maybeSingle(),
      ]);

    if (medRecordResult.error) throw medRecordResult.error;
    if (!medRecordResult.data) {
      return NextResponse.json(
        {
          error:
            "Consultation must be completed before performing the Kapon procedure.",
        },
        { status: 400 },
      );
    }

    if (vetProfileResult.error || !vetProfileResult.data) {
      return NextResponse.json(
        { error: "Vet profile not found" },
        { status: 403 },
      );
    }

    const medRecord = medRecordResult.data;
    const vetProfile = vetProfileResult.data;

    const { data: bloodTest, error: btError } = await supabase
      .from("medical_test_results")
      .select("id, is_abnormal")
      .eq("medical_record_id", medRecord.id)
      .eq("test_type", "Blood Test")
      .maybeSingle();

    if (btError) throw btError;
    if (!bloodTest) {
      return NextResponse.json(
        {
          error:
            "Blood test is required before the Kapon procedure can be performed.",
        },
        { status: 400 },
      );
    }
    if (bloodTest.is_abnormal) {
      return NextResponse.json(
        {
          error:
            "Kapon procedure is blocked: Suspected Disease Detected in blood test results.",
        },
        { status: 400 },
      );
    }

    const neuterResult = await supabase
      .from("neuter_pet")
      .insert({
        pet_id,
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

    if (neuterResult.error) throw neuterResult.error;

    // clean casting without @ts-ignore
    const petData = petInfoResult.data as any;
    const pet_name = petData?.name || "your pet";
    const phone = petData?.client?.phone || "";

    // Run critical DB updates in parallel
    const [petUpdateResult, apptUpdateResult, paymentResult, auditResult] =
      await Promise.all([
        supabase
          .from("pets")
          .update({ is_spayed_neutered: true })
          .eq("id", pet_id),
        supabase
          .from("appointments")
          .update({ appointment_status: "completed" })
          .eq("id", appointment_id),
        supabase.from("payments").insert({ amount_paid: operation_cost || 0 }),
        supabase.from("audit_logs").insert({
          user_id: user.id,
          action_type: "create",
          table_name: "neuter_pet",
          details: `Recorded ${operation_type} procedure for pet_id ${pet_id} in appointment_id ${appointment_id}`,
        }),
      ]);

    if (petUpdateResult.error) throw petUpdateResult.error;
    if (apptUpdateResult.error) throw apptUpdateResult.error;
    if (paymentResult.error) throw paymentResult.error;
    if (auditResult.error) throw auditResult.error;

    // Send SMS notification after DB updates succeed (non-blocking)
    if (phone) {
      const sms_message = `Hi! Paws Vet Clinic here. ${pet_name} has successfully completed their ${operation_type || "Kapon"} procedure. We will contact you again if there are additional details.`;
      sendSms(phone, sms_message).catch((err) =>
        console.error("[Neuter SMS] Failed to notify client:", err),
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create neuter record" },
      { status: 500 },
    );
  }
}
