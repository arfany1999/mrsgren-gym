import { NextRequest, NextResponse } from "next/server";

const OWNER_EMAIL = "arfany1999@gmail.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req: NextRequest) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email notification");
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await req.json() as {
    email: string;
    sex: string;
    age: number;
    weight_kg: number;
    height_cm: number;
    activity_level: string;
  };

  const activityLabels: Record<string, string> = {
    sedentary:   "Sedentary",
    light:       "Lightly Active",
    moderate:    "Moderately Active",
    very_active: "Very Active",
  };

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #f5f5f5; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="font-size: 40px; margin-bottom: 8px;">🏋️</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #fff;">New User Joined!</h1>
        <p style="margin: 6px 0 0; color: #888; font-size: 14px;">GYM Tracker — Profile Completed</p>
      </div>

      <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px 0; color: #888; width: 40%;">Email</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600;">${body.email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px 0; color: #888;">Sex</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600; text-transform: capitalize;">${body.sex}</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px 0; color: #888;">Age</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600;">${body.age} years</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px 0; color: #888;">Weight</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600;">${body.weight_kg} kg</td>
          </tr>
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px 0; color: #888;">Height</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600;">${body.height_cm} cm</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888;">Activity</td>
            <td style="padding: 10px 0; color: #f5f5f5; font-weight: 600;">${activityLabels[body.activity_level] ?? body.activity_level}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; font-size: 12px; color: #555; text-align: center;">
        Sent automatically by GYM Tracker · ${new Date().toUTCString()}
      </p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "GYM Tracker <onboarding@resend.dev>",
      to: [OWNER_EMAIL],
      subject: `🏋️ New user joined: ${body.email}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
    return NextResponse.json({ ok: false, error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
