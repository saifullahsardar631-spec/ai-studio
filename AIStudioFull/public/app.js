const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const chatList = document.getElementById("chatList");
const newChatBtn = document.getElementById("newChat");
const clearAllBtn = document.getElementById("clearAll");
const themeToggle = document.getElementById("themeToggle");
const micBtn = document.getElementById("micBtn");
const toolPanel = document.getElementById("toolPanel");
const chatPanel = document.getElementById("chatPanel");
const toolCard = document.getElementById("toolCard");
const pageTitle = document.getElementById("pageTitle");

let chats = JSON.parse(localStorage.getItem("aiStudioChats") || "[]");
let currentChatId = null;
let currentMode = "chat";

function saveChats() {
  localStorage.setItem("aiStudioChats", JSON.stringify(chats));
}

function createChat() {
  const id = Date.now().toString();

  chats.unshift({
    id,
    title: "New Chat",
    messages: []
  });

  currentChatId = id;
  saveChats();
  renderChatList();
  renderMessages();
  input.focus();
}

function currentChat() {
  return chats.find(c => c.id === currentChatId);
}

function ensureChat() {
  if (!currentChatId || !currentChat()) {
    createChat();
  }
}

function renderChatList() {
  chatList.innerHTML = "";

  chats.slice(0, 30).forEach(c => {
    const el = document.createElement("div");

    el.className =
      "chat-item" +
      (c.id === currentChatId ? " active" : "");

    el.textContent = c.title || "New Chat";

    el.onclick = () => {
      currentChatId = c.id;
      renderChatList();
      renderMessages();
      input.focus();
    };

    chatList.appendChild(el);
  });
}

function addMessage(text, role) {
  const d = document.createElement("div");

  d.className = "msg " + role;
  d.textContent = text;

  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;

  return d;
}

function renderMessages() {
  chat.innerHTML = "";

  const c = currentChat();

  if (!c || !c.messages.length) {
    chat.innerHTML = `
      <div class="welcome">
        <div class="welcome-icon">✦</div>

        <h2>How can I help?</h2>

        <p>
          Ask anything. Your
          <strong>AI Studio</strong>
          will answer.
        </p>

        <div class="suggestions">

          <button class="suggestion">
            Explain artificial intelligence simply.
          </button>

          <button class="suggestion">
            Write a short Urdu story.
          </button>

          <button class="suggestion">
            Help me learn JavaScript.
          </button>

          <button class="suggestion">
            Pakistan ka capital kya hai?
          </button>

        </div>
      </div>
    `;

    bindSuggestions();
    return;
  }

  c.messages.forEach(m => {
    addMessage(
      m.content,
      m.role === "user" ? "user" : "bot"
    );
  });
}

function bindSuggestions() {
  document.querySelectorAll(".suggestion").forEach(button => {
    button.onclick = () => {
      input.value = button.textContent.trim();
      form.requestSubmit();
    };
  });
}

/* --------------------------------
   SAFE JSON RESPONSE FUNCTION
-------------------------------- */

async function getResponseData(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();

  throw new Error(
    text ||
    `Server returned an invalid response (${response.status})`
  );
}

/* --------------------------------
   SEND CHAT MESSAGE
-------------------------------- */

