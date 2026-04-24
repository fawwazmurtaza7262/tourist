console.log("Destination JS loaded");

const API_KEY = CONFIG.API_KEY;

// --- Element Selection ---
const cityInput      = document.getElementById("cityInput");
const daysRange      = document.getElementById("daysRange");
const daysValue      = document.getElementById("daysValue");
const daysText       = document.getElementById("daysText");
const budgetRange    = document.getElementById("budgetRange");
const budgetValue    = document.getElementById("budgetValue");
const budgetText     = document.getElementById("budgetText");
const currencySelect = document.getElementById("currencySelect");
const discoverBtn    = document.getElementById("discoverBtn");
const resultsSection = document.getElementById("resultsSection");
const resultsTitle   = document.getElementById("resultsTitle");
const resultsCount   = document.getElementById("resultsCount");
const statDays       = document.getElementById("statDays");
const statBudget     = document.getElementById("statBudget");
const statCurrency   = document.getElementById("statCurrency");
const spotsGrid      = document.getElementById("spotsGrid");

// --- Currency config ---
const currencySymbols = {
  USD:"$", EUR:"€", GBP:"£", CAD:"CA$", AUD:"A$",
  JPY:"¥", CHF:"CHF ", PKR:"₨", AED:"AED ", INR:"₹",
  MXN:"MX$", BRL:"R$", KRW:"₩", CNY:"¥", SGD:"S$",
  THB:"฿", TRY:"₺", ZAR:"R", SEK:"kr", NOK:"kr"
};

currencySelect.innerHTML = Object.keys(currencySymbols)
  .map(c => `<option value="${c}">${c} — ${currencySymbols[c].trim()}</option>`)
  .join("");

// --- State ---
let exchangeRates = {};
let lastSpots     = [];
let lastHotels    = [];
let localCurrency = null;
let localCityName = "";
let showOverBudget = false;
let activeTab     = "attractions";

// --- Filter + Sort State ---
let activeFilter = "All";
let activeSort   = "default";

// --- City → currency map ---
const cityToCurrency = {
  lahore:"PKR", karachi:"PKR", islamabad:"PKR", rawalpindi:"PKR", peshawar:"PKR",
  mumbai:"INR", delhi:"INR", bangalore:"INR", chennai:"INR", hyderabad:"INR", kolkata:"INR",
  dhaka:"BDT", colombo:"LKR", kathmandu:"NPR",
  dubai:"AED", abudhabi:"AED", sharjah:"AED", riyadh:"SAR", jeddah:"SAR",
  doha:"QAR", kuwait:"KWD", muscat:"OMR", amman:"JOD", telaviv:"ILS", jerusalem:"ILS",
  london:"GBP", manchester:"GBP", edinburgh:"GBP",
  paris:"EUR", berlin:"EUR", rome:"EUR", madrid:"EUR", amsterdam:"EUR",
  barcelona:"EUR", vienna:"EUR", athens:"EUR", lisbon:"EUR", brussels:"EUR",
  zurich:"CHF", geneva:"CHF", stockholm:"SEK", oslo:"NOK", copenhagen:"DKK",
  warsaw:"PLN", budapest:"HUF", prague:"CZK",
  newyork:"USD", losangeles:"USD", chicago:"USD", houston:"USD", miami:"USD",
  toronto:"CAD", vancouver:"CAD", montreal:"CAD", calgary:"CAD",
  mexicocity:"MXN", cancun:"MXN", saopaulo:"BRL", rio:"BRL",
  tokyo:"JPY", osaka:"JPY", kyoto:"JPY",
  beijing:"CNY", shanghai:"CNY", seoul:"KRW", singapore:"SGD",
  bangkok:"THB", jakarta:"IDR", bali:"IDR",
  sydney:"AUD", melbourne:"AUD", auckland:"NZD",
  cairo:"EGP", capetown:"ZAR", johannesburg:"ZAR",
};

