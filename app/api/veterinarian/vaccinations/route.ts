import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";
import { sendSms } from "@/utils/sms/sms";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const petId = request.nextUrl.searchParams.get("pet_id");

    const [petsResult, vaccinationHistoryResult] = await Promise.all([
      supabase
        .from("pets")
        .select("id, name, species, client_profiles(last_name)")
        .order("name"),

      (() => {
        const showArchived =
          request.nextUrl.searchParams.get("archived") === "true";
        let q = supabase
          .from("vaccination_records")
          .select(
            `*, pets(id, name, species, breed, client_profiles(last_name))`,
          )
          .eq("is_archived", showArchived)
          .order("administered_date", { ascending: false });
        if (petId) q = q.eq("pet_id", petId).limit(100);
        else q = q.limit(50);
        return q;
      })(),
    ]);

    if (petsResult.error)
      return NextResponse.json(
        { error: petsResult.error.message },
        { status: 500 },
      );
    if (vaccinationHistoryResult.error)
      return NextResponse.json(
        { error: vaccinationHistoryResult.error.message },
        { status: 500 },
      );

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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      user.user_metadata?.role !== "veterinarian"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: vetProfile, error: vetError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (vetError)
      return handleError(vetError, "POST /api/vaccinations (vet profile)");
    if (!vetProfile)
      return NextResponse.json(
        { error: "Veterinarian profile not found" },
        { status: 404 },
      );

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
          {
            error: `Lot number "${body.batch_number}" already exists in an active record. Please verify before saving.`,
          },
          { status: 409 },
        );
      }
    }

    const [petAndOwner, insertResult, auditResult] = await Promise.all([
      supabase
        .from("pets")
        .select(
          `
          id,
          name,
          client_profiles(id, first_name, last_name, phone)
          `,
        )
        .eq("id", body.pet_id)
        .maybeSingle(),
      supabase
        .from("vaccination_records")
        .insert([
          {
            pet_id: body.pet_id,
            vaccine_name: body.vaccine_name,
            vaccine_type: body.vaccine_type,
            batch_number: body.batch_number || null,
            administered_date: body.administered_date,
            next_due_date: body.next_due_date || null,
            administered_by: vetProfile.id,
            side_effects_noted: body.notes || null,
          },
        ])
        .select(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "vaccination_records",
        details: `Logged vaccination "${body.vaccine_name}" for pet_id ${body.pet_id}`,
      }),
    ]);

    if (petAndOwner.error && petAndOwner.error.code !== "PGRST116") {
      throw petAndOwner.error;
    }
    if (insertResult.error) throw insertResult.error;
    if (auditResult.error) throw auditResult.error;

    // extract the exact data you need
    const petAndOwnerData = petAndOwner.data;

    // supabase returns an object but sometimes with arrays
    const ownerData = Array.isArray(petAndOwnerData?.client_profiles)
      ? petAndOwnerData?.client_profiles[0] // get the first element if it's an array
      : petAndOwnerData?.client_profiles; // get the object if it's an object

    if (ownerData?.phone) {
      const petName = petAndOwnerData?.name;
      const followUpText = body.next_due_date
        ? ` Next follow-up schedule is on ${String(body.next_due_date).split("T")[0]}.`
        : "";
      const message = `Hi! This is Paws Vet Clinic. Just confirming that ${petName} has successfully received their ${body.vaccine_name} vaccination.${followUpText}`;

      // Fire-and-forget the SMS to prevent blocking the API response
      sendSms(ownerData.phone, message)
        .then((smsSuccess) => {
          if (!smsSuccess) {
            console.error("Failed to send SMS, but vaccination was logged.");
          }
        })
        .catch((err) => console.error("Unhandled SMS error:", err));
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    return handleError(error, "POST /api/vaccinations");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      user.user_metadata?.role !== "veterinarian"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Strip immutable fields
    delete updates.administered_by;
    delete updates.pet_id;

    const { data: oldRecord } = await supabase
      .from("vaccination_records")
      .select()
      .eq("id", id)
      .single();

    const [updateResult, auditResult] = await Promise.all([
      supabase
        .from("vaccination_records")
        .update(updates)
        .eq("id", id)
        .select(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "vaccination_records",
        details: `Updated vaccination record id ${id}`,
        old_values: oldRecord ?? null,
        new_values: updates,
      }),
    ]);

    if (updateResult.error)
      return handleError(updateResult.error, "PATCH /api/vaccinations");
    if (!updateResult.data || updateResult.data.length === 0)
      return NextResponse.json(
        { error: "Record not found or update not permitted" },
        { status: 404 },
      );
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "PATCH /api/vaccinations");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      user.user_metadata?.role !== "veterinarian"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    const [archiveResult, auditResult] = await Promise.all([
      supabase
        .from("vaccination_records")
        .update({ is_archived: true })
        .eq("id", id),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "delete",
        table_name: "vaccination_records",
        details: `Archived vaccination record id ${id}`,
      }),
    ]);

    if (archiveResult.error)
      return handleError(archiveResult.error, "DELETE /api/vaccinations");
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "DELETE /api/vaccinations");
  }
}
