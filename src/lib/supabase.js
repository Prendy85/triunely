import { createClient } from "@supabase/supabase-js";

// 👇 Replace with your real values
const SUPABASE_URL = "https://eadxngfhthbrwrkgpdsw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZHhuZ2ZodGhicndya2dwZHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzk1NTQsImV4cCI6MjA3NDcxNTU1NH0.K5VrlZIom4H6r40E9AmdZupmm6qNAMp3AAXRHgeIY7A"; // paste full anon public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
