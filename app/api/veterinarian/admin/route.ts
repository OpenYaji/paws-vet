import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: oldRecord } = await supabase.from('clinic_settings').select().eq('id', 1).single();

    const [updateResult, logResult] = await Promise.all([
      supabase.from('clinic_settings').update({ ...body, updated_at: new Date().toISOString() }).eq('id', 1),
      supabase.from("audit_logs").insert({
        user_id: body.updated_by,
        action_type: "update",
        table_name: "clinic_settings",
        details: `Updated clinic settings with data: ${JSON.stringify(body)}`,
        old_values: oldRecord ?? null,
        new_values: body,
      }),
    ]);

    if (updateResult.error) throw updateResult.error;
    if (logResult.error) throw logResult.error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}