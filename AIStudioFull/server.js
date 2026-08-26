import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
    model,
    keyConfigured: Boolean(apiKey)
  });
});

function buildPrompt(prompt, history = []) {
  const recent = Array.isArray(history) ? history.slice(-12) : [];

  const previous = recent
    .filter(m => m && m.content)
    .map(m => {
      const role = m.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${String(m.content)}`;
    })
    .join("\n");

  return previous
    ? `${previous}\nUser: ${prompt}\nAssistant:`
    : prompt;
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

  if (!ai) {
    return res.status(500).json({
      ok: false,
      error: "GEMINI_API_KEY is not configured."
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildPrompt(prompt, history)
    });

    const answer = response.text?.trim();

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
      model,
      message: answer
    });

  } catch (error) {
    console.error("Gemini error:", error);

    return res.status(503).json({
      ok: false,
      error: "Could not connect to Gemini.",
      details: error?.message || String(error)
    });
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

  res.json({
    ok: true,
    type: "image",
    status: "provider-required",
    prompt,
    message: "Image generation UI is ready."
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

  res.json({
    ok: true,
    type: "video",
    status: "provider-required",
    prompt,
    jobId: `demo_${Date.now()}`,
    message: "Video generation UI is ready."
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

  res.json({
    ok: true,
    type: "captions",
    status: "ready",
    captions
  });
});

app.listen(port, () => {
  console.log(`AI Studio Backend running on http://localhost:${port}`);
  console.log(`Gemini model: ${model}`);
  console.log(`Gemini key configured: ${Boolean(apiKey)}`);
});
