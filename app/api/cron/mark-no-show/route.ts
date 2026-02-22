import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();

  const graceMinutes = 15;
  const cutoff = new Date(Date.now() - graceMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .update({ appointment_status: "no_show" })
    .in("appointment_status", ["pending", "confirmed"])
    .is("checked_in_at", null)
    .lte("scheduled_start", cutoff)
    .select("id");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ updated: data?.length ?? 0 });
}
