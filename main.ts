import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// --- Config ---
const BASE_URL = "https://your-app.deno.dev";
const SECRET = "proxysecret";

// KV placeholder (pseudo)
const kv: Record<string, string> = {}; // In real: Deno KV or Cloud DB

// --- Helpers ---
function shortKey(): string {
  return Math.random().toString(36).substring(2, 8);
}

function generateToken(key: string) {
  const expiry = Date.now() + 1000 * 60 * 10;
  return btoa(`${key}.${expiry}.${SECRET}`);
}

function verifyToken(token: string, key: string) {
  try {
    const [tokKey, expiry, secret] = atob(token).split(".");
    return tokKey === key && secret === SECRET && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

// --- Serve ---
serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const params = url.searchParams;

  // --- Home page (UI) ---
  if (pathname === "/") {
    return new Response(`
<html>
  <head>
    <meta charset="UTF-8">
    <title>Video Proxy Generator</title>
    <style>
      body{display:flex;justify-content:center;align-items:center;height:100vh;background:#0d1117;color:white;margin:0;}
      .card{background:#161b22;padding:30px;border-radius:16px;width:90%;max-width:450px;text-align:center;}
      input,button{width:100%;padding:10px;margin:5px 0;border-radius:10px;font-size:15px;}
      button{background:#1f6feb;color:white;border:none;cursor:pointer;}
      button:hover{background:#2d8cff;}
      p{word-wrap:break-word;color:#58a6ff;}
    </style>
  </head>
  <body>
    <div class="card">
      <h2>🎬 Video Proxy Generator</h2>
      <input type="text" id="videoUrl" placeholder="Enter full video link (VPN required)"/>
      <button onclick="generate()">Generate</button>
      <p id="result"></p>
    </div>
    <script>
      function generate() {
        const url = document.getElementById('videoUrl').value.trim();
        const result = document.getElementById('result');
        if (!url.startsWith('https://')) { result.style.color='red'; result.textContent='⚠️ Use full https:// link'; return;}
        fetch('/new?url='+encodeURIComponent(url))
          .then(r=>r.text())
          .then(t=>{result.style.color='#58a6ff'; result.innerHTML='<b>Short Link:</b><br>'+window.location.origin+'/'+t+'<br><br><button onclick="copyLink()">Copy</button>'; window.copyText=window.location.origin+'/'+t;});
      }
      function copyLink(){navigator.clipboard.writeText(window.copyText); alert('Copied!');}
    </script>
  </body>
</html>`, { headers: { "content-type": "text/html" }});
  }

  // --- Generate new short link ---
  if (pathname === "/new") {
    const videoUrl = params.get("url");
    if (!videoUrl) return new Response("Missing URL", { status: 400 });

    // --- TODO: fetch video + upload to Cloud storage ---
    // For demo, simulate cloud upload URL
    const cloudUrl = videoUrl; // In real: upload video to R2/B2/CDN, get public URL

    // Store in KV
    const key = shortKey();
    kv[key] = cloudUrl;

    return new Response(key);
  }

  // --- Redirect short link ---
  const key = pathname.substring(1);
  if (key && kv[key]) {
    return new Response(null, { status: 302, headers: { Location: kv[key] } });
  }

  return new Response("Not found", { status: 404 });
});
