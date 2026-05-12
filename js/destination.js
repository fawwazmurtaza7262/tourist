console.log("Destination JS loaded — OpenRouter");


// ─── OpenRouter API ───
const OPENROUTER_KEY = CONFIG.OPENROUTER_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_MODEL = "openai/gpt-4o-mini";


// ─── Element refs ───
const nlInput       = document.getElementById("nlInput");
const parsedSummary = document.getElementById("parsedSummary");
const chipCity      = document.getElementById("chipCity");
const chipDates     = document.getElementById("chipDates");
const chipBudget    = document.getElementById("chipBudget");
const chipCurrency  = document.getElementById("chipCurrency");
const discoverBtn   = document.getElementById("discoverBtn");


// ─── Currency config ───
const currencySymbols = {
  USD:"$", EUR:"€", GBP:"£", CAD:"CA$", AUD:"A$",
  JPY:"¥", CHF:"CHF ", PKR:"₨", AED:"AED ", INR:"₹",
  MXN:"MX$", BRL:"R$", KRW:"₩", CNY:"¥", SGD:"S$",
  THB:"฿", TRY:"₺", ZAR:"R", SEK:"kr", NOK:"kr"
};


// ─── State ───
let parsedCity       = "";
let parsedDays       = 3;
let parsedBudget     = 5000;
let parsedCurrency   = "USD";
let parsedStartTime  = "9:00 AM";
let parsedDatesLabel = "";
let editingItinerary = null;
let chatHistory      = [];
let isGenerating     = false;


