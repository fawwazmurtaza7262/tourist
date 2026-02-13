console.log("Destination JS loaded");

const API_KEY = CONFIG.API_KEY;

// --- Element Selection ---
const cityInput       = document.getElementById("cityInput");
const daysRange       = document.getElementById("daysRange");
const daysValue       = document.getElementById("daysValue");
const daysText        = document.getElementById("daysText");
const budgetRange     = document.getElementById("budgetRange");
const budgetValue     = document.getElementById("budgetValue");
const budgetText      = document.getElementById("budgetText");
const currencySelect  = document.getElementById("currencySelect");
const discoverBtn     = document.getElementById("discoverBtn");
const resultsSection  = document.getElementById("resultsSection");
const resultsTitle    = document.getElementById("resultsTitle");
const resultsCount    = document.getElementById("resultsCount");
const statDays        = document.getElementById("statDays");
const statBudget      = document.getElementById("statBudget");
const statCurrency    = document.getElementById("statCurrency");
const spotsGrid       = document.getElementById("spotsGrid");

// --- Currency config ---
const currencySymbols = {
  USD:"$", EUR:"€", GBP:"£", CAD:"CA$", AUD:"A$",
  JPY:"¥", CHF:"CHF ", PKR:"₨", AED:"AED ", INR:"₹",
  MXN:"MX$", BRL:"R$", KRW:"₩", CNY:"¥", SGD:"S$",
  THB:"฿", TRY:"₺", ZAR:"R", SEK:"kr", NOK:"kr"
};

// Populate <select>
currencySelect.innerHTML = Object.keys(currencySymbols)
  .map(c => `<option value="${c}">${c} — ${currencySymbols[c].trim()}</option>`)
  .join("");

// --- State ---
let exchangeRates  = {};   // all rates relative to USD
let lastSpots      = [];   // raw Gemini spots (prices in USD)
let localCurrency  = null; // currency code of the destination city e.g. "PKR"
let localCityName  = "";

// --- Known city → currency map (instant fallback, no extra API call) ---
const cityToCurrency = {
  // South Asia
  lahore:"PKR", karachi:"PKR", islamabad:"PKR", rawalpindi:"PKR", peshawar:"PKR",
  mumbai:"INR", delhi:"INR", bangalore:"INR", chennai:"INR", hyderabad:"INR", kolkata:"INR",
  dhaka:"BDT", colombo:"LKR", kathmandu:"NPR",
  // Middle East
  dubai:"AED", abudhabi:"AED", sharjah:"AED",
  riyadh:"SAR", jeddah:"SAR",
  doha:"QAR", kuwait:"KWD", muscat:"OMR", amman:"JOD", beirut:"LBP",
  telaviv:"ILS", jerusalem:"ILS",
  // Europe
  london:"GBP", manchester:"GBP", edinburgh:"GBP",
  paris:"EUR", berlin:"EUR", rome:"EUR", madrid:"EUR", amsterdam:"EUR",
  barcelona:"EUR", vienna:"EUR", athens:"EUR", lisbon:"EUR", brussels:"EUR",
  zurich:"CHF", geneva:"CHF",
  stockholm:"SEK", oslo:"NOK", copenhagen:"DKK",
  warsaw:"PLN", budapest:"HUF", prague:"CZK",
  // Americas
  newyork:"USD", losangeles:"USD", chicago:"USD", houston:"USD", miami:"USD",
  toronto:"CAD", vancouver:"CAD", montreal:"CAD", calgary:"CAD",
  mexico:"MXN", mexicocity:"MXN", cancun:"MXN",
  saopaulo:"BRL", rio:"BRL", buenosaires:"ARS",
  bogota:"COP", lima:"PEN", santiago:"CLP",
  // Asia Pacific
  tokyo:"JPY", osaka:"JPY", kyoto:"JPY",
  beijing:"CNY", shanghai:"CNY", guangzhou:"CNY", shenzhen:"CNY",
  seoul:"KRW", busan:"KRW",
  singapore:"SGD",
  bangkok:"THB", chiangmai:"THB", phuket:"THB",
  jakarta:"IDR", bali:"IDR",
  kualalumpur:"MYR",
  manila:"PHP",
  hongkong:"HKD",
  sydney:"AUD", melbourne:"AUD", brisbane:"AUD",
  auckland:"NZD",
  // Africa
  cairo:"EGP", alexandria:"EGP",
  nairobi:"KES", capetown:"ZAR", johannesburg:"ZAR", lagos:"NGN",
  casablanca:"MAD",
};

