import { supabase } from "./supabase";

/**
 * Upload a local video URI to Supabase Storage and return a public URL.
 * Bucket: weekly-videos (public for MVP)
 */
export async function uploadWeeklyVideo({ fileUri, churchId, weekStartISO }) {
  if (!fileUri) throw new Error("Missing fileUri");
  if (!churchId) throw new Error("Missing churchId");
  if (!weekStartISO) throw new Error("Missing weekStartISO");

  const cleanUri = String(fileUri).split("?")[0];
  const ext = cleanUri.split(".").pop()?.toLowerCase() || "mp4";

  const contentType =
    ext === "mov" ? "video/quicktime" :
    ext === "m4v" ? "video/x-m4v" :
    "video/mp4";

  const fileName = `weekly-${Date.now()}.${ext}`;
  const objectPath = `${churchId}/${weekStartISO}/${fileName}`;

  // Expo-friendly: fetch(uri) -> blob
  const res = await fetch(fileUri);
  const blob = await res.blob();

  const { data, error } = await supabase.storage
    .from("weekly-videos")
    .upload(objectPath, blob, { contentType, upsert: true });

  if (error) throw error;

  const { data: pub } = supabase.storage.from("weekly-videos").getPublicUrl(data.path);
  if (!pub?.publicUrl) throw new Error("Failed to get public URL");

  return pub.publicUrl;
}
