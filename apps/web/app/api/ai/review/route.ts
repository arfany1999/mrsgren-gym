import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface WorkoutSummary {
  date: string;
  title: string;
  durationMins: number;
  totalSets: number;
  totalVolume: number;
  exercises: Array<{ name: string; sets: number; topSet?: string }>;
}

interface ReviewRequest {
  workouts: WorkoutSummary[];   // last 7-14 days
  goal?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Coach is not configured on the server." },
      { status: 503 },
    );
  }

  let body: ReviewRequest;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const workouts = Array.isArray(body.workouts) ? body.workouts.slice(0, 30) : [];
  const goal = body.goal ?? "balanced progress";

  const system = `You are a friendly, data-driven strength coach. Given a list of the user's recent workouts, produce a concise weekly review.

Output MUST be a single valid JSON object — NO prose, NO markdown fencing, NO commentary. Schema:
{
  "summary": string,          // 1-sentence overall take
  "wins":    [string, ...],   // 1-3 concrete positive observations
  "watchouts":[string, ...],  // 0-3 things that need attention (missed muscle groups, stalled lifts, overtraining, etc.)
  "suggestions":[string, ...],// 2-4 concrete actions for next week (specific sets, reps, exercises)
  "score": number             // 0-100 training-week quality
}

Rules:
- Be specific and numeric. Don't say "you did well" — say "you hit chest 3× with rising volume (+8% vs prior week)".
- Keep each string under 140 chars.
- Base score on consistency, volume, balance across muscle groups, and PR progression.`;

  const user = `Goal: ${goal}
Recent workouts (${workouts.length}):
${JSON.stringify(workouts, null, 2)}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map(c => c.text)
      .join("\n")
      .trim();
    const jsonStart = text.indexOf("{");
    const jsonEnd   = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "AI returned non-JSON", raw: text }, { status: 502 });
    }
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return NextResponse.json({ review: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI call failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
