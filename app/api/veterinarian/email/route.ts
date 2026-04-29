import { EmailTemplate } from "@/components/veterinarian/email-template/email-template";
import { sendEmail } from "@/utils/mail/email";
 
export async function POST(req: Request) {
  const { to, subject, content } = await req.json();
  try {
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
