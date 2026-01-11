// src/lib/apologeticsV2.js
import { supabase } from "./supabase";

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computeDayNumberFromStartsOn(startsOnIso, overrideDayNumber) {
  if (Number.isFinite(Number(overrideDayNumber))) {
    const n = Math.max(1, Number(overrideDayNumber));
    return { computedDayNumber: n, dayNumber: n, usedOverride: true };
  }

  if (!startsOnIso) return { computedDayNumber: 1, dayNumber: 1, usedOverride: false };

  const start = startOfLocalDay(new Date(startsOnIso));
  const today = startOfLocalDay(new Date());

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const dayNumber = Math.max(1, diffDays + 1);
  return { computedDayNumber: dayNumber, dayNumber, usedOverride: false };
}

// Day number (1..n) -> week_number (1..n), day_of_week (1..7)
function dayToWeekAndDow(dayNumber) {
  const dn = Math.max(1, Number(dayNumber || 1));
  const weekNumber = Math.floor((dn - 1) / 7) + 1; // 1..n
  const dayOfWeek = ((dn - 1) % 7) + 1; // 1..7
  return { weekNumber, dayOfWeek };
}

function asInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadApologeticsV2Board({ dayNumberOverride, drillsLimit = 5 } = {}) {
  // 1) active pack
  const { data: pack, error: packErr } = await supabase
    .from("formation_packs")
    .select("id,name,starts_on,updated_at,created_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (packErr) return { ok: false, error: packErr.message };
  if (!pack?.id) return { ok: true, note: "No ACTIVE formation pack found." };

  const { computedDayNumber, dayNumber } = computeDayNumberFromStartsOn(
    pack.starts_on,
    dayNumberOverride
  );

  const { weekNumber, dayOfWeek } = dayToWeekAndDow(dayNumber);

  // 2) drills for today (ordered by slot)
  const { data: drills, error: drillsErr } = await supabase
    .from("formation_v2_apologetics_drills")
    .select("*")
    .eq("pack_id", pack.id)
    .eq("week_number", weekNumber)
    .eq("day_number", dayOfWeek)
    .eq("is_active", true)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(Math.max(1, asInt(drillsLimit, 5)));

  if (drillsErr) return { ok: false, error: drillsErr.message };

  const drill = Array.isArray(drills) && drills.length ? drills[0] : null;

  // 3) boss battle for this week
  const { data: boss, error: bossErr } = await supabase
    .from("formation_v2_apologetics_boss_battles")
    .select("*")
    .eq("pack_id", pack.id)
    .eq("week_number", weekNumber)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (bossErr) return { ok: false, error: bossErr.message };

  // 4) user progress (if logged in)
  const userRes = await supabase.auth.getUser();
  const userId = userRes?.data?.user?.id || null;

  let attemptsByDrillId = {};
  let attempt = null;
  let bossAttempt = null;

  if (userId && Array.isArray(drills) && drills.length) {
    const drillIds = drills.map((d) => d.id).filter(Boolean);

    const { data: attempts, error: aErr } = await supabase
      .from("formation_v2_apologetics_attempts")
      .select("*")
      .eq("user_id", userId)
      .in("drill_id", drillIds);

    if (!aErr && Array.isArray(attempts)) {
      attemptsByDrillId = attempts.reduce((acc, row) => {
        acc[row.drill_id] = row;
        return acc;
      }, {});
    }

    if (drill?.id) attempt = attemptsByDrillId[drill.id] || null;
  }

  if (userId && boss?.id) {
    const { data: b, error: bErr } = await supabase
      .from("formation_v2_apologetics_boss_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("boss_id", boss.id)
      .limit(1)
      .maybeSingle();

    if (!bErr) bossAttempt = b;
  }

  return {
    ok: true,
    pack,
    computedDayNumber,
    dayNumber,
    weekNumber,
    dayOfWeek,

    drills: drills || [],
    attemptsByDrillId,

    drill: drill || null,
    attempt: attempt || null,

    boss: boss || null,
    bossAttempt: bossAttempt || null,
    note:
      (!drills || drills.length === 0) && !boss
        ? "No apologetics content seeded for this week/day yet."
        : null,
  };
}

/**
 * NEW: Server-side grading via Supabase Edge Function.
 * Requires you to deploy: faith-coach-grade-drill
 */
export async function gradeApologeticsDrillV2({
  drill,
  userAnswer,
  mode = "arena_v2",
} = {}) {
  if (!drill?.id) return { ok: false, error: "Missing drill." };
  if (!userAnswer || !String(userAnswer).trim()) return { ok: false, error: "Missing user answer." };

  // We send the drill payload + the user's rebuttal.
  // The Edge Function should return something like:
  // { score: 0-100, verdict: "pass|revise", feedback: "...", improved_answer: "...", recommended_verses: [...], recommended_points: [...] }
  const payload = {
    mode,
    drill: {
      id: drill.id,
      title: drill.title,
      prompt: drill.prompt,
      opponent_type: drill.opponent_type,
      key_points: drill.key_points || [],
      scripture_refs: drill.scripture_refs || [],
    },
    user_answer: userAnswer,
  };

  try {
    const { data, error } = await supabase.functions.invoke("faith-coach-grade-drill1", {

      body: payload,
    });

    if (error) return { ok: false, error: error.message || "Function error." };
    return { ok: true, result: data };
  } catch (e) {
    return { ok: false, error: e?.message || "Failed to invoke grading function." };
  }
}

export async function upsertApologeticsAttemptV2({
  drillId,
  userAnswer,
  usedFaithCoach,
  completed,
  score,
  xpEarned,
  lightPointsEarned,
  coachFeedback,
}) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes?.data?.user?.id || null;
  if (!userId) return { ok: false, error: "Not logged in." };
  if (!drillId) return { ok: false, error: "Missing drillId." };

  const payload = {
    user_id: userId,
    drill_id: drillId,
    user_answer: userAnswer ?? null,
    used_faith_coach: !!usedFaithCoach,
    coach_feedback: coachFeedback ?? {},
    score: Number.isFinite(Number(score)) ? Number(score) : 0,
    completed: !!completed,
    xp_earned: Number.isFinite(Number(xpEarned)) ? Number(xpEarned) : 0,
    light_points_earned: Number.isFinite(Number(lightPointsEarned))
      ? Number(lightPointsEarned)
      : 0,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("formation_v2_apologetics_attempts")
    .upsert(payload, { onConflict: "user_id,drill_id" });

  if (!upErr) return { ok: true };

  const { error: insErr } = await supabase
    .from("formation_v2_apologetics_attempts")
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
    });

  if (!insErr) return { ok: true };

  const { error: updErr } = await supabase
    .from("formation_v2_apologetics_attempts")
    .update(payload)
    .eq("user_id", userId)
    .eq("drill_id", drillId);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}

export async function startBossAttemptV2({ bossId, state }) {
  const userRes = await supabase.auth.getUser();
  const userId = userRes?.data?.user?.id || null;
  if (!userId) return { ok: false, error: "Not logged in." };
  if (!bossId) return { ok: false, error: "Missing bossId." };

  const payload = {
    user_id: userId,
    boss_id: bossId,
    state: state ?? {},
    completed: false,
    xp_earned: 0,
    light_points_earned: 0,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("formation_v2_apologetics_boss_attempts")
    .upsert(payload, { onConflict: "user_id,boss_id" });

  if (!upErr) return { ok: true };

  const { error: insErr } = await supabase
    .from("formation_v2_apologetics_boss_attempts")
    .insert({ ...payload, created_at: new Date().toISOString() });

  if (!insErr) return { ok: true };

  const { error: updErr } = await supabase
    .from("formation_v2_apologetics_boss_attempts")
    .update(payload)
    .eq("user_id", userId)
    .eq("boss_id", bossId);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
