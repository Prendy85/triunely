// supabase/functions/link-preview/index.ts

type Preview = {
  ok: boolean;
  inputUrl: string;
  finalUrl?: string;
  domain?: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  type?: "website" | "video" | "unknown";
  error?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeHttpUrl(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function getDomain(u: string): string | undefined {
  try {
    return new URL(u).hostname.replace(/^www\./i, "");
  } catch {
    return undefined;
  }
}

function absolutizeUrl(maybeRelative: string | null | undefined, baseUrl: string): string | null {
  if (!maybeRelative) return null;
  const s = String(maybeRelative).trim();
  if (!s) return null;
  try {
    // already absolute
    if (/^https?:\/\//i.test(s)) return s;
    // protocol-relative //example.com/img.jpg
    if (/^\/\//.test(s)) return `https:${s}`;
    // relative path
    const base = new URL(baseUrl);
    return new URL(s, base).toString();
  } catch {
    return null;
  }
}

function pickFirst(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    const s = (v ?? "").trim();
    if (s) return s;
  }
  return null;
}

function extractMeta(html: string, key: string, attr: "property" | "name" = "property"): string | null {
  // Matches: <meta property="og:title" content="...">
  // Also handles single quotes and whitespace.
  const re = new RegExp(
    `<meta\\s+[^>]*${attr}\\s*=\\s*["']${key}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1] ? decodeHtml(m[1]) : null;
}

function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1] ? decodeHtml(m[1]).replace(/\s+/g, " ").trim() : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchHtml(url: string): Promise<{ finalUrl: string; html: string }> {
  // Some sites block “unknown” agents; set one.
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const finalUrl = res.url || url;

  // If HTML is blocked (403/503) or not HTML, we still try fallback later.
  const ct = res.headers.get("content-type") || "";
  const isHtml = ct.toLowerCase().includes("text/html");

  // Always read text (some servers omit content-type correctly)
  const html = await res.text();

  return { finalUrl, html: isHtml ? html : html };
}

async function fetchHtmlViaJina(url: string): Promise<{ finalUrl: string; html: string }> {
  // Fallback fetch through a simple HTML mirror that often bypasses bot blocks.
  // If you dislike this dependency, remove it; but it’s very effective for “blocked by WAF” pages.
  const mirror = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
  const res = await fetch(mirror, { redirect: "follow" });
  const html = await res.text();
  return { finalUrl: url, html };
}

function buildPreviewFromHtml(inputUrl: string, finalUrl: string, html: string): Preview {
  const ogTitle = extractMeta(html, "og:title", "property");
  const twTitle = extractMeta(html, "twitter:title", "name");
  const titleTag = extractTitleTag(html);

  const ogDesc = extractMeta(html, "og:description", "property");
  const twDesc = extractMeta(html, "twitter:description", "name");
  const desc = pickFirst(ogDesc, twDesc, extractMeta(html, "description", "name"));

  const ogImage = extractMeta(html, "og:image", "property");
  const twImage = extractMeta(html, "twitter:image", "name");
  const image = absolutizeUrl(pickFirst(ogImage, twImage), finalUrl);

  const siteName = pickFirst(extractMeta(html, "og:site_name", "property"));

  const ogVideo = extractMeta(html, "og:video", "property");
  const twPlayer = extractMeta(html, "twitter:player", "name");

  const type: Preview["type"] = ogVideo || twPlayer ? "video" : "website";

  return {
    ok: true,
    inputUrl,
    finalUrl,
    domain: getDomain(finalUrl),
    title: pickFirst(ogTitle, twTitle, titleTag),
    description: desc,
    image,
    siteName,
    type,
  };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputUrl = normalizeHttpUrl(body?.url ?? "");
    if (!inputUrl) {
      return new Response(JSON.stringify({ ok: false, error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow http(s)
    if (!/^https?:\/\//i.test(inputUrl)) {
      return new Response(JSON.stringify({ ok: false, error: "Only http/https URLs are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Try direct fetch
    let finalUrl = inputUrl;
    let html = "";
    try {
      const r = await fetchHtml(inputUrl);
      finalUrl = r.finalUrl;
      html = r.html;
    } catch {
      // ignore, try fallback
    }

    // 2) If we got nothing useful, try fallback mirror
    if (!html || html.length < 200) {
      const r2 = await fetchHtmlViaJina(inputUrl);
      finalUrl = r2.finalUrl;
      html = r2.html;
    }

    if (!html || html.length < 200) {
      const out: Preview = {
        ok: false,
        inputUrl,
        finalUrl,
        domain: getDomain(finalUrl),
        error: "Could not fetch HTML for preview",
      };
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preview = buildPreviewFromHtml(inputUrl, finalUrl, html);

    return new Response(JSON.stringify(preview), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Unknown error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
