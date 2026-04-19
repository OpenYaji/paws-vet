// app/api/notifications/route.ts
import { createCookieClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Creating JSON responses for consistent and reuable response formatting
function jsonError(message: any, status: number = 400, details?: any) {
  return NextResponse.json(
    { error: message, ... (details ? { details} : { }) },
    { status },
  );
}

async function requireUser(req: NextRequest) {
  const supabase = await createCookieClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return { supabase, user: null, response: jsonError("Unauthorized", 401) };
  }

  return { supabase, user: data.user, response: null };
}

// role check via tables (recommended vs JWT app_metadata)
async function isVetOrAdmin(supabase: any, userId: string) {
  const [{ data: vet }, { data: admin }] = await Promise.all([
    supabase.from("veterinarian_profiles").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("admin_profiles").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  return Boolean(vet?.id || admin?.id);
}

// Limit what columns need to return
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

// GET: Fetch notifications for a user
export async function GET(request: NextRequest) {
  // server-side auth check
  const { supabase, user, response } = await requireUser(request);
  // If not authenticated, return early with the error response
  if (response) return response;

  try {
    // Parse query parameters for pagination and filtering
    const queryParams = request.nextUrl.searchParams;

    // Limit the number of notifications returned, with a max cap to prevent abuse
    const limit = Math.min(parseInt(queryParams.get("limit") || "20", 10), 100);
    const unreadOnly = (queryParams.get("is_read") ?? "false") === "false";

    // Query the database for notifications belonging to the authenticated user, applying filters and sorting
    let query = supabase
      .from("notification_logs")
      .select(notifSelect)
      .eq("recipient_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(limit);  

    // If the unreadOnly filter is set, add a condition to only fetch unread notifications
    if (unreadOnly) query = query.eq("is_read", false);

    // Execute the query and handle potential errors
    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/notifications] db error", { userId: user.id, error });
      return jsonError("Failed to fetch notifications", 500);
    }

    // Return the fetched notifications as a JSON response. If no data is found, return an empty array for consistency.
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[GET /api/notifications] unexpected", { userId: user.id, err });
    return jsonError("Internal server error", 500);
  }
}

// POST: Create a new notification
export async function POST(request: NextRequest) {
   // server-side auth check
  const { supabase, user, response } = await requireUser(request);
  // If not authenticated, return early with the error response
  if (response) return response;

  try {
    const body = await request.json();
    const {
      recipient_id,
      notification_type,
      subject,
      content,
      related_entity_type,
      related_entity_id,
    } = body;

    if (!recipient_id || !notification_type || !content) {
      return NextResponse.json(
        { error: "Recipient ID, notification type, and content are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("notification_logs")
      .insert({
        recipient_id,
        notification_type,
        subject,
        content,
        related_entity_type,
        related_entity_id,
        delivery_status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 },
    );
  }
}

// PATCH: Mark notification as delivered/read
export async function PATCH(request: NextRequest) {
   // server-side auth check
  const { supabase, user, response } = await requireUser(request);
  // If not authenticated, return early with the error response
  if (response) return response;
  try {
    const body = await request.json();
    const { notification_id, delivery_status } = body;

    if (!notification_id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );
    }

    const updateData: any = {
      delivery_status: delivery_status || "delivered",
    };

    if (delivery_status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("notification_logs")
      .update(updateData)
      .eq("id", notification_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating notification:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 },
    );
  }
}
