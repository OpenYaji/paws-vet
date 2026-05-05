import * as React from "react";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  from?: string; // Optional: default fallback can be set
  to: string | string[];
  subject: string;
  react: React.ReactNode;
}

export async function sendEmail({
  from = "PAWS Vet Clinic <paws-quezoncity.ph>", // Default sender
  to,
  subject,
  react,
}: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email API] RESEND_API_KEY is missing.");
    return { success: false, error: "Missing API Key Configuration" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
    });

    if (error) {
      console.error("[Email API] Resend error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("[Email API] Unexpected error:", error);
    return { success: false, error };
  }
}
