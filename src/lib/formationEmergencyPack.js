// src/lib/formationEmergencyPack.js
// Emergency fallback pack (~10 days). Used only when Supabase fetch fails.
// Keep it minimal and sacred. No “rerolling”; selection is deterministic per date.

const PACK = [
  {
    day: 1,
    verse: {
      reference: "John 15:5",
      translation: "WEB",
      text: "I am the vine. You are the branches... apart from me you can do nothing.",
    },
    discipline: "prayer",
    options: [
      { intensity: "faithful", title: "Abide — Faithful Step", minutes: [5, 7], prompt: "Pray one honest sentence to God about your need for Him. End with: “Lord, help me follow You.”" },
      { intensity: "standard", title: "Abide — Standard Step", minutes: [8, 12], prompt: "Spend 8–12 minutes in focused prayer: dependence, confession, and one request. Finish with thanks." },
      { intensity: "stretch", title: "Abide — Stretch Step", minutes: [12, 15], prompt: "Pray 12–15 minutes. Add 3 minutes of silence at the end. Write one sentence of what you sensed God pressing on you." },
    ],
  },
  {
    day: 2,
    verse: {
      reference: "Matthew 6:33",
      translation: "WEB",
      text: "But seek first God’s Kingdom, and his righteousness; and all these things will be given to you as well.",
    },
    discipline: "scripture",
    options: [
      { intensity: "faithful", title: "Seek First — Faithful Step", minutes: [5, 7], prompt: "Read the verse twice. Ask: “God, what does seeking You first mean for me today?” Write one sentence." },
      { intensity: "standard", title: "Seek First — Standard Step", minutes: [8, 12], prompt: "Read Matthew 6:25–34. Identify one anxiety and one priority shift. Pray a short surrender prayer." },
      { intensity: "stretch", title: "Seek First — Stretch Step", minutes: [12, 15], prompt: "Read Matthew 6:25–34 slowly. Choose one concrete action today that proves Kingdom-first priority." },
    ],
  },
  // Add days 3–10 later; this is enough to prevent “Daily page breaks”.
];

function localDateKey() {
  // YYYYMMDD number in local time
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${y}${m}${day}`);
}

export const EMERGENCY_DAILY_PACK = {
  today() {
    const idx = localDateKey() % PACK.length;
    return PACK[idx];
  },
};
