import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(request: NextRequest) {
  try {
    console.log("=== CHECKING FOR NO-SHOWS ===");

    const now = new Date().toISOString();
    console.log("Current time:", now);

    // Find appointments that should be marked as no-show:
    // - scheduled_start has passed (is in the past)
    // - status is still 'pending' or 'confirmed' (not processed)
    // - Add a grace period of 15 minutes to avoid marking too early
    const gracePeriodMinutes = 15;
    const gracePeriodTime = new Date();
    gracePeriodTime.setMinutes(
      gracePeriodTime.getMinutes() - gracePeriodMinutes,
    );
    const gracePeriodISO = gracePeriodTime.toISOString();

    // First, fetch the appointments that meet the criteria
    const { data: missedAppointments, error: fetchError } = await supabase
      .from("appointments")
      .select(
        "id, appointment_number, scheduled_start, appointment_status, pets(name), client_profiles:pets(client_profiles(first_name, last_name))",
      )
      .in("appointment_status", ["pending", "confirmed"])
      .lt("scheduled_start", gracePeriodISO); // scheduled_start is less than grace period time (in the past)

    if (fetchError) {
      console.error("Error fetching missed appointments:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!missedAppointments || missedAppointments.length === 0) {
      console.log("No missed appointments found");
      return NextResponse.json({
        message: "No missed appointments to update",
        updated: 0,
      });
    }

    console.log(
      `Found ${missedAppointments.length} missed appointment(s):`,
      missedAppointments.map((a) => ({
        id: a.id,
        number: a.appointment_number,
        scheduled: a.scheduled_start,
      })),
    );

    // Update all missed appointments to 'no_show'
    const appointmentIds = missedAppointments.map((a) => a.id);

    const { data: updatedData, error: updateError } = await supabase
      .from("appointments")
      .update({
        appointment_status: "no_show",
        updated_at: now,
      })
      .in("id", appointmentIds)
      .select();

    if (updateError) {
      console.error("Error updating appointments to no-show:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    console.log(
      `Successfully marked ${updatedData?.length || 0} appointment(s) as no-show`,
    );

    return NextResponse.json({
      message: `Marked ${updatedData?.length || 0} appointment(s) as no-show`,
      updated: updatedData?.length || 0,
      appointments: updatedData?.map((a) => ({
        id: a.id,
        appointment_number: a.appointment_number,
        scheduled_start: a.scheduled_start,
      })),
    });
  } catch (error: any) {
    console.error("Error in check-no-shows:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
