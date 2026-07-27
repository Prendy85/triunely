// src/lib/uploadFeedMedia.js
import * as FileSystem from "expo-file-system/legacy";
import { FileSystemUploadType } from "expo-file-system/legacy";

import { supabase } from "./supabase";

const BUCKET = "post_media";
const SOFT_MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function encodeStoragePath(p) {
  return String(p)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

function sanitizeStoragePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80);
}

function getExtFromUri(uri, fallback) {
  try {
    const clean = String(uri || "").split("?")[0];
    const ext = clean.split(".").pop()?.toLowerCase();

    if (ext && ext.length <= 6) return ext;

    return fallback;
  } catch {
    return fallback;
  }
}

function isVideoMedia(media) {
  const kind = String(media?.kind || "").toLowerCase();
  const assetType = String(media?.assetType || "").toLowerCase();
  const mediaType = String(media?.mediaType || "").toLowerCase();
  const type = String(media?.type || media?.mimeType || "").toLowerCase();
  const fileName = String(media?.fileName || "").toLowerCase();
  const uri = String(media?.uri || "").toLowerCase();

  return (
    kind === "video" ||
    assetType === "video" ||
    mediaType === "video" ||
    type.startsWith("video") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".mov") ||
    fileName.endsWith(".webm") ||
    uri.includes(".mp4") ||
    uri.includes(".mov") ||
    uri.includes(".webm")
  );
}

function getContentType(media, isVideo) {
  const raw =
    media?.mimeType ||
    media?.type ||
    media?.contentType ||
    null;

  if (raw) {
    const value = String(raw).toLowerCase();

    if (value === "video/mov") return "video/quicktime";
    return value;
  }

  const fileName = String(media?.fileName || media?.uri || "").toLowerCase();

  if (fileName.endsWith(".mov")) return "video/quicktime";
  if (fileName.endsWith(".webm")) return "video/webm";
  if (fileName.endsWith(".mp4")) return "video/mp4";
  if (fileName.endsWith(".png")) return "image/png";
  if (fileName.endsWith(".webp")) return "image/webp";
  if (fileName.endsWith(".heic")) return "image/heic";

  return isVideo ? "video/mp4" : "image/jpeg";
}

async function getAccessTokenOrThrow() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error("No active session token. Please sign in again.");
  }

  return token;
}

async function uploadViaStorageBinary({ localUri, objectPath, contentType }) {
  const token = await getAccessTokenOrThrow();

  const supabaseUrl = supabase?.supabaseUrl;
  const supabaseKey = supabase?.supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase client is missing supabaseUrl/supabaseKey. Check src/lib/supabase.js."
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodeStoragePath(
    objectPath
  )}`;

  const headers = {
    "Content-Type": contentType,
    Authorization: `Bearer ${token}`,
    apikey: supabaseKey,
    "x-upsert": "true",
  };

  const uploadOptions = {
    headers,
    uploadType: FileSystemUploadType?.BINARY_CONTENT ?? "binaryContent",
  };

  let res = await FileSystem.uploadAsync(url, localUri, {
    ...uploadOptions,
    httpMethod: "POST",
  });

  if (res.status >= 400) {
    res = await FileSystem.uploadAsync(url, localUri, {
      ...uploadOptions,
      httpMethod: "PUT",
    });
  }

  if (res.status < 200 || res.status >= 300) {
    console.log("uploadFeedMedia storage upload failed:", {
      status: res.status,
      body: res.body,
      objectPath,
      contentType,
      localUri,
    });

    throw new Error(
      `Supabase Storage upload failed (${res.status}): ${res.body || "No response body"}`
    );
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw new Error("No publicUrl returned from Supabase Storage.");
  }

  return data.publicUrl;
}

export async function uploadFeedMedia({
  media,
  scope = "posts",
  ownerId,
  folderId,
  allowPermanentVideo = false,
}) {
  if (!media?.uri) {
    return {
      mediaUrl: null,
      mediaType: null,
    };
  }

  const video = isVideoMedia(media);

  if (video && allowPermanentVideo !== true) {
    throw new Error(
      "Permanent video uploads are not available for this account."
    );
  }

  try {
    const info = await FileSystem.getInfoAsync(media.uri, { size: true });
    const sizeBytes = info?.size ?? 0;

    console.log("uploadFeedMedia selected file:", {
      exists: info?.exists,
      sizeBytes,
      uri: media.uri,
      fileName: media.fileName,
      type: media.type,
      mimeType: media.mimeType,
      assetType: media.assetType,
      kind: media.kind,
      video,
    });

    if (video && sizeBytes > SOFT_MAX_VIDEO_BYTES) {
      throw new Error(
        "This video is quite large for a mobile upload. Try a shorter clip or Medium quality export."
      );
    }
  } catch (e) {
    if (String(e?.message || "").includes("quite large")) {
      throw e;
    }

    console.log("uploadFeedMedia size check skipped:", e);
  }

  const contentType = getContentType(media, video);
  const fallbackExt = video ? "mp4" : "jpg";
  const ext = getExtFromUri(media.uri, fallbackExt);

  const safeOwner = sanitizeStoragePart(ownerId) || "user";
  const safeFolder = sanitizeStoragePart(folderId) || "general";

  const originalFileName =
    media.fileName ||
    `${video ? "video" : "image"}-${Date.now()}.${ext}`;

  const cleanFileName = String(originalFileName).replace(/[^a-zA-Z0-9._-]/g, "-");

  const objectPath = `${scope}/${safeFolder}/${
    video ? "videos" : "images"
  }/${Date.now()}-${safeOwner}-${cleanFileName}`;

  console.log("uploadFeedMedia binary upload starting:", {
    bucket: BUCKET,
    objectPath,
    contentType,
    localUri: media.uri,
    video,
  });

  const mediaUrl = await uploadViaStorageBinary({
    localUri: media.uri,
    objectPath,
    contentType,
  });

  console.log("uploadFeedMedia binary upload complete:", {
    mediaUrl,
    mediaType: contentType,
  });

  return {
    mediaUrl,
    mediaType: contentType,
  };
}

export function isFeedVideoMedia(media) {
  return isVideoMedia(media);
}