const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const chatList = document.getElementById("chatList");
const newChatBtn = document.getElementById("newChat");
const clearAllBtn = document.getElementById("clearAll");
const themeToggle = document.getElementById("themeToggle");
const micBtn = document.getElementById("micBtn");
const chatPanel = document.getElementById("chatPanel");
const toolPanel = document.getElementById("toolPanel");
const toolCard = document.getElementById("toolCard");
const pageTitle = document.getElementById("pageTitle");
const statusLine = document.getElementById("statusLine");

const API_BASE = "";

let chats = JSON.parse(
  localStorage.getItem("aiStudioChats") || "[]"
);

let currentChatId = null;
let currentMode = "chat";

/* =========================
   STORAGE
========================= */

function saveChats() {
  localStorage.setItem(
    "aiStudioChats",
    JSON.stringify(chats)
  );
}

/* =========================
   CHAT
========================= */

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

function getCurrentChat() {
  return chats.find(
    chatItem => chatItem.id === currentChatId
  );
}

function ensureChat() {
  if (!currentChatId || !getCurrentChat()) {
    createChat();
  }
}

/* =========================
   CHAT LIST
========================= */

function renderChatList() {
  chatList.innerHTML = "";

  chats.slice(0, 30).forEach(chatItem => {
    const element = document.createElement("button");

    element.type = "button";
    element.className =
      "chat-item" +
      (chatItem.id === currentChatId
        ? " active"
        : "");

    element.textContent =
      chatItem.title || "New Chat";

    element.onclick = () => {
      currentChatId = chatItem.id;

      renderChatList();
      renderMessages();

      input.focus();
    };

    chatList.appendChild(element);
  });
}

/* =========================
   MESSAGE
========================= */

function addMessage(text, role) {
  const element = document.createElement("div");

  element.className = `msg ${role}`;
  element.textContent = text;

  chat.appendChild(element);

  chat.scrollTop = chat.scrollHeight;

  return element;
}

/* =========================
   RENDER
========================= */

function renderMessages() {
  chat.innerHTML = "";

  const current = getCurrentChat();

  if (!current || current.messages.length === 0) {
    chat.innerHTML = `
      <div class="welcome">
        <div class="welcome-icon">✦</div>

        <h2>How can I help?</h2>

        <p>
          Ask anything. Your
          <strong>Gemini AI</strong>
          will answer.
        </p>

        <div class="suggestions">

          <button class="suggestion" type="button">
            Explain artificial intelligence simply.
          </button>

          <button class="suggestion" type="button">
            Write a short Urdu story.
          </button>

          <button class="suggestion" type="button">
            Help me learn JavaScript.
          </button>

          <button class="suggestion" type="button">
            Pakistan ka capital kya hai?
          </button>

        </div>
      </div>
    `;

    bindSuggestions();
    return;
  }

  current.messages.forEach(message => {
    addMessage(
      message.content,
      message.role === "user"
        ? "user"
        : "bot"
    );
  });
}

/* =========================
   SUGGESTIONS
========================= */

function bindSuggestions() {
  document
    .querySelectorAll(".suggestion")
    .forEach(button => {
      button.onclick = () => {
        input.value =
          button.textContent.trim();

        input.focus();
        form.requestSubmit();
      };
    });
}

/* =========================
   API RESPONSE
========================= */

async function readResponse(response) {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `Server returned an empty response. HTTP ${response.status}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Invalid server response. HTTP ${response.status}`
    );
  }
}

/* =========================
   SEND MESSAGE
========================= */

