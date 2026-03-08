import { createCookieClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin-server";
import { handleError } from "@/utils/error-handler";

export const dynamic = "force-dynamic";

// Test this API with Postman: /api/appointments/appointment-reports?date=2024-06-01 
export async function GET(request: NextRequest) {
  try {
    const supabase = await createCookieClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.user_metadata.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to today if no date provided
    const referenceDate = dateParam ? new Date(dateParam) : new Date();

    // Calculate start (Sunday) and end (Saturday) of the week
    const startOfWeek = new Date(referenceDate);
    const day = startOfWeek.getDay(); // 0 is Sunday
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    // Use start of next week for better filtering (lt instead of lte)
    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    startOfNextWeek.setHours(0, 0, 0, 0);

    console.log(`Generating report for week: ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`);
    console.log(`Query range: ${startOfWeek.toISOString()} to ${startOfNextWeek.toISOString()}`);

    const admin = supabaseAdmin(); // Use admin client to bypass RLS for reporting
    
    // Fetch appointments with necessary fields and relations
    const { data: appointments, error } = await admin
      .from("appointments")
      .select(`
        id,
        appointment_status,
        appointment_type,
        scheduled_start,
        veterinarian:veterinarian_profiles!appointments_veterinarian_id_fkey(
          first_name,
          last_name
        )
      `)
      .gte("scheduled_start", startOfWeek.toISOString())
      .lt("scheduled_start", startOfNextWeek.toISOString());

    // Delegate fetch error to centralized handler
    if (error) return handleError(error, "appointment-reports");

    console.log(`Found ${appointments?.length || 0} appointments in date range`);
    
    // Debug: Log all appointments found
    if (appointments && appointments.length > 0) {
      console.log('Appointments found:', appointments.map(a => ({
        id: a.id,
        scheduled_start: a.scheduled_start,
        status: a.appointment_status,
        type: a.appointment_type
      })));
    }

    // Initialize counters
    const report = {
      period: {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString(),
      },
      total_appointments: 0,
      by_status: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      by_day: {
        "Sunday": 0,
        "Monday": 0,
        "Tuesday": 0,
        "Wednesday": 0,
        "Thursday": 0,
        "Friday": 0,
        "Saturday": 0
      } as Record<string, number>,
      by_veterinarian: {} as Record<string, number>,
      appointments: [] as any[], // Include raw appointments for debugging
    };

    if (appointments) {
      report.total_appointments = appointments.length;
      report.appointments = appointments; // Store for debugging

      appointments.forEach((apt: any) => {
        // Count by Status
        const status = apt.appointment_status;
        report.by_status[status] = (report.by_status[status] || 0) + 1;

        // Count by Type
        const type = apt.appointment_type;
        report.by_type[type] = (report.by_type[type] || 0) + 1;

        // Count by Day
        const date = new Date(apt.scheduled_start);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (report.by_day.hasOwnProperty(dayName)) {
            report.by_day[dayName]++;
        }

        // Count by Veterinarian
        let vetName = 'Unassigned';
        if (apt.veterinarian) {
          vetName = `${apt.veterinarian.first_name} ${apt.veterinarian.last_name}`;
        }
        report.by_veterinarian[vetName] = (report.by_veterinarian[vetName] || 0) + 1;
      });
    }

    console.log('Report generated:', {
      total: report.total_appointments,
      by_status: report.by_status,
      by_type: report.by_type,
      by_day: report.by_day
    });

    return NextResponse.json(report);

  } catch (error: any) {
    // Unexpected JS/network error — centralized handler
    return handleError(error, "appointment-reports");
  }
}