import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/utils/sms/sms";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Admin client uses SUPABASE_SERVICE_ROLE_KEY (server-only, bypasses RLS)
function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  try {
    // Verify vet session first
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Number(searchParams.get("offset") || 0);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = admin
      .from("notification_logs")
      .select(
        "id, recipient_id, notification_type, subject, content, related_entity_type, delivery_status, is_read, created_at",
        { count: "exact" },
      )
      .eq("notification_type", "sms")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("delivery_status", status);
    if (search)
      query = query.or(`content.ilike.%${search}%,subject.ilike.%${search}%`);

    const { data: logs, error, count } = await query;
    if (error) throw error;

    // Batch-fetch recipient names from client_profiles
    const recipientIds = [
      ...new Set(
        (logs ?? [])
          .map((l: any) => l.recipient_id)
          .filter(Boolean) as string[],
      ),
    ];

    let profileMap: Record<
      string,
      { first_name: string; last_name: string; phone: string | null }
    > = {};
    if (recipientIds.length > 0) {
      const { data: profiles } = await admin
        .from("client_profiles")
        .select("user_id, first_name, last_name, phone")
        .in("user_id", recipientIds);
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.user_id] = p;
      });
    }

    const enriched = (logs ?? []).map((log: any) => ({
      ...log,
      recipient: profileMap[log.recipient_id] ?? null,
    }));

    return NextResponse.json({ logs: enriched, total: count ?? 0 });
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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
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
      const { data: clients, error: clientsError } = await admin
        .from("client_profiles")
        .select("user_id, phone, first_name, last_name");
      if (clientsError) throw clientsError;
      clientsToNotify = clients || [];
    } else {
      const { data: client, error: clientError } = await admin
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

    if (clientsToNotify.length === 0) {
      return NextResponse.json({ message: "No clients to notify" });
    }

    // Log to notification_logs before sending
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

    const { error: insertError } = await admin
      .from("notification_logs")
      .insert(notifications);

    if (insertError) {
      console.warn("Failed to insert notification logs:", insertError);
    }

    // Send SMS concurrently
    let sentCount = 0;
    let failCount = 0;
    await Promise.all(
      clientsToNotify.map(async (client) => {
        if (client.phone) {
          const success = await sendSms(client.phone, message);
          success ? sentCount++ : failCount++;
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
