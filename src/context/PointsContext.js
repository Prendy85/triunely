// src/context/PointsContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const PointsContext = createContext(null);
const STORAGE_KEY = "tri_points_v1";

// Award rules
const DAILY_POINTS = 5;
const COACH_DAILY_POINTS = 1;
const PRAYER_POINTS = 1;
const PRAYER_DAILY_CAP = 5;

// helpers
function iso(d = new Date()) { return d.toISOString().slice(0, 10); }
function yesterdayIso() { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d); }

export function PointsProvider({ children }) {
  const [state, setState] = useState({
    total: 0,
    streak: 0,
    lastDailyDate: null,
    todayCoachAwarded: false,
    todayPrayerCount: 0,
    today: iso()
  });
  const [loaded, setLoaded] = useState(false);

  // Load persisted local state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(prev => ({ ...prev, ...JSON.parse(raw) }));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Reset day-scoped flags if date rolled
  useEffect(() => {
    if (!loaded) return;
    const todayStr = iso();
    if (state.today !== todayStr) {
      setState(prev => ({
        ...prev,
        today: todayStr,
        todayCoachAwarded: false,
        todayPrayerCount: 0
      }));
    }
  }, [loaded, state.today]);

  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [loaded, state]);

  const todayCompleted = state.lastDailyDate === state.today;

  // --- Supabase insert (fire-and-forget) ---
  async function insertLedgerRow(source, delta, meta = {}) {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id;
      if (!uid) return; // not signed in → skip remote write
      await supabase.from("light_points_ledger").insert({
        user_id: uid,
        source,                 // 'daily' | 'coach' | 'prayer'
        delta,                  // positive int
        active: false,          // subscribers later → true
        meta: { ...meta, local: true }
      });
    } catch (e) {
      // Keep silent; UI already updated locally
      // console.log("ledger insert failed", e);
    }
  }

  // --- Award functions ---
  function completeDaily() {
    if (todayCompleted) return { granted: false, reason: "already-completed" };

    const continued = state.lastDailyDate === yesterdayIso();
    const newStreak = continued ? state.streak + 1 : 1;
    const newTotal = state.total + DAILY_POINTS;

    setState(prev => ({ ...prev, total: newTotal, streak: newStreak, lastDailyDate: state.today }));
    // remote write (no await)
    insertLedgerRow("daily", DAILY_POINTS);

    return { granted: true, newTotal, newStreak };
  }

  function awardCoachPointOnce() {
    if (state.todayCoachAwarded) return { granted: false, reason: "coach-already-awarded" };

    const newTotal = state.total + COACH_DAILY_POINTS;
    setState(prev => ({ ...prev, total: newTotal, todayCoachAwarded: true }));
    insertLedgerRow("coach", COACH_DAILY_POINTS);

    return { granted: true, newTotal };
  }

  function awardPrayerPoint() {
    if (state.todayPrayerCount >= PRAYER_DAILY_CAP) {
      return { granted: false, reason: "prayer-cap-reached", remaining: 0 };
    }
    const newCount = state.todayPrayerCount + 1;
    const newTotal = state.total + PRAYER_POINTS;

    setState(prev => ({ ...prev, total: newTotal, todayPrayerCount: newCount }));
    insertLedgerRow("prayer", PRAYER_POINTS);

    return { granted: true, newTotal, remaining: PRAYER_DAILY_CAP - newCount };
  }

  const value = useMemo(() => ({
    loaded,
    total: state.total,
    streak: state.streak,
    todayCompleted,
    todayCoachAwarded: state.todayCoachAwarded,
    todayPrayerCount: state.todayPrayerCount,
    completeDaily,
    awardCoachPointOnce,
    awardPrayerPoint
  }), [loaded, state, todayCompleted]);

  return <PointsContext.Provider value={value}>{children}</PointsContext.Provider>;
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error("usePoints must be used within PointsProvider");
  return ctx;
}
