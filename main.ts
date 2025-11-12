import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const SECRET = "proxysecret"; // change this if you want
const BASE_URL = "https://your-app-name.deno.dev"; // replace with your Deno Deploy URL

function generateToken(url: string) {
  const expiry = Date.now() + 1000 * 60 * 10; // 10 mins
  return btoa(`${url}.${expiry}.${SECRET}`);
}

function verifyToken(token: string, url: string) {
  try {
    const decoded = atob(token);
    const [origUrl, expiry, secret] = decoded.split(".");
    return origUrl === url && secret === SECRET && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

serve((req) => {
  const { pathname, searchParams } = new URL(req.url);

  // Home Page
  if (pathname === "/") {
    return new Response(
      `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Video Proxy Generator</title>
<style>
body { font-family: Arial,sans-serif; background:#0d1117; color:white; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
.card { background:#161b22; padding:30px; border-radius:16px; box-shadow:0 0 15px rgba(255,255,255,0.1); text-align:center; width:90%; max-width:450px; }
h2 { margin-bottom:15px; }
input { width:100%; padding:10px; border:none; border-radius:10px; margin-bottom:10px; font-size:15px; text-align:center; }
button { background:#1f6feb; border:none; padding:10px 20px; border-radius:10px; color:white; font-size:16px; cursor:pointer; width:100%; }
button:hover { background:#2d8cff; }
p { margin-top:15px; word-wrap:break-word; color:#58a6ff; }
</style>
</head>
<body>
<div class="card">
<h2>🎬 Video Proxy Generator</h2>
<input type="text" id="videoUrl" placeholder="Enter full video link (https://...)" />
<button onclick="generate()">Generate</button>
<p id="result"></p>
</div>
<script>
function generate() {
  const url = document.getElementById('videoUrl').value.trim();
  const result = document.getElementById('result');
  if (!url.startsWith('https://')) {
    result.style.color = 'red';
    result.textContent = '⚠️ Please enter a valid https:// video link';
    return;
  }
  const gen = window.location.origin + '/proxy?url=' + encodeURIComponent(url);
  result.style.color = '#58a6ff';
  result.innerHTML = '<b>Proxy Link:</b><br>' + gen + '<br><br><button onclick="copyLink()">Copy</button>';
  window.copyText = gen;
}
function copyLink() {
  navigator.clipboard.writeText(window.copyText);
  alert('Copied!');
}
</script>
</body>
</html>
      `,
      { headers: { "content-type": "text/html" } }
    );
  }

  // Proxy generate route
  if (pathname === "/proxy") {
    const url = searchParams.get("url");
    if (!url) return new Response("Missing video URL", { status: 400 });

    const token = generateToken(decodeURIComponent(url));
    const redirect = `${BASE_URL}/watch?url=${encodeURIComponent(url)}&token=${token}`;
    return new Response(null, { status: 302, headers: { Location: redirect } });
  }

  // Watch route (actual redirect)
  if (pathname === "/watch") {
    const url = searchParams.get("url");
    const token = searchParams.get("token");
    if (!url || !token) return new Response("Missing params", { status: 400 });

    const decodedUrl = decodeURIComponent(url);
    if (!verifyToken(token, decodedUrl)) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    return new Response(null, { status: 302, headers: { Location: decodedUrl } });
  }

  return new Response("Not found", { status: 404 });
});
