// @ts-nocheck
// supabase/functions/upload-post-image/index.ts

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const base64 = body.base64 as string | undefined;
    const fileName = body.fileName as string | undefined;
    const contentType = (body.contentType as string | undefined) || "image/jpeg";
    const pathPrefix = body.pathPrefix as string | undefined;

    if (!base64 || !fileName) {
      return new Response(
        JSON.stringify({ error: "Missing base64 or fileName" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server storage configuration missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);

    // Decode base64 -> Uint8Array
    const fileBytes = Uint8Array.from(
      atob(base64),
      (c) => c.charCodeAt(0)
    );

    const BUCKET = "post_media";

    // If a pathPrefix is provided (e.g. "avatars/<userId>"), use that.
    // Otherwise keep the old behaviour for posts (timestamp prefix).
    let filePath: string;
    if (pathPrefix && pathPrefix.trim().length > 0) {
      const cleanPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
      filePath = `${cleanPrefix}/${fileName}`;
    } else {
      filePath = `${Date.now()}-${fileName}`;
    }

    const { error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(filePath, fileBytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { data: publicData } = supabaseClient
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        publicUrl: publicData.publicUrl,
        path: filePath,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Unexpected error in upload-post-image function:", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error while uploading image" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
