console.log("Plan JS loaded");

// Track how many days we have
let dayCount = 0;

document.addEventListener("DOMContentLoaded", () => {
  const addDayBtn = document.getElementById("addDayBtn");
  
  // 1. Initialize: Create Day 1 automatically so the page isn't empty
  createDay(); 

  // 2. Load any saved items from the Destinations page
  loadSavedActivities();

  // 3. Setup the "Add Day" button listener
  addDayBtn.addEventListener("click", () => {
    createDay();
  });

  // 4. Setup Checklist & Clear buttons (same as before)
  setupChecklist();
  setupClearButton();
});

// --- CORE FUNCTION: Create a New Day ---
function createDay() {
  dayCount++; // Increment day counter (Day 1, Day 2, etc.)
  
  const daysContainer = document.getElementById("daysContainer");
  
  // Create the Card HTML
  const dayCard = document.createElement("div");
  dayCard.className = "day-card";
  dayCard.innerHTML = `
    <div class="day-header">
        <h3>Day ${dayCount}</h3>
        <button class="delete-day-btn" style="background:none; border:none; cursor:pointer;">🗑️</button>
    </div>
    <div class="activities-list"></div> <button class="add-btn">+ Add Activity</button>
  `;

  daysContainer.appendChild(dayCard);

  // Attach event listener to the NEW "+ Add Activity" button immediately
  const addActivityBtn = dayCard.querySelector(".add-btn");
  addActivityBtn.addEventListener("click", handleAddActivity);
  
  // Attach event listener to delete the day
  const deleteDayBtn = dayCard.querySelector(".delete-day-btn");
  deleteDayBtn.addEventListener("click", () => {
     if(confirm(`Delete Day ${dayCount}?`)) {
         dayCard.remove();
         // Optional: You could re-number the remaining days here if you wanted
     }
  });
}

// --- HELPER: Handle Adding an Activity ---
function handleAddActivity(e) {
  const time = prompt("What time is this activity? (e.g., 10:00 AM)");
  if (!time) return; 

  const text = prompt("What is the activity?");
  if (!text) return; 

  // Create the activity row
  const newRow = document.createElement("div");
  newRow.className = "activity-item";
  newRow.innerHTML = `
    <span class="time">${time}</span>
    <span>${text}</span>
  `;

  // Insert it into the .activities-list container (before the Add Button)
  // We look for the 'activities-list' div inside this specific day card
  const activityList = e.target.parentElement.querySelector(".activities-list");
  activityList.appendChild(newRow);
}

// --- LOAD SAVED ACTIVITIES (From Destinations Page) ---
function loadSavedActivities() {
  const trip = JSON.parse(localStorage.getItem("myTrip")) || [];
  
  // We simply dump saved items into "Day 1" for now
  // In a complex app, you'd save which day they belong to.
  const firstDayList = document.querySelector(".day-card .activities-list");

  if (firstDayList) {
    trip.forEach((activity) => {
      const row = document.createElement("div");
      row.className = "activity-item";
      row.innerHTML = `
        <span class="time" style="color:#00b4d8; font-weight:bold;">Saved</span>
        <span>${activity.name} <small style="color:#666">(${activity.price})</small></span>
        <button onclick="this.parentElement.remove()" style="border:none; background:none; cursor:pointer; float:right;">❌</button>
      `;
      firstDayList.appendChild(row);
    });
  }
}

// --- CHECKLIST LOGIC ---
function setupChecklist() {
  const checkboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');
  checkboxes.forEach((box, index) => {
    const key = `checklist_${index}`;
    if (localStorage.getItem(key) === "true") box.checked = true;
    box.addEventListener("change", () => localStorage.setItem(key, box.checked));
  });
}

// --- CLEAR ALL LOGIC ---
function setupClearButton() {
  const clearBtn = document.getElementById("clearAllBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (confirm("Clear entire itinerary?")) {
        localStorage.clear();
        location.reload();
      }
    });
  }
}