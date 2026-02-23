import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    console.log(`Generating report for week: ${startOfWeek.toISOString()} to ${endOfWeek.toISOString()}`);

    // Fetch appointments with necessary fields and relations
    const { data: appointments, error } = await supabase
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
      .lte("scheduled_start", endOfWeek.toISOString());

    if (error) {
      console.error("Error fetching appointments for report:", error);
      return NextResponse.json({ 
        error: "Failed to fetch appointment data", 
        details: error.message 
      }, { status: 500 });
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
    };

    if (appointments) {
      report.total_appointments = appointments.length;

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

    return NextResponse.json(report);

  } catch (error: any) {
    console.error("Server error generating report:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
