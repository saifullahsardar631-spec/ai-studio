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

function saveChats(){ localStorage.setItem("aiStudioChats", JSON.stringify(chats)); }

function createChat(){
  const id = Date.now().toString();
  const chatData = {id, title:"New Chat", messages:[]};
  chats.unshift(chatData);
  currentChatId = id;
  saveChats();
  renderChatList();
  renderMessages();
}

function currentChat(){
  return chats.find(c => c.id === currentChatId);
}

function ensureChat(){
  if(!currentChatId || !currentChat()) createChat();
}

function renderChatList(){
  chatList.innerHTML = "";
  chats.slice(0,30).forEach(c => {
    const el = document.createElement("div");
    el.className = "chat-item" + (c.id === currentChatId ? " active" : "");
    el.textContent = c.title || "New Chat";
    el.onclick = () => { currentChatId = c.id; renderChatList(); renderMessages(); };
    chatList.appendChild(el);
  });
}

function addMessage(text, role){
  const d = document.createElement("div");
  d.className = "msg " + role;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

function renderMessages(){
  chat.innerHTML = "";
  const c = currentChat();
  if(!c || !c.messages.length){
    chat.innerHTML = `<div class="welcome">
      <div class="welcome-icon">✦</div>
      <h2>How can I help?</h2>
      <p>Ask anything. Your local <strong>llama3.2</strong> model will answer.</p>
      <div class="suggestions">
        <button class="suggestion">Explain artificial intelligence simply.</button>
        <button class="suggestion">Write a short Urdu story.</button>
        <button class="suggestion">Help me learn JavaScript.</button>
      </div>
    </div>`;
    bindSuggestions();
    return;
  }
  c.messages.forEach(m => addMessage(m.content, m.role === "user" ? "user" : "bot"));
}

function bindSuggestions(){
  document.querySelectorAll(".suggestion").forEach(b => b.onclick = () => {
    input.value = b.textContent;
    form.requestSubmit();
  });
}

async function sendMessage(prompt){
  ensureChat();
  const c = currentChat();
  c.messages.push({role:"user",content:prompt});
  if(c.title === "New Chat") c.title = prompt.slice(0,42);
  saveChats(); renderChatList();
  renderMessages();
  input.value = ""; input.disabled = true;
  const bot = addMessage("Thinking…","bot");

  try{
    const r = await fetch("/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({prompt,history:c.messages.slice(-12,-1)})
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || "Request failed");
    const answer = data.message || data.response || "No response received.";
    bot.textContent = answer;
    c.messages.push({role:"assistant",content:answer});
    saveChats();
  }catch(err){
    bot.textContent = "Backend/Ollama se connection nahi ho saka.\n" + err.message;
  }finally{
    input.disabled = false; input.focus();
  }
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const prompt = input.value.trim();
  if(prompt && currentMode === "chat") sendMessage(prompt);
});

newChatBtn.onclick = () => createChat();

clearAllBtn.onclick = () => {
  if(confirm("Delete all saved chat history?")){
    chats=[]; currentChatId=null; saveChats(); renderChatList(); renderMessages();
  }
};

themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("aiStudioTheme", document.body.classList.contains("light") ? "light":"dark");
};
if(localStorage.getItem("aiStudioTheme")==="light") document.body.classList.add("light");

document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => {
  currentMode = tab.dataset.mode;
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  if(currentMode === "chat"){
    pageTitle.textContent = "AI Chat";
    chatPanel.classList.remove("hidden"); toolPanel.classList.add("hidden");
    renderMessages();
  }else{
    chatPanel.classList.add("hidden"); toolPanel.classList.remove("hidden");
    renderTool(currentMode);
  }
});

function renderTool(mode){
  const configs = {
    image:{title:"Image Studio",icon:"🖼️",desc:"Describe the image you want. The UI is ready for an image provider.",placeholder:"A futuristic city at sunset..."},
    video:{title:"Video Studio",icon:"🎬",desc:"Create a video prompt. A provider is required for real video generation.",placeholder:"A cinematic shot of mountains in the rain..."},
    voice:{title:"Voice Studio",icon:"🎙️",desc:"Type text and let your browser read it aloud.",placeholder:"Hello from AI Studio..."},
    captions:{title:"Caption Studio",icon:"📝",desc:"Paste a transcript and generate simple timed captions.",placeholder:"Paste your transcript here..."}
  };
  const c=configs[mode];
  toolCard.innerHTML=`<h2>${c.icon} ${c.title}</h2><p>${c.desc}</p>
    <div class="tool-form"><textarea id="toolInput" placeholder="${c.placeholder}"></textarea><button id="toolRun" class="send-btn">Run</button></div>
    <div id="toolResult" class="result hidden"></div>`;
  document.getElementById("toolRun").onclick=()=>runTool(mode);
}

async function runTool(mode){
  const value=document.getElementById("toolInput").value.trim();
  const result=document.getElementById("toolResult");
  if(!value) return;
  result.classList.remove("hidden"); result.textContent="Working…";
  try{
    if(mode==="voice"){
      if("speechSynthesis" in window){
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(value));
        result.textContent="Speaking…";
      }else result.textContent="Your browser does not support speech synthesis.";
      return;
    }
    const endpoint = mode==="image" ? "/api/image" : mode==="video" ? "/api/video" : "/api/captions";
    const body = mode==="captions" ? {text:value} : {prompt:value};
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error || "Request failed");
    result.textContent = mode==="captions"
      ? data.captions.map(x=>`${x.start}s - ${x.end}s  ${x.text}`).join("\n")
      : (data.message || "Request completed.");
  }catch(err){ result.textContent="Error: "+err.message; }
}

micBtn.onclick = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ alert("Voice input is not supported by this browser."); return; }
  const rec = new SpeechRecognition();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.onresult = e => { input.value = e.results[0][0].transcript; };
  rec.onerror = () => {};
  rec.start();
};

if(!chats.length) createChat(); else { currentChatId=chats[0].id; renderChatList(); renderMessages(); }