async function sendMessage(prompt) {
  ensureChat();

  const c = currentChat();

  c.messages.push({
    role: "user",
    content: prompt
  });

  if (c.title === "New Chat") {
    c.title = prompt.slice(0, 42);
  }

  saveChats();
  renderChatList();
  renderMessages();

  input.value = "";
  input.disabled = true;
  micBtn.disabled = true;

  const bot = addMessage("Thinking…", "bot");

  try {
    const r = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        prompt: prompt,

        history: c.messages.slice(-12, -1)
      })
    });

    const data = await getResponseData(r);

    if (!r.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Request failed (${r.status})`
      );
    }

    const answer =
      data?.message ||
      data?.response ||
      data?.answer ||
      "No response received.";

    bot.textContent = "";

    await typeText(bot, answer);

    c.messages.push({
      role: "assistant",
      content: answer
    });

    saveChats();

  } catch (err) {

    console.error("Chat error:", err);

    bot.textContent =
      "Backend se connection nahi ho saka.\n\n" +
      err.message;

  } finally {

    input.disabled = false;
    micBtn.disabled = false;
    input.focus();
  }
}

/* --------------------------------
   TYPING EFFECT
-------------------------------- */

function typeText(element, text) {
  return new Promise(resolve => {

    let i = 0;
    const speed = 8;

    function write() {

      if (i < text.length) {

        element.textContent +=
          text.charAt(i);

        i++;

        chat.scrollTop =
          chat.scrollHeight;

        setTimeout(write, speed);

      } else {

        resolve();

      }
    }

    write();
  });
}

/* --------------------------------
   CHAT FORM
-------------------------------- */

form.addEventListener("submit", e => {

  e.preventDefault();

  const prompt =
    input.value.trim();

  if (!prompt) return;

  if (currentMode === "chat") {
    sendMessage(prompt);
  }

});

/* --------------------------------
   NEW CHAT
-------------------------------- */

newChatBtn.onclick = () => {
  createChat();
};

/* --------------------------------
   CLEAR ALL
-------------------------------- */

clearAllBtn.onclick = () => {

  if (confirm("Delete all saved chat history?")) {

    chats = [];
    currentChatId = null;

    saveChats();

    createChat();
  }

};

/* --------------------------------
   THEME
-------------------------------- */

themeToggle.onclick = () => {

  document.body.classList.toggle("light");

  const theme =
    document.body.classList.contains("light")
      ? "light"
      : "dark";

  localStorage.setItem(
    "aiStudioTheme",
    theme
  );

  themeToggle.textContent =
    theme === "light"
      ? "☀️"
      : "☾";
};

if (
  localStorage.getItem("aiStudioTheme")
  === "light"
) {

  document.body.classList.add("light");

  themeToggle.textContent = "☀️";
}

/* --------------------------------
   TABS
-------------------------------- */

document.querySelectorAll(".tab").forEach(tab => {

  tab.onclick = () => {

    currentMode =
      tab.dataset.mode;

    document
      .querySelectorAll(".tab")
      .forEach(t =>
        t.classList.remove("active")
      );

    tab.classList.add("active");

    if (currentMode === "chat") {

      pageTitle.textContent =
        "AI Chat";

      chatPanel.classList.remove(
        "hidden"
      );

      toolPanel.classList.add(
        "hidden"
      );

      renderMessages();
      input.focus();

    } else {

      chatPanel.classList.add(
        "hidden"
      );

      toolPanel.classList.remove(
        "hidden"
      );

      renderTool(currentMode);
    }
  };

});

/* --------------------------------
   TOOL CONFIGURATION
-------------------------------- */

function renderTool(mode) {

  const configs = {

    image: {
      title: "Image Studio",
      icon: "🖼️",
      desc: "Describe the image you want.",
      placeholder:
        "A futuristic city at sunset..."
    },

    video: {
      title: "Video Studio",
      icon: "🎬",
      desc: "Create a video prompt.",
      placeholder:
        "A cinematic shot of mountains in the rain..."
    },

    voice: {
      title: "Voice Studio",
      icon: "🎙️",
      desc: "Let your browser read text aloud.",
      placeholder:
        "Hello from AI Studio..."
    },

    captions: {
      title: "Caption Studio",
      icon: "📝",
      desc: "Generate simple timed captions.",
      placeholder:
        "Paste your transcript here..."
    }

  };

  const c = configs[mode];

  if (!c) return;

  toolCard.innerHTML = `

    <h2>
      ${c.icon} ${c.title}
    </h2>

    <p>
      ${c.desc}
    </p>

    <div class="tool-form">

      <textarea
        id="toolInput"
        placeholder="${c.placeholder}"
      ></textarea>

      <button
        id="toolRun"
        class="send-btn"
      >
        Run
      </button>

    </div>

    <div
      id="toolResult"
      class="result hidden"
    ></div>

  `;

  document.getElementById(
    "toolRun"
  ).onclick = () =>
    runTool(mode);
}

/* --------------------------------
   RUN TOOLS
-------------------------------- */

async function runTool(mode) {

  const toolInput =
    document.getElementById(
      "toolInput"
    );

  const result =
    document.getElementById(
      "toolResult"
    );

  if (!toolInput || !result) return;

  const value =
    toolInput.value.trim();

  if (!value) return;

  result.classList.remove(
    "hidden"
  );

  result.textContent =
    "Working…";

  try {

    /* VOICE */

    if (mode === "voice") {

      if (
        "speechSynthesis"
        in window
      ) {

        speechSynthesis.cancel();

        const speech =
          new SpeechSynthesisUtterance(
            value
          );

        speechSynthesis.speak(
          speech
        );

        result.textContent =
          "Speaking…";

      } else {

        result.textContent =
          "Your browser does not support speech synthesis.";

      }

      return;
    }

    /* ENDPOINT */

    const endpoint =
      mode === "image"
        ? "/api/image"
        : mode === "video"
        ? "/api/video"
        : "/api/captions";

    /* REQUEST BODY */

    const body =
      mode === "captions"
        ? {
            text: value
          }
        : {
            prompt: value
          };

    /* REQUEST */

    const r = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(body)
      }
    );

    /* SAFE RESPONSE */

    const data =
      await getResponseData(r);

    if (!r.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `Request failed (${r.status})`
      );
    }

    /* CAPTIONS */

    if (mode === "captions") {

      if (
        Array.isArray(
          data?.captions
        )
      ) {

        result.textContent =
          data.captions
            .map(
              x =>
                `${x.start}s - ${x.end}s  ${x.text}`
            )
            .join("\n");

      } else {

        result.textContent =
          data?.message ||
          "No captions received.";
      }

    } else {

      result.textContent =
        data?.message ||
        data?.response ||
        "Request completed.";
    }

  } catch (err) {

    console.error(
      "Tool error:",
      err
    );

    result.textContent =
      "Error: " +
      err.message;
  }
}

/* --------------------------------
   MICROPHONE
-------------------------------- */

micBtn.onclick = () => {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    alert(
      "Voice input is not supported by this browser."
    );

    return;
  }

  const rec =
    new SpeechRecognition();

  rec.lang = "en-US";
  rec.interimResults = false;

  rec.onstart = () => {
    micBtn.textContent = "🔴";
  };

  rec.onresult = e => {

    input.value =
      e.results[0][0]
        .transcript;

    input.focus();
  };

  rec.onerror = () => {
    micBtn.textContent = "🎙️";
  };

  rec.onend = () => {
    micBtn.textContent = "🎙️";
  };

  rec.start();
};

/* --------------------------------
   START APP
-------------------------------- */

if (!chats.length) {

  createChat();

} else {

  currentChatId =
    chats[0].id;

  renderChatList();
  renderMessages();
}