// ─── OpenRouter helper with auto-retry ───
async function callAI(systemPrompt, userPrompt, maxTokens = 4096) {
  if (!OPENROUTER_KEY || OPENROUTER_KEY === "YOUR_OPENROUTER_KEY_HERE") {
    throw new Error("NO_KEY: Please add your OpenRouter API key to js/config.js");
  }

  const MAX_RETRIES = 3;
  let fallbackDelayMs = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": window.location.href,
        "X-Title": "Tourist Planner"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt }
        ]
      })
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;

    if (!res.ok || data.error) {
      const msg = data?.error?.message || `HTTP ${res.status}`;

      if (
        res.status === 401 ||
        data?.error?.code === 401 ||
        msg.toLowerCase().includes("auth") ||
        msg.toLowerCase().includes("key")
      ) {
        throw new Error("NO_KEY: Invalid API key. Check your key at openrouter.ai/keys");
      }

      if (res.status === 429 || data?.error?.code === 429) {
        if (attempt < MAX_RETRIES) {
          const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : fallbackDelayMs;

          updateLoadingLabel(`Rate limited — waiting ${Math.round(waitMs / 1000)}s, then retrying… (${attempt}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, waitMs));
          fallbackDelayMs = Math.min(fallbackDelayMs * 2, 30000);
          continue;
        }
        throw new Error("RATE: Still rate limited after several retries. Please wait and try again.");
      }

      throw new Error(msg);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response. Please try again.");
    return text;
  }
}


function parseJSON(raw) {
  return JSON.parse(raw.replace(/```json/gi,"").replace(/```/g,"").trim());
}


// ─── Currency mapping helper ───
const currencyMap = [
  { re: /\b(usd|us dollar|us dollars?|dollar|dollars?)\b/i,           code: "USD" },
  { re: /\b(cad|canadian dollar|canadian dollars?)\b/i,               code: "CAD" },
  { re: /\b(gbp|pound|pounds?|british pound|sterling)\b/i,            code: "GBP" },
  { re: /\b(eur|euro|euros?)\b/i,                                     code: "EUR" },
  { re: /\b(aud|australian dollar|australian dollars?)\b/i,           code: "AUD" },
  { re: /\b(jpy|yen)\b/i,                                             code: "JPY" },
  { re: /\b(inr|rupee|rupees)\b/i,                                    code: "INR" },
  { re: /\b(pkr|pakistani rupee|pakistani rupees)\b/i,                code: "PKR" },
  { re: /\b(aed|dirham|dirhams)\b/i,                                  code: "AED" },
  { re: /\b(mxn|peso|pesos?)\b/i,                                     code: "MXN" },
  { re: /\b(brl|real|reais)\b/i,                                      code: "BRL" },
  { re: /\b(chf|franc|francs)\b/i,                                    code: "CHF" },
  { re: /\b(sgd|singapore dollar|singapore dollars?)\b/i,             code: "SGD" }
];


// ─── NL Parsing (regex — no AI calls wasted) ───
let parseDebounce = null;
nlInput.addEventListener("input", () => {
  const val = nlInput.value.trim();
  discoverBtn.classList.toggle("active", val.length > 3);
  clearTimeout(parseDebounce);
  if (val.length < 3) { parsedSummary.style.display = "none"; return; }
  parseDebounce = setTimeout(() => parseInput(val), 400);
});


function parseInput(text) {
  const lower = text.toLowerCase();

  // ─── START TIME — parsed FIRST before anything else touches the string ───
  // Matches: "start at 1 pm", "starting at 9:30am", "begin at 10 AM", "kick off at 2pm"
  const timeMatch = lower.match(
    /(?:start(?:ing)?|begin(?:ning)?|kick\s*off)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/
  );

  if (timeMatch) {
    let hour     = parseInt(timeMatch[1], 10);
    const mins   = timeMatch[2] || "00";
    const period = timeMatch[3].toUpperCase();

    if (hour === 12 && period === "AM") hour = 0;
    if (hour !== 12 && period === "PM") hour += 12;

    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    parsedStartTime = `${displayHour}:${mins} ${period}`;
  } else {
    parsedStartTime = "9:00 AM";
  }

  // ─── CITY ───
  const cityMatch = text.match(
    /(?:go(?:ing)?\s+to|trip\s+to|visit(?:ing)?|travel(?:ling)?\s+to|in|fly(?:ing)?\s+to|heading\s+to)\s+([A-Z][a-zA-Z\s\-]{1,30}?)(?=\s+(?:for|from|with|on|\d)|[,.]|$)/i
  );
  parsedCity = cityMatch ? cityMatch[1].trim().replace(/\s+/g," ") : "";
  if (!parsedCity) {
    const cap = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/);
    if (cap) parsedCity = cap[1];
  }

  // ─── DAYS ───
  const daysMatch = lower.match(/(\d+)\s*day/);
  const weekMatch = lower.match(/(\d+)\s*week/);
  const aWeek     = lower.includes("a week") || lower.includes("one week");
  parsedDays = daysMatch ? parseInt(daysMatch[1])
             : weekMatch ? parseInt(weekMatch[1]) * 7
             : aWeek     ? 7 : 3;
  parsedDays = Math.max(1, Math.min(parsedDays, 30));

  // ─── CURRENCY (words, codes, symbols) ───
  parsedCurrency = "USD";
  for (const c of currencyMap) {
    if (c.re.test(text)) {
      parsedCurrency = c.code;
      break;
    }
  }

  // Fallback using symbols if no words/codes matched
  if (!text.match(/\b(usd|cad|gbp|eur|aud|jpy|inr|pkr|aed|mxn|brl|chf|sgd|dollar|dollars?|pound|pounds?|euro|euros?|yen|rupee|rupees|dirham|dirhams|peso|pesos?|franc|francs|real|reais)\b/i) && /[£$€₨₹¥]/.test(text)) {
    if      (text.includes("£")) parsedCurrency = "GBP";
    else if (text.includes("€")) parsedCurrency = "EUR";
    else if (text.includes("₨")) parsedCurrency = "PKR";
    else if (text.includes("₹")) parsedCurrency = "INR";
    else if (text.includes("¥")) parsedCurrency = "JPY";
    else                         parsedCurrency = "USD";
  }

  // ─── BUDGET (no longer grabs "1 day") ───
  const budgetPatterns = [
    /(?:budget|spend|cost|under|around|about|on)\s*(?:of\s*)?\b(?:[£$€₨₹¥]?|CAD|USD|GBP|EUR|AUD|JPY|PKR)\b\s*(\d[\d,]*(?:\.\d+)?)(k)?\s*(?:budget|spend|cost)?\b/i,
    /\b(\d[\d,]*(?:\.\d+)?)(k)?\s*\b(?:[£$€₨₹¥]?|CAD|USD|GBP|EUR|AUD|JPY|PKR)\b\s*(?:budget|spend|cost|under|around|about)\b/i,
    /\b(?:budget|spend|cost|under|around|about|on)\s*(?:of\s*)?(\d[\d,]*(?:\.\d+)?)(k)?\b/i,
    /[£$€₨₹¥]\s*(\d[\d,]*(?:\.\d+)?)(k)?/i
  ];

  let budgetMatch = null;
  for (const re of budgetPatterns) {
    const m = text.match(re);
    if (m) { budgetMatch = m; break; }
  }

  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(/,/g, ""));
    if (budgetMatch[2]) val *= 1000;
    parsedBudget = val > 0 ? val : 5000;
  } else {
    parsedBudget = 5000;
  }

  // ─── DATES ───
  const dateMatch = text.match(/(?:from\s+)?([A-Z][a-z]+\s+\d{1,2})(?:\s*[-–to]+\s*(?:[A-Z][a-z]+\s*)?\d{1,2})?/);
  parsedDatesLabel = dateMatch ? dateMatch[0].replace(/^from\s+/i,"").trim() : "";

  if (parsedCity) showParsedSummary();
  else parsedSummary.style.display = "none";
}


function showParsedSummary() {
  if (!parsedCity && !parsedDays) return;
  const sym = currencySymbols[parsedCurrency] || parsedCurrency + " ";
  chipCity.innerHTML     = parsedCity ? `📍 <strong>${parsedCity}</strong>` : "";
  chipDates.innerHTML    = parsedDatesLabel
    ? `📅 <strong>${parsedDatesLabel}</strong> · ${parsedDays} day${parsedDays>1?"s":""}`
    : `📅 <strong>${parsedDays} day${parsedDays>1?"s":""}</strong>`;
  chipBudget.innerHTML   = `💰 <strong>${sym}${parsedBudget.toLocaleString()}</strong>`;
  chipCurrency.innerHTML = `🌐 <strong>${parsedCurrency}</strong>`;
  chipCity.style.display     = parsedCity ? "" : "none";
  chipDates.style.display    = parsedDays  ? "" : "none";
  chipBudget.style.display   = "";
  chipCurrency.style.display = "";
  parsedSummary.style.display = "flex";
}


// ─── Search History ───
function getHistory() { return JSON.parse(localStorage.getItem("searchHistory")) || []; }
function saveToHistory(city) {
  let h = getHistory().filter(c => c.toLowerCase() !== city.toLowerCase());
  h.unshift(city); h = h.slice(0, 6);
  localStorage.setItem("searchHistory", JSON.stringify(h));
}
function renderHistory() {
  const container = document.getElementById("searchHistory");
  if (!container) return;
  const history = getHistory();
  if (!history.length) { container.innerHTML = ""; return; }
  container.innerHTML = `<span class="history-label">Recent:</span>
    ${history.map(city => `<button onclick="fillCity('${city.replace(/'/g, "\\'")}') " class="history-chip">📍 ${city}</button>`).join("")}
    <button onclick="clearHistory()" class="history-clear">✕ clear</button>`;
}
window.fillCity = function(city) {
  nlInput.value = `I want to go to ${city}`;
  discoverBtn.classList.add("active");
  nlInput.focus();
  parseInput(nlInput.value.trim());
};
window.clearHistory = function() {
  localStorage.removeItem("searchHistory");
  renderHistory();
};


// ─── Discover Button ───
discoverBtn.addEventListener("click", () => {
  if (isGenerating) return;

  const rawInput = nlInput.value.trim();
  if (!rawInput) { alert("Tell us where you want to go!"); return; }

  if (!parsedCity) parseInput(rawInput);
  const rawCity = parsedCity || rawInput;
  if (!rawCity) { alert("Please enter a destination."); return; }

  isGenerating = true;
  discoverBtn.disabled = true;
  discoverBtn.textContent = "Generating…";

  localStorage.setItem("selectedDays",     parsedDays);
  localStorage.setItem("tripBudget",       parsedBudget);
  localStorage.setItem("lastSearchedCity", rawCity);
  localStorage.setItem("tripCurrency",     parsedCurrency);
  localStorage.setItem("tripDatesLabel",   parsedDatesLabel);
  saveToHistory(rawCity);

  showLoadingSection(rawCity);
});


// ══════════════════════════════════════════════
// STEP 1 — GENERATE ITINERARY
// ══════════════════════════════════════════════

function showLoadingSection(city) {
  let section = document.getElementById("itineraryGenSection");
  if (!section) {
    section = document.createElement("section");
    section.id = "itineraryGenSection";
    section.className = "itinerary-gen-section";
    document.querySelector(".search-container").insertAdjacentElement("afterend", section);
  }
  const sym = currencySymbols[parsedCurrency] || parsedCurrency + " ";
  section.style.display = "block";
  section.innerHTML = `
    <div class="itin-gen-header">
      <div class="itin-gen-eyebrow">✨ AI Itinerary Planner</div>
      <h2 class="itin-gen-title">Building your itinerary for <em>${city}</em></h2>
      <p class="itin-gen-sub">${parsedDays} day${parsedDays>1?"s":""} · ${sym}${parsedBudget.toLocaleString()} ${parsedCurrency}${parsedDatesLabel ? " · " + parsedDatesLabel : ""}</p>
    </div>
    <div class="single-loading-wrap">
      <div class="single-loading-card">
        <div class="spinner"></div>
        <p class="loading-label">Crafting your personalised itinerary…</p>
      </div>
    </div>
  `;
  section.scrollIntoView({ behavior: "smooth" });
  generateItinerary(city);
}


async function generateItinerary(city) {
  const sym = currencySymbols[parsedCurrency] || parsedCurrency + " ";
  try {
    const raw = await callAI(
      "You are an expert travel planner. Always respond with ONLY a raw JSON object — no markdown, no backticks, no explanation.",
      `Create a ${parsedDays}-day itinerary for ${city} with a budget of ${sym}${parsedBudget} ${parsedCurrency}. Start the first day at ${parsedStartTime} and do not begin earlier than that time. Use 24‑hour style times in your JSON (e.g. "13:00").

Return ONLY this JSON structure:
{
  "title": "Trip to ${city}",
  "emoji": "✈️",
  "tagline": "One compelling sentence about this trip",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "estimatedCost": "${sym}XXXX",
  "days": [
    {
      "day": 1,
      "theme": "Arrival & First Impressions",
      "activities": [
        { "time": "9:00 AM", "name": "Name", "desc": "Under 10 words", "cost": "${sym}0", "type": "attraction" }
      ]
    }
  ]
}
Generate exactly ${parsedDays} days, 4-5 activities each. Types: attraction, food, transport, hotel. Pick a fitting emoji for ${city}.`,
      4096
    );

    const itin = parseJSON(raw);

    // Force the first activity of the trip to start at parsedStartTime
    if (itin.days?.length && itin.days[0].activities?.length) {
      itin.days[0].activities[0].time = parsedStartTime;
    }

    document.getElementById("itineraryGenSection").style.display = "none";
    editingItinerary = itin;
    chatHistory = [];
    showEditor();
  } catch(err) {
    console.error("Generation error:", err);
    showGenerationError(city, err.message);
  } finally {
    isGenerating = false;
    discoverBtn.disabled = false;
    discoverBtn.textContent = "Generate Itinerary";
  }
}


function updateLoadingLabel(text) {
  const label = document.querySelector(".loading-label");
  if (label) label.textContent = text;
}


function showGenerationError(city, errMsg = "") {
  const wrap = document.querySelector(".single-loading-wrap");
  if (!wrap) return;

  const isNoKey  = errMsg.startsWith("NO_KEY:");
  const isRate   = errMsg.startsWith("RATE:");
  const safeCity = city.replace(/\\/g,"\\\\").replace(/'/g,"\\'");

  let icon, title, body, action;

  if (isNoKey) {
    icon  = "🔑";
    title = "API Key Required";
    body  = errMsg.replace("NO_KEY: ","") + "<br><br>1. Go to <strong>openrouter.ai/keys</strong><br>2. Sign up free &amp; create a key<br>3. Paste it in <strong>js/config.js</strong> and refresh this page.";
    action = "";
  } else if (isRate) {
    icon   = "⏳";
    title  = "Too many requests";
    body   = "Please wait 30 seconds and try again.";
    action = `<button onclick="generateItinerary('${safeCity}')" class="retry-gen-btn" style="margin-top:8px;">↺ Retry</button>`;
  } else {
    icon   = "⚠️";
    title  = "Failed to generate itinerary";
    body   = "Something went wrong. Please try again.";
    action = `<button onclick="generateItinerary('${safeCity}')" class="retry-gen-btn" style="margin-top:8px;">↺ Retry</button>`;
  }

  wrap.innerHTML = `
    <div class="single-loading-card">
      <div style="font-size:2rem;margin-bottom:8px;">${icon}</div>
      <p style="color:#EF4444;font-weight:700;font-size:1rem;margin:0 0 10px;">${title}</p>
      <p style="font-size:0.85rem;color:#555;line-height:1.6;max-width:380px;margin:0 0 4px;">${body}</p>
      ${action}
    </div>
  `;
}


// ══════════════════════════════════════════════
// STEP 2 — EDITOR
// ══════════════════════════════════════════════

function showEditor() {
  let section = document.getElementById("itineraryEditorSection");
  if (!section) {
    section = document.createElement("section");
    section.id = "itineraryEditorSection";
    section.className = "itin-editor-section";
    document.querySelector(".search-container").insertAdjacentElement("afterend", section);
  }
  section.style.display = "block";
  renderEditor();
  section.scrollIntoView({ behavior: "smooth" });
}


function renderEditor() {
  const section = document.getElementById("itineraryEditorSection");
  const itin    = editingItinerary;
  const sym     = currencySymbols[parsedCurrency] || parsedCurrency + " ";
  const city    = parsedCity || localStorage.getItem("lastSearchedCity") || "Your Destination";

  section.innerHTML = `
    <div class="editor-header">
      <button class="back-to-options-btn" onclick="backToSearch()">← New Search</button>
      <div class="editor-title-wrap">
        <span class="editor-emoji">${itin.emoji || "✈️"}</span>
        <div>
          <h2 class="editor-title">${itin.title}</h2>
          <p class="editor-sub">${city} · ${parsedDays} day${parsedDays>1?"s":""} · ${sym}${parsedBudget.toLocaleString()}</p>
        </div>
      </div>
      <button class="finalize-btn" onclick="finalizeItinerary()">✓ Save &amp; View Full Plan</button>
    </div>

    <div class="editor-body">
      <div class="editor-days" id="editorDays"></div>
      <div class="editor-sidebar">
        <div class="editor-sidebar-card">
          <h4>✨ Highlights</h4>
          <ul class="highlight-list">${(itin.highlights||[]).map(h=>`<li>${h}</li>`).join("")}</ul>
        </div>
        <div class="editor-sidebar-card">
          <h4>➕ Add Activity</h4>
          <select id="addToDaySelect" class="editor-input">
            ${(itin.days||[]).map((d,i)=>`<option value="${i}">Day ${d.day}: ${d.theme||""}</option>`).join("")}
          </select>
          <input id="newActivityTime" class="editor-input" type="text" placeholder="Time (e.g. 2:00 PM)">
          <input id="newActivityName" class="editor-input" type="text" placeholder="Activity name">
          <input id="newActivityDesc" class="editor-input" type="text" placeholder="Short description">
          <input id="newActivityCost" class="editor-input" type="text" placeholder="Cost (e.g. ${sym}20)">
          <button class="add-activity-btn" onclick="addCustomActivity()">Add to Itinerary</button>
        </div>
        <div class="editor-sidebar-card chat-card">
          <h4>💬 Chat with AI</h4>
          <p class="chat-hint">Ask me to modify this itinerary — swap activities, adjust budget, add a rest day…</p>
          <div class="chat-messages" id="editorChatMessages"></div>
          <div class="chat-input-row">
            <textarea id="editorChatInput" placeholder="e.g. Replace Day 2 lunch with a vegan option…" rows="2"></textarea>
            <button onclick="sendChatEdit()" class="chat-send-btn">↑</button>
          </div>
        </div>
      </div>
    </div>
  `;
  renderDays();
  chatHistory.forEach(m => appendChatMessage(m.role, m.text, false, true));
  setTimeout(() => {
    const chatInput = document.getElementById("editorChatInput");
    if (chatInput) {
      chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatEdit(); }
      });
    }
  }, 100);
}


function renderDays() {
  const container = document.getElementById("editorDays");
  if (!container) return;
  container.innerHTML = "";
  const typeColors = { attraction:"#3B82F6", food:"#F59E0B", transport:"#10B981", hotel:"#8B5CF6" };

  (editingItinerary.days || []).forEach((day, dayIdx) => {
    const activitiesHTML = (day.activities || []).map((act, actIdx) => `
      <div class="editor-activity">
        <span class="act-type-dot" style="background:${typeColors[act.type] || '#94A3B8'}"></span>
        <div class="act-info">
          <span class="act-time">${act.time || ""}</span>
          <span class="act-name">${act.name}</span>
          ${act.desc ? `<span class="act-desc">${act.desc}</span>` : ""}
        </div>
        <span class="act-cost">${act.cost || ""}</span>
        <button class="act-remove-btn" onclick="removeActivity(${dayIdx},${actIdx})" title="Remove">✕</button>
      </div>
    `).join("");

    const dayCard = document.createElement("div");
    dayCard.className = "editor-day-card";
    dayCard.innerHTML = `
      <div class="editor-day-header">
        <div class="editor-day-badge">Day ${day.day}</div>
        <div class="editor-day-theme">${day.theme || ""}</div>
        <span class="editor-day-count">${(day.activities || []).length} activities</span>
      </div>
      <div class="editor-activities-list">${activitiesHTML || '<p class="no-acts">No activities yet.</p>'}</div>
    `;
    container.appendChild(dayCard);
  });
}


window.removeActivity = function(dayIdx, actIdx) {
  editingItinerary.days[dayIdx].activities.splice(actIdx, 1);
  renderDays();
  showEditorToast("Activity removed");
};


window.addCustomActivity = function() {
  const dayIdx = parseInt(document.getElementById("addToDaySelect").value);
  const time   = document.getElementById("newActivityTime").value.trim();
  const name   = document.getElementById("newActivityName").value.trim();
  const desc   = document.getElementById("newActivityDesc").value.trim();
  const cost   = document.getElementById("newActivityCost").value.trim();
  if (!name) { showEditorToast("Please enter an activity name", "error"); return; }
  editingItinerary.days[dayIdx].activities.push({ time: time || "", name, desc, cost, type: "attraction" });
  renderDays();
  ["newActivityTime","newActivityName","newActivityDesc","newActivityCost"].forEach(id => {
    document.getElementById(id).value = "";
  });
  showEditorToast("Activity added ✓");
};


window.backToSearch = function() {
  document.getElementById("itineraryEditorSection").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
};


// ─── AI Chat Edit ───
window.sendChatEdit = async function() {
  if (isGenerating) return;

  const input   = document.getElementById("editorChatInput");
  const msgText = input.value.trim();
  if (!msgText) return;

  isGenerating = true;
  input.value  = "";
  appendChatMessage("user", msgText);
  appendChatMessage("ai", "✦ Updating your itinerary…", true);

  try {
    const raw = await callAI(
      "You are a travel assistant that edits itineraries. Return ONLY raw JSON — no markdown, no backticks, no explanation.",
      `Current itinerary:\n${JSON.stringify(editingItinerary, null, 2)}\n\nUser request: "${msgText}"\n\nReturn ONLY the updated itinerary as raw JSON, same structure.`,
      4096
    );
    editingItinerary = parseJSON(raw);
    const savedHistory = [...chatHistory];
    renderEditor();
    chatHistory = savedHistory;
    savedHistory.forEach(m => appendChatMessage(m.role, m.text, false, true));
    appendChatMessage("ai", "✓ Done! Your itinerary has been updated.");
  } catch(err) {
    console.error("Chat edit error:", err);
    appendChatMessage("ai", `Sorry — ${err.message.replace(/^(NO_KEY|RATE): /,"")}`);
  } finally {
    isGenerating = false;
  }
};


function appendChatMessage(role, text, isTyping = false, noHistory = false) {
  const box = document.getElementById("editorChatMessages");
  if (!box) return;
  const existing = box.querySelector(".typing-indicator");
  if (existing) existing.remove();
  const msg = document.createElement("div");
  msg.className = `chat-msg chat-msg-${role}${isTyping ? " typing-indicator" : ""}`;
  msg.textContent = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  if (!isTyping && !noHistory) chatHistory.push({ role, text });
}


function showEditorToast(msg, type = "success") {
  let t = document.getElementById("editorToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "editorToast";
    t.className = "editor-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `editor-toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = "editor-toast", 2500);
}


// ══════════════════════════════════════════════
// STEP 3 — FINALIZE → PLAN PAGE
// ══════════════════════════════════════════════

window.finalizeItinerary = function() {
  if (!editingItinerary) return;
  const city = parsedCity || localStorage.getItem("lastSearchedCity") || "Your Destination";

  const tripDays = editingItinerary.days.map(d => ({
    label:      `Day ${d.day}: ${d.theme || ""}`,
    subLabel:   `Day ${d.day}`,
    activities: (d.activities || []).map(a => ({
      time: a.time || "–",
      text: a.name + (a.desc ? ` — ${a.desc}` : ""),
      cost: a.cost ? parseFloat(a.cost.replace(/[^0-9.]/g,"")) || 0 : 0
    }))
  }));

  localStorage.setItem("tripDays",            JSON.stringify(tripDays));
  localStorage.setItem("selectedDays",        parsedDays);
  localStorage.setItem("tripBudget",          parsedBudget);
  localStorage.setItem("lastSearchedCity",    city);
  localStorage.setItem("tripCurrency",        parsedCurrency);
  localStorage.setItem("finalItinerary",      JSON.stringify(editingItinerary));
  localStorage.setItem("tripItineraryTitle",  editingItinerary.title || "My Itinerary");
  localStorage.setItem("tripDatesLabel",      parsedDatesLabel);

  window.location.href = "plan.html";
};


// ─── Boot ───
renderHistory();