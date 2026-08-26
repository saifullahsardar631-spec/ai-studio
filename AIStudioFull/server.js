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

const CHAT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL ||
  "gemini-3.1-flash-image";

const VIDEO_MODEL =
  process.env.GEMINI_VIDEO_MODEL ||
  "veo-3.1-generate-preview";

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

app.use(cors());

app.use(
  express.json({
    limit: "4mb"
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

/* --------------------------------
   HOME
-------------------------------- */

app.get("/", (_req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/* --------------------------------
   HEALTH
-------------------------------- */

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "AI Studio Backend",
    provider: "Google Gemini",
    chatModel: CHAT_MODEL,
    imageModel: IMAGE_MODEL,
    videoModel: VIDEO_MODEL,
    keyConfigured: Boolean(apiKey)
  });
});

/* --------------------------------
   CHECK API
-------------------------------- */

function requireAI(res) {
  if (!ai) {
    res.status(500).json({
      ok: false,
      error:
        "GEMINI_API_KEY is not configured."
    });

    return false;
  }

  return true;
}

/* --------------------------------
   CHAT HISTORY
-------------------------------- */

function buildPrompt(
  prompt,
  history = []
) {
  const recent =
    Array.isArray(history)
      ? history.slice(-12)
      : [];

  const previous =
    recent
      .filter(
        m =>
          m &&
          m.content
      )
      .map(m => {
        const role =
          m.role === "assistant"
            ? "Assistant"
            : "User";

        return (
          role +
          ": " +
          String(m.content)
        );
      })
      .join("\n");

  if (previous) {
    return (
      previous +
      "\nUser: " +
      prompt +
      "\nAssistant:"
    );
  }

  return prompt;
}

/* --------------------------------
   CHAT
-------------------------------- */

app.post(
  "/api/chat",
  async (req, res) => {
    const prompt =
      String(
        req.body?.prompt || ""
      ).trim();

    const history =
      req.body?.history || [];

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error:
          "Prompt is required"
      });
    }

    if (!requireAI(res)) {
      return;
    }

    try {
      const response =
        await ai.models.generateContent({
          model: CHAT_MODEL,

          contents:
            buildPrompt(
              prompt,
              history
            )
        });

      const answer =
        response.text?.trim();

      if (!answer) {
        return res.status(502).json({
          ok: false,
          error:
            "Gemini returned no response."
        });
      }

      return res.json({
        ok: true,
        type: "chat",
        status: "success",
        provider:
          "Google Gemini",
        model: CHAT_MODEL,
        message: answer
      });

    } catch (error) {
      console.error(
        "Gemini chat error:",
        error
      );

      return res.status(503).json({
        ok: false,
        error:
          "Could not connect to Gemini.",
        details:
          error?.message ||
          String(error)
      });
    }
  }
);

/* --------------------------------
   IMAGE GENERATION
-------------------------------- */

app.post(
  "/api/image",
  async (req, res) => {
    const prompt =
      String(
        req.body?.prompt || ""
      ).trim();

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error:
          "Prompt is required"
      });
    }

    if (!requireAI(res)) {
      return;
    }

    try {
      console.log(
        "Generating image..."
      );

      const interaction =
        await ai.interactions.create({
          model: IMAGE_MODEL,

          input: prompt,

          response_format: {
            type: "image",
            aspect_ratio: "16:9"
          }
        });

      const image =
        interaction.output_image;

      if (
        !image ||
        !image.data
      ) {
        return res.status(502).json({
          ok: false,
          error:
            "Image model returned no image."
        });
      }

      const mimeType =
        image.mime_type ||
        "image/png";

      const imageData =
        `data:${mimeType};base64,${image.data}`;

      return res.json({
        ok: true,
        type: "image",
        status: "success",
        provider:
          "Google Gemini",
        model: IMAGE_MODEL,
        mimeType,
        image: imageData,
        message:
          "Image generated successfully."
      });

    } catch (error) {
      console.error(
        "Image generation error:",
        error
      );

      return res.status(503).json({
        ok: false,
        error:
          "Image generation failed.",
        details:
          error?.message ||
          String(error)
      });
    }
  }
);

