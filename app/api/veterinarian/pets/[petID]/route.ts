import { createAdminClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Fixed: Changed to support both naming conventions
type RouteContext = {
  params: Promise<{ [key: string]: string }>; // Flexible param type
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createAdminClient();

    // get the current user by getUser()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const params = await context.params;
    console.log("DEBUG - All params received:", params); // Debug log

    // Fixed: Support multiple naming conventions (petID, id, petId)
    const petId = params.petID || params.id || params.petId;

    if (!petId) {
      console.error("ERROR - No pet ID found in params:", params);
      return NextResponse.json(
        { error: "Pet ID is required" },
        { status: 400 },
      );
    }

    console.log("SUCCESS - Processing archive for pet:", petId);

    // Read the request body
    const body = await request.json();

    // Build update payload — only include fields present in body
    const allowedFields = [
      "is_archived",
      "name",
      "species",
      "breed",
      "color",
      "weight",
      "microchip_number",
      "date_of_birth",
      "gender",
    ];
    const updatePayload: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updatePayload[field] = body[field];
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Update the database
    const { data, error } = await supabase
      .from("pets")
      .update(updatePayload)
      .eq("id", petId)
      .select();

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Archive pet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive pet" },
      { status: 500 },
    );
  }
}
