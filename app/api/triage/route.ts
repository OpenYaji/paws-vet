import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

// 1. Initialize Supabase with SERVICE ROLE KEY (Bypasses RLS policies)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

// --- GET: Fetch "Waiting Room" (Patients Ready for Triage) ---
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {}
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user || user.user_metadata.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // We want appointments that are 'in_progress' (checked in and awaiting triage)
    // Fix: Create separate date objects to avoid mutation
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    console.log("Triage API - Date range:", {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      serverTime: now.toISOString(),
    });

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_number,
        scheduled_start,
        checked_in_at,
        appointment_status,
        reason_for_visit, 
        pets (
          id,
          name,
          species,
          breed,
          photo_url,
          weight,
          color,
          client_profiles!pets_owner_id_fkey (
            first_name,
            last_name,
            phone
          )
        )
      `,
      )
      // Fetch appointments that are 'in_progress' (checked in)
      .eq("appointment_status", "in_progress")
      .order("checked_in_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching waiting room:", error);
      return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }

    console.log(
      "Triage API - Found",
      data?.length || 0,
      "in_progress appointments",
    );

    // Log all checked_in_at times for debugging
    if (data && data.length > 0) {
      data.forEach((appt: any) => {
        console.log(
          "Appointment",
          appt.id,
          "- Status:",
          appt.appointment_status,
          "Checked in at:",
          appt.checked_in_at,
        );
      });
    }

    // Filter to only show appointments checked in today and without triage records
    const { data: triageRecords } = await supabase
      .from("triage_records")
      .select("appointment_id");

    const triageCompletedIds = new Set(
      triageRecords?.map((r) => r.appointment_id) || [],
    );
    console.log(
      "Triage API - Excluded appointment IDs (already triaged):",
      Array.from(triageCompletedIds),
    );

    const filteredData = (data || []).filter((appt: any) => {
      // Exclude if already triaged
      if (triageCompletedIds.has(appt.id)) {
        console.log("Filtering out", appt.id, "- already has triage record");
        return false;
      }

      // If checked_in_at exists, must be today
      if (appt.checked_in_at) {
        const checkedInDate = new Date(appt.checked_in_at);
        const isToday =
          checkedInDate >= startOfDay && checkedInDate <= endOfDay;
        console.log(
          "Appointment",
          appt.id,
          "- Checked in:",
          checkedInDate.toISOString(),
          "Is today?",
          isToday,
        );
        return isToday;
      }

      // If no checked_in_at but status is in_progress, include it
      console.log(
        "Appointment",
        appt.id,
        "- No checked_in_at, including anyway",
      );
      return true;
    });

    console.log(
      "Triage API - Final queue:",
      filteredData.length,
      "patients waiting",
    );
    return NextResponse.json(filteredData || []);
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on catch
  }
}

// --- POST: Save Vitals & Update Status ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appointment_id,
      pet_id,
      weight,
      temperature,
      heart_rate,
      respiratory_rate,
      mucous_membrane,
      triage_level,
      chief_complaint,
    } = body;

    // Validation
    if (!appointment_id || !pet_id) {
      return NextResponse.json(
        { error: "Appointment ID and Pet ID are required" },
        { status: 400 },
      );
    }

    if (!weight || !temperature) {
      return NextResponse.json(
        { error: "Weight and Temperature are required" },
        { status: 400 },
      );
    }

    // 1. Insert triage record
    const { data: triageData, error: triageError } = await supabase
      .from("triage_records")
      .insert({
        appointment_id,
        pet_id,
        weight: parseFloat(weight),
        temperature: parseFloat(temperature),
        heart_rate: heart_rate ? parseInt(heart_rate) : null,
        respiratory_rate: respiratory_rate ? parseInt(respiratory_rate) : null,
        mucous_membrane,
        triage_level,
        chief_complaint,
      })
      .select()
      .single();

    if (triageError) {
      console.error("Error inserting triage record:", triageError);
      throw new Error(triageError.message);
    }

    // 2. Update pet weight
    const { error: petError } = await supabase
      .from("pets")
      .update({ weight: parseFloat(weight) })
      .eq("id", pet_id);

    if (petError) {
      console.error("Error updating pet weight:", petError);
      // Don't throw - this is not critical
    }

    // 3. Keep appointment status as 'in_progress'
    // The existence of a triage_record indicates the patient is ready for consultation
    // (We'll check for triage_record in the consultation page query)

    return NextResponse.json({
      success: true,
      message: "Triage completed successfully",
      triage_id: triageData.id,
    });
  } catch (error: any) {
    console.error("Triage save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save triage" },
      { status: 500 },
    );
  }
}
