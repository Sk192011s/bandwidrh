import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CDN_BASE = "https://cdn.mydomain.com/videos"; // CDN or storage link
const SECRET = "mysecretkey"; // for simple token generation

function generateToken(id: string) {
  // simple token (you can use JWT or HMAC if you want)
  const expiry = Date.now() + 1000 * 60 * 10; // 10 min valid
  return btoa(`${id}.${expiry}.${SECRET}`);
}

function verifyToken(token: string, id: string) {
  try {
    const decoded = atob(token);
    const [tid, expiry, secret] = decoded.split(".");
    return tid === id && secret === SECRET && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

serve((req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle /watch/:id
  if (pathname.startsWith("/watch/")) {
    const id = pathname.split("/")[2];
    if (!id) return new Response("Missing ID", { status: 400 });

    const token = generateToken(id);
    const redirectURL = `${CDN_BASE}/${id}.mp4?token=${token}`;
    return new Response(null, {
      status: 302,
      headers: { Location: redirectURL },
    });
  }

  // Verify endpoint (optional)
  if (pathname.startsWith("/verify/")) {
    const [_, __, id] = pathname.split("/");
    const token = url.searchParams.get("token") || "";
    const ok = verifyToken(token, id);
    return new Response(ok ? "Valid ✅" : "Invalid ❌");
  }

  return new Response("Video Redirect API 🚀", { status: 200 });
});
