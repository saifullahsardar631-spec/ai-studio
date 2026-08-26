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
const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2";

app.use(cors());
app.use(express.json({ limit: "4mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "AI Studio Backend", ollama: ollamaModel });
});

function buildPrompt(prompt, history = []) {
  const recent = Array.isArray(history) ? history.slice(-12) : [];
  const transcript = recent
    .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${String(m.content || "")}`)
    .join("\n");
  return transcript ? `${transcript}\nUser: ${prompt}\nAssistant:` : prompt;
}

app.post("/api/chat", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const history = req.body?.history || [];

  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: buildPrompt(prompt, history),
        stream: false
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();

    res.json({
      ok: true,
      type: "chat",
      status: "success",
      model: ollamaModel,
      message: data.response || "No response from Ollama."
    });
  } catch (error) {
    console.error("Ollama error:", error);
    res.status(503).json({
      ok: false,
      error: "Could not connect to Ollama.",
      details: error.message
    });
  }
});

app.post("/api/image", (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  res.json({
    ok: true,
    type: "image",
    status: "provider-required",
    prompt,
    message: "Image generation UI is ready. Connect an image provider to generate real images."
  });
});

app.post("/api/video", (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  res.json({
    ok: true,
    type: "video",
    status: "provider-required",
    prompt,
    jobId: `demo_${Date.now()}`,
    message: "Video generation UI is ready. Connect a video provider for real generation."
  });
});

app.post("/api/voice", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Text is required" });
  res.json({ ok: true, type: "voice", status: "ready", text });
});

app.post("/api/captions", (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Transcript is required" });
  const parts = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const captions = parts.map((line, i) => ({
    start: i * 3,
    end: i * 3 + 3,
    text: line
  }));
  res.json({ ok: true, type: "captions", status: "ready", captions });
});

app.listen(port, () => {
  console.log(`AI Studio Backend running on http://localhost:${port}`);
  console.log(`Ollama: ${ollamaUrl} | Model: ${ollamaModel}`);
});
