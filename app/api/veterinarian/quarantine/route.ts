import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/utils/error-handler";

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = "force-dynamic";

// get the authenticated user and role
async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();

  // check for manual token in headers (for fetcher)
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
  try {
    const supabase = await createClient();

    const { data: quarantineRecords, error } = await supabase
      .from("quarantine_pets")
      .select(
        `
        id,
        pet_id,
        reason,
        status,
        start_date,
        expected_end_date,
        pets:pet_id(
            id,
            name,
            species,
            breed,
            gender,
            color
            )
        `,
      )
      .order("start_date", { ascending: false })
      .limit(10);

    if (error) return handleError(error, "GET /api/quarantine");

    return NextResponse.json(quarantineRecords || []);
  } catch (error) {
    return handleError(error, "GET /api/quarantine");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);

    // verify authentication before creating quarantine records
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse JSON request body
    const body = await request.json();

    // Extract required and optional fields from request body
    const { pet_id, reason, notes, start_date, expected_end_date } = body;

    // Validate required fields before proceeding with database insertion
    if (!pet_id || !reason || !start_date || !expected_end_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const [insertResult, auditResult] = await Promise.all([
      supabase.from("quarantine_pets").insert({
        pet_id,
        reason,
        notes: notes || null,
        start_date,
        expected_end_date,
        status: "active",
      }).select().single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "quarantine_pets",
        details: `Placed pet_id ${pet_id} in quarantine. Reason: ${reason}`,
      }),
    ]);

    if (insertResult.error) return handleError(insertResult.error, "POST /api/quarantine");
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // Unexpected error — centralized handler
    return handleError(error, "POST /api/quarantine");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, end_date, reason, notes, expected_end_date } = body;

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    const patch: Record<string, any> = {};
    if (status !== undefined) patch.status = status;
    if (end_date !== undefined) patch.end_date = end_date || null;
    if (reason !== undefined) patch.reason = reason;
    if (notes !== undefined) patch.notes = notes;
    if (expected_end_date !== undefined) patch.expected_end_date = expected_end_date;

    const supabase = await createClient();

    const { data: oldRecord } = await supabase.from("quarantine_pets").select().eq("id", id).single();

    const [updateResult, auditResult] = await Promise.all([
      supabase.from("quarantine_pets").update(patch).eq("id", id).select().single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "quarantine_pets",
        details: `Updated quarantine record id ${id}`,
        old_values: oldRecord ?? null,
        new_values: patch,
      }),
    ]);

    if (updateResult.error) return handleError(updateResult.error, "PATCH /api/quarantine");
    if (auditResult.error) throw auditResult.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    // Unexpected error — centralized handler
    return handleError(error, "PATCH /api/quarantine");
  }
}
