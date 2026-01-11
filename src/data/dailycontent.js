// src/data/dailyContent.js

export const CHALLENGES = [
  // Prayer & Devotion
  "Pray for one friend by name today.",
  "Thank God for 3 blessings before bed.",
  "Read today’s verse out loud twice.",
  "Pray for someone you find difficult to love.",
  "Take 2 minutes of silence, invite the Holy Spirit.",
  // Encouragement & Community
  "Encourage one person with a kind word today.",
  "Comment “I prayed for you” on the Prayer Wall.",
  "Share your favorite verse on social media.",
  "Send a text of encouragement to a family member.",
  "Pray for someone in your church leadership.",
  // Gratitude & Reflection
  "Write down 3 things you’re grateful for.",
  "Reflect: how did God show up in your life this week?",
  "Journal 5 minutes about worries → give them to God.",
  "Thank God for something in creation you notice today.",
  "Share one answered prayer on the Prayer Wall.",
  // Lifestyle & Action
  "Do one small act of kindness anonymously.",
  "Fast from social media for 1 hour today.",
  "Take a short walk and pray as you walk.",
  "Memorize one verse from today’s reading.",
  "Do something generous for someone without telling them.",
  // Family & Relationships
  "Pray for your parents/children by name.",
  "Tell one person you forgive them (or pray to release it).",
  "Pray for unity in your community.",
  "Tell someone “God loves you.”",
  "Pray for someone who doesn’t know Jesus yet.",
  // World & Mission
  "Pray for Christians facing persecution today.",
  "Pray for peace in a country in conflict.",
  "Give thanks for your pastor and pray for them.",
  "Pray for healthcare workers in your town.",
  "Ask God to show you one person to encourage today."
];

export const VERSES = [
  { ref: "John 8:12", text: "“I am the light of the world.”" },
  { ref: "Psalm 23:1", text: "“The Lord is my shepherd; I shall not want.”" },
  { ref: "Philippians 4:6", text: "“Do not be anxious about anything…”" },
  { ref: "Proverbs 3:5", text: "“Trust in the Lord with all your heart…”" },
  { ref: "Isaiah 41:10", text: "“Fear not, for I am with you…”" },
  { ref: "Matthew 11:28", text: "“Come to me, all who labor and are heavy laden…”" },
  { ref: "Romans 8:28", text: "“All things work together for good…”" },
  { ref: "Joshua 1:9", text: "“Be strong and courageous…”" },
  { ref: "1 Peter 5:7", text: "“Cast all your anxiety on him…”" },
  { ref: "Lamentations 3:22-23", text: "“His mercies are new every morning.”" }
];

export function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000); // days since Jan 1
}

export function getDailyContent(d = new Date()) {
  const day = dayOfYear(d);
  const verse = VERSES[day % VERSES.length];
  const challenge = CHALLENGES[day % CHALLENGES.length];
  return { verse, challenge };
}
