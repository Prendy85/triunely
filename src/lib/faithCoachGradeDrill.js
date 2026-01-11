// src/lib/faithCoachGradeDrill.js
import { supabase } from "./supabase";

/**
 * Calls Supabase Edge Function: faith-coach-grade-drill
 * Returns:
 *  - { ok: true, grade, raw }
 *  - { ok: false, error, status, details, raw }
 *
 * This version keeps the HTTP status + raw error details so we can debug non-2xx.
 */
export async function gradeDrillWithFaithCoach({ drill, userAnswer }) {
  const payload = { drill, userAnswer };

  console.log("=== gradeDrillWithFaithCoach: START ===");
  console.log("Function:", "faith-coach-grade-drill");
  console.log("Payload:", JSON.stringify(payload, null, 2));

  const startedAt = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke("faith-coach-grade-drill", {
      body: payload,
    });

    console.log("Invoke duration (ms):", Date.now() - startedAt);

    if (error) {
      // Supabase error shapes vary; extract what we can reliably
      const status =
        error.status ??
        error.statusCode ??
        error.context?.status ??
        error.context?.response?.status ??
        "unknown";

      const message =
        error.message ??
        error.context?.message ??
        error.context?.response?.statusText ??
        "Edge function returned non-2xx";

      console.log("=== gradeDrillWithFaithCoach: INVOKE ERROR ===");
      console.log("Derived status:", status);
      console.log("Derived message:", message);
      console.log("Raw error object:", error);

      return {
        ok: false,
        error: message,
        status,
        details: error,
        raw: data ?? null,
      };
    }

    // If the function itself returns { ok:false, error:... } we keep that too
    if (!data?.ok) {
      console.log("=== gradeDrillWithFaithCoach: FUNCTION OK-FALSE ===");
      console.log("Returned data:", data);

      return {
        ok: false,
        error: data?.error || "Grading failed.",
        status: 200,
        details: data,
        raw: data,
      };
    }

    console.log("=== gradeDrillWithFaithCoach: OK ===");
    console.log("Returned data:", data);

    return { ok: true, grade: data.grade, raw: data };
  } catch (e) {
    console.log("=== gradeDrillWithFaithCoach: THREW ===");
    console.log("Exception:", e);

    return {
      ok: false,
      error: String(e?.message || e),
      status: "thrown",
      details: e,
      raw: null,
    };
  }
}
