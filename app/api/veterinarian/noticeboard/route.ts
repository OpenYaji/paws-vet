import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function notifyAllVets(noticeId: string, title: string, content: string, priority: string) {
  try {
    // Get all vet user IDs
    const { data: vets } = await adminSupabase
      .from("veterinarian_profiles")
      .select("user_id");

    if (!vets || vets.length === 0) return;

    const priorityLabel = priority === "urgent" ? "🚨 Urgent" : "📌 Notice";
    const rows = vets.map((v: any) => ({
      recipient_id: v.user_id,
      notification_type: "admin_announcement",
      subject: `${priorityLabel}: ${title}`,
      content: content.length > 200 ? content.slice(0, 197) + "…" : content,
      related_entity_type: "noticeboard",
      related_entity_id: noticeId,
      is_read: false,
      delivery_status: "pending",
      created_at: new Date().toISOString(),
    }));

    await adminSupabase.from("notification_logs").insert(rows);
  } catch (err) {
    console.error("[noticeboard] Failed to send vet notifications:", err);
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("noticeboard")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const priority = body.priority || "normal";

    const [insertResult, auditResult] = await Promise.all([
      supabase.from("noticeboard").insert([{ title: body.title, content: body.content, priority, author_id: user.id }]).select().single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "create",
        table_name: "noticeboard",
        details: `Posted notice "${body.title}" with priority "${priority}"`,
      }),
    ]);

    if (insertResult.error) throw insertResult.error;
    if (auditResult.error) throw auditResult.error;

    if (priority === "urgent" || priority === "important") {
      notifyAllVets(insertResult.data.id, body.title, body.content, priority);
    }

    return NextResponse.json(insertResult.data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, title, content, priority } = body;
    if (!id) return NextResponse.json({ error: "Notice ID is required" }, { status: 400 });

    const { data: oldRecord } = await supabase.from("noticeboard").select().eq("id", id).single();

    const [updateResult, auditResult] = await Promise.all([
      supabase.from("noticeboard").update({ title, content, priority }).eq("id", id).select().single(),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "update",
        table_name: "noticeboard",
        details: `Updated notice id ${id}`,
        old_values: oldRecord ?? null,
        new_values: { title, content, priority },
      }),
    ]);

    if (updateResult.error) throw updateResult.error;
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json(updateResult.data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Notice ID is required" }, { status: 400 });

    const [deleteResult, auditResult] = await Promise.all([
      supabase.from("noticeboard").delete().eq("id", id),
      supabase.from("audit_logs").insert({
        user_id: user.id,
        action_type: "delete",
        table_name: "noticeboard",
        details: `Deleted notice id ${id}`,
      }),
    ]);

    if (deleteResult.error) throw deleteResult.error;
    if (auditResult.error) throw auditResult.error;
    return NextResponse.json({ message: "Notice deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