/* --------------------------------
   VIDEO GENERATION
-------------------------------- */

app.post(
  "/api/video",
  async (req, res) => {
    const prompt =
      String(
        req.body?.prompt || ""
      ).trim();

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error:
          "Prompt is required"
      });
    }

    if (!requireAI(res)) {
      return;
    }

    try {
      console.log(
        "Starting video generation..."
      );

      let operation =
        await ai.models.generateVideos({
          model: VIDEO_MODEL,
          prompt
        });

      console.log(
        "Video generation started."
      );

      /*
        Veo generation is asynchronous.
        Check status until complete.
      */

      let attempts = 0;

      const maxAttempts = 60;

      while (
        !operation.done &&
        attempts < maxAttempts
      ) {
        attempts++;

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              10000
            )
        );

        operation =
          await ai.operations.getVideosOperation(
            operation
          );

        console.log(
          `Video status check ${attempts}/${maxAttempts}`
        );
      }

      if (!operation.done) {
        return res.status(202).json({
          ok: true,
          type: "video",
          status: "processing",
          provider:
            "Google Gemini",
          model: VIDEO_MODEL,
          message:
            "Video is still processing. Please try again shortly."
        });
      }

      const generated =
        operation.response
          ?.generatedVideos?.[0];

      const video =
        generated?.video;

      if (!video) {
        return res.status(502).json({
          ok: false,
          error:
            "Video model returned no video."
        });
      }

      /*
        Return the generated video
        file information.

        The actual file can be downloaded
        using the Gemini Files API.
      */

      return res.json({
        ok: true,
        type: "video",
        status: "success",
        provider:
          "Google Gemini",
        model: VIDEO_MODEL,
        video: {
          uri: video.uri || null,
          mimeType:
            video.mimeType ||
            "video/mp4"
        },
        message:
          "Video generated successfully."
      });

    } catch (error) {
      console.error(
        "Video generation error:",
        error
      );

      return res.status(503).json({
        ok: false,
        error:
          "Video generation failed.",
        details:
          error?.message ||
          String(error)
      });
    }
  }
);

/* --------------------------------
   VOICE
-------------------------------- */

app.post(
  "/api/voice",
  async (req, res) => {
    const text =
      String(
        req.body?.text || ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        ok: false,
        error:
          "Text is required"
      });
    }

    return res.json({
      ok: true,
      type: "voice",
      status: "ready",
      text,
      message:
        "Voice text is ready for browser speech synthesis."
    });
  }
);

/* --------------------------------
   CAPTIONS
-------------------------------- */

app.post(
  "/api/captions",
  (req, res) => {
    const text =
      String(
        req.body?.text || ""
      ).trim();

    if (!text) {
      return res.status(400).json({
        ok: false,
        error:
          "Transcript is required"
      });
    }

    const parts =
      text
        .split(/[.!?]+/)
        .map(
          s => s.trim()
        )
        .filter(Boolean);

    const captions =
      parts.map(
        (line, index) => ({
          start:
            index * 3,

          end:
            index * 3 + 3,

          text: line
        })
      );

    return res.json({
      ok: true,
      type: "captions",
      status: "ready",
      captions
    });
  }
);

/* --------------------------------
   ERROR HANDLER
-------------------------------- */

app.use(
  (err, _req, res, _next) => {
    console.error(
      "Unhandled server error:",
      err
    );

    res.status(500).json({
      ok: false,
      error:
        "Internal server error.",
      details:
        err?.message ||
        String(err)
    });
  }
);

/* --------------------------------
   START
-------------------------------- */

app.listen(
  port,
  () => {
    console.log(
      `AI Studio Backend running on http://localhost:${port}`
    );

    console.log(
      `Gemini chat model: ${CHAT_MODEL}`
    );

    console.log(
      `Gemini image model: ${IMAGE_MODEL}`
    );

    console.log(
      `Gemini video model: ${VIDEO_MODEL}`
    );

    console.log(
      `Gemini key configured: ${Boolean(
        apiKey
      )}`
    );
  }
);