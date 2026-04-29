import { NextResponse } from "next/server";
import { sendSms } from "@/utils/sms";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
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
  } catch (error) {
    console.error("[POST /api/veterinarian/sms/kapon] Error:", error);
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
  }
}
