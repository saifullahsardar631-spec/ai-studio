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
const statusLine = document.getElementById("statusLine");

let chats = JSON.parse(
  localStorage.getItem("aiStudioChats") || "[]"
);

let currentChatId = null;
let currentMode = "chat";

/* --------------------------------
   CONFIG
-------------------------------- */

const API_BASE = "";

/* --------------------------------
   STORAGE
-------------------------------- */

function saveChats() {
  localStorage.setItem(
    "aiStudioChats",
    JSON.stringify(chats)
  );
}

/* --------------------------------
   CHAT
-------------------------------- */

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
  return chats.find(
    c => c.id === currentChatId
  );
}

function ensureChat() {
  if (!currentChatId || !currentChat()) {
    createChat();
  }
}

/* --------------------------------
   CHAT LIST
-------------------------------- */

function renderChatList() {
  chatList.innerHTML = "";

  chats.slice(0, 30).forEach(c => {
    const el = document.createElement("div");

    el.className =
      "chat-item" +
      (c.id === currentChatId
        ? " active"
        : "");

    el.textContent =
      c.title || "New Chat";

    el.onclick = () => {
      currentChatId = c.id;

      renderChatList();
      renderMessages();

      input.focus();
    };

    chatList.appendChild(el);
  });
}

/* --------------------------------
   MESSAGE
-------------------------------- */

function addMessage(text, role) {
  const d = document.createElement("div");

  d.className =
    "msg " + role;

  d.textContent = text;

  chat.appendChild(d);

  chat.scrollTop =
    chat.scrollHeight;

  return d;
}

/* --------------------------------
   RENDER MESSAGES
-------------------------------- */

function renderMessages() {
  chat.innerHTML = "";

  const c = currentChat();

  if (!c || !c.messages.length) {
    chat.innerHTML = `
      <div class="welcome">

        <div class="welcome-icon">
          ✦
        </div>

        <h2>
          How can I help?
        </h2>

        <p>
          Ask anything.
          Your
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
      m.role === "user"
        ? "user"
        : "bot"
    );

  });
}

/* --------------------------------
   SUGGESTIONS
-------------------------------- */

function bindSuggestions() {

  document
    .querySelectorAll(".suggestion")
    .forEach(button => {

      button.onclick = () => {

        input.value =
          button.textContent.trim();

        form.requestSubmit();

      };

    });

}

/* --------------------------------
   SAFE JSON
-------------------------------- */

async function getResponseData(response) {

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  const text =
    await response.text();

  if (!text.trim()) {

    throw new Error(
      `Server returned an empty response (HTTP ${response.status}).`
    );

  }

  if (
    contentType.includes(
      "application/json"
    )
  ) {

    try {

      return JSON.parse(text);

    } catch {

      throw new Error(
        "Server returned invalid JSON."
      );

    }

  }

  try {

    return JSON.parse(text);

  } catch {

    throw new Error(
      `Server returned an unexpected response (HTTP ${response.status}).`
    );

  }
}

/* --------------------------------
   SEND CHAT
-------------------------------- */

async function sendMessage(prompt) {

  ensureChat();

  const c =
    currentChat();

  c.messages.push({
    role: "user",
    content: prompt
  });

  if (
    c.title === "New Chat"
  ) {

    c.title =
      prompt.slice(0, 42);

  }

  saveChats();

  renderChatList();
  renderMessages();

  input.value = "";

  input.disabled = true;
  micBtn.disabled = true;

  const bot =
    addMessage(
      "Thinking…",
      "bot"
    );

  try {

    statusLine.textContent =
      "Google Gemini • AI Studio";

    const response =
      await fetch(
        `${API_BASE}/api/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              prompt,

              history:
                c.messages.slice(
                  -12,
                  -1
                )

            })

        }
      );

    const data =
      await getResponseData(
        response
      );

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.details ||
        data?.message ||
        `Gemini request failed (HTTP ${response.status}).`
      );

    }

    const answer =
      data?.message ||
      data?.response ||
      data?.answer;

    if (!answer) {

      throw new Error(
        "Gemini returned no response."
      );

    }

    bot.textContent = "";

    await typeText(
      bot,
      String(answer)
    );

    c.messages.push({

      role: "assistant",

      content:
        String(answer)

    });

    saveChats();

    statusLine.textContent =
      `Google Gemini • ${
        data?.model || "AI"
      }`;

  } catch (error) {

    console.error(
      "Gemini chat error:",
      error
    );

    bot.textContent =
      "Gemini se connection nahi ho saka.\n\n" +
      error.message;

    statusLine.textContent =
      "Google Gemini • Connection error";

  } finally {

    input.disabled = false;
    micBtn.disabled = false;

    input.focus();

  }
}

/* --------------------------------
   TYPING
-------------------------------- */

