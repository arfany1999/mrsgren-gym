import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// AI coach endpoint. Takes a single exercise + the user's recent completed
// sessions for that exercise, asks Claude for the next session's prescription
// using progressive-overload principles, and returns a structured suggestion.
//
// Designed to be called once per exercise per active workout (the client
// caches by `exerciseId + lastWorkoutId` for 24h). Output is short and
// structured so we can use the cheap fast model.

export const runtime = "nodejs";

interface HistorySet {
  reps: number | null;
  weightKg: number | null;
}

interface HistorySession {
  date: string; // ISO
  sets: HistorySet[];
}

interface CoachRequest {
  exercise: {
    name: string;
    muscleGroups?: string[];
  };
  history: HistorySession[];
}

interface CoachSuggestion {
  strategy: "increase" | "maintain" | "deload" | "first_session";
  reps: number;
  weightKg: number;
  reasoning: string;
}

// Frozen system prompt: keep this stable across calls so prompt caching
// engages once it grows past the model's 4096-token threshold (currently
// well below — caching simply won't fire yet, no error). The cache_control
// marker stays in case the prompt expands later.
const SYSTEM_PROMPT = `You are an experienced strength coach. Given a single exercise and the user's recent completed sessions for that exercise, recommend the prescription for their NEXT session, using these progressive-overload rules:

1. If their TOP set in the most recent session was at least 10 reps with form intact — increase the working weight by 2.5 kg (or 5 kg for compound lower-body lifts: squats, deadlifts, hip thrusts).
2. If their top set was 6 to 9 reps — keep the same weight, target +1 rep on the same number of sets.
3. If their top set was 5 reps or fewer — drop weight 5 to 10% to rebuild quality reps.
4. If they have done the SAME weight × reps for 3 or more consecutive sessions (a stall) — recommend a deload: drop weight 10 to 15% for ONE session, return to working weight after.
5. If they have no history (first_session) — recommend a conservative starting weight: 50% of bodyweight estimate for compound lifts, otherwise just-the-bar (20 kg) for barbells / 5 kg dumbbells for accessories. Use 8 reps as the default.

ALWAYS round weight to the nearest 2.5 kg (the smallest standard plate pair on a barbell). Use kilograms. Return ONLY structured JSON matching the provided schema.

Reasoning must be ONE concise sentence under 90 characters that ties back to specific numbers from the history (e.g. "Hit 4×10 @ 70 kg cleanly — small bump"). Do not pad with disclaimers, do not mention rest, do not mention RPE.`;

const COACH_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    suggestion: {
      type: "object",
      properties: {
        strategy: {
          type: "string",
          enum: ["increase", "maintain", "deload", "first_session"],
        },
        reps: { type: "integer" },
        weightKg: { type: "number" },
        reasoning: { type: "string" },
      },
      required: ["strategy", "reps", "weightKg", "reasoning"],
      additionalProperties: false,
    },
  },
  required: ["suggestion"],
  additionalProperties: false,
};

function buildUserPrompt(req: CoachRequest): string {
  const lines: string[] = [];
  lines.push(`Exercise: ${req.exercise.name}`);
  if (req.exercise.muscleGroups?.length) {
    lines.push(`Muscles: ${req.exercise.muscleGroups.join(", ")}`);
  }
  lines.push("");
  if (req.history.length === 0) {
    lines.push("No prior sessions logged for this exercise.");
  } else {
    lines.push(`Recent sessions (oldest → newest, ${req.history.length} total):`);
    for (const s of req.history) {
      const setStr = s.sets
        .map((set) => {
          const w = set.weightKg ?? 0;
          const r = set.reps ?? 0;
          return `${r}×${w}kg`;
        })
        .join(", ");
      lines.push(`- ${s.date.slice(0, 10)}: ${setStr || "(no completed sets)"}`);
    }
  }
  lines.push("");
  lines.push("What should the user do in their NEXT session?");
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  // Graceful degradation: if no API key is configured, return 503 so the
  // client falls back to its built-in heuristic. The frontend treats this
  // as a normal "AI coach off" state, not an error.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ai_disabled", message: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.exercise?.name || !Array.isArray(body?.history)) {
    return NextResponse.json(
      { error: "invalid_request", message: "exercise.name and history are required" },
      { status: 400 },
    );
  }
  // Hard-cap the history we forward — these calls are short and structured,
  // we don't need (or want to pay for) the full lifetime of the lift.
  const trimmedHistory = body.history.slice(-8);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      // System prompt as a single text block with cache_control so the
      // prefix is cached once it grows past the model minimum (currently
      // 4096 tokens for Haiku 4.5 — won't engage at the current size, but
      // leaves the door open if we expand the prompt later).
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: COACH_OUTPUT_SCHEMA,
        },
      },
      messages: [
        { role: "user", content: buildUserPrompt({ ...body, history: trimmedHistory }) },
      ],
    });

    // The first text block is guaranteed to be valid JSON when output_config
    // is set. We still parse defensively so a malformed response surfaces
    // as a clean fallback rather than crashing the route.
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "no_text_block" },
        { status: 502 },
      );
    }
    let parsed: { suggestion: CoachSuggestion };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return NextResponse.json({ error: "invalid_model_output" }, { status: 502 });
    }

    return NextResponse.json(
      {
        suggestion: parsed.suggestion,
        usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cacheRead: response.usage.cache_read_input_tokens ?? 0,
          cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // Typed exceptions per the SDK conventions — never string-match.
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "anthropic_error", status: error.status, message: error.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
