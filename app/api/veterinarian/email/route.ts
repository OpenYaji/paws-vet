import { EmailTemplate } from "@/components/veterinarian/email-template/email-template";
import { sendEmail } from "@/utils/mail/email";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== "veterinarian") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, content } = await req.json();
    const { success, data, error } = await sendEmail({
      to: to,
      subject: subject,
      react: EmailTemplate({ firstName: content }),
    });

    if (!success) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