function typeText(
  element,
  text
) {

  return new Promise(
    resolve => {

      let i = 0;

      const speed = 8;

      function write() {

        if (
          i < text.length
        ) {

          element.textContent +=
            text.charAt(i);

          i++;

          chat.scrollTop =
            chat.scrollHeight;

          setTimeout(
            write,
            speed
          );

        } else {

          resolve();

        }

      }

      write();

    }
  );
}

/* --------------------------------
   FORM
-------------------------------- */

form.addEventListener(
  "submit",
  e => {

    e.preventDefault();

    const prompt =
      input.value.trim();

    if (!prompt)
      return;

    if (
      currentMode === "chat"
    ) {

      sendMessage(
        prompt
      );

    }

  }
);

/* --------------------------------
   NEW CHAT
-------------------------------- */

newChatBtn.onclick = () => {

  createChat();

};

/* --------------------------------
   CLEAR HISTORY
-------------------------------- */

clearAllBtn.onclick = () => {

  if (
    confirm(
      "Delete all saved chat history?"
    )
  ) {

    chats = [];

    currentChatId =
      null;

    saveChats();

    createChat();

  }

};

/* --------------------------------
   THEME
-------------------------------- */

themeToggle.onclick = () => {

  document.body
    .classList
    .toggle("light");

  const theme =
    document.body
      .classList
      .contains("light")
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
  localStorage.getItem(
    "aiStudioTheme"
  ) === "light"
) {

  document.body
    .classList
    .add("light");

  themeToggle.textContent =
    "☀️";

}

/* --------------------------------
   TABS
-------------------------------- */

document
  .querySelectorAll(".tab")
  .forEach(tab => {

    tab.onclick = () => {

      currentMode =
        tab.dataset.mode;

      document
        .querySelectorAll(
          ".tab"
        )
        .forEach(t =>
          t.classList.remove(
            "active"
          )
        );

      tab.classList.add(
        "active"
      );

      if (
        currentMode === "chat"
      ) {

        pageTitle.textContent =
          "AI Chat";

        statusLine.textContent =
          "Google Gemini";

        chatPanel
          .classList
          .remove("hidden");

        toolPanel
          .classList
          .add("hidden");

        renderMessages();

        input.focus();

      } else {

        chatPanel
          .classList
          .add("hidden");

        toolPanel
          .classList
          .remove("hidden");

        renderTool(
          currentMode
        );

      }

    };

  });

/* --------------------------------
   TOOLS
-------------------------------- */

function renderTool(mode) {

  const configs = {

    image: {

      title:
        "Image Studio",

      icon:
        "🖼️",

      desc:
        "Describe the image you want.",

      placeholder:
        "A futuristic city at sunset..."

    },

    video: {

      title:
        "Video Studio",

      icon:
        "🎬",

      desc:
        "Create a video prompt.",

      placeholder:
        "A cinematic shot of mountains in the rain..."

    },

    voice: {

      title:
        "Voice Studio",

      icon:
        "🎙️",

      desc:
        "Let your browser read text aloud.",

      placeholder:
        "Hello from AI Studio..."

    },

    captions: {

      title:
        "Caption Studio",

      icon:
        "📝",

      desc:
        "Generate simple timed captions.",

      placeholder:
        "Paste your transcript here..."

    }

  };

  const c =
    configs[mode];

  if (!c)
    return;

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

  document
    .getElementById("toolRun")
    .onclick = () =>
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

  if (
    !toolInput ||
    !result
  )
    return;

  const value =
    toolInput.value.trim();

  if (!value)
    return;

  result
    .classList
    .remove("hidden");

  result.textContent =
    "Working…";

  try {

    /* VOICE */

    if (
      mode === "voice"
    ) {

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

    /* BODY */

    const body =
      mode === "captions"
        ? {
            text: value
          }
        : {
            prompt: value
          };

    /* REQUEST */

    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              body
            )

        }
      );

    const data =
      await getResponseData(
        response
      );

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.details ||
        data?.message ||
        `Request failed (HTTP ${response.status}).`
      );

    }

    /* CAPTIONS */

    if (
      mode === "captions"
    ) {

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

  } catch (error) {

    console.error(
      "Tool error:",
      error
    );

    result.textContent =
      "Error: " +
      error.message;

  }

}

/* --------------------------------
   MICROPHONE
-------------------------------- */

micBtn.onclick = () => {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (
    !SpeechRecognition
  ) {

    alert(
      "Voice input is not supported by this browser."
    );

    return;

  }

  const rec =
    new SpeechRecognition();

  rec.lang =
    "en-US";

  rec.interimResults =
    false;

  rec.onstart = () => {

    micBtn.textContent =
      "🔴";

  };

  rec.onresult = e => {

    input.value =
      e.results[0][0]
        .transcript;

    input.focus();

  };

  rec.onerror = () => {

    micBtn.textContent =
      "🎙️";

  };

  rec.onend = () => {

    micBtn.textContent =
      "🎙️";

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