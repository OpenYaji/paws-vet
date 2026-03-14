import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/utils/error-handler";

export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
  const { data: { user }, error } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
  if (error || !user) return { user: null, role: null, supabase };
  const role =
    user?.user_metadata?.role?.toLowerCase() ||
    user?.app_metadata?.role?.toLowerCase() ||
    "client";
  return { user, role, supabase };
}

// --- GET: Fetch waiting room queue OR completed triage records ---
export async function GET(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);
    if (!user || role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const completed = request.nextUrl.searchParams.get("completed");

    // Return completed triage records for today (for vitals correction)
    if (completed === "true") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const { data, error } = await supabase
        .from("triage_records")
        .select(`
          id,
          appointment_id,
          pet_id,
          weight,
          temperature,
          heart_rate,
          respiratory_rate,
          mucous_membrane,
          triage_level,
          chief_complaint,
          created_at,
          pets(id, name, species, breed)
        `)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json([], { status: 200 });
      return NextResponse.json(data || []);
    }

    // Default: return waiting room queue (un-triaged)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id, appointment_number, scheduled_start, checked_in_at, appointment_status, reason_for_visit,
        pets(id, name, species, breed, photo_url, weight, color,
          client_profiles!pets_owner_id_fkey(first_name, last_name, phone))
      `)
      .eq("appointment_status", "in_progress")
      .order("checked_in_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching waiting room:", error);
      return NextResponse.json([], { status: 200 });
    }

    const { data: triageRecords } = await supabase
      .from("triage_records")
      .select("appointment_id");

    const triageCompletedIds = new Set(triageRecords?.map((r) => r.appointment_id) || []);

    const filteredData = (data || []).filter((appt: any) => {
      if (triageCompletedIds.has(appt.id)) return false;
      if (appt.checked_in_at) {
        const checkedInDate = new Date(appt.checked_in_at);
        return checkedInDate >= startOfDay && checkedInDate <= endOfDay;
      }
      return true;
    });

    return NextResponse.json(filteredData || []);
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// --- POST: Save Vitals & Update Status ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, pet_id, weight, temperature, heart_rate, respiratory_rate, mucous_membrane, triage_level, chief_complaint } = body;

    if (!appointment_id || !pet_id) {
      return NextResponse.json({ error: "Appointment ID and Pet ID are required" }, { status: 400 });
    }
    if (!weight || !temperature) {
      return NextResponse.json({ error: "Weight and Temperature are required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: triageData, error: triageError } = await supabase
      .from("triage_records")
      .insert({
        appointment_id, pet_id,
        weight: parseFloat(weight),
        temperature: parseFloat(temperature),
        heart_rate: heart_rate ? parseInt(heart_rate) : null,
        respiratory_rate: respiratory_rate ? parseInt(respiratory_rate) : null,
        mucous_membrane, triage_level, chief_complaint,
      })
      .select()
      .single();

    if (triageError) throw new Error(triageError.message);

    await supabase.from("pets").update({ weight: parseFloat(weight) }).eq("id", pet_id);

    return NextResponse.json({ success: true, message: "Triage completed successfully", triage_id: triageData.id });
  } catch (error: any) {
    return handleError(error, "POST /api/triage");
  }
}

// --- PATCH: Correct vitals on a completed triage record ---
export async function PATCH(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);
    if (!user || role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const allowed = ["weight", "temperature", "heart_rate", "respiratory_rate", "mucous_membrane", "triage_level", "chief_complaint"];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    const { data, error } = await supabase
      .from("triage_records")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) return handleError(error, "PATCH /api/triage");
    return NextResponse.json(data);
  } catch (error: any) {
    return handleError(error, "PATCH /api/triage");
  }
}
