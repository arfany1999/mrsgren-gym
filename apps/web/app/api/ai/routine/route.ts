import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

interface RoutineRequest {
  goal?: string;          // e.g. "hypertrophy", "strength", "fat loss", "general"
  experience?: string;    // "beginner" | "intermediate" | "advanced"
  daysPerWeek?: number;   // 2-6
  equipment?: string;     // "full gym" | "dumbbells only" | "bodyweight"
  focus?: string;         // free-text, e.g. "bigger arms, stronger squat"
  sessionMinutes?: number;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI Coach is not configured on the server." },
      { status: 503 },
    );
  }

  let body: RoutineRequest;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const goal          = body.goal          ?? "hypertrophy";
  const experience    = body.experience    ?? "intermediate";
  const daysPerWeek   = Math.min(6, Math.max(2, body.daysPerWeek ?? 4));
  const equipment     = body.equipment     ?? "full gym";
  const focus         = body.focus         ?? "";
  const sessionMinutes = body.sessionMinutes ?? 60;

  const system = `You are an expert strength & hypertrophy coach. You design efficient, science-based workout routines.

Output MUST be a single valid JSON object — NO prose, NO markdown fencing, NO commentary. Schema:
{
  "name": string,                         // name of the whole routine/program
  "description": string,                  // 1-2 sentences
  "days": [
    {
      "title": string,                    // e.g. "Push Day — Chest/Shoulders/Triceps"
      "exercises": [
        {
          "name": string,                 // use standard gym names (e.g. "Bench Press", "Romanian Deadlift")
          "muscleGroup": string,          // e.g. "chest"
          "sets": number,                 // 2-5
          "repRange": string,             // e.g. "8-12"
          "restSeconds": number,          // 30-240
          "note": string                  // one-line cue or tempo hint; can be empty
        }
      ]
    }
  ]
}

Rules:
- Use exercises that are well-known and searchable.
- Include 5-7 exercises per day.
- Mix compounds first, isolations after.
- Respect the equipment available.
- Total days array length MUST equal daysPerWeek.
- Do not include warm-up or cool-down entries — just working exercises.`;

  const user = `Generate a routine with these constraints:
- Goal: ${goal}
- Experience: ${experience}
- Days per week: ${daysPerWeek}
- Equipment: ${equipment}
- Session length: ~${sessionMinutes} minutes
- Focus areas: ${focus || "balanced development"}`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    });

    // Extract text
    const text = msg.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map(c => c.text)
      .join("\n")
      .trim();

    // Parse JSON (be tolerant to stray markdown fences if any)
    const jsonStart = text.indexOf("{");
    const jsonEnd   = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return NextResponse.json({ error: "AI returned non-JSON", raw: text }, { status: 502 });
    }
    const json = text.slice(jsonStart, jsonEnd + 1);
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch {
      return NextResponse.json({ error: "AI returned unparseable JSON", raw: text }, { status: 502 });
    }

    return NextResponse.json({ routine: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI call failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
