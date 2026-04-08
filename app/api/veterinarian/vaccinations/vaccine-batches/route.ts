import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { handleError } from "@/utils/error-handler";
import { sendSms } from "@/utils/sms";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: vetProfile, error: vetError } = await supabase
      .from("veterinarian_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (vetError) throw vetError;
    if (!vetProfile) {
      return NextResponse.json(
        { error: "Veterinarian profile not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { vaccines } = body;

    const vaccinesWithAdmin = vaccines.map((v: any) => ({
      ...v,
      administered_by: vetProfile.id,
    }));

    // grab the info from the first dose in the array
    const firstShot = vaccines[0];

    const [petAndOwner, vaccineBatches, auditLogs] = await Promise.all([
      supabase
        .from("pets")
        .select(
          `
          id,
          name,
          client_profiles(id, first_name, last_name, phone)
          `,
        )
        .eq("id", firstShot.pet_id)
        .maybeSingle(),
      supabase.from("vaccination_records").insert(vaccinesWithAdmin),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "vaccination_records",
        details: `Logged vaccination batch vaccination series`,
      }),
    ]);

    if (petAndOwner?.error) throw petAndOwner.error;
    if (vaccineBatches?.error) throw vaccineBatches.error;
    if (auditLogs?.error) throw auditLogs.error;

    // extract the exact data you need
    const petAndOwnerData = petAndOwner.data;

    // supabase returns an object but sometimes with arrays
    const ownerData = Array.isArray(petAndOwnerData?.client_profiles)
      ? petAndOwnerData?.client_profiles[0] // get the first element if it's an array
      : petAndOwnerData?.client_profiles; // get the object if it's an object

    if (ownerData?.phone) {
      const petName = petAndOwnerData?.name;
      const message = `Hi! This is Paws Vet Clinic. Just confirming that ${petName} has successfully received their ${firstShot.vaccine_name} vaccination.`;
      
      // Fire-and-forget the SMS to prevent blocking the API response
      sendSms(ownerData.phone, message)
        .then((smsSuccess) => {
          if (!smsSuccess) {
            console.error("Failed to send SMS, but vaccination was logged.");
          }
        })
        .catch(err => console.error("Unhandled SMS error:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Vaccines added successfully",
    });
  } catch (error: any) {
    return handleError(
      error,
      "POST /api/veterinarian/vaccinations/vaccine-batches",
    );
  }
}
