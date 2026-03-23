import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/utils/sms";

export const dynamic = "force-dynamic";

// Use service role to bypass RLS and notify all clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { noticeId, message } = body;

    // Require either a noticeId OR a direct message
    if (!noticeId && !message) {
      return NextResponse.json({ error: "Notice ID or message is required" }, { status: 400 });
    }

    let subject = "New Clinic Announcement";
    let content = message;
    let relatedId = null;

    // If it came from the Notice Board, fetch the notice details
    if (noticeId) {
      const { data: notice, error: noticeError } = await supabaseAdmin
        .from("noticeboard")
        .select("*")
        .eq("id", noticeId)
        .single();

      if (noticeError || !notice) {
        return NextResponse.json({ error: "Notice not found" }, { status: 404 });
      }

      subject = `New Announcement: ${notice.title}`;
      content = notice.content;
      relatedId = notice.id;
    }

    // Fetch all client user IDs
    const { data: clients, error: clientsError } = await supabaseAdmin
      .from("client_profiles")
      .select("user_id, phone");

    if (clientsError) {
      throw clientsError;
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ message: "No clients to notify" });
    }

    // Prepare notifications
    const notifications = clients.map((client) => ({
      recipient_id: client.user_id,
      notification_type: "general",
      subject: subject,
      content: content,
      related_entity_type: relatedId ? "noticeboard" : "clinic_settings",
      related_entity_id: relatedId,
      delivery_status: "pending",
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    // Batch insert notifications
    const { error: insertError } = await supabaseAdmin
      .from("notification_logs")
      .insert(notifications);

    if (insertError) {
      throw insertError;
    }

    // sending sms to all clients concurrently
    await Promise.all(
      clients.map((client) => {
        if (client.phone) {
          return sendSms(client.phone, content);
        }
        return Promise.resolve(false);
      })
    );

    return NextResponse.json({
      success: true,
      message: `Notified ${clients.length} clients successfully`
    });

  } catch (error: any) {
    console.error("[POST /api/veterinarian/noticeboard/notify] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}