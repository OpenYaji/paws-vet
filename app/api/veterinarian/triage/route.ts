import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/utils/error-handler";

export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
  const {
    data: { user },
    error,
  } = token
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

      const { data, error } = await supabase
        .from("triage_records")
        .select(
          `
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
        `,
        )
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: false });

      if (error) return NextResponse.json([], { status: 200 });
      return NextResponse.json(data || []);
    }

    // Default: return waiting room queue (un-triaged)
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

    // Run both queries in parallel — no reason to wait for one before starting the other
    const [{ data, error }, { data: triageRecords }] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          `
          id, appointment_number, appointment_type, scheduled_start, checked_in_at, reason_for_visit,
          pets(id, name, species, breed,
            client_profiles!pets_owner_id_fkey(first_name, last_name))
        `,
        )
        .eq("appointment_status", "in_progress")
        .order("checked_in_at", { ascending: true, nullsFirst: false }),

      // Scope to today only — avoids a full table scan as triage_records grows
      supabase
        .from("triage_records")
        .select("appointment_id")
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString()),
    ]);

    if (error) {
      console.error("Error fetching waiting room:", error);
      return NextResponse.json([], { status: 200 });
    }

    const triageCompletedIds = new Set(
      triageRecords?.map((r) => r.appointment_id) || [],
    );

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [triageResult, , auditResult] = await Promise.all([
      supabase
        .from("triage_records")
        .insert({
          appointment_id,
          pet_id,
          weight: parseFloat(weight),
          temperature: parseFloat(temperature),
          heart_rate: heart_rate ? parseInt(heart_rate) : null,
          respiratory_rate: respiratory_rate
            ? parseInt(respiratory_rate)
            : null,
          mucous_membrane,
          triage_level,
          chief_complaint,
        })
        .select()
        .single(),
      supabase
        .from("pets")
        .update({ weight: parseFloat(weight) })
        .eq("id", pet_id),
      supabase.from("audit_logs").insert({
        user_id: user?.id ?? null,
        action_type: "create",
        table_name: "triage_records",
        details: `Recorded triage for appointment_id ${appointment_id}, pet_id ${pet_id}`,
      }),
    ]);

    if (triageResult.error) throw new Error(triageResult.error.message);
    if (auditResult.error) throw auditResult.error;

    return NextResponse.json({
      success: true,
      message: "Triage completed successfully",
      triage_id: triageResult.data.id,
    });
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
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const allowed = [
      "weight",
      "temperature",
      "heart_rate",
      "respiratory_rate",
      "mucous_membrane",
      "triage_level",
      "chief_complaint",
    ];
    const patch: Record<string, any> = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key];
    }

    const { data: oldRecord } = await supabase
      .from("triage_records")
      .select()
      .eq("id", id)
      .single();

    const [updateResult, auditResult] = await Promise.all([
      supabase
        .from("triage_records")
        .update(patch)
        .eq("id", id)
        .select()
        .single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "triage_records",
        details: `Updated triage record id ${id}`,
        old_values: oldRecord ?? null,
        new_values: patch,
      }),
    ]);

    if (updateResult.error)
      return handleError(updateResult.error, "PATCH /api/triage");
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "PATCH /api/triage");
  }
}
