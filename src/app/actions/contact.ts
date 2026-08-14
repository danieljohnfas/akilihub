"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_test_123");

export async function submitContactForm(prevState: any, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const type = formData.get("type") as string;
    const message = formData.get("message") as string;

    if (!name || !email || !message) {
      return { error: "Name, email, and message are required." };
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set. Contact form submission skipped.");
      // Pretend it succeeded if there's no API key configured locally
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: "AkiliBrain Contact <onboarding@resend.dev>",
      to: "info@akilibrain.com",
      subject: `New Contact Form Submission: ${type}`,
      replyTo: email,
      text: `
Name: ${name}
Email: ${email}
Type: ${type}

Message:
${message}
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return { error: "Failed to send message. Please try again later." };
    }

    return { success: true };
  } catch (err) {
    console.error("Error submitting contact form:", err);
    return { error: "An unexpected error occurred." };
  }
}
