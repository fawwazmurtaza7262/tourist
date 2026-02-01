console.log("Destination JS loaded");

// --- 1. Element Selection ---
const cityInput = document.getElementById("cityInput");
const daysRange = document.getElementById("daysRange");
const daysValue = document.getElementById("daysValue");
const daysText = document.getElementById("daysText");
const budgetRange = document.getElementById("budgetRange");
const budgetValue = document.getElementById("budgetValue");
const budgetText = document.getElementById("budgetText");
const currencySelect = document.getElementById("currencySelect");
const discoverBtn = document.getElementById("discoverBtn");

// Results Elements
const resultsSection = document.getElementById("resultsSection");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const statDays = document.getElementById("statDays");
const statBudget = document.getElementById("statBudget");
const statCurrency = document.getElementById("statCurrency");
const spotsGrid = document.getElementById("spotsGrid");

// --- 2. The Database (10 Cities) ---
const destinationsDB = {
  dubai: [
    { name: "Burj Khalifa", type: "Landmark", rating: 4.8, reviews: "20k", price: 40, image: "🏙️", desc: "The world's tallest building with stunning views." },
    { name: "Dubai Mall", type: "Shopping", rating: 4.7, reviews: "15k", price: 0, image: "🛍️", desc: "Massive mall featuring an aquarium and ice rink." },
    { name: "Desert Safari", type: "Adventure", rating: 4.9, reviews: "12k", price: 60, image: "🏜️", desc: "Dune bashing, camel rides, and BBQ dinner." },
    { name: "Palm Jumeirah", type: "Beach", rating: 4.6, reviews: "8k", price: 0, image: "🏝️", desc: " iconic palm-shaped island with luxury resorts." }
  ],
  paris: [
    { name: "Eiffel Tower", type: "Landmark", rating: 4.7, reviews: "50k", price: 30, image: "🗼", desc: "The Iron Lady offering panoramic city views." },
    { name: "Louvre Museum", type: "Culture", rating: 4.8, reviews: "45k", price: 20, image: "🎨", desc: "World's largest art museum, home to Mona Lisa." },
    { name: "Notre Dame", type: "History", rating: 4.6, reviews: "30k", price: 0, image: "⛪", desc: "Medieval Catholic cathedral." },
    { name: "Seine Cruise", type: "Relax", rating: 4.5, reviews: "20k", price: 15, image: "🛥️", desc: "Romantic boat ride through the heart of Paris." }
  ],
  newyork: [
    { name: "Statue of Liberty", type: "Landmark", rating: 4.7, reviews: "30k", price: 25, image: "🗽", desc: "Symbol of freedom on Liberty Island." },
    { name: "Central Park", type: "Nature", rating: 4.9, reviews: "60k", price: 0, image: "🌳", desc: "Huge urban park perfect for walking and biking." },
    { name: "Times Square", type: "City", rating: 4.5, reviews: "80k", price: 0, image: "🚕", desc: "Bright lights, billboards, and Broadway shows." },
    { name: "Empire State", type: "View", rating: 4.6, reviews: "40k", price: 45, image: "🏙️", desc: "Iconic skyscraper with an observation deck." }
  ],
  tokyo: [
    { name: "Senso-ji Temple", type: "Culture", rating: 4.8, reviews: "10k", price: 0, image: "⛩️", desc: "Ancient Buddhist temple in Asakusa." },
    { name: "Shibuya Crossing", type: "Landmark", rating: 4.6, reviews: "20k", price: 0, image: "🚶", desc: "The busiest pedestrian crossing in the world." },
    { name: "Tokyo Tower", type: "View", rating: 4.5, reviews: "15k", price: 25, image: "🗼", desc: "Communication and observation tower." },
    { name: "Akihabara", type: "Shopping", rating: 4.4, reviews: "18k", price: 0, image: "🎮", desc: "Electric town famous for anime and electronics." }
  ],
  london: [
    { name: "Big Ben", type: "Landmark", rating: 4.6, reviews: "25k", price: 0, image: "🕰️", desc: "The Great Bell of the striking clock." },
    { name: "London Eye", type: "View", rating: 4.5, reviews: "30k", price: 35, image: "🎡", desc: "Giant observation wheel on the South Bank." },
    { name: "Tower Bridge", type: "History", rating: 4.7, reviews: "22k", price: 12, image: "🌉", desc: " iconic combined bascule and suspension bridge." },
    { name: "British Museum", type: "Culture", rating: 4.8, reviews: "35k", price: 0, image: "🏛️", desc: "Dedicated to human history, art, and culture." }
  ],
  rome: [
    { name: "Colosseum", type: "History", rating: 4.8, reviews: "40k", price: 18, image: "🏟️", desc: "Ancient gladiatorial arena." },
    { name: "Vatican City", type: "Culture", rating: 4.9, reviews: "35k", price: 25, image: "🇻🇦", desc: "Home of the Pope, St. Peter's, and Sistine Chapel." },
    { name: "Trevi Fountain", type: "Landmark", rating: 4.7, reviews: "28k", price: 0, image: "⛲", desc: "Famous baroque fountain (don't forget to throw a coin)." },
    { name: "Pantheon", type: "History", rating: 4.8, reviews: "20k", price: 0, image: "🏛️", desc: "Former Roman temple, now a church." }
  ],
  bali: [
    { name: "Uluwatu Temple", type: "Culture", rating: 4.7, reviews: "15k", price: 5, image: "🌊", desc: "Sea temple on a cliff edge with sunset views." },
    { name: "Monkey Forest", type: "Nature", rating: 4.5, reviews: "12k", price: 10, image: "🐒", desc: "Sanctuary with grey long-tailed macaques." },
    { name: "Tegalalang Rice", type: "Nature", rating: 4.6, reviews: "8k", price: 2, image: "🌾", desc: "Famous scenic rice terraces." },
    { name: "Kuta Beach", type: "Beach", rating: 4.3, reviews: "20k", price: 0, image: "🏄", desc: "Popular beach known for surfing and sunsets." }
  ],
  sydney: [
    { name: "Opera House", type: "Landmark", rating: 4.8, reviews: "22k", price: 0, image: "🎭", desc: "Iconic performing arts center." },
    { name: "Bondi Beach", type: "Beach", rating: 4.6, reviews: "18k", price: 0, image: "🏖️", desc: "One of the most famous beaches in the world." },
    { name: "Harbour Bridge", type: "Adventure", rating: 4.7, reviews: "15k", price: 100, image: "🌉", desc: "Bridge climb for spectacular views." },
    { name: "Taronga Zoo", type: "Nature", rating: 4.5, reviews: "10k", price: 30, image: "🐨", desc: "City zoo with native Australian animals." }
  ],
  cairo: [
    { name: "Pyramids of Giza", type: "History", rating: 4.8, reviews: "50k", price: 20, image: "🔺", desc: "The last surviving wonder of the ancient world." },
    { name: "Nile Cruise", type: "Relax", rating: 4.5, reviews: "8k", price: 40, image: "⛵", desc: "Boat ride along the world's longest river." },
    { name: "Egyptian Museum", type: "Culture", rating: 4.6, reviews: "12k", price: 15, image: "🏺", desc: "Home to an extensive collection of antiquities." },
    { name: "Khan el-Khalili", type: "Shopping", rating: 4.4, reviews: "15k", price: 0, image: "🛍️", desc: "Famous bazaar and souq in the historic center." }
  ],
  rio: [
    { name: "Christ Redeemer", type: "Landmark", rating: 4.9, reviews: "30k", price: 15, image: "🗿", desc: "Giant Art Deco statue atop Mount Corcovado." },
    { name: "Copacabana", type: "Beach", rating: 4.6, reviews: "25k", price: 0, image: "🏖️", desc: "Famous 4km balneario beach." },
    { name: "Sugarloaf Mtn", type: "View", rating: 4.7, reviews: "20k", price: 25, image: "🚠", desc: "Peak situated at the mouth of Guanabara Bay." },
    { name: "Maracanã", type: "Sports", rating: 4.5, reviews: "18k", price: 10, image: "⚽", desc: "One of the largest football stadiums in the world." }
  ]
};

