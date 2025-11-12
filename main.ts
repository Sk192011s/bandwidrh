import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { openKv } from "https://deno.land/x/kv/mod.ts";

// --- Config ---
const BASE_URL = "https://your-app.deno.dev";
const SECRET = "proxysecret"; // change for security

// --- Open KV ---
const kv = await openKv(); // Deno KV persistent

// --- Helpers ---
function shortKey(): string {
  return Math.random().toString(36).substring(2, 8);
}

function generateToken(key: string) {
  const expiry = Date.now() + 1000 * 60 * 10; // 10 mins
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
<meta name="viewport" content="width=device-width,initial-scale=1">
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
    .then(t=>{
      result.style.color='#58a6ff';
      result.innerHTML='<b>Short Link:</b><br>'+window.location.origin+'/'+t+'<br><br><button onclick="copyLink()">Copy</button>';
      window.copyText=window.location.origin+'/'+t;
    });
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
    const cloudUrl = videoUrl; // Replace with real Cloud upload & get public URL

    // Generate short key
    const key = shortKey();
    await kv.set(["links", key], cloudUrl);

    return new Response(key);
  }

  // --- Redirect short link ---
  const key = pathname.substring(1);
  if (key) {
    const cloudUrl = await kv.get(["links", key]);
    if (!cloudUrl) return new Response("Not found", { status: 404 });

    return new Response(null, { status: 302, headers: { Location: cloudUrl.value } });
  }

  return new Response("Not found", { status: 404 });
});
