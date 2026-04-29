import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { sendSms } from "@/utils/sms/sms";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role =
      user.user_metadata?.role?.toLowerCase() ||
      user.app_metadata?.role?.toLowerCase() ||
      "client";
    if (role !== "veterinarian")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // get the exact date of tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toISOString().split("T")[0];

    // query the pets with vaccinations due tomorrow
    const { data: vaccination, error } = await supabase
      .from("vaccinations")
      .select(
        `
        id,
        pet_id,
        vaccine_name,
        next_due,
        pets!inner(
          name,
          client:client_profiles!inner(phone, first_name)
        )
        `,
      )
      .eq("next_due_date", targetDate)
      .is("is_reminder_sent", false);

    if (error)
      return NextResponse.json(
        { error: "Failed to get vaccinations" },
        { status: 500 },
      );

    if (!vaccination || vaccination.length === 0) {
      return NextResponse.json({
        message: "no vaccine reminders needed today",
      });
    }

    const processingPromises = vaccination.map(async (record: any) => {
      const petName = record.pets?.name;
      const clientName = record.pets?.client?.first_name;
      const phone = record.pets?.client?.phone;

      if (!phone) return null;

      const message = `Hi ${clientName}, this is Paws Vet Clinic. Just reminding you that ${petName} is due for their ${record.vaccine_name} vaccine tomorrow.`;

      const smsSuccess = await sendSms(phone, message);

      if (smsSuccess) {
        return supabase
          .from("vaccinations")
          .update({ is_reminder_sent: true })
          .eq("id", record.id);
      }
    });

    await Promise.all(processingPromises);

    // Still need to change later for vaccines that has more than 3 shots

    return NextResponse.json({
      success: true,
      message: `sent ${vaccination.length} vaccine reminders`,
    });
  } catch (error) {
    console.error("[GET /api/cron/vaccinations] Error:", error);
    return NextResponse.json(
      { error: "Failed to get vaccinations" },
      { status: 500 },
    );
  }
}
