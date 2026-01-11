// src/lib/stories.js

import * as LegacyFileSystem from "expo-file-system/legacy";
import { Video as VideoCompressor } from "react-native-compressor";
import { supabase } from "./supabase";

/**
 * Helper: for videos, ensure the file is under a given byte limit.
 * If it's too large, we attempt compression using react-native-compressor.
 *
 * Returns: { uri, sizeBytes } for the (possibly compressed) file to upload.
 */
async function compressStoryVideoIfNeeded(localUri, maxBytes) {
  // Check original file size
  const originalInfo = await LegacyFileSystem.getInfoAsync(localUri, { size: true });

  if (!originalInfo.exists) {
    throw new Error("Selected file no longer exists on device.");
  }

  const originalSize = originalInfo.size ?? 0;
  console.log("Story original video size (bytes):", originalSize);

  // If already under limit, no compression needed
  if (originalSize <= maxBytes) {
    return { uri: localUri, sizeBytes: originalSize };
  }

  console.log(
    `Video is above ${maxBytes} bytes, compressing before upload...`
  );

  // 1) Compress using "auto" method (WhatsApp-style behaviour)
  let compressedUri;
  try {
    compressedUri = await VideoCompressor.compress(
      localUri,
      {
        // "auto" lets the library choose sensible bitrate/size
        compressionMethod: "auto",
        // You can add extra hints if needed later (e.g. maxSize: 720)
      },
      (progress) => {
        // Progress is 0..1
        console.log("Video compression progress:", progress);
      }
    );
  } catch (err) {
    console.error("Video compression failed:", err);
    throw new Error(
      "We couldn’t compress this video for stories. Please try a shorter clip saved as 720p (HD)."
    );
  }

  // 2) Check compressed file size
  const compressedInfo = await LegacyFileSystem.getInfoAsync(compressedUri, {
    size: true,
  });

  if (!compressedInfo.exists) {
    throw new Error("Compressed video file could not be found on device.");
  }

  const compressedSize = compressedInfo.size ?? 0;
  console.log("Story compressed video size (bytes):", compressedSize);

  // If still too big, fail with a clear message
  if (compressedSize > maxBytes) {
    throw new Error(
      "Even after compression this video is still too large for stories. Please trim it to about 15 seconds and export/save it as 720p (HD), then try again."
    );
  }

  return { uri: compressedUri, sizeBytes: compressedSize };
}

/**
 * Upload story media (image or video) using the existing upload-post-image Edge Function.
 *
 * mediaType: 'image' | 'video'
 * localUri:  file:// uri from ImagePicker
 */
async function uploadStoryMediaViaEdgeFunction(mediaType, localUri) {
  if (!localUri) {
    throw new Error("No localUri provided for story upload");
  }

  // We keep a hard limit for what we send over the wire as base64.
  // This is mainly to avoid OOM in RN + Supabase Function body limits.
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
  const MAX_VIDEO_BYTES = 8 * 1024 * 1024; // 8 MB (target size after compression)

  let uploadUri = localUri;

  if (mediaType === "image") {
    // For images, just enforce the size limit directly (no compression here yet).
    const info = await LegacyFileSystem.getInfoAsync(localUri, { size: true });

    if (!info.exists) {
      throw new Error("Selected file no longer exists on device.");
    }

    const sizeBytes = info.size ?? 0;
    console.log("Story image file size (bytes):", sizeBytes);

    if (sizeBytes > MAX_IMAGE_BYTES) {
      throw new Error(
        "That photo is too large to upload as a story. Please choose a smaller image (under about 8MB)."
      );
    }
  }

  if (mediaType === "video") {
    // For videos, if too large we auto-compress first, then enforce the same 8MB limit.
    const { uri: finalUri, sizeBytes } = await compressStoryVideoIfNeeded(
      localUri,
      MAX_VIDEO_BYTES
    );
    uploadUri = finalUri;
    console.log("Using video file for story upload (bytes):", sizeBytes);
  }

  // 1) Read the chosen file (original or compressed) as base64
  const base64 = await LegacyFileSystem.readAsStringAsync(uploadUri, {
    encoding: "base64",
  });

  // 2) Decide file extension and content type
  let extension = "jpg";
  let contentType = "image/jpeg";

  if (mediaType === "video") {
    extension = "mp4";
    contentType = "video/mp4";
  }

  const fileName = `story-${Date.now()}.${extension}`;

  // 3) Call your existing Edge Function: upload-post-image
  //    We pass a pathPrefix so stories live under "stories/..." in the post_media bucket.
  const { data, error } = await supabase.functions.invoke(
    "upload-post-image",
    {
      body: {
        base64,
        fileName,
        contentType,
        pathPrefix: "stories",
      },
    }
  );

  if (error) {
    // Try to surface something more helpful than "non-2xx status code"
    console.error(
      "uploadStoryMediaViaEdgeFunction error (raw):",
      JSON.stringify(error, null, 2)
    );

    let message =
      "We couldn’t upload this story. If it’s a video, please trim it to around 15 seconds and export as 720p, then try again.";

    // Supabase Functions errors sometimes carry extra context
    try {
      const context = error.context;
      if (
        context &&
        context.response &&
        typeof context.response.body === "string"
      ) {
        const maybeJson = JSON.parse(context.response.body);
        if (maybeJson?.error) {
          message = maybeJson.error;
        }
      }
    } catch {
      // ignore JSON parse errors, fall back to generic
    }

    throw new Error(message);
  }

  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error("upload-post-image did not return a publicUrl");
  }

  return { publicUrl, contentType };
}

/**
 * Creates a story record in the database after the media has been uploaded.
 *
 * mediaType: 'image' | 'video'
 * mediaUrl:  public URL
 * caption:   optional text
 * userId:    current profile.id
 *
 * Returns: the inserted story row.
 */
export async function createStoryRecord({
  mediaType,
  mediaUrl,
  caption,
  userId,
  overlays,
}) {
  if (!mediaType || !mediaUrl || !userId) {
    throw new Error("Missing required fields for createStoryRecord");
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption || null,
      overlays: overlays || null, // new JSONB column
      // expires_at is handled by DB default (now + 24h)
    })
    .select("*")
    .single();


  if (error) {
    console.error("createStoryRecord error", error);
    throw new Error(
      "We saved the media but could not create the story record."
    );
  }

  return data;
}

/**
 * High-level helper: given local media + caption, handles:
 * - upload via Edge Function (image or video)
 * - insert row into stories table
 */
export async function createStory({
  mediaType,
  localUri,
  caption,
  userId,
  overlays,
}) {
  if (!userId) {
    throw new Error("No userId provided for createStory");
  }

  if (mediaType !== "image" && mediaType !== "video") {
    throw new Error(`Unsupported mediaType for story: ${mediaType}`);
  }

  // 1) Upload media via existing Edge Function (with size checks)
  const { publicUrl } = await uploadStoryMediaViaEdgeFunction(
    mediaType,
    localUri
  );

  // 2) Insert DB record (now with overlays)
  const story = await createStoryRecord({
    mediaType,
    mediaUrl: publicUrl,
    caption,
    userId,
    overlays: overlays || null,
  });

  return story;
}


/**
 * Fetch all active (non-expired) stories, with basic profile info.
 * We will group these by user on the UI side when rendering the Stories bar.
 */
export async function fetchActiveStories() {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `
      id,
      user_id,
      media_type,
      media_url,
      caption,
      overlays,
      created_at,
      expires_at,
      profiles (
        id,
        display_name,
        avatar_url
      )
    `
    )

    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchActiveStories error", error);
    throw error;
  }

  return data || [];
}
