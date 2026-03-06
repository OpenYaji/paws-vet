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

    // Insert the neuter record
    const { data: neuterData, error: neuterError } = await supabase
      .from("neuter_pet")
      .insert({
        pet_id,
        veterinarian_id: user.id, // The logged-in vet performing the surgery
        operation_date: new Date().toISOString(),
        procedure_type: operation_type,
        notes: notes || null,
        cost: operation_cost || null,
      })
      .select()
      .single();

    if (neuterError) throw neuterError;

    // Update the pet's spay/neuter status to true
    const { error: petError } = await supabase
      .from("pets")
      .update({ is_spayed_neuter: true })
      .eq("id", pet_id);

    if (petError) throw petError;

    // Mark the appointment as completed so it leaves the waiting room
    const { error: apptError } = await supabase
      .from("appointments")
      .update({ appointment_status: 'completed' })
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