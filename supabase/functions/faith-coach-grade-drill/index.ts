// supabase/functions/faith-coach-grade-drill/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type DrillInput = {
  id?: string;
  title?: string;
  prompt?: string; // the objection / challenge
  opponent_type?: string;
  key_points?: string[];
  scripture_refs?: string[];
};

type GradeResult = {
  score: number; // 0..100
  pass: boolean;
  strengths: string[];
  improvements: string[];
  recommended_rebuttal: string;
  recommended_scripture_refs: string[];
  summary: string;
};

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
  });
}

function normalizeArray(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  return a.map((x) => String(x || "").trim()).filter(Boolean);
}

function safeSnippet(s: string, max = 1000) {
  return (s || "").slice(0, max);
}

/**
 * Extract structured JSON text from OpenAI Responses API.
 * With Structured Outputs, the model emits strict JSON as text.
 */
function extractOutputText(raw: any): string | null {
  // Common convenience field
  if (typeof raw?.output_text === "string" && raw.output_text.trim()) return raw.output_text;

  // Typical nested content formats
  const c0 = raw?.output?.[0]?.content?.[0];
  if (typeof c0?.text === "string" && c0.text.trim()) return c0.text;
  if (typeof c0?.value === "string" && c0.value.trim()) return c0.value;

  // Some responses place text deeper or as arrays; last resort: scan for any string fields
  return null;
}

serve(async (req) => {
  const startedAt = Date.now();

  // Always handle CORS preflight
  if (req.method === "OPTIONS") return json({ ok: true }, 200);

  try {
    console.log("faith-coach-grade-drill: request received");
    console.log("method:", req.method);

    // Auth check
    const auth = req.headers.get("authorization") || "";
    const hasBearer = auth.toLowerCase().startsWith("bearer ");
    console.log("has bearer auth:", hasBearer);

    if (!hasBearer) {
      return json({ ok: false, error: "Not authenticated." }, 401);
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const drill: DrillInput = body?.drill || {};
    const userAnswer = String(body?.userAnswer || "").trim();

    console.log("payload summary:", {
      drill_id: drill?.id || null,
      title: drill?.title ? safeSnippet(String(drill.title), 80) : null,
      has_prompt: !!drill?.prompt,
      opponent_type: drill?.opponent_type || null,
      userAnswer_len: userAnswer.length,
      key_points_len: Array.isArray(drill?.key_points) ? drill.key_points.length : 0,
      scripture_refs_len: Array.isArray(drill?.scripture_refs) ? drill.scripture_refs.length : 0,
    });

    if (!drill?.prompt && !drill?.title) {
      return json({ ok: false, error: "Missing drill data." }, 400);
    }

    if (!userAnswer || userAnswer.length < 20) {
      return json(
        { ok: false, error: "Answer too short. Write at least a couple of sentences." },
        400
      );
    }

    const keyPoints = normalizeArray(drill?.key_points);
    const refs = normalizeArray(drill?.scripture_refs);

    // Env check (this is the most common cause of 500s)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    console.log("has OPENAI_API_KEY:", !!OPENAI_API_KEY);

    if (!OPENAI_API_KEY) {
      console.error("faith-coach-grade-drill: OPENAI_API_KEY is missing in function env");
      return json({ ok: false, error: "Server missing OPENAI_API_KEY." }, 500);
    }

    // Structured Outputs schema
    const schema = {
      type: "object",
      additionalProperties: false,
      required: [
        "score",
        "pass",
        "strengths",
        "improvements",
        "recommended_rebuttal",
        "recommended_scripture_refs",
        "summary",
      ],
      properties: {
        score: { type: "number", minimum: 0, maximum: 100 },
        pass: { type: "boolean" },
        strengths: { type: "array", items: { type: "string" }, minItems: 1 },
        improvements: { type: "array", items: { type: "string" }, minItems: 1 },
        recommended_rebuttal: { type: "string" },
        recommended_scripture_refs: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
    };

    const system = `
You are Faith Coach: a calm, charity-first Christian apologetics tutor and marker.
You grade the user's rebuttal to an objection.

Marking criteria (balance all):
- Clarity and structure (calm, concise, understandable)
- Charity and tone (respectful, not combative)
- Truthfulness and biblical faithfulness (no made-up claims)
- Logic and relevance (directly addresses the objection)
- Use of Scripture (appropriate, not proof-texting)

Return only JSON that matches the schema. Keep the recommended rebuttal short (4–10 sentences).
`;

    const user = `
DRILL
Title: ${drill?.title || "(untitled)"}
Opponent type: ${drill?.opponent_type || "(unknown)"}
Objection / Prompt:
${drill?.prompt || "(no prompt)"}

Seeded key points:
${keyPoints.length ? keyPoints.map((p) => `- ${p}`).join("\n") : "(none)"}

Seeded scripture refs:
${refs.length ? refs.join(", ") : "(none)"}

USER REBUTTAL (what you are grading):
${userAnswer}

TASK
1) Score 0–100 and decide pass=true if score >= 70.
2) Give 2–5 strengths.
3) Give 2–5 improvements.
4) Provide a better recommended rebuttal the user could learn from.
5) Provide 2–6 recommended scripture refs (can include some of the seeded ones if suitable).
6) Provide a 1–2 sentence summary encouragement.
`;

    // OpenAI Responses API call
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "faith_coach_grade",
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("OpenAI request failed:", { status: resp.status, body: safeSnippet(t, 1200) });

      return json(
        {
          ok: false,
          error: "OpenAI request failed.",
          status: resp.status,
          detail: safeSnippet(t, 1200),
        },
        500
      );
    }

    const raw = await resp.json().catch(() => null);
    if (!raw) {
      console.error("OpenAI response JSON parse failed");
      return json({ ok: false, error: "OpenAI returned invalid JSON envelope." }, 500);
    }

    const outputText = extractOutputText(raw);

    if (!outputText || typeof outputText !== "string") {
      console.error("No model output text found in Responses payload", {
        keys: Object.keys(raw || {}),
      });

      return json({ ok: false, error: "No model output returned." }, 500);
    }

    let grade: GradeResult | null = null;
    try {
      grade = JSON.parse(outputText);
    } catch (e) {
      console.error("Model returned invalid JSON text:", safeSnippet(outputText, 1200));
      return json(
        {
          ok: false,
          error: "Model returned invalid JSON.",
          details: String(e?.message || e),
          raw: safeSnippet(outputText, 1200),
        },
        500
      );
    }

    console.log("faith-coach-grade-drill: success", {
      score: grade?.score ?? null,
      pass: grade?.pass ?? null,
      ms: Date.now() - startedAt,
    });

    return json({ ok: true, grade });
  } catch (e) {
    console.error("faith-coach-grade-drill: CRASHED", e);
    return json(
      {
        ok: false,
        error: "Internal error in faith-coach-grade-drill",
        details: String(e?.message || e),
      },
      500
    );
  } finally {
    console.log("faith-coach-grade-drill: finished in ms =", Date.now() - startedAt);
  }
});
