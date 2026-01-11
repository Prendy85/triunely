// supabase/functions/faith-coach/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function looksFirstPerson(text: string) {
  const t = (text || "").toLowerCase();
  return /\b(i|me|my|i'm|i am|mine)\b/.test(t);
}

function firstNameOnly(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0] || "";
}

function stripLeadingGreeting(text: string) {
  const t = (text || "").trim();
  return t.replace(/^(hello|hi|hey)\s+[A-Za-z'-]+\s*,\s*/i, "");
}

function clamp(s: string, n: number) {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trim();
}

function extractJsonObject(text: string) {
  const t = (text || "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function normalizeStringArray(value: any, max = 6): string[] {
  const out: string[] = [];

  const add = (s: string) => {
    const v = String(s || "").trim();
    if (!v) return;
    if (out.includes(v)) return;
    out.push(v);
  };

  if (Array.isArray(value)) {
    value.forEach((v) => add(v));
  } else if (typeof value === "string") {
    value
      .split(/[\n,]+/g)
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((v) => add(v));
  }

  return out.slice(0, max);
}

async function callOpenAI(payload: any) {
  const aiRes = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text();
    console.error("OpenAI error", aiRes.status, text);
    return { ok: false, status: aiRes.status, raw: text };
  }

  const json = await aiRes.json();
  const text =
    json?.output?.[0]?.content?.[0]?.text ??
    "Faith Coach could not generate a response this time.";

  return { ok: true, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set in Edge Function environment");
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let bodyJson: any = {};
  try {
    bodyJson = await req.json();
  } catch {
    bodyJson = {};
  }

  const action = typeof bodyJson?.action === "string" ? bodyJson.action : "";

  // ------------------------------------------------------------
  // NEW: Weekly Challenge Generator
  // body: { action: "generate_weekly_challenge", church_name, week_start, topic }
  // returns:
  // {
  //   title, description, why_it_matters,
  //   scripture_refs: string[],
  //   action_label, action_url,
  //   lp_bonus
  // }
  // ------------------------------------------------------------
  if (action === "generate_weekly_challenge") {
    const churchName = clamp(String(bodyJson?.church_name ?? "Church"), 80);
    const weekStart = clamp(String(bodyJson?.week_start ?? ""), 32);
    const topic = clamp(String(bodyJson?.topic ?? ""), 120);

    const prompt = `
You are Triunely’s Faith Coach helping a church create a weekly discipleship challenge for members.

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY:
{
  "title": "…",
  "description": "…",
  "why_it_matters": "…",
  "scripture_refs": ["Book 1:1", "Book 2:2"],
  "action_label": "…",
  "action_url": null,
  "lp_bonus": 0
}

Rules:
- Make it practical and encouraging, Bible-faithful, not political.
- title: short (max 60 chars).
- description: 2–4 sentences.
- why_it_matters: 2–4 sentences explaining spiritual purpose and impact.
- scripture_refs: 2–5 references, formatted like "Philippians 4:6–7" (no quotes).
- action_label: short button label (e.g. "Read the verses" or "Take action").
- action_url: null unless a clear safe generic link is appropriate (generally keep null).
- lp_bonus: choose 0–50 (integer) based on difficulty.
- This is for: ${churchName}
- Week start (YYYY-MM-DD): ${weekStart || "(unknown)"}
- Topic or discipline focus (if provided): ${topic || "(none provided)"}
`.trim();

    const result = await callOpenAI({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.5,
      max_output_tokens: 450,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", status: result.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = extractJsonObject(result.text) || {};

    const title = clamp(parsed?.title || "Weekly challenge", 60);
    const description = clamp(parsed?.description || "", 600) || null;
    const whyItMatters = clamp(parsed?.why_it_matters || "", 700) || null;
    const scriptureRefs = normalizeStringArray(parsed?.scripture_refs, 6);

    const actionLabel = clamp(parsed?.action_label || "Read the verses", 40);
    const actionUrlRaw = String(parsed?.action_url ?? "").trim();
    const actionUrl =
      actionUrlRaw && (actionUrlRaw.startsWith("http://") || actionUrlRaw.startsWith("https://"))
        ? actionUrlRaw
        : null;

    let lpBonus = Number(parsed?.lp_bonus);
    if (!Number.isFinite(lpBonus) || lpBonus < 0) lpBonus = 0;
    lpBonus = Math.floor(Math.min(lpBonus, 50));

    return new Response(
      JSON.stringify({
        title,
        description,
        why_it_matters: whyItMatters,
        scripture_refs: scriptureRefs,
        action_label: actionLabel,
        action_url: actionUrl,
        lp_bonus: lpBonus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ------------------------------------------------------------
  // A) COACH / CHAT MODE + META ACTIONS
  // Triggered when request includes messages: ChatMessage[]
  // ------------------------------------------------------------
  if (Array.isArray(bodyJson?.messages)) {
    const messages: ChatMessage[] = bodyJson.messages;

    const firstName = firstNameOnly(
      typeof bodyJson.user_first_name === "string" ? bodyJson.user_first_name : ""
    );

    const cleanedMessages: ChatMessage[] = messages.map((m) => {
      if (m?.role === "assistant") {
        return { ...m, content: stripLeadingGreeting(m.content) };
      }
      return m;
    });

    // -------------------------
    // A1) SUMMARIZE ACTION
    // body: { action: "summarize", messages: [...] }
    // returns: { title, summary }
    // -------------------------
    if (action === "summarize") {
      const tail = cleanedMessages.slice(-30);
      const transcript = tail
        .filter((m) => m?.role === "user" || m?.role === "assistant")
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      const prompt = `
You are generating metadata for a saved pastoral chat thread in a Christian app.

Return ONLY valid JSON (no markdown, no extra commentary) with exactly:
{
  "title": "...",
  "summary": "..."
}

Rules:
- title: 3–7 words, plain text, no trailing punctuation.
- summary: 1–2 short sentences, plain English, pastoral tone.
- Do not include long quotes or lots of Scripture references.
- Do not mention being an AI.

CHAT TRANSCRIPT:
${transcript || "(empty)"}
`.trim();

      const result = await callOpenAI({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.2,
        max_output_tokens: 220,
      });

      if (!result.ok) {
        return new Response(
          JSON.stringify({ error: "OpenAI request failed", status: result.status }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = extractJsonObject(result.text);
      const title = clamp(parsed?.title || "Faith Coach Chat", 60);
      const summary = clamp(parsed?.summary || "Saved Faith Coach conversation.", 240);

      return new Response(JSON.stringify({ title, summary }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------
    // A2) GREETING (messages = [])
    // -------------------------
    if (messages.length === 0) {
      const name = firstName || "there";
      return new Response(
        JSON.stringify({ text: `Hello ${name}, how can I help you today?` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -------------------------
    // A3) NORMAL CHAT REPLY
    // -------------------------
    const system: ChatMessage = {
      role: "system",
      content: `
You are Triunely’s Faith Coach: a Bible-faithful, warm Christian pastor/elder speaking conversationally.

Primary behavior:
- Speak like a trusted church leader: calm, compassionate, direct, wise.
- Offer Scripture naturally as part of the conversation.
- Give practical next steps (prayer, repentance, forgiveness, boundaries, seeking counsel, Christian community).
- Be encouraging and hope-filled, centred on Christ.

Scripture requirement (important):
- Include 1–2 Scripture references directly relevant to what the user said.
- For EACH reference, include a short excerpt (ONE sentence max) OR a brief paraphrase if the verse is long.
- Format examples:
  - John 14:27 — "Peace I leave with you..."
  - Romans 8:1 — "There is now no condemnation..."
- Keep excerpts short. Do not paste long passages.

Structure (natural conversation, no headings):
- Start by acknowledging what the user is experiencing.
- Then include the verse(s) with excerpt(s).
- Then give advice and encouragement applied to their situation.
- End with at most ONE gentle question if it would help move the conversation forward.

Formatting rules:
- NO labeled headers (do NOT output "SCRIPTURE:" or "ENCOURAGEMENT:" etc).
- Short paragraphs. Bullets only if it genuinely helps.

Important rules:
- Do NOT repeatedly introduce yourself or say “I’m your Faith Coach”.
- Do NOT mention you are an AI unless asked.
- Do NOT start with greetings like "Hello/Hi" and do NOT address the user by name.
`.trim(),
    };

    const inputMessages: ChatMessage[] = [system, ...cleanedMessages];

    const payload = {
      model: "gpt-4.1-mini",
      input: inputMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
      temperature: 0.6,
      max_output_tokens: 650,
    };

    const result = await callOpenAI(payload);

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: "OpenAI request failed", status: result.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text: result.text.trim() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ------------------------------------------------------------
  // B) PRAYER PAGE MODE (single-shot, structured) — unchanged
  // ------------------------------------------------------------
  const title: string = bodyJson.title ?? "";
  const body: string = bodyJson.body ?? "";
  const combined = [title, body].filter(Boolean).join(" – ").trim();

  const viewerIsOwner: boolean | null =
    typeof bodyJson.viewer_is_owner === "boolean" ? bodyJson.viewer_is_owner : null;

  const shouldUseFirstPerson =
    viewerIsOwner === true ? true : viewerIsOwner === false ? false : looksFirstPerson(combined);

  const prayerVoiceRule = shouldUseFirstPerson
    ? `Use FIRST PERSON SINGULAR ("I / me / my"). This prayer is for the person who posted the request.`
    : `Use an INTERCESSORY prayer for SOMEONE ELSE ("we lift up this person... their family..."). The viewer is praying for the requester, not for themselves.`;

  const prompt = `
You are "Faith Coach", a gentle, Bible-faithful Christian mentor.

A believer has posted this prayer request on a Christian app:

"${combined || "No extra details provided."}"

PRAYER VOICE RULE (must follow):
${prayerVoiceRule}

Return your response in EXACTLY this order and format (with these headings):

SCRIPTURE:
- VerseRef — "short quote"
- VerseRef — "short quote"
- VerseRef — "short quote"

PRAYER TO PRAY:
(4–8 lines. Pastoral. Practical. Ask God for help relevant to the request.
End with "Amen.")

ENCOURAGEMENT:
(3–5 short sentences. Warm, pastoral. No preaching.)

Rules:
- Keep the whole response under ~300 words.
- Choose verses that are directly relevant to the request.
- Use clear, simple language.
`.trim();

  const result = await callOpenAI({
    model: "gpt-4.1-mini",
    input: prompt,
    temperature: 0.4,
    max_output_tokens: 520,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: "OpenAI request failed", status: result.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ text: result.text }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
