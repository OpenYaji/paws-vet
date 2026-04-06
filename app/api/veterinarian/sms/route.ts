import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/utils/sms";
import { createAdminClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();

    // search params
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || 10;
    const offset = searchParams.get("offset") || 0;

    // fetch all message history depending on limit and offset
    const { data: clients, error } = await supabase
      .from("notification_logs")
      .select(
        "id, recipient_id, notification_type, subject, content, related_entity_type, delivery_status, is_read, created_at",
      )
      .eq("notification_type", "sms")
      .limit(Number(limit))
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json(clients);
  } catch (error: any) {
    console.error("[GET /api/veterinarian/sms] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const body = await request.json();
    const { target, message } = body;

    if (!target || !message) {
      return NextResponse.json(
        { error: "Target and message are required" },
        { status: 400 },
      );
    }

    let clientsToNotify: any[] = [];

    if (target === "all") {
      // Fetch all client user IDs and phones
      const { data: clients, error: clientsError } = await supabase
        .from("client_profiles")
        .select("user_id, phone, first_name, last_name");

      if (clientsError) {
        throw clientsError;
      }
      clientsToNotify = clients || [];
    } else {
      // Fetch specific client
      const { data: client, error: clientError } = await supabase
        .from("client_profiles")
        .select("user_id, phone, first_name, last_name")
        .eq("id", target)
        .single();

      if (clientError || !client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 },
        );
      }
      clientsToNotify = [client];
    }

    // if no clients to notify
    if (clientsToNotify.length === 0) {
      return NextResponse.json({ message: "No clients to notify" });
    }

    // Prepare notifications for logging (optional but good practice)
    const notifications = clientsToNotify.map((client) => ({
      recipient_id: client.user_id,
      notification_type: "sms",
      subject: "SMS Broadcast",
      content: message,
      related_entity_type: "clinic_settings",
      delivery_status: "pending",
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    // Batch insert notifications
    const { error: insertError } = await supabase
      .from("notification_logs")
      .insert(notifications);

    if (insertError) {
      console.warn("Failed to insert notification logs:", insertError);
      // We don't throw here to ensure SMS still attempts to send even if logging fails
    }

    // sending sms concurrently
    let sentCount = 0;
    let failCount = 0;
    await Promise.all(
      clientsToNotify.map(async (client) => {
        if (client.phone) {
          const success = await sendSms(client.phone, message);
          if (success) {
            sentCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      }),
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} SMS successfully${failCount > 0 ? ` (${failCount} failed)` : ""}`,
      sentCount,
      failCount,
    });
  } catch (error: any) {
    console.error("[POST /api/veterinarian/sms] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
