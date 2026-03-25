import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

// Helper function to get the user and role cleanly
async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();

  // Check for manual token in headers (for fetcher)
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

export async function GET(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const showArchived = searchParams.get("archived") === "true";
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the query
    let query = supabase
      .from("pets")
      .select(
        `
        id, owner_id, name, species, breed, color, gender, weight,
        microchip_number, photo_url, is_spayed_neutered, behavioral_notes,
        special_needs, current_medical_status, created_at,
        client_profiles!pets_owner_id_fkey ( id, first_name, last_name, phone )
      `,
        { count: "exact" },
      )
      .range(from, to)
      .eq("is_archived", showArchived)
      .order("created_at", { ascending: false });

    // Restrict to the client's own pets if they are not staff
    if (role === "client") {
      query = query.eq("owner_id", user.id);
    }

    const { data, error, count } = await query;

    if(error) return handleError(error, "GET /api/pets");

    return NextResponse.json({ data, total: count, page });
  } catch (error: any) {
    // Unexpected JS error — centralized handler
    return handleError(error, "GET /api/pets");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.species || !body.date_of_birth) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (new Date(body.date_of_birth) > new Date()) {
      return NextResponse.json(
        { error: "Date of birth cannot be in the future." },
        { status: 400 },
      );
    }

    // Force the owner_id to be the logged-in client if they are not staff
    const assignedOwnerId = role === "client" ? user.id : body.owner_id || null;

    const [insertResult, auditResult] = await Promise.all([
      supabase.from("pets").insert([{
        owner_id: assignedOwnerId,
        name: body.name,
        species: body.species,
        breed: body.breed || null,
        date_of_birth: body.date_of_birth,
        gender: body.gender,
        color: body.color || null,
        weight: parseFloat(body.weight) || 0,
        microchip_number: body.microchip_number || null,
        is_spayed_neutered: body.is_spayed_neutered || false,
        behavioral_notes: body.behavioral_notes || null,
        special_needs: body.special_needs || null,
        current_medical_status: body.current_medical_status || null,
        photo_url: body.photo_url || null,
        is_active: true,
      }]).select(`*, client_profiles ( id, first_name, last_name, phone, email )`).single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "pets",
        details: `Added new pet "${body.name}" (${body.species})`,
      }),
    ]);

    if (insertResult.error) return handleError(insertResult.error, "POST /api/pets");
    if (auditResult.error) throw auditResult.error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    // Unexpected JS error — centralized handler
    return handleError(error, "POST /api/pets");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id") || body.id;

    if (!id)
      return NextResponse.json(
        { error: "Pet ID is required" },
        { status: 400 },
      );

    const { id: _, ...updates } = body;

    let updateQuery = supabase.from("pets").update(updates).eq("id", id);

    if (role === "client") {
      updateQuery = updateQuery.eq("owner_id", user.id);
    }

    const { data: oldRecord } = await supabase.from("pets").select().eq("id", id).single();

    const [updateResult, auditResult] = await Promise.all([
      updateQuery.select().single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "pets",
        details: `Updated pet id ${id}`,
        old_values: oldRecord ?? null,
        new_values: updates,
      }),
    ]);

    if (updateResult.error) return handleError(updateResult.error, "PATCH /api/pets");
    if (auditResult.error) throw auditResult.error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Unexpected JS error — centralized handler
    return handleError(error, "PATCH /api/pets");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, role, supabase } = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "Pet ID is required" },
        { status: 400 },
      );

    let archiveQuery = supabase.from("pets").update({ is_archived: true }).eq("id", id);

    if (role === "client") {
      archiveQuery = archiveQuery.eq("owner_id", user.id);
    }

    const [archiveResult, auditResult] = await Promise.all([
      archiveQuery,
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "delete",
        table_name: "pets",
        details: `Archived pet id ${id}`,
      }),
    ]);

    if (archiveResult.error) return handleError(archiveResult.error, "DELETE /api/pets");
    if (auditResult.error) throw auditResult.error;

    return NextResponse.json({ message: "Pet archived successfully" }, { status: 200 });
  } catch (error: any) {
    // Unexpected JS error — centralized handler
    return handleError(error, "DELETE /api/pets");
  }
}
