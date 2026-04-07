import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Supabase clients ─────────────────────────────────────────────────────────

/** Service-role client — used for privileged DB operations (bypasses RLS). */

// ── Response helpers ──────────────────────────────────────────────────────────

/** Returns a consistent error JSON response. */
function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details !== undefined && { details }) },
    { status },
  );
}

// ── Auth / authorization helpers ──────────────────────────────────────────────

/**
 * Verifies the request carries a valid session via the cookie-based client.
 * Returns the authenticated user or a ready-to-send 401 response.
 */
async function requireUser(req: NextRequest) {
  const cookieClient = await createClient();
  const { data, error } = await cookieClient.auth.getUser();

  if (error || !data?.user) {
    console.error("[auth] requireUser failed:", error?.message);
    return { user: null, response: jsonError("Unauthorized", 401) };
  }

  return { user: data.user, response: null };
}

/**
 * Checks that the authenticated user holds one of the allowed roles.
 * Role is expected in user_metadata.role (set during sign-up).
 * Returns a ready-to-send 403 response if the check fails, otherwise null.
 */
function requireRole(
  user: { user_metadata?: Record<string, unknown> },
  allowedRoles: string[],
) {
  const role = user.user_metadata?.role as string | undefined;
  if (!role || !allowedRoles.includes(role)) {
    console.error(
      `[auth] requireRole failed: role="${role ?? "none"}", required one of [${allowedRoles.join(", ")}]`,
    );
    return jsonError("Forbidden: insufficient permissions", 403);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // DB query — service-role client to bypass RLS
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const veterinarian = searchParams.get("veterinarian");
    const search = searchParams.get("search");
    const petId = searchParams.get("pet_id");

    let query = supabase
      .from("appointments")
      .select(
        `
        *,
        pet:pets!appointments_pet_id_fkey(
          id,
          name,
          species,
          breed,
          owner_id,
          client:client_profiles!pets_owner_id_fkey(
            id,
            first_name,
            last_name,  
            phone,
            email:users!client_profiles_user_id_fkey(email)
          )
        ),
        veterinarian:veterinarian_profiles!appointments_veterinarian_id_fkey(
          id,
          first_name,
          last_name,
          specializations
        )
      `,
      )
      .order("scheduled_start", { ascending: false })
      .limit(10);

    if (status && status !== "all") {
      query = query.eq("appointment_status", status);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte("scheduled_start", startOfDay.toISOString())
        .lte("scheduled_start", endOfDay.toISOString());
    }

    if (veterinarian) {
      query = query.eq("veterinarian_id", veterinarian);
    }

    if (petId) {
      query = query.eq("pet_id", petId);
    }

    if (search) {
      query = query.or(
        `appointment_number.ilike.%${search}%,reason_for_visit.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    // Delegate Supabase DB error to centralized handler
    if (error) return handleError(error, "GET /api/appointments");

    // 6. Return consistent JSON + correct status
    const transformedData = (data || []).map((appointment: any) => ({
      ...appointment,
      client: appointment.pet?.client || null,
      pet: {
        id: appointment.pet?.id,
        name: appointment.pet?.name,
        species: appointment.pet?.species,
        breed: appointment.pet?.breed,
      },
    }));

    console.log(
      "[GET /api/appointments] Fetched:",
      transformedData.length,
      "records",
    );
    return NextResponse.json(transformedData, { status: 200 });
  } catch (error: any) {
    // Unexpected JS/network error — centralized handler
    return handleError(error, "GET /api/appointments");
  }
}

export async function POST(request: NextRequest) {
  // 1. Create cookie client + 2. Get user (auth)
  const { user, response: authError } = await requireUser(request);
  if (authError) return authError; // auth failed — response is already a 401

  // 3. Authorize — any authenticated role may book an appointment

  try {
    const supabase = await createClient();

    // 4. Validate input
    const body = await request.json();

    console.log("[POST /api/appointments] Received body:", body);

    if (!body.pet_id || !body.scheduled_start || !body.scheduled_end) {
      console.error("[POST /api/appointments] Missing required fields:", {
        pet_id: body.pet_id,
        scheduled_start: body.scheduled_start,
        scheduled_end: body.scheduled_end,
      });
      return jsonError(
        "Missing required fields",
        400,
        "pet_id, scheduled_start, and scheduled_end are required",
      );
    }

    // booked_by is taken from the verified session — no manual header parsing needed
    const bookedBy: string = body.booked_by ?? user!.id;

    const appointmentNumber = `APT-${Date.now()}`;

    let veterinarianId = body.veterinarian_id;
    if (!veterinarianId) {
      try {
        veterinarianId = await getDefaultVeterinarian(supabase);
      } catch (error) {
        console.error("No veterinarian available:", error);
        return NextResponse.json(
          {
            error: "No veterinarian available",
            details: "Please contact the clinic to schedule an appointment",
          },
          { status: 400 },
        );
      }
    }

    const appointmentData = {
      appointment_number: appointmentNumber,
      pet_id: body.pet_id,
      veterinarian_id: veterinarianId,
      booked_by: bookedBy,
      // Safe for all subsystems — falls back to 'consultation' if not provided
      appointment_type: body.appointment_type || "consultation",
      appointment_status: body.appointment_status || "pending",
      scheduled_start: body.scheduled_start,
      scheduled_end: body.scheduled_end,
      reason_for_visit: body.reason_for_visit || "General appointment",
      special_instructions: body.special_instructions || null,
      is_emergency: body.is_emergency || false,
    };

    // 5. DB query
    console.log("[POST /api/appointments] Inserting:", appointmentData);

    const { data, error } = await supabase
      .from("appointments")
      .insert([appointmentData]).select(`
        *,
        pet:pets(id, name, species, breed, owner_id),
        veterinarian:veterinarian_profiles(id, first_name, last_name)
      `);

    // 6. Delegate insert DB error to centralized handler
    if (error) return handleError(error, "POST /api/appointments");

    if (!data || data.length === 0) {
      console.error("[POST /api/appointments] No data returned after insert");
      return jsonError(
        "Failed to create appointment",
        500,
        "No data returned from database",
      );
    }

    console.log("[POST /api/appointments] Created:", data[0].id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    // Unexpected JS/network error — centralized handler
    return handleError(error, "POST /api/appointments");
  }
}

async function getDefaultVeterinarian(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("veterinarian_profiles")
    .select("id")
    .eq("employment_status", "full_time")
    .limit(1)
    .single();

  if (error || !data) {
    const { data: anyVet, error: anyError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .limit(1)
      .single();

    if (anyError || !anyVet) {
      throw new Error("No veterinarian available");
    }

    return anyVet.id;
  }

  return data.id;
}

export async function PATCH(request: NextRequest) {
  // 1. Create cookie client + 2. Get user (auth)
  const { user, response: authError } = await requireUser(request);
  if (authError) return authError; // auth failed — response is already a 401

  // 3. Authorize — only veterinarians and admins may update appointments
  const roleError = requireRole(user!, ["veterinarian", "admin"]);
  if (roleError) return roleError; // role check failed — response is already a 403

  try {
    const supabase = await createClient();

    // Validate input
    const body = await request.json();

    if (!body.id) {
      return jsonError("Missing appointment ID", 400);
    }

    const { data: current } = await supabase
      .from("appointments")
      .select("id, appointment_status, checked_in_at, scheduled_start")
      .eq("id", body.id)
      .single();

    console.log("Current appointment state:", current);

    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select();

    // Delegate update DB error to centralized handler
    if (error) return handleError(error, "PATCH /api/appointments");

    if (!data || data.length === 0) {
      console.error("[PATCH /api/appointments] Appointment not found:", id);
      return jsonError("Appointment not found", 404);
    }

    console.log(
      `[PATCH /api/appointments] id=${id} status: ${current?.appointment_status} → ${data[0].appointment_status}`,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Unexpected JS/network error — centralized handler
    return handleError(error, "PATCH /api/appointments");
  }
}
