import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
res.json({
ok: true,
service: "AI Studio Backend",
provider: "Google Gemini",
model: GEMINI_MODEL,
keyConfigured: Boolean(GEMINI_API_KEY)
});
});

function buildContents(prompt, history = []) {
const recent = Array.isArray(history)
? history.slice(-12)
: [];

const contents = [];

for (const message of recent) {
if (!message || !message.content) {
continue;
}

```
contents.push({
  role: message.role === "assistant" ? "model" : "user",
  parts: [
    {
      text: String(message.content)
    }
  ]
});
```

}

contents.push({
role: "user",
parts: [
{
text: prompt
}
]
});

return contents;
}

app.post("/api/chat", async (req, res) => {
const prompt = String(req.body?.prompt || "").trim();
const history = req.body?.history || [];

if (!prompt) {
return res.status(400).json({
ok: false,
error: "Prompt is required"
});
}

if (!GEMINI_API_KEY) {
return res.status(500).json({
ok: false,
error: "GEMINI_API_KEY is not configured."
});
}

try {
const url =
"https://generativelanguage.googleapis.com/v1beta/models/" +
GEMINI_MODEL +
":generateContent?key=" +
encodeURIComponent(GEMINI_API_KEY);

```
const response = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contents: buildContents(prompt, history),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  })
});

const raw = await response.text();

let data;

try {
  data = JSON.parse(raw);
} catch {
  return res.status(502).json({
    ok: false,
    error: "Gemini returned invalid JSON.",
    details: raw.slice(0, 500)
  });
}

if (!response.ok) {
  return res.status(response.status).json({
    ok: false,
    error:
      data?.error?.message ||
      "Gemini request failed.",
    details: data?.error || null
  });
}

const parts =
  data?.candidates?.[0]?.content?.parts || [];

const answer = parts
  .map(part => part?.text || "")
  .join("")
  .trim();

if (!answer) {
  return res.status(502).json({
    ok: false,
    error: "Gemini returned no response."
  });
}

return res.json({
  ok: true,
  type: "chat",
  status: "success",
  provider: "Google Gemini",
  model: GEMINI_MODEL,
  message: answer
});
```

} catch (error) {
console.error("Gemini error:", error);

```
return res.status(503).json({
  ok: false,
  error: "Could not connect to Gemini.",
  details: error?.message || String(error)
});
```

}
});

app.post("/api/image", (req, res) => {
const prompt = String(req.body?.prompt || "").trim();

if (!prompt) {
return res.status(400).json({
ok: false,
error: "Prompt is required"
});
}

return res.json({
ok: true,
type: "image",
status: "provider-required",
prompt,
message:
"Image generation UI is ready. Connect an image provider for real image generation."
});
});

app.post("/api/video", (req, res) => {
const prompt = String(req.body?.prompt || "").trim();

if (!prompt) {
return res.status(400).json({
ok: false,
error: "Prompt is required"
});
}

return res.json({
ok: true,
type: "video",
status: "provider-required",
prompt,
jobId: "demo_" + Date.now(),
message:
"Video generation UI is ready. Connect a video provider for real video generation."
});
});

app.post("/api/voice", (req, res) => {
const text = String(req.body?.text || "").trim();

if (!text) {
return res.status(400).json({
ok: false,
error: "Text is required"
});
}

return res.json({
ok: true,
type: "voice",
status: "ready",
text
});
});

app.post("/api/captions", (req, res) => {
const text = String(req.body?.text || "").trim();

if (!text) {
return res.status(400).json({
ok: false,
error: "Transcript is required"
});
}

const parts = text
.split(/[.!?]+/)
.map(s => s.trim())
.filter(Boolean);

const captions = parts.map((line, index) => ({
start: index * 3,
end: index * 3 + 3,
text: line
}));

return res.json({
ok: true,
type: "captions",
status: "ready",
captions
});
});

app.use((req, res) => {
res.status(404).json({
ok: false,
error: "Route not found",
path: req.path
});
});

app.listen(port, () => {
console.log(
"AI Studio Backend running on port " + port
);

console.log(
"Gemini model: " + GEMINI_MODEL
);

console.log(
"Gemini key configured: " +
Boolean(GEMINI_API_KEY)
);
});
