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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "AI Studio Backend",
    provider: "Google Gemini",
    model: GEMINI_MODEL,
    keyConfigured: Boolean(GEMINI_API_KEY)
  });
});

function buildContents(prompt, history = []) {
  const recent = Array.isArray(history) ? history.slice(-12) : [];

  const contents = recent
    .filter(m => m && m.content)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content) }]
    }));

  contents.push({
    role: "user",
    parts: [{ text: prompt }]
  });

  return contents;
}

app.post("/api/chat", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const history = req.body?.history || [];

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured."
    });
  }

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

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
      throw new Error(
        `Gemini returned an invalid response. HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini request failed. HTTP ${response.status}`
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
      throw new Error("Gemini returned no response.");
    }

    res.json({
      ok: true,
      type: "chat",
      status: "success",
      model: GEMINI_MODEL,
      message: answer
    });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(503).json({
      ok: false,
      error: "Could not connect to Gemini.",
      details: error.message
    });
  }
});

app.post("/api/image", (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }

  res.json({
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
      error: "Prompt is required"
    });
  }

  res.json({
    ok: true,
    type: "video",
    status: "provider-required",
    prompt,
    jobId: `demo_${Date.now()}`,
    message:
      "Video generation UI is ready. Connect a video provider for real generation."
  });
});

app.post("/api/voice", (req, res) => {
  const text = String(req.body?.text || "").trim();

  if (!text) {
    return res.status(400).json({
      error: "Text is required"
    });
  }

  res.json({
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
      error: "Transcript is required"
    });
  }

  const parts = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const captions = parts.map((line, i) => ({
    start: i * 3,
    end: i * 3 + 3,
    text: line
  }));

  res.json({
    ok: true,
    type: "captions",
    status: "ready",
    captions
  });
});

app.listen(port, () => {
  console.log(`AI Studio Backend running on http://localhost:${port}`);
  console.log(`Gemini model: ${GEMINI_MODEL}`);
  console.log(`Gemini key configured: ${Boolean(GEMINI_API_KEY)}`);
});