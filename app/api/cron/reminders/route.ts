import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { sendSms } from "@/utils/sms/sms";

export async function GET(request: NextRequest) {
  try {
    // check if the request is authorized
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split("T")[0];

    // query the appointments that are due tomorrow
    const { data: appointments, error: fetchError } = await supabase
      .from("appointments")
      .select(
        `
        id, 
        appointment_time, 
        client_profiles!inner(phone, first_name)
      `,
      )
      .eq("appointment_date", tomorrowDate)
      // only get appointments that are actively scheduled
      .in("appointment_status", ["scheduled", "approved"])
      // only get ones that haven't been reminded yet
      .is("reminder_sent", false);

    if (fetchError) throw fetchError;
    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ message: "no reminders needed today" });
    }

    //
    const processingPromises = appointments.map(async (appt: any) => {
      const phone = appt.client_profiles?.phone;
      const name = appt.client_profiles?.first_name;

      if (!phone) return null;

      const message = `Hi ${name}, this is paws clinic! Just reminding you of your pet's appointment tomorrow at ${appt.appointment_time}.`;

      // send the text using your android phone gateway
      const smsSuccess = await sendSms(phone, message);

      // if the text sent successfully, mark it in the database
      if (smsSuccess) {
        return supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", appt.id);
      }
    });

    // execute all texts and database updates in parallel
    await Promise.all(processingPromises);

    return NextResponse.json({
      success: true,
      message: `processed ${appointments.length} reminders`,
    });
  } catch (error: any) {
    console.error("cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
