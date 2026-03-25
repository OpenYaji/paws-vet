import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const petId = request.nextUrl.searchParams.get("pet_id");

    const [petsResult, vaccinationHistoryResult] = await Promise.all([
      supabase
        .from("pets")
        .select("id, name, species, client_profiles(last_name)")
        .order("name"),

      (() => {
        const showArchived = request.nextUrl.searchParams.get("archived") === "true";
        let q = supabase
          .from("vaccination_records")
          .select(`*, pets(id, name, species, breed, client_profiles(last_name))`)
          .eq("is_archived", showArchived)
          .order("administered_date", { ascending: false });
        if (petId) q = q.eq("pet_id", petId).limit(100);
        else q = q.limit(50);
        return q;
      })(),
    ]);

    if (petsResult.error) return handleError(petsResult.error, "GET /api/vaccinations (pets)");
    if (vaccinationHistoryResult.error) return handleError(vaccinationHistoryResult.error, "GET /api/vaccinations (history)");

    return NextResponse.json({
      pets: petsResult.data || [],
      history: vaccinationHistoryResult.data || [],
      vaccinations: [],
    });
  } catch (error: any) {
    return handleError(error, "GET /api/vaccinations");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { data: vetProfile, error: vetError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (vetError) return handleError(vetError, "POST /api/vaccinations (vet profile)");
    if (!vetProfile) return NextResponse.json({ error: "Veterinarian profile not found" }, { status: 404 });

    const body = await request.json();

    // Duplicate lot number guard — same batch_number on an active record means the vial was already logged
    if (body.batch_number) {
      const { data: existing } = await supabase
        .from("vaccination_records")
        .select("id")
        .eq("batch_number", body.batch_number)
        .eq("is_archived", false)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `Lot number "${body.batch_number}" already exists in an active record. Please verify before saving.` },
          { status: 409 }
        );
      }
    }

    const [insertResult, auditResult] = await Promise.all([
      supabase.from("vaccination_records").insert([{
        pet_id: body.pet_id,
        vaccine_name: body.vaccine_name,
        vaccine_type: body.vaccine_type,
        batch_number: body.batch_number || null,
        administered_date: body.administered_date,
        next_due_date: body.next_due_date || null,
        administered_by: vetProfile.id,
        side_effects_noted: body.notes || null,
      }]).select(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "vaccination_records",
        details: `Logged vaccination "${body.vaccine_name}" for pet_id ${body.pet_id}`,
      }),
    ]);

    if (insertResult.error) return handleError(insertResult.error, "POST /api/vaccinations (insert)");
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return handleError(error, "POST /api/vaccinations");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Strip immutable fields
    delete updates.administered_by;
    delete updates.pet_id;

    const { data: oldRecord } = await supabase.from("vaccination_records").select().eq("id", id).single();

    const [updateResult, auditResult] = await Promise.all([
      supabase.from("vaccination_records").update(updates).eq("id", id).select(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "vaccination_records",
        details: `Updated vaccination record id ${id}`,
        old_values: oldRecord ?? null,
        new_values: updates,
      }),
    ]);

    if (updateResult.error) return handleError(updateResult.error, "PATCH /api/vaccinations");
    if (!updateResult.data || updateResult.data.length === 0)
      return NextResponse.json({ error: "Record not found or update not permitted" }, { status: 404 });
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "PATCH /api/vaccinations");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const [archiveResult, auditResult] = await Promise.all([
      supabase.from("vaccination_records").update({ is_archived: true }).eq("id", id),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "delete",
        table_name: "vaccination_records",
        details: `Archived vaccination record id ${id}`,
      }),
    ]);

    if (archiveResult.error) return handleError(archiveResult.error, "DELETE /api/vaccinations");
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "DELETE /api/vaccinations");
  }
}