function getCityKey(raw) { return raw.toLowerCase().replace(/[\s\-'\.]/g, ""); }
function detectLocalCurrency(raw) { return cityToCurrency[getCityKey(raw)] || null; }


// ─────────────────────────────────────────
// SEARCH HISTORY
// ─────────────────────────────────────────

function getHistory() {
  return JSON.parse(localStorage.getItem("searchHistory")) || [];
}

function saveToHistory(city) {
  let history = getHistory();
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  history = history.slice(0, 6);
  localStorage.setItem("searchHistory", JSON.stringify(history));
}

function renderHistory() {
  let container = document.getElementById("searchHistory");
  if (!container) {
    container = document.createElement("div");
    container.id = "searchHistory";
    container.style.cssText = "margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;";
    cityInput.parentElement.appendChild(container);
  }

  const history = getHistory();
  if (history.length === 0) { container.innerHTML = ""; return; }

  container.innerHTML = `
    <span style="font-size:0.75rem; color:#999;">Recent:</span>
    ${history.map(city => `
      <button onclick="fillCity('${city}')" style="
        background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px;
        padding:3px 12px; font-size:0.78rem; cursor:pointer; color:#555;
        font-family:inherit; transition:all 0.15s;"
        onmouseover="this.style.background='#a8dadc';this.style.color='white'"
        onmouseout="this.style.background='#f1f5f9';this.style.color='#555'">
        📍 ${city}
      </button>
    `).join("")}
    <button onclick="clearHistory()" style="
      background:none; border:none; font-size:0.72rem;
      color:#ccc; cursor:pointer; font-family:inherit; padding:0;">✕ clear</button>
  `;
}

window.fillCity = function(city) {
  cityInput.value = city;
  discoverBtn.classList.add("active");
  cityInput.focus();
};

window.clearHistory = function() {
  localStorage.removeItem("searchHistory");
  renderHistory();
};


// --- Exchange rates ---
async function loadExchangeRates() {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    exchangeRates = (await res.json()).rates;
  } catch {
    exchangeRates = {
      USD:1, CAD:1.36, EUR:0.92, GBP:0.79, AUD:1.52, JPY:149,
      CHF:0.90, PKR:278, INR:83, AED:3.67, MXN:17, BRL:4.97,
      KRW:1325, CNY:7.24, SGD:1.34, THB:35, TRY:30, ZAR:18.6,
      SEK:10.4, NOK:10.6, EGP:30.9, SAR:3.75, QAR:3.64
    };
  }
}

const sym = (code) => currencySymbols[code] || (code + " ");
const fmt = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

function toUserCurrency(usdAmount) {
  return Math.round(usdAmount * (exchangeRates[currencySelect.value] || 1));
}

function toLocalCurrency(usdAmount) {
  if (!localCurrency || !exchangeRates[localCurrency]) return null;
  return Math.round(usdAmount * exchangeRates[localCurrency]);
}

function totalBudgetInUSD() {
  return parseFloat(budgetRange.value) / (exchangeRates[currencySelect.value] || 1);
}

function perNightBudgetInUSD() {
  return (totalBudgetInUSD() * 0.4) / parseInt(daysRange.value);
}


// --- Rate badge ---
function updateRateBadge() {
  let badge = document.getElementById("rateBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "rateBadge";
    badge.style.cssText = "margin-top:6px; font-size:0.8rem; color:#555; line-height:1.8;";
    currencySelect.parentElement.appendChild(badge);
  }

  const uc = currencySelect.value;
  const ur = exchangeRates[uc] || 1;
  const lines = [];

  if (uc !== "USD") {
    lines.push(`1 USD = ${ur.toFixed(2)} ${uc}`);
    lines.push(`1 ${uc} = ${(1/ur).toFixed(4)} USD`);
  }

  if (localCurrency && localCurrency !== uc) {
    const lr = exchangeRates[localCurrency] || 1;
    lines.push(`1 ${uc} = ${(lr/ur).toFixed(2)} ${localCurrency} <em style="color:#aaa">(${localCityName} local)</em>`);
  }

  badge.innerHTML = lines.join("<br>");
}

const updateBudgetDisplay = () => {
  const uc = currencySelect.value;
  budgetValue.textContent = `${sym(uc)}${fmt(budgetRange.value)}`;
  budgetText.textContent  = `Total budget: ${sym(uc)}${fmt(budgetRange.value)}`;
  updateRateBadge();

  if (lastSpots.length > 0 || lastHotels.length > 0) {
    renderBudgetSummary();
    if (activeTab === "attractions") renderAttractions();
    else renderHotels();
  }
};


// --- Budget summary bar ---
function renderBudgetSummary() {
  let bar = document.getElementById("budgetSummaryBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "budgetSummaryBar";
    bar.style.cssText = `
      background:#f0f9ff; border:1px solid #a8dadc; border-radius:10px;
      padding:14px 20px; margin-bottom:20px;
      display:flex; flex-wrap:wrap; gap:16px; font-size:0.88rem; color:#333;
    `;
    spotsGrid.before(bar);
  }

  const uc = currencySelect.value;
  const days = parseInt(daysRange.value);
  const total = parseFloat(budgetRange.value);
  const daily = total / days;
  const localTotal = localCurrency && localCurrency !== uc
    ? Math.round(totalBudgetInUSD() * (exchangeRates[localCurrency] || 1)) : null;

  bar.innerHTML = `
    <div>🗓️ <strong>${days} day${days>1?"s":""}</strong></div>
    <div>💰 Total: <strong>${sym(uc)}${fmt(total)}</strong></div>
    <div>📅 Per day: <strong>${sym(uc)}${fmt(daily)}</strong></div>
    <div>💱 <strong>${uc}</strong></div>
    ${localTotal ? `<div>🏙️ ≈ <strong>${sym(localCurrency)}${fmt(localTotal)}</strong> ${localCurrency} total</div>` : ""}
  `;
}


// --- Tabs ---
function renderTabs() {
  let tabBar = document.getElementById("tabBar");
  if (!tabBar) {
    tabBar = document.createElement("div");
    tabBar.id = "tabBar";
    tabBar.style.cssText = `
      display:flex; gap:0; margin-bottom:24px;
      border-radius:10px; overflow:hidden;
      border:1px solid #a8dadc; width:fit-content;
    `;
    spotsGrid.before(tabBar);
  }

  tabBar.innerHTML = `
    <button id="tabAttractions" onclick="switchTab('attractions')" style="
      padding:10px 24px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600;
      background:${activeTab==="attractions" ? "#a8dadc" : "#fff"};
      color:${activeTab==="attractions" ? "#fff" : "#555"};
      font-family:inherit; transition:all 0.2s;
    ">🗺️ Attractions</button>
    <button id="tabHotels" onclick="switchTab('hotels')" style="
      padding:10px 24px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600;
      background:${activeTab==="hotels" ? "#a8dadc" : "#fff"};
      color:${activeTab==="hotels" ? "#fff" : "#555"};
      font-family:inherit; transition:all 0.2s; border-left:1px solid #a8dadc;
    ">🏨 Hotels</button>
  `;
}

function switchTab(tab) {
  activeTab = tab;
  renderTabs();

  if (tab === "attractions") {
    if (lastSpots.length > 0) renderAttractions();
    else fetchAttractions(localCityName);
  } else {
    if (lastHotels.length > 0) renderHotels();
    else fetchHotels(localCityName);
  }
}


// --- Apply Filter + Sort ---
function applyFilterSort(spots) {
  let filtered = [...spots];

  if (activeFilter !== "All") {
    filtered = filtered.filter(s =>
      (s.type || "").toLowerCase() === activeFilter.toLowerCase()
    );
  }

  if (activeSort === "rating") {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (activeSort === "priceLow") {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (activeSort === "priceHigh") {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  return filtered;
}


// --- Filter Bar ---
function renderFilterBar(spots) {
  let bar = document.getElementById("filterBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "filterBar";
    bar.style.cssText = `
      display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:20px;
    `;
    spotsGrid.before(bar);
  }

  const types = ["All", ...new Set(spots.map(s => s.type).filter(Boolean))];

  bar.innerHTML = `
    <label style="font-size:0.85rem;color:#555;">
      Filter:
      <select id="typeFilter" style="margin-left:6px;padding:7px 10px;border-radius:8px;border:1px solid #ccc;">
        ${types.map(t => `<option value="${t}" ${t===activeFilter?"selected":""}>${t}</option>`).join("")}
      </select>
    </label>
    <label style="font-size:0.85rem;color:#555;">
      Sort:
      <select id="sortFilter" style="margin-left:6px;padding:7px 10px;border-radius:8px;border:1px solid #ccc;">
        <option value="default" ${activeSort==="default"?"selected":""}>Default</option>
        <option value="rating" ${activeSort==="rating"?"selected":""}>Highest Rating</option>
        <option value="priceLow" ${activeSort==="priceLow"?"selected":""}>Lowest Price</option>
        <option value="priceHigh" ${activeSort==="priceHigh"?"selected":""}>Highest Price</option>
      </select>
    </label>
  `;

  document.getElementById("typeFilter").addEventListener("change", (e) => {
    activeFilter = e.target.value;
    renderAttractions();
  });

  document.getElementById("sortFilter").addEventListener("change", (e) => {
    activeSort = e.target.value;
    renderAttractions();
  });
}


// --- Render Attractions ---
function renderAttractions() {
  spotsGrid.innerHTML = "";
  showOverBudget = false;

  const uc        = currencySelect.value;
  const budgetUSD = totalBudgetInUSD();

  renderFilterBar(lastSpots);

  const filtered   = applyFilterSort(lastSpots);
  const affordable = filtered.filter(s => s.price === 0 || s.price <= budgetUSD);
  const tooExp     = filtered.filter(s => s.price > 0 && s.price > budgetUSD);

  resultsCount.textContent = `${lastSpots.length} attractions found · ${affordable.length} within your ${sym(uc)}${fmt(budgetRange.value)} budget`;

  if (affordable.length === 0 && lastSpots.length > 0) {
    const msg = document.createElement("div");
    msg.style.cssText = "grid-column:1/-1; text-align:center; padding:30px; color:#666;";
    msg.innerHTML = `<p>😅 No attractions fit your current budget. Try increasing it or switching currency.</p>`;
    spotsGrid.appendChild(msg);
  }

  affordable.forEach(spot => renderSpotCard(spot, false));

  if (tooExp.length > 0) {
    const toggle = document.createElement("div");
    toggle.id = "overBudgetToggle";
    toggle.style.cssText = "grid-column:1/-1; text-align:center; margin:16px 0 8px;";
    toggle.innerHTML = `
      <button onclick="toggleOverBudget()" style="
        background:none; border:1px dashed #ccc; color:#888; padding:8px 20px;
        border-radius:20px; cursor:pointer; font-size:0.85rem; font-family:inherit;
      ">Show ${tooExp.length} attraction${tooExp.length>1?"s":""} over budget ▾</button>
    `;
    spotsGrid.appendChild(toggle);

    const hiddenSection = document.createElement("div");
    hiddenSection.id = "overBudgetSection";
    hiddenSection.style.cssText = "display:none; grid-column:1/-1;";

    const subGrid = document.createElement("div");
    subGrid.style.cssText = "display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px;";

    tooExp.forEach(spot => {
      const card = buildSpotCard(spot, true);
      subGrid.appendChild(card);
    });

    hiddenSection.appendChild(subGrid);
    spotsGrid.appendChild(hiddenSection);
  }
}

window.toggleOverBudget = function() {
  const section = document.getElementById("overBudgetSection");
  const btn     = document.querySelector("#overBudgetToggle button");
  showOverBudget = !showOverBudget;
  section.style.display = showOverBudget ? "block" : "none";
  btn.textContent = showOverBudget
    ? "Hide over-budget attractions ▴"
    : `Show ${section.querySelectorAll(".spot-card").length} attractions over budget ▾`;
};


function buildSpotCard(spot, dimmed) {
  const uc = currencySelect.value;
  const lc = localCurrency;

  const userPrice   = spot.price === 0 ? 0 : toUserCurrency(spot.price);
  const userDisplay = spot.price === 0 ? "FREE" : `${sym(uc)}${fmt(userPrice)}`;

  let localLine = "";
  if (lc && lc !== uc && spot.price > 0) {
    const lp = toLocalCurrency(spot.price);
    if (lp) localLine = `<small style="color:#888;display:block;margin-top:2px;">${sym(lc)}${fmt(lp)} ${lc}</small>`;
  }

  const card = document.createElement("div");
  card.className = "spot-card";

  if (dimmed) {
    card.style.opacity = "0.5";
    card.style.filter = "grayscale(30%)";
  }

  card.innerHTML = `
    <div class="card-header"><span class="card-icon">${spot.image}</span></div>
    <div class="card-body">
      <h3>${spot.name}</h3>
      <div class="rating">⭐ ${spot.rating} <span style="color:#999">(${spot.reviews})</span></div>
      <p>${spot.desc}</p>
      <div class="price-box">
        <span>ENTRY PRICE${dimmed ? ' <span style="font-size:0.7rem;color:#e74c3c;">over budget</span>' : ''}</span>
        <strong style="color:${spot.price===0?"#2ecc71":"#3498db"}">${userDisplay}</strong>
        ${localLine}
      </div>
      <button class="learn-btn" onclick="addToItinerary(this)"
        data-name="${spot.name}" data-price="${userDisplay}"
        ${dimmed ? 'style="background:#ccc;"' : ""}>
        + Add to Itinerary
      </button>
    </div>`;
  return card;
}

function renderSpotCard(spot, dimmed) {
  spotsGrid.appendChild(buildSpotCard(spot, dimmed));
}


// --- Render Hotels ---
function renderHotels() {
  spotsGrid.innerHTML = "";

  const uc = currencySelect.value;
  const lc = localCurrency;
  const days = parseInt(daysRange.value);
  const nightlyBudgetUSD = perNightBudgetInUSD();

  const affordable = lastHotels.filter(h => h.price_per_night <= nightlyBudgetUSD);
  const tooExp     = lastHotels.filter(h => h.price_per_night > nightlyBudgetUSD);

  const nightlyUser = toUserCurrency(nightlyBudgetUSD);
  resultsCount.textContent = `${lastHotels.length} hotels found · ${affordable.length} fit your nightly budget (${sym(uc)}${fmt(nightlyUser)}/night)`;

  if (affordable.length === 0 && lastHotels.length > 0) {
    const msg = document.createElement("div");
    msg.style.cssText = "grid-column:1/-1; text-align:center; padding:30px; color:#666;";
    msg.innerHTML = `<p>😅 No hotels fit your nightly budget. Try a higher budget or fewer days.</p>`;
    spotsGrid.appendChild(msg);
  }

  const renderHotelCard = (hotel, dimmed) => {
    const nightlyUser  = toUserCurrency(hotel.price_per_night);
    const totalUser    = nightlyUser * days;
    const nightlyLocal = lc && lc !== uc ? toLocalCurrency(hotel.price_per_night) : null;

    const card = document.createElement("div");
    card.className = "spot-card";

    if (dimmed) {
      card.style.opacity = "0.5";
      card.style.filter = "grayscale(30%)";
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">${hotel.stars >= 5 ? "🏩" : hotel.stars >= 4 ? "🏨" : "🏠"}</span>
        <div style="margin-top:6px;">${"⭐".repeat(Math.min(hotel.stars||3, 5))}</div>
      </div>
      <div class="card-body">
        <h3>${hotel.name}</h3>
        <div style="font-size:0.82rem; color:#888; margin-bottom:6px;">📍 ${hotel.area || localCityName}</div>
        <div class="rating">⭐ ${hotel.rating} <span style="color:#999">(${hotel.reviews})</span></div>
        <p>${hotel.desc}</p>
        <div class="price-box">
          <span>PER NIGHT${dimmed ? ' <span style="font-size:0.7rem;color:#e74c3c;">over nightly budget</span>' : ''}</span>
          <strong style="color:#3498db">${sym(uc)}${fmt(nightlyUser)}</strong>
          ${nightlyLocal ? `<small style="color:#888;display:block;margin-top:2px;">${sym(lc)}${fmt(nightlyLocal)} ${lc}/night</small>` : ""}
          <small style="color:#aaa;display:block;margin-top:4px;">${days} night${days>1?"s":""} total: <strong>${sym(uc)}${fmt(totalUser)}</strong></small>
        </div>
        <button class="learn-btn" onclick="addHotelToTrip(this)"
          data-name="${hotel.name}"
          data-price="${sym(uc)}${fmt(nightlyUser)}/night"
          ${dimmed ? 'style="background:#ccc;"' : ""}>
          + Save Hotel
        </button>
      </div>`;
    spotsGrid.appendChild(card);
  };

  affordable.forEach(h => renderHotelCard(h, false));

  if (tooExp.length > 0) {
    const divider = document.createElement("div");
    divider.style.cssText = "grid-column:1/-1; text-align:center; color:#aaa; font-size:0.85rem; padding:8px 0; border-top:1px dashed #ddd;";
    divider.textContent = `⬇️ ${tooExp.length} hotel${tooExp.length>1?"s":""} over your nightly budget`;
    spotsGrid.appendChild(divider);
    tooExp.forEach(h => renderHotelCard(h, true));
  }
}


// --- Add hotel to trip ---
window.addHotelToTrip = function(button) {
  const name  = button.getAttribute("data-name");
  const price = button.getAttribute("data-price");
  const trip  = JSON.parse(localStorage.getItem("myTrip")) || [];

  if (trip.some(s => s.name === `🏨 ${name}`)) {
    button.textContent = "Already saved!";
    button.style.backgroundColor = "#f59e0b";
    return;
  }

  trip.push({ name: `🏨 ${name}`, price });
  localStorage.setItem("myTrip", JSON.stringify(trip));

  button.textContent = "✓ Saved!";
  button.style.backgroundColor = "#2ecc71";
  button.disabled = true;
};


// --- Add attraction to trip ---
window.addToItinerary = function(button) {
  const name  = button.getAttribute("data-name");
  const price = button.getAttribute("data-price");
  const trip  = JSON.parse(localStorage.getItem("myTrip")) || [];

  if (trip.some(s => s.name === name)) {
    button.textContent = "Already added!";
    button.style.backgroundColor = "#f59e0b";
    return;
  }

  trip.push({ name, price });
  localStorage.setItem("myTrip", JSON.stringify(trip));

  button.textContent = "✓ Added!";
  button.style.backgroundColor = "#2ecc71";
  button.disabled = true;
};


// --- Robust JSON parser ---
function safeParseArray(text) {
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  try { return JSON.parse(text); } catch (_) {}

  let lastBrace = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) lastBrace = i;
    }
  }

  if (lastBrace === -1) return [];

  const trimmed = text.substring(0, lastBrace + 1) + "]";
  const fixed = trimmed.startsWith("[") ? trimmed : "[" + trimmed;

  try { return JSON.parse(fixed); } catch (_) { return []; }
}


// --- Fetch Attractions ---
async function fetchAttractions(city) {
  spotsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">
    <div class="spinner"></div><p>Finding attractions in ${city}…</p></div>`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          contents:[{parts:[{
            text:`You are a travel API. List up to 30 real tourist attractions, landmarks, museums, markets, parks, and activities in ${city}.
All "price" values MUST be in USD. Use 0 for free entry.
Return ONLY a raw JSON array, no markdown, no backticks, no explanation.
Keep each desc under 15 words. Compact format required.
[{"name":"Name","type":"Category","rating":4.5,"reviews":"10k","price":5,"image":"Emoji","desc":"Short description."}]`
          }]}],
          generationConfig:{ temperature:0.3, maxOutputTokens:4096 }
        })
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi,"").replace(/```/g,"").trim();

    lastSpots = safeParseArray(text);
    activeFilter = "All";
    activeSort   = "default";

    renderBudgetSummary();
    renderTabs();
    renderAttractions();

  } catch(err) {
    console.error(err);
    spotsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#e74c3c;padding:40px;">
      <h3>Could not load attractions</h3><p>${err.message}</p></div>`;
  }
}


// --- Fetch Hotels ---
async function fetchHotels(city) {
  spotsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">
    <div class="spinner"></div><p>Finding hotels in ${city}…</p></div>`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          contents:[{parts:[{
            text:`You are a hotel search API. List 20 real hotels in ${city} across budget, mid-range, and luxury tiers.
All "price_per_night" values MUST be in USD.
Return ONLY a raw JSON array, no markdown, no backticks, no explanation.
Keep each desc under 15 words. Compact format required.
[{"name":"Hotel Name","stars":4,"area":"Neighbourhood","rating":4.5,"reviews":"2k","price_per_night":80,"desc":"Short description."}]`
          }]}],
          generationConfig:{ temperature:0.3, maxOutputTokens:3000 }
        })
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi,"").replace(/```/g,"").trim();

    lastHotels = safeParseArray(text);
    renderTabs();
    renderHotels();

  } catch(err) {
    console.error(err);
    spotsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#e74c3c;padding:40px;">
      <h3>Could not load hotels</h3><p>${err.message}</p></div>`;
  }
}


// --- Discover button ---
discoverBtn.addEventListener("click", () => {
  const rawCity = cityInput.value.trim();
  if (!rawCity) { alert("Please enter a city!"); return; }

  localStorage.setItem("selectedDays", daysRange.value);
  localStorage.setItem("tripBudget", budgetRange.value);
  localStorage.setItem("lastSearchedCity", rawCity); // ← just save raw, no correction

  saveToHistory(rawCity);

  localCityName = rawCity;
  localCurrency = detectLocalCurrency(rawCity);

  lastSpots  = [];
  lastHotels = [];
  activeTab  = "attractions";
  activeFilter = "All";
  activeSort   = "default";

  resultsSection.style.display = "block";
  resultsTitle.textContent  = `Best Spots in ${rawCity}`;
  statDays.textContent      = `${daysRange.value} days`;
  statBudget.textContent    = `${sym(currencySelect.value)}${fmt(budgetRange.value)}`;
  statCurrency.textContent  = currencySelect.value;
  resultsCount.textContent  = "Loading…";

  updateRateBadge();
  fetchAttractions(rawCity);
  resultsSection.scrollIntoView({ behavior:"smooth" });
});


// --- Listeners ---
daysRange.addEventListener("input", e => {
  daysValue.textContent = e.target.value;
  daysText.textContent  = e.target.value === "1" ? "1 day" : `${e.target.value} days`;
  localStorage.setItem("selectedDays", e.target.value);
  updateBudgetDisplay();
});

budgetRange.addEventListener("input", updateBudgetDisplay);
currencySelect.addEventListener("change", updateBudgetDisplay);

cityInput.addEventListener("input", () => {
  discoverBtn.classList.toggle("active", cityInput.value.trim().length > 0);
});


// --- Boot ---
loadExchangeRates().then(updateBudgetDisplay);
renderHistory();