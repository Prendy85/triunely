// src/lib/formationDaily.js
import { EMERGENCY_DAILY_PACK } from "./formationEmergencyPack";
import { supabase } from "./supabase";

const INTENSITY_ORDER = { faithful: 1, standard: 2, stretch: 3 };

function sortIntensity(a, b) {
  return (INTENSITY_ORDER[a.intensity] ?? 99) - (INTENSITY_ORDER[b.intensity] ?? 99);
}

export async function fetchFaithCoachByVerseId(verseId) {
  const { data, error } = await supabase
    .from("formation_verse_coach")
    .select("context_text,theological_meaning,practical_application,related_scripture")
    .eq("verse_id", verseId)
    .single();

  if (error) throw error;
  return data;
}

export async function loadDailyBundle() {
  try {
    // 1) Get or create today's assignment
    const { data: dailyRows, error: dailyError } = await supabase.rpc(
      "get_or_create_daily_assignment"
    );
    if (dailyError) throw dailyError;

    const daily = dailyRows?.[0];
    if (!daily) throw new Error("No daily assignment returned");

    // 2) Fetch all intensity options for the same concept
    const { data: options, error: optError } = await supabase
      .from("formation_challenges")
      .select("id,intensity,min_stage,title,prompt,time_minutes_min,time_minutes_max,allows_unseen_act")
      .eq("concept_id", daily.concept_id)
      .eq("challenge_kind", "daily");

    if (optError) throw optError;

    const sortedOptions = (options ?? []).slice().sort(sortIntensity);

    // 3) Weekly + Monthly (safe if not present)
    const { data: weeklyRows } = await supabase.rpc("get_or_create_weekly_assignment");
    const { data: monthlyRows } = await supabase.rpc("get_or_create_monthly_assignment");

    return {
      mode: "dynamic",
      daily,
      options: sortedOptions,
      weekly: weeklyRows?.[0] ?? null,
      monthly: monthlyRows?.[0] ?? null,
    };
  } catch (err) {
    // Reliability fallback: Daily page never breaks
    const fallback = EMERGENCY_DAILY_PACK.today();

    return {
      mode: "fallback",
      daily: {
        // mirror the shape Daily.js expects
        verse_reference: fallback.verse.reference,
        verse_translation: fallback.verse.translation,
        verse_text: fallback.verse.text,
        discipline: fallback.discipline,
        formation_stage: "seeker",
        concept_id: null,
        challenge_id: null,
      },
      options: fallback.options.map((o) => ({
        id: o.intensity,
        intensity: o.intensity,
        min_stage: "seeker",
        title: o.title,
        prompt: o.prompt,
        time_minutes_min: o.minutes[0],
        time_minutes_max: o.minutes[1],
        allows_unseen_act: fallback.discipline === "service",
      })),
      weekly: null,
      monthly: null,
      error: String(err?.message ?? err),
    };
  }
}
