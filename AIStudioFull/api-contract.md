# AI Studio API

- `POST /api/chat` — local Ollama chat using `llama3.2`
- `POST /api/image` — image UI/provider placeholder
- `POST /api/video` — video UI/provider placeholder
- `POST /api/voice` — voice text endpoint; browser UI uses Speech Synthesis
- `POST /api/captions` — simple timed captions from transcript
- `GET /health` — server health

The frontend stores chat history locally in the browser. No cloud API key is required for the Ollama chat.
