// app/api/veterinarian/notifications/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Consistent error response helper
function jsonError(message: any, status: number = 400, details?: any) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status },
  );
}

// get the authenticated user and supabase client
async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();

  // check for manual token in headers (for fetcher)
  const authHeader = request.headers.get("Authorization");
  const token = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

  const {
    data: { user },
    error,
  } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  if (error || !user) return { user: null, role: null, supabase };

  const role =
    user?.user_metadata?.role?.toLowerCase() ||
    user?.app_metadata?.role?.toLowerCase() ||
    "client";

  return { user, role, supabase };
}

// Vet-only guard — admins are excluded to keep this feed isolated
async function isVet(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("veterinarian_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.id);
}

// Notification types relevant to the veterinarian feed
const vet_notification_types = [
  "new_appointment",
  "new_pet",
  "emergency",
  "appointment_today",
  "quarantine_alert",
  "no_show",
  "admin_announcement",
  "admin_duty_notice",
  // carry over shared types that vets also receive
  "appointment_reminder",
  "appointment_confirmed",
  "appointment_cancelled",
  "test_results",
  "general",
];

const notifSelect = `
  id,
  recipient_id,
  notification_type,
  subject,
  content,
  related_entity_type,
  related_entity_id,
  delivery_status,
  is_read,
  sent_at,
  delivered_at
`;

// GET: fetch vet-specific notifications with optional unread + pagination filters
export async function GET(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  // Only veterinarians may access this endpoint
  const authorized = await isVet(supabase, user!.id);
  if (!authorized) return jsonError("Forbidden: veterinarians only", 403);

  try {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(params.get("limit") || "20", 10), 100);
    const unreadOnly = (params.get("is_read") ?? "false") === "false";

    // Scope query to this vet's notifications, ordered newest first
    let query = supabase
      .from("notification_logs")
      .select(notifSelect)
      .eq("recipient_id", user!.id)
      .in("notification_type", vet_notification_types)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/veterinarian/notifications] db error", { userId: user!.id, error });
      return jsonError("Failed to fetch notifications", 500);
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[GET /api/veterinarian/notifications] unexpected", { userId: user!.id, err });
    return jsonError("Internal server error", 500);
  }
}

// PATCH: mark a notification as read
export async function PATCH(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const authorized = await isVet(supabase, user!.id);
  if (!authorized) return jsonError("Forbidden: veterinarians only", 403);

  try {
    const body = await request.json();
    const { notification_id, mark_all_read } = body;

    // Batch mark-all-read shortcut
    if (mark_all_read) {
      const { error } = await supabase
        .from("notification_logs")
        .update({ is_read: true })
        .eq("recipient_id", user!.id)
        .eq("is_read", false)
        .in("notification_type", vet_notification_types);

      if (error) return jsonError("Failed to update notifications", 500);
      return NextResponse.json({ success: true });
    }

    if (!notification_id) return jsonError("notification_id is required", 400);

    // Only allow marking own notifications to prevent IDOR
    const { data, error } = await supabase
      .from("notification_logs")
      .update({ is_read: true, delivered_at: new Date().toISOString() })
      .eq("id", notification_id)
      .eq("recipient_id", user!.id)
      .select(notifSelect)
      .single();

    if (error) {
      console.error("[PATCH /api/veterinarian/notifications] db error", error);
      return jsonError("Failed to update notification", 500);
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/veterinarian/notifications] unexpected", err);
    return jsonError("Internal server error", 500);
  }
}