async function sendMessage(prompt) {
  ensureChat();

  const current = getCurrentChat();

  current.messages.push({
    role: "user",
    content: prompt
  });

  if (current.title === "New Chat") {
    current.title =
      prompt.length > 42
        ? prompt.slice(0, 42) + "..."
        : prompt;
  }

  saveChats();
  renderChatList();
  renderMessages();

  input.value = "";
  input.disabled = true;
  micBtn.disabled = true;

  const botMessage =
    addMessage(
      "Thinking...",
      "bot"
    );

  statusLine.textContent =
    "Connecting to Google Gemini...";

  try {
    const history =
      current.messages
        .slice(-11, -1)
        .map(message => ({
          role: message.role,
          content: message.content
        }));

    const response =
      await fetch(
        `${API_BASE}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt,
            history
          })
        }
      );

    const data =
      await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.details ||
        `HTTP ${response.status}`
      );
    }

    const answer =
      data.message ||
      data.response ||
      data.answer;

    if (!answer) {
      throw new Error(
        "Gemini returned no answer."
      );
    }

    botMessage.textContent = "";

    await typeText(
      botMessage,
      String(answer)
    );

    current.messages.push({
      role: "assistant",
      content: String(answer)
    });

    saveChats();

    statusLine.textContent =
      `Google Gemini • ${
        data.model || "AI"
      }`;

  } catch (error) {
    console.error(
      "Chat error:",
      error
    );

    botMessage.textContent =
      "❌ No response.\n\n" +
      error.message;

    statusLine.textContent =
      "Gemini connection error";
  }

  input.disabled = false;
  micBtn.disabled = false;
  input.focus();
}

/* =========================
   TYPING
========================= */

function typeText(element, text) {
  return new Promise(resolve => {
    let index = 0;

    function write() {
      if (index >= text.length) {
        resolve();
        return;
      }

      element.textContent +=
        text.charAt(index);

      index++;

      chat.scrollTop =
        chat.scrollHeight;

      setTimeout(write, 5);
    }

    write();
  });
}

/* =========================
   FORM
========================= */

form.addEventListener(
  "submit",
  event => {
    event.preventDefault();

    if (currentMode !== "chat") {
      return;
    }

    const prompt =
      input.value.trim();

    if (!prompt) {
      return;
    }

    sendMessage(prompt);
  }
);

/* =========================
   NEW CHAT
========================= */

newChatBtn.onclick = () => {
  createChat();
};

/* =========================
   CLEAR HISTORY
========================= */

clearAllBtn.onclick = () => {
  const confirmed =
    confirm(
      "Delete all saved chat history?"
    );

  if (!confirmed) {
    return;
  }

  chats = [];
  currentChatId = null;

  saveChats();
  createChat();
};

/* =========================
   THEME
========================= */

themeToggle.onclick = () => {
  document.body.classList.toggle("light");

  const light =
    document.body.classList.contains(
      "light"
    );

  localStorage.setItem(
    "aiStudioTheme",
    light ? "light" : "dark"
  );

  themeToggle.textContent =
    light ? "☀️" : "☾";
};

if (
  localStorage.getItem(
    "aiStudioTheme"
  ) === "light"
) {
  document.body.classList.add(
    "light"
  );

  themeToggle.textContent = "☀️";
}

/* =========================
   TABS
========================= */

document
  .querySelectorAll(".tab")
  .forEach(tab => {
    tab.onclick = () => {
      currentMode =
        tab.dataset.mode;

      document
        .querySelectorAll(".tab")
        .forEach(item =>
          item.classList.remove(
            "active"
          )
        );

      tab.classList.add("active");

      if (currentMode === "chat") {
        pageTitle.textContent =
          "AI Chat";

        statusLine.textContent =
          "Google Gemini";

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

/* =========================
   TOOLS
========================= */

function renderTool(mode) {
  const settings = {
    image: {
      title: "Image Studio",
      icon: "🖼️",
      description:
        "Describe the image you want.",
      placeholder:
        "A futuristic city at sunset..."
    },

    video: {
      title: "Video Studio",
      icon: "🎬",
      description:
        "Describe the video you want.",
      placeholder:
        "A cinematic mountain scene..."
    },

    voice: {
      title: "Voice Studio",
      icon: "🎙️",
      description:
        "Type text and let your browser speak it.",
      placeholder:
        "Hello from AI Studio..."
    },

    captions: {
      title: "Caption Studio",
      icon: "📝",
      description:
        "Paste text to create simple captions.",
      placeholder:
        "Paste your transcript here..."
    }
  };

  const setting =
    settings[mode];

  if (!setting) {
    return;
  }

  toolCard.innerHTML = `
    <h2>
      ${setting.icon}
      ${setting.title}
    </h2>

    <p>
      ${setting.description}
    </p>

    <div class="tool-form">

      <textarea
        id="toolInput"
        placeholder="${setting.placeholder}"
      ></textarea>

      <button
        id="toolRun"
        class="send-btn"
        type="button"
      >
        Run
      </button>

    </div>

    <pre
      id="toolResult"
      class="result hidden"
    ></pre>
  `;

  document.getElementById(
    "toolRun"
  ).onclick = () =>
    runTool(mode);
}

/* =========================
   RUN TOOL
========================= */

async function runTool(mode) {
  const toolInput =
    document.getElementById(
      "toolInput"
    );

  const result =
    document.getElementById(
      "toolResult"
    );

  if (!toolInput || !result) {
    return;
  }

  const value =
    toolInput.value.trim();

  if (!value) {
    result.classList.remove(
      "hidden"
    );

    result.textContent =
      "Please enter something first.";

    return;
  }

  result.classList.remove(
    "hidden"
  );

  result.textContent =
    "Working...";

  try {
    /* VOICE */

    if (mode === "voice") {
      if (
        !("speechSynthesis" in window)
      ) {
        throw new Error(
          "Your browser does not support voice."
        );
      }

      speechSynthesis.cancel();

      const speech =
        new SpeechSynthesisUtterance(
          value
        );

      speech.lang = "en-US";

      speechSynthesis.speak(
        speech
      );

      result.textContent =
        "🔊 Speaking...";

      return;
    }

    /* CAPTIONS */

    if (mode === "captions") {
      const response =
        await fetch(
          `${API_BASE}/api/captions`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              text: value
            })
          }
        );

      const data =
        await readResponse(
          response
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.details ||
          "Caption request failed."
        );
      }

      result.textContent =
        (data.captions || [])
          .map(
            caption =>
              `${caption.start}s - ${caption.end}s  ${caption.text}`
          )
          .join("\n");

      return;
    }

    /* IMAGE / VIDEO */

    const endpoint =
      mode === "image"
        ? "/api/image"
        : "/api/video";

    const response =
      await fetch(
        `${API_BASE}${endpoint}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt: value
          })
        }
      );

    const data =
      await readResponse(
        response
      );

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.details ||
        "Request failed."
      );
    }

    result.textContent =
      data.message ||
      "Request completed.";

  } catch (error) {
    console.error(
      "Tool error:",
      error
    );

    result.textContent =
      "❌ Error: " +
      error.message;
  }
}

/* =========================
   MICROPHONE
========================= */

micBtn.onclick = () => {
  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Recognition) {
    alert(
      "Voice input is not supported by this browser."
    );

    return;
  }

  const recognition =
    new Recognition();

  recognition.lang = "en-US";
  recognition.interimResults =
    false;

  recognition.onstart = () => {
    micBtn.textContent = "🔴";
  };

  recognition.onresult = event => {
    input.value =
      event.results[0][0]
        .transcript;

    input.focus();
  };

  recognition.onerror = error => {
    console.error(
      "Microphone error:",
      error
    );

    micBtn.textContent = "🎙️";
  };

  recognition.onend = () => {
    micBtn.textContent = "🎙️";
  };

  recognition.start();
};

/* =========================
   START
========================= */

if (chats.length === 0) {
  createChat();
} else {
  currentChatId =
    chats[0].id;

  renderChatList();
  renderMessages();
}

console.log(
  "AI Studio frontend loaded successfully."
);