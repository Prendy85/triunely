// src/lib/youtube.js

export function getYouTubeVideoId(url) {
  if (!url) return null;

  try {
    const lower = String(url).toLowerCase();

    // youtu.be/VIDEOID
    if (lower.includes("youtu.be/")) {
      const match = String(url).match(/youtu\.be\/([^?&/]+)/i);
      return match?.[1] || null;
    }

    // youtube.com/shorts/VIDEOID
    if (lower.includes("youtube.com") && lower.includes("/shorts/")) {
      const match = String(url).match(/shorts\/([^?&/]+)/i);
      return match?.[1] || null;
    }

    // youtube.com/watch?v=VIDEOID
    if (lower.includes("youtube.com")) {
      const match = String(url).match(/[?&]v=([^&]+)/i);
      return match?.[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnail(url) {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(url) {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  // modestbranding + playsinline is a nicer “in-app” feel
  return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&modestbranding=1&rel=0`;
}

export function getDomainFromUrl(url) {
  try {
    const withoutProtocol = String(url).replace(/^https?:\/\/(www\.)?/i, "");
    return withoutProtocol.split("/")[0] || null;
  } catch {
    return null;
  }
}

export async function openExternalUrl(url, Linking, Alert) {
  try {
    if (!url) return;

    // ensure scheme
    const safe = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    const supported = await Linking.canOpenURL(safe);
    if (supported) {
      await Linking.openURL(safe);
    } else {
      Alert?.alert?.("Cannot open link", safe);
    }
  } catch {
    Alert?.alert?.("Cannot open link", "Something went wrong opening this link. Please try again.");
  }
}
