import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BUCKET_NAME = "weekly-videos";
const PUBLIC_BUCKET_MARKER = "/storage/v1/object/public/weekly-videos/";

type WeeklyMessageRow = {
  id: string;
  video_url: string | null;
  video_expires_at: string | null;
  video_deleted_at: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getStoragePathFromPublicUrl(videoUrl: string | null) {
  if (!videoUrl) return null;

  const markerIndex = videoUrl.indexOf(PUBLIC_BUCKET_MARKER);

  if (markerIndex === -1) {
    return null;
  }

  const pathStart = markerIndex + PUBLIC_BUCKET_MARKER.length;
  const rawPath = videoUrl.slice(pathStart).split("?")[0];

  try {
    return decodeURIComponent(rawPath);
  } catch (_error) {
    return rawPath;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse(
        {
          ok: false,
          error: "Method not allowed. Use POST.",
        },
        405
      );
    }

    const cleanupSecret = Deno.env.get("CLEANUP_WEEKLY_VIDEOS_SECRET");
    const requestSecret = req.headers.get("x-cleanup-secret");

    if (!cleanupSecret || requestSecret !== cleanupSecret) {
      return jsonResponse(
        {
          ok: false,
          error: "Unauthorized cleanup request.",
        },
        401
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          error: "Missing Supabase environment variables.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const nowIso = new Date().toISOString();

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("church_weekly_messages")
      .select("id, video_url, video_expires_at, video_deleted_at")
      .not("video_url", "is", null)
      .is("video_deleted_at", null)
      .lte("video_expires_at", nowIso)
      .limit(100);

    if (fetchError) {
      return jsonResponse(
        {
          ok: false,
          step: "fetch_expired_rows",
          error: fetchError.message,
        },
        500
      );
    }

    const expiredRows = (rows || []) as WeeklyMessageRow[];

    const results = {
      ok: true,
      checkedAt: nowIso,
      found: expiredRows.length,
      deleted: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{
        id: string;
        path?: string | null;
        status: "deleted" | "skipped" | "failed";
        reason?: string;
      }>,
    };

    for (const row of expiredRows) {
      const path = getStoragePathFromPublicUrl(row.video_url);

      if (!path) {
        results.skipped += 1;

        results.details.push({
          id: row.id,
          path: null,
          status: "skipped",
          reason: "Could not extract storage path from video_url.",
        });

        continue;
      }

      const { error: removeError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (removeError) {
        results.failed += 1;

        results.details.push({
          id: row.id,
          path,
          status: "failed",
          reason: removeError.message,
        });

        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("church_weekly_messages")
        .update({
          video_url: null,
          video_deleted_at: nowIso,
        })
        .eq("id", row.id);

      if (updateError) {
        results.failed += 1;

        results.details.push({
          id: row.id,
          path,
          status: "failed",
          reason: `Storage deleted, but database update failed: ${updateError.message}`,
        });

        continue;
      }

      results.deleted += 1;

      results.details.push({
        id: row.id,
        path,
        status: "deleted",
      });
    }

    return jsonResponse(results);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});