// --- 3. Helper Functions ---
const currencySymbols = { USD: "$", EUR: "€", GBP: "£" };
const formatMoney = (amount) => new Intl.NumberFormat().format(amount);

const updateBudgetDisplay = () => {
  const symbol = currencySymbols[currencySelect.value];
  const amount = formatMoney(budgetRange.value);
  budgetValue.textContent = `${symbol}${amount}`;
  budgetText.textContent = `Total budget: ${symbol}${amount}`;
};

// --- 4. Event Listeners ---
daysRange.addEventListener("input", (e) => {
  daysValue.textContent = e.target.value;
  daysText.textContent = e.target.value === "1" ? "1 day" : `${e.target.value} days`;
});

budgetRange.addEventListener("input", updateBudgetDisplay);
currencySelect.addEventListener("change", updateBudgetDisplay);

// --- 5. Main Search Logic ---
discoverBtn.addEventListener("click", () => {
  const cityInputVal = cityInput.value.trim();
  
  if (!cityInputVal) {
    alert("Please enter a city! Try 'Paris', 'Tokyo', or 'New York'.");
    return;
  }

  // CLEAN THE INPUT: remove spaces and make lowercase
  // "New York" -> "newyork", "Rio de Janeiro" -> "rio" (matches logic below)
  let cityKey = cityInputVal.toLowerCase().replace(/\s+/g, '');
  
  // Special fix for Rio since people might just type "Rio" or "Rio de Janeiro"
  if (cityKey.includes("rio")) cityKey = "rio";

  const spots = destinationsDB[cityKey];

  // Show the Results Section
  resultsSection.style.display = "block";
  
  // Update Stats Header
  resultsTitle.textContent = `Best Spots in ${cityInputVal}`; // Use original typing for title
  statDays.textContent = `${daysRange.value} days`;
  statBudget.textContent = `${currencySymbols[currencySelect.value]}${formatMoney(budgetRange.value)}`;
  statCurrency.textContent = currencySelect.value;

  // Clear previous results
  spotsGrid.innerHTML = "";

  // Check if city exists in our DB
  if (!spots) {
    resultsCount.textContent = "0 attractions found";
    spotsGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: #666;">
        <h3>City not found in our database 😔</h3>
        <p>Try one of these: Dubai, Paris, New York, Tokyo, London, Rome, Bali, Sydney, Cairo, Rio.</p>
      </div>
    `;
    return;
  }

  // Update count found
  resultsCount.textContent = `${spots.length} attractions found`;

  // Generate Cards
  spots.forEach(spot => {
    // Check if within budget (simple check: is price per entry less than total budget?)
    // In a real app, you'd calculate total cost vs budget. 
    // Here we just show everything but highlight the price.
    
    const priceDisplay = spot.price === 0 ? "FREE" : `${currencySymbols[currencySelect.value]}${spot.price}`;
    
    const card = document.createElement("div");
    card.className = "spot-card";
    
    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">${spot.image}</span>
      </div>
      <div class="card-body">
        <h3>${spot.name}</h3>
        <div class="rating">⭐ ${spot.rating} <span style="color:#999; font-weight:normal;">(${spot.reviews})</span></div>
        <p>${spot.desc}</p>
        
        <div class="price-box">
           <span>ENTRY PRICE</span>
           <strong style="color:${spot.price === 0 ? '#2ecc71' : '#3498db'}">${priceDisplay}</strong>
        </div>
        
        <button class="learn-btn">Learn More</button>
      </div>
    `;
    
    spotsGrid.appendChild(card);
  });

  // Scroll smoothly to results
  resultsSection.scrollIntoView({ behavior: "smooth" });
});

// Initialize on load
updateBudgetDisplay();