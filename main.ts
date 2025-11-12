import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CDN_BASE = "https://cdn.mydomain.com/videos"; // Change to your CDN or storage link
const SECRET = "mysecretkey"; // Change this for security

function generateToken(id: string) {
  const expiry = Date.now() + 1000 * 60 * 10; // 10 min valid
  return btoa(`${id}.${expiry}.${SECRET}`);
}

serve((req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // API for /generate?id=abc123
  if (pathname === "/generate") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("❌ Missing ID", { status: 400 });

    const token = generateToken(id);
    const redirectURL = `${CDN_BASE}/${id}.mp4?token=${token}`;
    const fullLink = `${url.origin}/watch/${id}`;

    const html = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Video Link Generated</title>
        <style>
          body { font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#0d1117; color:#fff; }
          .box { background:#161b22; padding:25px 35px; border-radius:16px; box-shadow:0 0 12px rgba(255,255,255,0.1); text-align:center; width:90%; max-width:450px; }
          input { width:100%; padding:10px; border-radius:8px; border:none; margin:10px 0; background:#222; color:#fff; }
          button { padding:10px 20px; border:none; border-radius:8px; background:#2f81f7; color:white; cursor:pointer; font-size:16px; transition:0.2s; }
          button:hover { background:#1b61d1; }
          .link-box { margin-top:20px; word-break:break-all; background:#222; padding:10px; border-radius:8px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>✅ Video Link Generated</h2>
          <div class="link-box">${redirectURL}</div>
          <p style="margin-top:15px;">(This link is valid for 10 minutes)</p>
          <button onclick="navigator.clipboard.writeText('${redirectURL}');alert('Copied!')">Copy Link</button>
          <br><br>
          <a href="/" style="color:#2f81f7;text-decoration:none;">← Generate another</a>
        </div>
      </body>
      </html>
    `;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }

  // Redirect handler
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

  // Home page (UI)
  const html = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Video Redirect Generator</title>
      <style>
        body { font-family: Arial, sans-serif; background:#0d1117; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; }
        .box { background:#161b22; padding:25px 35px; border-radius:16px; box-shadow:0 0 12px rgba(255,255,255,0.1); text-align:center; width:90%; max-width:450px; }
        input { width:100%; padding:10px; border-radius:8px; border:none; margin:10px 0; background:#222; color:#fff; font-size:16px; text-align:center; }
        button { padding:10px 20px; border:none; border-radius:8px; background:#2f81f7; color:white; cursor:pointer; font-size:16px; transition:0.2s; width:100%; }
        button:hover { background:#1b61d1; }
        h2 { margin-bottom:10px; }
      </style>
    </head>
    <body>
      <div class="box">
        <h2>🎬 Video Redirect Generator</h2>
        <form onsubmit="generate(event)">
          <input id="id" placeholder="Enter video ID (e.g. abc123)" required />
          <button type="submit">Generate Link</button>
        </form>
      </div>

      <script>
        function generate(e) {
          e.preventDefault();
          const id = document.getElementById('id').value.trim();
          if (!id) return alert('Please enter a video ID!');
          location.href = '/generate?id=' + encodeURIComponent(id);
        }
      </script>
    </body>
    </html>
  `;
  return new Response(html, { headers: { "content-type": "text/html" } });
});
