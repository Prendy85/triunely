// supabase/functions/faith-coach/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY"
);

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
};

type OpenAISuccess = {
  ok: true;
  text: string;
  providerRequestId: string | null;
  model: string | null;
  usage: OpenAIUsage;
};

type OpenAIFailure = {
  ok: false;
  status: number;
  raw: string;
};

type OpenAIResult = OpenAISuccess | OpenAIFailure;

type ReservationResult = {
  allowed: boolean;
  usageEventId: string | null;
  requestKey: string;
  denialCode: string | null;
  raw: Record<string, unknown>;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function looksFirstPerson(text: string) {
  const value = String(text || "").toLowerCase();
  return /\b(i|me|my|i'm|i am|mine)\b/.test(value);
}

function firstNameOnly(input: string) {
  const value = String(input || "").trim();

  if (!value) {
    return "";
  }

  return value.split(/\s+/)[0] || "";
}

function stripLeadingGreeting(text: string) {
  const value = String(text || "").trim();

  return value.replace(
    /^(hello|hi|hey)\s+[A-Za-z'-]+\s*,\s*/i,
    ""
  );
}

function clamp(value: string, maximumLength: number) {
  const text = String(value || "").trim();

  if (text.length <= maximumLength) {
    return text;
  }

  return text.slice(0, maximumLength).trim();
}

function extractJsonObject(text: string) {
  const value = String(text || "").trim();
  const match = value.match(/\{[\s\S]*\}/);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeStringArray(
  value: unknown,
  maximum = 6
): string[] {
  const output: string[] = [];

  const add = (entry: unknown) => {
    const normalized = String(entry || "").trim();

    if (!normalized || output.includes(normalized)) {
      return;
    }

    output.push(normalized);
  };

  if (Array.isArray(value)) {
    value.forEach(add);
  } else if (typeof value === "string") {
    value
      .split(/[\n,]+/g)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach(add);
  }

  return output.slice(0, maximum);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function createRequestKey(value: unknown) {
  if (isUuid(value)) {
    return value;
  }

  return crypto.randomUUID();
}

function normaliseChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message) => {
      return (
        message &&
        typeof message === "object" &&
        ["system", "user", "assistant"].includes(
          String(message.role)
        ) &&
        typeof message.content === "string"
      );
    })
    .map((message) => ({
      role: message.role as ChatMessage["role"],
      content: clamp(message.content, 12000),
    }));
}

function extractOutputText(json: any): string {
  if (typeof json?.output_text === "string") {
    return json.output_text;
  }

  if (!Array.isArray(json?.output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const outputItem of json.output) {
    if (!Array.isArray(outputItem?.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (typeof contentItem?.text === "string") {
        textParts.push(contentItem.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

async function callOpenAI(payload: Record<string, unknown>): Promise<OpenAIResult> {
  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const raw = await response.text();

    console.error(
      "Faith Coach OpenAI error",
      response.status,
      raw
    );

    return {
      ok: false,
      status: response.status,
      raw,
    };
  }

  const json = await response.json();

  const text =
    extractOutputText(json) ||
    "Faith Coach could not generate a response this time.";

  const inputTokens = Number(json?.usage?.input_tokens);
  const outputTokens = Number(json?.usage?.output_tokens);
  const totalTokens = Number(json?.usage?.total_tokens);

  return {
    ok: true,
    text,
    providerRequestId:
      typeof json?.id === "string" ? json.id : null,
    model:
      typeof json?.model === "string"
        ? json.model
        : typeof payload.model === "string"
          ? payload.model
          : null,
    usage: {
      input_tokens: Number.isFinite(inputTokens)
        ? inputTokens
        : null,
      output_tokens: Number.isFinite(outputTokens)
        ? outputTokens
        : null,
      total_tokens: Number.isFinite(totalTokens)
        ? totalTokens
        : null,
    },
  };
}

function denialHttpStatus(denialCode: string | null) {
  switch (denialCode) {
    case "authentication_required":
      return 401;

    case "account_access_denied":
    case "account_type_mismatch":
    case "entitlement_required":
    case "capability_not_in_plan":
    case "account_type_not_launched":
      return 403;

    case "allowance_exhausted":
      return 429;

    case "capability_unavailable":
      return 404;

    default:
      return 403;
  }
}

function denialMessage(denialCode: string | null) {
  switch (denialCode) {
    case "allowance_exhausted":
      return "You have used your current free Faith Coach allowance.";

    case "entitlement_required":
    case "capability_not_in_plan":
      return "This Faith Coach feature requires an eligible verified plan.";

    case "account_access_denied":
      return "You do not have permission to use Faith Coach for this account.";

    case "account_type_mismatch":
      return "This Faith Coach feature is not available for this account type.";

    case "capability_unavailable":
      return "This Faith Coach feature is currently unavailable.";

    default:
      return "Faith Coach access could not be authorised.";
  }
}

async function reserveAuthorisedRequest(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    requestKey: string;
    actorUserId: string;
    accountType: "user" | "church";
    accountId: string;
    capabilityKey: string;
    sourceSurface: string;
    sourceRecordType?: string | null;
    sourceRecordId?: string | null;
    requestMetadata?: Record<string, unknown>;
  }
): Promise<ReservationResult> {
  const { data, error } = await serviceClient.rpc(
    "reserve_authorised_faith_coach_request",
    {
      p_request_key: params.requestKey,
      p_actor_user_id: params.actorUserId,
      p_account_type: params.accountType,
      p_account_id: params.accountId,
      p_capability_key: params.capabilityKey,
      p_source_surface: params.sourceSurface,
      p_source_record_type:
        params.sourceRecordType || null,
      p_source_record_id:
        params.sourceRecordId || null,
      p_request_metadata:
        params.requestMetadata || {},
    }
  );

  if (error) {
    console.error(
      "Faith Coach reservation RPC failed",
      error
    );

    throw new Error("faith_coach_reservation_failed");
  }

  const result =
    data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};

  return {
    allowed: result.allowed === true,
    usageEventId:
      typeof result.usage_event_id === "string"
        ? result.usage_event_id
        : null,
    requestKey:
      typeof result.request_key === "string"
        ? result.request_key
        : params.requestKey,
    denialCode:
      typeof result.denial_code === "string"
        ? result.denial_code
        : null,
    raw: result,
  };
}

async function reserveInternalSummary(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    requestKey: string;
    userId: string;
    chatId: string;
  }
): Promise<ReservationResult> {
  const { data, error } = await serviceClient.rpc(
    "reserve_internal_faith_coach_summary",
    {
      p_request_key: params.requestKey,
      p_user_id: params.userId,
      p_chat_id: params.chatId,
      p_request_metadata: {
        source: "faith_coach_edge_function",
      },
    }
  );

  if (error) {
    console.error(
      "Faith Coach summary reservation failed",
      error
    );

    throw new Error(
      "faith_coach_summary_reservation_failed"
    );
  }

  const result =
    data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};

  return {
    allowed: result.allowed === true,
    usageEventId:
      typeof result.usage_event_id === "string"
        ? result.usage_event_id
        : null,
    requestKey:
      typeof result.request_key === "string"
        ? result.request_key
        : params.requestKey,
    denialCode:
      typeof result.denial_code === "string"
        ? result.denial_code
        : null,
    raw: result,
  };
}

async function startUsageEvent(
  serviceClient: ReturnType<typeof createClient>,
  usageEventId: string,
  model: string
) {
  const { data, error } = await serviceClient.rpc(
    "start_faith_coach_request",
    {
      p_usage_event_id: usageEventId,
      p_provider: "openai",
      p_model: model,
      p_request_metadata_patch: {
        provider_started_by:
          "faith_coach_edge_function",
      },
    }
  );

  if (error) {
    console.error(
      "Faith Coach start usage RPC failed",
      error
    );

    throw new Error("faith_coach_start_failed");
  }

  if (
    data &&
    typeof data === "object" &&
    data.ok === false
  ) {
    console.error(
      "Faith Coach start usage rejected",
      data
    );

    throw new Error("faith_coach_start_rejected");
  }
}

async function finishUsageEvent(
  serviceClient: ReturnType<typeof createClient>,
  params: {
    usageEventId: string;
    outcome: "succeeded" | "failed" | "cancelled";
    openAIResult?: OpenAISuccess | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    responseMetadata?: Record<string, unknown>;
  }
) {
  const result = params.openAIResult || null;

  const { error } = await serviceClient.rpc(
    "finish_faith_coach_request",
    {
      p_usage_event_id: params.usageEventId,
      p_outcome: params.outcome,
      p_provider_request_id:
        result?.providerRequestId || null,
      p_provider: "openai",
      p_model: result?.model || null,
      p_input_tokens:
        result?.usage.input_tokens ?? null,
      p_output_tokens:
        result?.usage.output_tokens ?? null,
      p_total_tokens:
        result?.usage.total_tokens ?? null,
      p_estimated_cost_minor_units: null,
      p_cost_currency: "GBP",
      p_error_code: params.errorCode || null,
      p_error_message: params.errorMessage || null,
      p_response_metadata:
        params.responseMetadata || {},
    }
  );

  if (error) {
    console.error(
      "Faith Coach finish usage RPC failed",
      error
    );
  }
}

async function executeMeteredOpenAI(
  serviceClient: ReturnType<typeof createClient>,
  reservation: ReservationResult,
  payload: Record<string, unknown>
): Promise<OpenAIResult> {
  if (!reservation.usageEventId) {
    throw new Error("faith_coach_usage_event_missing");
  }

  const model =
    typeof payload.model === "string"
      ? payload.model
      : "gpt-4.1-mini";

  await startUsageEvent(
    serviceClient,
    reservation.usageEventId,
    model
  );

  let result: OpenAIResult;

  try {
    result = await callOpenAI(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "OpenAI request threw an exception.";

    await finishUsageEvent(serviceClient, {
      usageEventId: reservation.usageEventId,
      outcome: "failed",
      errorCode: "openai_exception",
      errorMessage: message,
    });

    throw error;
  }

  if (!result.ok) {
    await finishUsageEvent(serviceClient, {
      usageEventId: reservation.usageEventId,
      outcome: "failed",
      errorCode: `openai_http_${result.status}`,
      errorMessage: clamp(result.raw, 1500),
      responseMetadata: {
        provider_http_status: result.status,
      },
    });

    return result;
  }

  await finishUsageEvent(serviceClient, {
    usageEventId: reservation.usageEventId,
    outcome: "succeeded",
    openAIResult: result,
  });

  return result;
}

function reservationDeniedResponse(
  reservation: ReservationResult
) {
  return jsonResponse(
    {
      error: "faith_coach_access_denied",
      message: denialMessage(
        reservation.denialCode
      ),
      denial_code: reservation.denialCode,
      request_key: reservation.requestKey,
      commercial_access:
        reservation.raw.commercial_access || null,
      allowance_count:
        reservation.raw.allowance_count ?? null,
      used_count:
        reservation.raw.used_count ?? null,
      remaining_count:
        reservation.raw.remaining_count ?? null,
      window_ends_at:
        reservation.raw.window_ends_at ?? null,
    },
    denialHttpStatus(reservation.denialCode)
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "method_not_allowed" },
      405
    );
  }

  if (
    !OPENAI_API_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error(
      "Faith Coach Edge Function environment is incomplete"
    );

    return jsonResponse(
      { error: "server_configuration_error" },
      500
    );
  }

  const authorizationHeader =
    req.headers.get("Authorization") || "";

  const token = authorizationHeader.replace(
    /^Bearer\s+/i,
    ""
  ).trim();

  if (!token) {
    return jsonResponse(
      {
        error: "authentication_required",
        message:
          "You must be signed in to use Faith Coach.",
      },
      401
    );
  }

  const authClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const serviceClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    console.error(
      "Faith Coach authentication failed",
      authError
    );

    return jsonResponse(
      {
        error: "invalid_authentication",
        message:
          "Your session could not be verified. Please sign in again.",
      },
      401
    );
  }

  let bodyJson: any;

  try {
    bodyJson = await req.json();
  } catch {
    return jsonResponse(
      { error: "invalid_json_body" },
      400
    );
  }

  const action =
    typeof bodyJson?.action === "string"
      ? bodyJson.action.trim()
      : "";

  const requestKey = createRequestKey(
    bodyJson?.request_key
  );

  try {
    // ========================================================
    // WEEKLY CHALLENGE GENERATOR
    // ========================================================

    if (action === "generate_weekly_challenge") {
      if (!isUuid(bodyJson?.church_id)) {
        return jsonResponse(
          {
            error: "church_id_required",
            message:
              "A valid church ID is required to generate a weekly challenge.",
          },
          400
        );
      }

      const churchId = bodyJson.church_id;
      const churchName = clamp(
        String(bodyJson?.church_name ?? "Church"),
        80
      );

      const weekStart = clamp(
        String(bodyJson?.week_start ?? ""),
        32
      );

      const topic = clamp(
        String(bodyJson?.topic ?? ""),
        120
      );

      const reservation =
        await reserveAuthorisedRequest(
          serviceClient,
          {
            requestKey,
            actorUserId: user.id,
            accountType: "church",
            accountId: churchId,
            capabilityKey:
              "church_weekly_challenge_generation",
            sourceSurface:
              "weekly_challenge_editor",
            sourceRecordType: "church",
            sourceRecordId: churchId,
            requestMetadata: {
              week_start: weekStart || null,
              topic: topic || null,
            },
          }
        );

      if (!reservation.allowed) {
        return reservationDeniedResponse(
          reservation
        );
      }

      const prompt = `
You are Triunely’s Faith Coach helping a church create a weekly discipleship challenge for members.

Return ONLY valid JSON with exactly:

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
- Make it practical and encouraging, Bible-faithful and not political.
- title: maximum 60 characters.
- description: 2–4 sentences.
- why_it_matters: 2–4 sentences.
- scripture_refs: 2–5 Bible references.
- action_label: a short button label.
- action_url: normally null.
- lp_bonus: integer from 0–50.
- Church: ${churchName}
- Week start: ${weekStart || "(unknown)"}
- Topic or discipline: ${topic || "(none provided)"}
`.trim();

      const result = await executeMeteredOpenAI(
        serviceClient,
        reservation,
        {
          model: "gpt-4.1-mini",
          input: prompt,
          temperature: 0.5,
          max_output_tokens: 450,
        }
      );

      if (!result.ok) {
        return jsonResponse(
          {
            error: "openai_request_failed",
            status: result.status,
            request_key: requestKey,
          },
          502
        );
      }

      const parsed =
        extractJsonObject(result.text) || {};

      const title = clamp(
        parsed?.title || "Weekly challenge",
        60
      );

      const description =
        clamp(parsed?.description || "", 600) ||
        null;

      const whyItMatters =
        clamp(
          parsed?.why_it_matters || "",
          700
        ) || null;

      const scriptureRefs =
        normalizeStringArray(
          parsed?.scripture_refs,
          6
        );

      const actionLabel = clamp(
        parsed?.action_label ||
          "Read the verses",
        40
      );

      const actionUrlRaw = String(
        parsed?.action_url ?? ""
      ).trim();

      const actionUrl =
        actionUrlRaw.startsWith("https://") ||
        actionUrlRaw.startsWith("http://")
          ? actionUrlRaw
          : null;

      let lpBonus = Number(parsed?.lp_bonus);

      if (
        !Number.isFinite(lpBonus) ||
        lpBonus < 0
      ) {
        lpBonus = 0;
      }

      lpBonus = Math.floor(
        Math.min(lpBonus, 50)
      );

      return jsonResponse({
        title,
        description,
        why_it_matters: whyItMatters,
        scripture_refs: scriptureRefs,
        action_label: actionLabel,
        action_url: actionUrl,
        lp_bonus: lpBonus,
        request_key: reservation.requestKey,
      });
    }

    // ========================================================
    // CHAT AND SUMMARY MODES
    // ========================================================

    if (Array.isArray(bodyJson?.messages)) {
      const messages =
        normaliseChatMessages(
          bodyJson.messages
        );

      const cleanedMessages =
        messages.map((message) => {
          if (message.role === "assistant") {
            return {
              ...message,
              content:
                stripLeadingGreeting(
                  message.content
                ),
            };
          }

          return message;
        });

      const firstName = firstNameOnly(
        typeof bodyJson.user_first_name ===
          "string"
          ? bodyJson.user_first_name
          : ""
      );

      // ------------------------------------------------------
      // INTERNAL CHAT SUMMARY
      // ------------------------------------------------------

      if (action === "summarize") {
        const chatId = isUuid(
          bodyJson?.chat_id
        )
          ? bodyJson.chat_id
          : requestKey;

        const reservation =
          await reserveInternalSummary(
            serviceClient,
            {
              requestKey,
              userId: user.id,
              chatId,
            }
          );

        if (!reservation.allowed) {
          return reservationDeniedResponse(
            reservation
          );
        }

        const tail =
          cleanedMessages.slice(-30);

        const transcript = tail
          .filter(
            (message) =>
              message.role === "user" ||
              message.role === "assistant"
          )
          .map(
            (message) =>
              `${message.role.toUpperCase()}: ${message.content}`
          )
          .join("\n\n");

        const prompt = `
You are generating metadata for a saved pastoral chat thread in a Christian app.

Return ONLY valid JSON with exactly:

{
  "title": "...",
  "summary": "..."
}

Rules:
- title: 3–7 words, plain text and no trailing punctuation.
- summary: 1–2 short sentences in plain English.
- Use a warm pastoral tone.
- Do not include long quotations.
- Do not mention being an AI.

CHAT TRANSCRIPT:
${transcript || "(empty)"}
`.trim();

        const result =
          await executeMeteredOpenAI(
            serviceClient,
            reservation,
            {
              model: "gpt-4.1-mini",
              input: prompt,
              temperature: 0.2,
              max_output_tokens: 220,
            }
          );

        if (!result.ok) {
          return jsonResponse(
            {
              error:
                "openai_request_failed",
              status: result.status,
              request_key: requestKey,
            },
            502
          );
        }

        const parsed =
          extractJsonObject(result.text);

        return jsonResponse({
          title: clamp(
            parsed?.title ||
              "Faith Coach Chat",
            60
          ),
          summary: clamp(
            parsed?.summary ||
              "Saved Faith Coach conversation.",
            240
          ),
          request_key:
            reservation.requestKey,
        });
      }

      // Greeting is deterministic and does not use allowance.

      if (messages.length === 0) {
        const name = firstName || "there";

        return jsonResponse({
          text: `Hello ${name}, how can I help you today?`,
          metered: false,
        });
      }

      // ------------------------------------------------------
      // NORMAL FAITH COACH CHAT REPLY
      // ------------------------------------------------------

      const chatId = isUuid(
        bodyJson?.chat_id
      )
        ? bodyJson.chat_id
        : null;

      const reservation =
        await reserveAuthorisedRequest(
          serviceClient,
          {
            requestKey,
            actorUserId: user.id,
            accountType: "user",
            accountId: user.id,
            capabilityKey:
              "faith_coach_chat_reply",
            sourceSurface: "coach",
            sourceRecordType: chatId
              ? "faith_coach_chat"
              : null,
            sourceRecordId: chatId,
          }
        );

      if (!reservation.allowed) {
        return reservationDeniedResponse(
          reservation
        );
      }

      const system: ChatMessage = {
        role: "system",
        content: `
You are Triunely’s Faith Coach: a Bible-faithful, warm Christian pastor or elder speaking conversationally.

Primary behaviour:
- Speak like a trusted church leader: calm, compassionate, direct and wise.
- Offer Scripture naturally.
- Give practical next steps involving prayer, repentance, forgiveness, boundaries, Christian community or appropriate pastoral support.
- Be encouraging, hope-filled and centred on Christ.

Scripture:
- Include 1–2 directly relevant Scripture references.
- Include a short excerpt or brief paraphrase for each.
- Do not paste long passages.

Structure:
- Acknowledge what the user is experiencing.
- Apply the Scripture to their situation.
- Give practical encouragement.
- End with no more than one gentle question where useful.

Formatting:
- Do not use labelled headings.
- Use short paragraphs.
- Do not repeatedly introduce yourself.
- Do not claim to be human.
- Do not start with Hello, Hi or Hey.
- Do not address the user by name.
`.trim(),
      };

      const inputMessages = [
        system,
        ...cleanedMessages.slice(-20),
      ];

      const result =
        await executeMeteredOpenAI(
          serviceClient,
          reservation,
          {
            model: "gpt-4.1-mini",
            input: inputMessages
              .map(
                (message) =>
                  `${message.role.toUpperCase()}: ${message.content}`
              )
              .join("\n\n"),
            temperature: 0.6,
            max_output_tokens: 650,
          }
        );

      if (!result.ok) {
        return jsonResponse(
          {
            error: "openai_request_failed",
            status: result.status,
            request_key: requestKey,
          },
          502
        );
      }

      return jsonResponse({
        text: result.text.trim(),
        request_key:
          reservation.requestKey,
        usage: {
          remaining_count:
            reservation.raw
              .remaining_count ?? null,
          window_ends_at:
            reservation.raw
              .window_ends_at ?? null,
        },
      });
    }

    // ========================================================
    // PRAYER REQUEST GUIDANCE
    // ========================================================

    const title = clamp(
      String(bodyJson?.title ?? ""),
      300
    );

    const body = clamp(
      String(bodyJson?.body ?? ""),
      5000
    );

    if (!title && !body) {
      return jsonResponse(
        {
          error: "prayer_content_required",
        },
        400
      );
    }

    const prayerRequestId = isUuid(
      bodyJson?.prayer_request_id
    )
      ? bodyJson.prayer_request_id
      : null;

    const sourceSurface =
      bodyJson?.source_surface ===
      "prayer_group"
        ? "prayer_group"
        : "prayer";

    const reservation =
      await reserveAuthorisedRequest(
        serviceClient,
        {
          requestKey,
          actorUserId: user.id,
          accountType: "user",
          accountId: user.id,
          capabilityKey:
            "prayer_request_guidance",
          sourceSurface,
          sourceRecordType:
            prayerRequestId
              ? "prayer_request"
              : null,
          sourceRecordId:
            prayerRequestId,
        }
      );

    if (!reservation.allowed) {
      return reservationDeniedResponse(
        reservation
      );
    }

    const combined = [title, body]
      .filter(Boolean)
      .join(" – ")
      .trim();

    const viewerIsOwner =
      typeof bodyJson.viewer_is_owner ===
      "boolean"
        ? bodyJson.viewer_is_owner
        : null;

    const shouldUseFirstPerson =
      viewerIsOwner === true
        ? true
        : viewerIsOwner === false
          ? false
          : looksFirstPerson(combined);

    const prayerVoiceRule =
      shouldUseFirstPerson
        ? `Use FIRST PERSON SINGULAR ("I", "me" and "my").`
        : `Use an INTERCESSORY prayer for someone else.`;

    const prompt = `
You are Faith Coach, a gentle and Bible-faithful Christian mentor.

A believer has posted this prayer request:

"${combined}"

PRAYER VOICE:
${prayerVoiceRule}

Return the response in exactly this order:

SCRIPTURE:
- VerseRef — "short quote"
- VerseRef — "short quote"
- VerseRef — "short quote"

PRAYER TO PRAY:
Write 4–8 pastoral and practical lines.
End with "Amen."

ENCOURAGEMENT:
Write 3–5 short, warm and pastoral sentences.

Rules:
- Keep the response under approximately 300 words.
- Choose Scripture directly relevant to the request.
- Use clear, simple language.
`.trim();

    const result =
      await executeMeteredOpenAI(
        serviceClient,
        reservation,
        {
          model: "gpt-4.1-mini",
          input: prompt,
          temperature: 0.4,
          max_output_tokens: 520,
        }
      );

    if (!result.ok) {
      return jsonResponse(
        {
          error: "openai_request_failed",
          status: result.status,
          request_key: requestKey,
        },
        502
      );
    }

    return jsonResponse({
      text: result.text.trim(),
      request_key:
        reservation.requestKey,
      usage: {
        remaining_count:
          reservation.raw.remaining_count ??
          null,
        window_ends_at:
          reservation.raw.window_ends_at ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "Faith Coach unexpected failure",
      error
    );

    return jsonResponse(
      {
        error: "faith_coach_internal_error",
        message:
          "Faith Coach could not complete this request.",
        request_key: requestKey,
      },
      500
    );
  }
});