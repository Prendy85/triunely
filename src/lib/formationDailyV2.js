// src/lib/formationDailyV2.js
import { supabase } from "./supabase";

const DISCIPLINES = ["scripture", "prayer", "obedience", "service", "renunciation"];

function toUtcMidnightMs(d) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayNumberFromStartDate(startsOnYYYYMMDD) {
  if (!startsOnYYYYMMDD) return 1;
  const [y, m, d] = startsOnYYYYMMDD.split("-").map((n) => parseInt(n, 10));
  const startUtc = Date.UTC(y, (m || 1) - 1, d || 1);
  const todayUtc = toUtcMidnightMs(new Date());
  const diffDays = Math.floor((todayUtc - startUtc) / 86400000);
  return Math.max(1, diffDays + 1);
}

function normalizeVerseRow(v) {
  if (!v) return { ref: "—", translation: "WEB", text: "—", verseId: null };

  const text = v.text ?? v.verse_text ?? v.content ?? v.body ?? v.verse ?? "—";

  const translation = v.translation ?? v.verse_translation ?? v.version ?? "WEB";

  const ref =
    v.reference ??
    v.verse_reference ??
    v.ref ??
    v.passage ??
    (() => {
      const book = v.book || v.book_name;
      const chapter = v.chapter;
      const vs = v.verse_start ?? v.start_verse ?? v.verse;
      const ve = v.verse_end ?? v.end_verse;
      if (book && chapter && vs) return `${book} ${chapter}:${vs}${ve ? `-${ve}` : ""}`;
      return "—";
    })();

  return { ref, translation, text, verseId: v.id ?? v.verse_id ?? null };
}

export async function loadDailyV2Board({ dayNumberOverride } = {}) {
  // 1) Active pack
  const { data: pack, error: packErr } = await supabase
    .from("formation_packs")
    .select("id, name, starts_on, ends_on, is_active")
    .eq("is_active", true)
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (packErr) {
    return { ok: false, error: packErr.message || "Failed to load active pack." };
  }

  if (!pack?.id) {
    return { ok: false, error: "No active formation pack found." };
  }

  const computedDayNumber = dayNumberFromStartDate(pack.starts_on);
  const requestedDayNumber = dayNumberOverride ?? computedDayNumber;

  // 2) Load v2 day row for this pack + day_number (fallback to day 1 if not seeded)
  const fetchDay = async (dn) => {
    return supabase
      .from("formation_v2_daily_days")
      .select("id, pack_id, day_number, verse_id, title")
      .eq("pack_id", pack.id)
      .eq("day_number", dn)
      .maybeSingle();
  };

  let { data: day, error: dayErr } = await fetchDay(requestedDayNumber);

  if (dayErr) {
    return { ok: false, error: dayErr.message || "Failed to load daily day row." };
  }

  // fallback to day 1 if computed/requested day isn't present
  if (!day?.id && requestedDayNumber !== 1) {
    const fallback = await fetchDay(1);
    if (fallback?.data?.id) {
      day = fallback.data;
    }
  }

  const effectiveDayNumber = day?.day_number ?? requestedDayNumber;

  // If not seeded yet (even day 1 missing)
  if (!day?.id) {
    return {
      ok: true,
      pack,
      dayNumber: effectiveDayNumber,
      computedDayNumber,
      day: null,
      verse: normalizeVerseRow(null),
      missions: [],
      completions: [],
      completedByDiscipline: {},
      note: "No missions published for this day yet.",
    };
  }

  // 3) Verse (optional)
  let verse = normalizeVerseRow(null);
  if (day.verse_id) {
    const { data: vRow } = await supabase
      .from("formation_verses")
      .select("*")
      .eq("id", day.verse_id)
      .maybeSingle();

    verse = normalizeVerseRow(vRow);
  }

  // 4) Missions
  const { data: missions, error: mErr } = await supabase
    .from("formation_v2_daily_missions")
    .select(
      "id, day_id, discipline, slot, mission_title, objective_line, why_short, steps, prayer_prompt, scripture_refs, allows_unseen_act, reward_points, is_published"
    )
    .eq("day_id", day.id)
    .eq("is_published", true)
    .order("discipline", { ascending: true })
    .order("slot", { ascending: true });

  if (mErr) {
    return { ok: false, error: mErr.message || "Failed to load missions." };
  }

  // 5) Completions for current user (if logged in)
  const { data: authRes } = await supabase.auth.getUser();
  const userId = authRes?.user?.id;

  let completions = [];
  if (userId) {
    const { data: cRows } = await supabase
      .from("formation_v2_mission_completions")
      .select("id, user_id, day_id, mission_id, discipline, unseen_act, reflection_text, completed_at")
      .eq("user_id", userId)
      .eq("day_id", day.id);

    completions = cRows || [];
  }

  const completedByDiscipline = {};
  for (const d of DISCIPLINES) completedByDiscipline[d] = null;
  for (const c of completions) completedByDiscipline[c.discipline] = c;

  return {
    ok: true,
    pack,
    dayNumber: effectiveDayNumber,
    computedDayNumber,
    day,
    verse,
    missions: missions || [],
    completions,
    completedByDiscipline,
    note: null,
  };
}

export async function completeMissionV2({ dayId, mission, unseenAct = false, reflectionText = "" }) {
  const { data: authRes, error: authErr } = await supabase.auth.getUser();
  if (authErr) return { ok: false, error: authErr.message || "Auth error." };
  const user = authRes?.user;
  if (!user?.id) return { ok: false, error: "You must be logged in." };

  const payload = {
    user_id: user.id,
    day_id: dayId,
    mission_id: mission.id,
    discipline: mission.discipline,
    unseen_act: !!unseenAct,
    reflection_text: reflectionText || null,
  };

  // Allows swapping mission choice within the same discipline/day if you ever want it.
  // Still enforces 1 per discipline/day/user at the DB level.
  const { data, error } = await supabase
    .from("formation_v2_mission_completions")
    .upsert(payload, { onConflict: "user_id,day_id,discipline" })
    .select("*")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message || "Could not mark complete." };
  }

  return { ok: true, completion: data };
}

export async function upsertDailyShareV2({ dayId, visibility = "public", postText = "", payload = {} }) {
  const { data: authRes } = await supabase.auth.getUser();
  const userId = authRes?.user?.id;
  if (!userId) return { ok: false, error: "You must be logged in." };

  const row = {
    user_id: userId,
    day_id: dayId,
    visibility,
    include_scripture: true,
    include_reflection: false,
    post_text: postText || null,
    payload: payload || {},
  };

  // We can't use ON CONFLICT directly via PostgREST in all setups,
  // so do a simple: try insert; if fails, update.
  const ins = await supabase.from("formation_v2_daily_share_posts").insert(row).select("*").maybeSingle();
  if (!ins.error) return { ok: true, share: ins.data };

  const upd = await supabase
    .from("formation_v2_daily_share_posts")
    .update({
      visibility,
      post_text: postText || null,
      payload: payload || {},
    })
    .eq("user_id", userId)
    .eq("day_id", dayId)
    .select("*")
    .maybeSingle();

  if (upd.error) return { ok: false, error: upd.error.message || "Could not save share post." };
  return { ok: true, share: upd.data };
}