function getCityKey(raw) {
  return raw.toLowerCase().replace(/[\s\-'\.]/g, "");
}

function detectLocalCurrency(cityRaw) {
  const key = getCityKey(cityRaw);
  return cityToCurrency[key] || null;
}

// --- Load live exchange rates (base USD) ---
async function loadExchangeRates() {
  try {
    const res  = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await res.json();
    exchangeRates = data.rates;
    console.log("Rates loaded ✓");
  } catch (e) {
    console.warn("Rate fetch failed, using fallback");
    exchangeRates = {
      USD:1, CAD:1.36, EUR:0.92, GBP:0.79, AUD:1.52, JPY:149,
      CHF:0.90, PKR:278, INR:83, AED:3.67, MXN:17, BRL:4.97,
      KRW:1325, CNY:7.24, SGD:1.34, THB:35, TRY:30, ZAR:18.6,
      SEK:10.4, NOK:10.6, EGP:30.9, SAR:3.75, QAR:3.64
    };
  }
}

// Convert: userCurrency → USD → localCurrency
function convertToLocal(usdPrice) {
  if (!localCurrency || !exchangeRates[localCurrency]) return null;
  return Math.round(usdPrice * exchangeRates[localCurrency]);
}

// Convert user's budget (in their chosen currency) → USD
function budgetInUSD() {
  const rate = exchangeRates[currencySelect.value] || 1;
  return parseFloat(budgetRange.value) / rate;
}

// Convert user budget → local city currency
function budgetInLocal() {
  if (!localCurrency || !exchangeRates[localCurrency]) return null;
  return Math.round(budgetInUSD() * exchangeRates[localCurrency]);
}

function dailyBudgetInUSD() {
  return budgetInUSD() / parseInt(daysRange.value);
}

function sym(code) {
  return currencySymbols[code] || (code + " ");
}

const fmt = (n) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

// --- Rate badge under currency selector ---
function updateRateBadge() {
  let badge = document.getElementById("rateBadge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "rateBadge";
    badge.style.cssText = "margin-top:6px; font-size:0.8rem; color:#555; line-height:1.6;";
    currencySelect.parentElement.appendChild(badge);
  }

  const userCode  = currencySelect.value;
  const userRate  = exchangeRates[userCode] || 1;  // USD → userCode
  const lines     = [];

  // Always show user currency vs USD
  if (userCode !== "USD") {
    lines.push(`1 USD = ${userRate.toFixed(2)} ${userCode}`);
    lines.push(`1 ${userCode} = ${(1 / userRate).toFixed(4)} USD`);
  }

  // Show local city currency conversion if different from user's currency
  if (localCurrency && localCurrency !== userCode) {
    const localRate = exchangeRates[localCurrency] || 1;
    // user → local
    const userToLocal = localRate / userRate;
    lines.push(`1 ${userCode} = ${userToLocal.toFixed(2)} ${localCurrency} <em style="color:#aaa">(${localCityName} local)</em>`);
  }

  badge.innerHTML = lines.join("<br>");
}

// --- Budget display ---
const updateBudgetDisplay = () => {
  const userCode = currencySelect.value;
  const amount   = fmt(budgetRange.value);
  budgetValue.textContent = `${sym(userCode)}${amount}`;
  budgetText.textContent  = `Total budget: ${sym(userCode)}${amount}`;
  updateRateBadge();
  if (lastSpots.length > 0) {
    renderBudgetSummary();
    renderCards(lastSpots);
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
      display:flex; flex-wrap:wrap; gap:16px;
      font-size:0.88rem; color:#333;
    `;
    spotsGrid.before(bar);
  }

  const userCode  = currencySelect.value;
  const days      = parseInt(daysRange.value);
  const total     = parseFloat(budgetRange.value);
  const daily     = total / days;
  const localCode = localCurrency;
  const localTotal = budgetInLocal();
  const localDaily = localTotal ? Math.round(localTotal / days) : null;

  let localLine = "";
  if (localCode && localCode !== userCode && localTotal) {
    localLine = `<div>🏙️ In ${localCityName}: <strong>${sym(localCode)}${fmt(localTotal)}</strong> total · <strong>${sym(localCode)}${fmt(localDaily)}</strong>/day</div>`;
  }

  bar.innerHTML = `
    <div>🗓️ <strong>${days} day${days > 1 ? "s" : ""}</strong></div>
    <div>💰 Total: <strong>${sym(userCode)}${fmt(total)}</strong></div>
    <div>📅 Per day: <strong>${sym(userCode)}${fmt(daily)}</strong></div>
    <div>💱 Currency: <strong>${userCode}</strong></div>
    ${localLine}
  `;
}

// --- Render Cards ---
const renderCards = (spots) => {
  spotsGrid.innerHTML = "";

  const userCode  = currencySelect.value;
  const localCode = localCurrency;
  const dailyUSD  = dailyBudgetInUSD();

  const withinBudget = spots.filter(s => s.price === 0 || s.price <= dailyUSD);
  const overBudget   = spots.filter(s => s.price > 0  && s.price > dailyUSD);

  resultsCount.textContent =
    `${spots.length} attractions · ${withinBudget.length} within your daily budget`;

  const renderSpot = (spot, dimmed) => {
    // Price in user's currency
    const userRate     = exchangeRates[userCode] || 1;
    const userPrice    = spot.price === 0 ? 0 : Math.round(spot.price * userRate);
    const userDisplay  = spot.price === 0 ? "FREE" : `${sym(userCode)}${fmt(userPrice)}`;

    // Price in local city currency (only if different from user's and city known)
    let localDisplay = "";
    if (localCode && localCode !== userCode && spot.price > 0) {
      const lp = convertToLocal(spot.price);
      if (lp) localDisplay = `<small style="color:#888; display:block; margin-top:2px;">${sym(localCode)}${fmt(lp)} ${localCode}</small>`;
    }

    const overTag = dimmed
      ? `<span style="font-size:0.72rem; color:#e74c3c; font-weight:600; margin-left:6px;">over daily budget</span>`
      : "";

    const card = document.createElement("div");
    card.className = "spot-card";
    if (dimmed) card.style.opacity = "0.5";

    card.innerHTML = `
      <div class="card-header"><span class="card-icon">${spot.image}</span></div>
      <div class="card-body">
        <h3>${spot.name}</h3>
        <div class="rating">⭐ ${spot.rating} <span style="color:#999">(${spot.reviews})</span></div>
        <p>${spot.desc}</p>
        <div class="price-box">
          <span>ENTRY PRICE ${overTag}</span>
          <strong style="color:${spot.price === 0 ? '#2ecc71' : '#3498db'}">${userDisplay}</strong>
          ${localDisplay}
        </div>
        <button class="learn-btn"
          onclick="addToItinerary(this)"
          data-name="${spot.name}"
          data-price="${userDisplay}"
          ${dimmed ? 'style="background:#ccc;"' : ""}>
          + Add to Itinerary
        </button>
      </div>
    `;
    spotsGrid.appendChild(card);
  };

  withinBudget.forEach(s => renderSpot(s, false));

  if (overBudget.length > 0) {
    const div = document.createElement("div");
    div.style.cssText = "grid-column:1/-1; text-align:center; color:#aaa; font-size:0.85rem; padding:12px 0 4px; border-top:1px dashed #ddd; margin-top:8px;";
    div.textContent = `⬇️  ${overBudget.length} attraction${overBudget.length > 1 ? "s" : ""} over your daily budget`;
    spotsGrid.appendChild(div);
    overBudget.forEach(s => renderSpot(s, true));
  }
};

// --- Save to Itinerary ---
function addToItinerary(button) {
  const spotName  = button.getAttribute("data-name");
  const spotPrice = button.getAttribute("data-price");
  const trip      = JSON.parse(localStorage.getItem("myTrip")) || [];

  if (trip.some(s => s.name === spotName)) {
    button.textContent = "Already added!";
    button.style.backgroundColor = "#f59e0b";
    setTimeout(() => { button.textContent = "✓ Added!"; button.style.backgroundColor = "#2ecc71"; }, 1500);
    return;
  }

  trip.push({ name: spotName, price: spotPrice });
  localStorage.setItem("myTrip", JSON.stringify(trip));
  button.textContent = "✓ Added!";
  button.style.backgroundColor = "#2ecc71";
  button.disabled = true;
}

// --- Gemini Fetch ---
const fetchWithAI = async (city) => {
  spotsGrid.innerHTML = `
    <div class="loading-container" style="grid-column:1/-1; text-align:center; padding:40px;">
      <div class="spinner"></div>
      <p>Finding all attractions in ${city}…</p>
    </div>
  `;

  try {
    const res  = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{
            text: `You are a travel API. List every notable tourist attraction, landmark, museum, market, park, and activity in ${city}.
Include as many real places as you know — do not limit the list.
IMPORTANT: All "price" values must be in USD (use 0 for free entry).
Return ONLY a raw JSON array. No markdown, no explanation, no backticks.
Format: {"name":"Name","type":"Category","rating":4.5,"reviews":"10k","price":5,"image":"SingleEmoji","desc":"One sentence under 20 words."}`
          }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
        })
      }
    );

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    text = text.replace(/,\s*([}\]])/g, "$1");

    const spots = JSON.parse(text);
    lastSpots = spots;

    renderBudgetSummary();
    renderCards(spots);

  } catch (err) {
    console.error("AI Error:", err);
    spotsGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; color:#e74c3c; padding:40px;">
        <h3>Could not load results</h3><p>${err.message}</p>
        <p style="color:#999; font-size:0.9rem;">Check your API key in config.js.</p>
      </div>`;
  }
};

// --- Discover Button ---
discoverBtn.addEventListener("click", () => {
  const rawCity = cityInput.value.trim();
  if (!rawCity) { alert("Please enter a city!"); return; }

  // Detect local currency for this city
  localCityName  = rawCity;
  localCurrency  = detectLocalCurrency(rawCity);

  if (localCurrency) {
    console.log(`Local currency for ${rawCity}: ${localCurrency}`);
  } else {
    console.log(`No local currency mapping found for ${rawCity} — will skip local conversion`);
  }

  lastSpots = [];
  resultsSection.style.display = "block";
  resultsTitle.textContent  = `Best Spots in ${rawCity}`;
  statDays.textContent      = `${daysRange.value} days`;
  statBudget.textContent    = `${sym(currencySelect.value)}${fmt(budgetRange.value)}`;
  statCurrency.textContent  = currencySelect.value;
  resultsCount.textContent  = "Loading…";

  updateRateBadge(); // refresh to include local city currency line

  fetchWithAI(rawCity);
  resultsSection.scrollIntoView({ behavior: "smooth" });
});

// --- Listeners ---
daysRange.addEventListener("input", (e) => {
  daysValue.textContent = e.target.value;
  daysText.textContent  = e.target.value === "1" ? "1 day" : `${e.target.value} days`;
  updateBudgetDisplay();
});
budgetRange.addEventListener("input", updateBudgetDisplay);
currencySelect.addEventListener("change", updateBudgetDisplay);
cityInput.addEventListener("input", () => {
  discoverBtn.classList.toggle("active", cityInput.value.trim().length > 0);
});

// --- Boot ---
loadExchangeRates().then(updateBudgetDisplay);