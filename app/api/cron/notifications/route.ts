import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/utils/sms/sms";

// force dynamic rendering
export const dynamic = "force-dynamic";

// use service role to bypass rls
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function GET(request: NextRequest) {
  try {
    console.log("=== RUNNING DAILY SMS NOTIFICATIONS ===");

    const now = new Date();

    // start of today and end of today
    const today_start = new Date(now);
    today_start.setHours(0, 0, 0, 0);
    const today_end = new Date(now);
    today_end.setHours(23, 59, 59, 999);

    // exactly 3 days from now
    const three_days_date = new Date(now);
    three_days_date.setDate(three_days_date.getDate() + 3);
    const three_days_start = new Date(three_days_date);
    three_days_start.setHours(0, 0, 0, 0);
    const three_days_end = new Date(three_days_date);
    three_days_end.setHours(23, 59, 59, 999);

    // fetch all data concurrently for optimization
    const [
      { data: today_appointments },
      { data: three_days_appointments },
      { data: today_quarantines },
      { data: three_days_quarantines },
    ] = await Promise.all([
      // appointments for today
      supabaseAdmin
        .from("appointments")
        .select("id, scheduled_start, pet:pets(client:client_profiles(phone))")
        .gte("scheduled_start", today_start.toISOString())
        .lte("scheduled_start", today_end.toISOString())
        .in("appointment_status", ["confirmed", "pending"]),

      // appointments for 3 days from now
      supabaseAdmin
        .from("appointments")
        .select("id, scheduled_start, pet:pets(client:client_profiles(phone))")
        .gte("scheduled_start", three_days_start.toISOString())
        .lte("scheduled_start", three_days_end.toISOString())
        .in("appointment_status", ["confirmed", "pending"]),

      // quarantines ending today
      supabaseAdmin
        .from("quarantine_pets")
        .select("id, pet:pets(name), expected_end_date")
        .gte("expected_end_date", today_start.toISOString())
        .lte("expected_end_date", today_end.toISOString())
        .eq("status", "active"),

      // quarantines ending 3 days from now
      supabaseAdmin
        .from("quarantine_pets")
        .select("id, pet:pets(name), expected_end_date")
        .gte("expected_end_date", three_days_start.toISOString())
        .lte("expected_end_date", three_days_end.toISOString())
        .eq("status", "active"),
    ]);

    const sms_tasks: Promise<boolean>[] = [];

    // sample comment: schedule sms for today's appointments
    if (today_appointments) {
      for (const apt of today_appointments) {
        // @ts-ignore
        const phone = apt.pet?.client?.phone;
        if (phone)
          sms_tasks.push(
            sendSms(
              phone,
              "Reminder: You have an appointment for your pet today.",
            ),
          );
      }
    }

    // sample comment: schedule sms for appointments in 3 days
    if (three_days_appointments) {
      for (const apt of three_days_appointments) {
        // @ts-ignore
        const phone = apt.pet?.client?.phone;
        if (phone)
          sms_tasks.push(
            sendSms(
              phone,
              "Reminder: You have an upcoming appointment for your pet in 3 days.",
            ),
          );
      }
    }

    // if there are quarantines, we need to notify the veterinarian
    if (
      (today_quarantines && today_quarantines.length > 0) ||
      (three_days_quarantines && three_days_quarantines.length > 0)
    ) {
      // fetch all vets who should receive the notification
      const { data: vets } = await supabaseAdmin
        .from("veterinarian_profiles")
        .select("phone")
        .eq("employment_status", "full_time");

      if (vets && vets.length > 0) {
        // sample comment: schedule sms for quarantines ending today
        if (today_quarantines) {
          for (const q of today_quarantines) {
            // @ts-ignore
            const pet_name = q.pet?.name || "A pet";
            for (const vet of vets) {
              if (vet.phone) {
                sms_tasks.push(
                  sendSms(
                    vet.phone,
                    `Quarantine Alert: Expected end date fulfilled today for monitored pet ${pet_name}.`,
                  ),
                );
              }
            }
          }
        }

        // sample comment: schedule sms for quarantines ending in 3 days
        if (three_days_quarantines) {
          for (const q of three_days_quarantines) {
            // @ts-ignore
            const pet_name = q.pet?.name || "A pet";
            for (const vet of vets) {
              if (vet.phone) {
                sms_tasks.push(
                  sendSms(
                    vet.phone,
                    `Quarantine Alert: Expected end date is in 3 days for monitored pet ${pet_name}.`,
                  ),
                );
              }
            }
          }
        }
      }
    }

    // execute all sms sending concurrently
    await Promise.all(sms_tasks);

    console.log(
      `Successfully dispatched ${sms_tasks.length} SMS notifications.`,
    );

    return NextResponse.json({
      success: true,
      message: `Dispatched ${sms_tasks.length} SMS notifications.`,
    });
  } catch (error: any) {
    console.error("[GET /api/cron/notifications] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
