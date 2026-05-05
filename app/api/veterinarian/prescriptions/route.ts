import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/utils/error-handler";
import { createClient } from "@/utils/supabase/server";
import { sendSms } from "@/utils/sms/sms";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("prescriptions")
      .select(
        `
          *,
          medical_record:medical_records!prescriptions_medical_record_id_fkey (
            id,
            record_number,
            visit_date,
            chief_complaint,
            appointment_id,
            pet_id
          ),
          prescribed_by_vet:veterinarian_profiles!prescriptions_prescribed_by_fkey (
            id,
            first_name,
            last_name
          )
        `,
      )
      .order("created_at", { ascending: false });

    const { data: prescriptionsData, error: prescriptionsError } = await query;

    // Delegate fetch error to centralized handler
    if (prescriptionsError)
      return handleError(prescriptionsError, "GET /api/prescriptions");

    // Fetch pet data for each prescription
    const prescriptionsWithPets = await Promise.all(
      (prescriptionsData || []).map(async (prescription: any) => {
        const { data: pet } = await supabase
          .from("pets")
          .select(
            `
              id,
              name,
              species,
              breed,
              owners:client_profiles!pets_owner_id_fkey (
                id,
                first_name,
                last_name,
                phone
              )
            `,
          )
          .eq("id", prescription.medical_record?.pet_id)
          .single();

        return {
          ...prescription,
          pets: pet,
        };
      }),
    );

    return NextResponse.json(prescriptionsWithPets, { status: 200 });
  } catch (error) {
    // Unexpected JS/DB error — centralized handler
    return handleError(error, "GET /api/prescriptions");
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { medical_record_id, prescribed_by, medication_name } = body;

    // Validate if there is medical record
    if (!medical_record_id) {
      return NextResponse.json(
        { error: "Medical Record ID is required to link this prescription." },
        { status: 400 },
      );
    }

    // Check if there is Vet ID
    if (!prescribed_by) {
      return NextResponse.json(
        { error: "Prescribed by (veterinarian ID) is required." },
        { status: 400 },
      );
    }

    // Verify the medical record exists
    const { data: medicalRecord, error: recordError } = await supabase
      .from("medical_records")
      .select("id, pet_id")
      .eq("id", medical_record_id)
      .single();

    if (recordError || !medicalRecord) {
      return NextResponse.json(
        { error: "Medical record not found." },
        { status: 404 },
      );
    }

    // Check for veterinarian by getSession()
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: petData } = await supabase
      .from("pets")
      .select("name, owner_id")
      .eq("id", medicalRecord.pet_id)
      .single();

    const [clientPhone, prescriptionResult, auditResult] = await Promise.all([
      petData?.owner_id
        ? supabase
            .from("client_profiles")
            .select("phone")
            .eq("id", petData.owner_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("prescriptions")
        .insert([
          {
            medical_record_id,
            prescribed_by,
            medication_name,
            dosage: body.dosage,
            frequency: body.frequency,
            duration: body.duration,
            instructions: body.instructions,
            form: body.form || null,
            quantity: body.quantity || null,
            refills_allowed: body.refills_allowed || 0,
            is_controlled_substance: body.is_controlled_substance || false,
          },
        ])
        .select()
        .single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "prescriptions",
        details: `Issued prescription "${medication_name}" for medical_record_id ${medical_record_id}`,
      }),
    ]);

    if (clientPhone.error)
      return handleError(clientPhone.error, "POST /api/prescriptions");
    if (prescriptionResult.error)
      return handleError(prescriptionResult.error, "POST /api/prescriptions");
    if (auditResult.error) throw auditResult.error;

    if (petData?.name && clientPhone.data?.phone) {
      const message = `A PAWS Veterinarian has issued a prescription for your pet named ${petData.name}.`;
      sendSms(clientPhone.data.phone, message).catch((err) =>
        console.error("[Prescriptions SMS] Failed to notify client:", err),
      );
    }

    return NextResponse.json(
      { success: true, data: prescriptionResult.data },
      { status: 201 },
    );
  } catch (error) {
    // Unexpected JS/DB error — centralized handler
    return handleError(error, "POST /api/prescriptions");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    if (!body.name || !body.owner_id || !body.species) {
      return NextResponse.json(
        { error: "Missing required fields: name, owner_id, species" },
        { status: 400 },
      );
    }

    const newPet = {
      name: body.name,
      species: body.species,
      breed: body.breed,
      color: body.color,
      weight: body.weight,
      owner_id: body.owner_id,
      image_url: body.image_url,
    };

    const { data, error } = await supabase
      .from("prescriptions")
      .insert([body])
      .select();

    // Delegate insert error to centralized handler
    if (error) return handleError(error, "PUT /api/prescriptions");

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    // Unexpected JS/DB error — centralized handler
    return handleError(error, "PUT /api/prescriptions");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Prescription ID is required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("prescriptions")
      .delete()
      .eq("id", id);

    // Delegate delete error to centralized handler
    if (error) return handleError(error, "DELETE /api/prescriptions");

    return NextResponse.json(
      { message: "Prescription deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    // Unexpected JS/DB error — centralized handler
    return handleError(err, "DELETE /api/prescriptions");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, mark_dispensed, ...edits } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Prescription ID is required" },
        { status: 400 },
      );
    }

    const patch: Record<string, any> = {};

    if (mark_dispensed) {
      patch.dispensed_date = new Date().toISOString();
    }

    const editableFields = [
      "medication_name",
      "dosage",
      "frequency",
      "duration",
      "instructions",
      "form",
      "quantity",
      "refills_allowed",
    ];
    for (const field of editableFields) {
      if (field in edits) patch[field] = edits[field];
    }

    const { data: oldRecord } = await supabase
      .from("prescriptions")
      .select()
      .eq("id", id)
      .single();

    const { data: petData } = await supabase
      .from("pets")
      .select("name, owner_id")
      .eq("id", oldRecord?.pet_id)
      .single();

    const [clientPhone, updateResult, auditResult] = await Promise.all([
      supabase
        .from("client_profiles")
        .select("phone")
        .eq("id", petData?.owner_id)
        .single(),
      supabase
        .from("prescriptions")
        .update(patch)
        .eq("id", id)
        .select()
        .single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "prescriptions",
        details: `Updated prescription id ${id}`,
        old_values: oldRecord ?? null,
        new_values: patch,
      }),
    ]);

    if (updateResult.error)
      return handleError(updateResult.error, "PATCH /api/prescriptions");
    if (auditResult.error) throw auditResult.error;

    if (petData?.name && clientPhone.data?.phone) {
      const message = `A PAWS Veterinarian has dispensed your pet's medication.`;
      sendSms(clientPhone.data.phone, message).catch((err) =>
        console.error("[Prescriptions SMS] Failed to notify client:", err),
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleError(error, "PATCH /api/prescriptions");
  }
}
