# AI Studio Full

Local AI Studio with:
- Ollama `llama3.2` chat
- Chat history in browser localStorage
- New Chat and clear history
- Light/dark theme
- Chat suggestions
- Voice input (browser support required)
- Voice output using browser Speech Synthesis
- Image, video and caption tool UI
- Express backend and Ollama integration

## Run

1. Open this folder in a terminal.
2. Run `npm install`.
3. Make sure Ollama is installed and `llama3.2` is available:
   `ollama list`
4. Start the server:
   `npm start`
5. Open `http://localhost:3000`.

Optional `.env`:
`PORT=3000`
`OLLAMA_URL=http://localhost:11434`
`OLLAMA_MODEL=llama3.2`

Image/video generation still require a real provider; the UI and backend endpoints are prepared for that integration.
