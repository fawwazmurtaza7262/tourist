console.log("Plan js loaded");

document.addEventListener("DOMContentLoaded", function() {
    setupAddButtons();
    setupChecklist();
});

// --- 1. ADD ACTIVITY LOGIC ---
function setupAddButtons() {
    // Find all buttons with class "add-btn"
    const addButtons = document.querySelectorAll(".add-btn");
  
    addButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Simple prompt to get data (you can replace this with a fancy modal later)
        const time = prompt("What time is this activity? (e.g., 4:00 PM)");
        if (!time) return; // Stop if they clicked Cancel
  
        const text = prompt("What is the activity?");
        if (!text) return; // Stop if they clicked Cancel
  
        // Create the new HTML element
        const newRow = document.createElement("div");
        newRow.className = "activity-item";
        
        // Use the same structure as your HTML
        newRow.innerHTML = `
          <span class="time">${time}</span>
          <span>${text}</span>
        `;
  
        // Insert the new row BEFORE the button that was clicked
        // e.target is the button, parentElement is the .day-card
        e.target.parentElement.insertBefore(newRow, e.target);
      });
    });
  }
  
  // --- 2. CHECKLIST SAVING LOGIC ---
  function setupChecklist() {
    // Find all checkboxes in the sidebar
    const checkboxes = document.querySelectorAll('.sidebar input[type="checkbox"]');
  
    checkboxes.forEach((box, index) => {
      // A. Unique ID for each box (e.g., "checklist_0", "checklist_1")
      const storageKey = `checklist_item_${index}`;
  
      // B. Load saved state from LocalStorage on page load
      const savedState = localStorage.getItem(storageKey);
      if (savedState === "true") {
        box.checked = true;
      }
  
      // C. Save state whenever the user clicks a box
      box.addEventListener("change", () => {
        localStorage.setItem(storageKey, box.checked);
      });
    });
  }

  // --- 3. CLEAR ALL FUNCTIONALITY ---
const clearBtn = document.getElementById("clearAllBtn");

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    // 1. Confirm with the user first
    if (confirm("Are you sure you want to clear your entire itinerary and checklist?")) {
      
      // 2. Clear the specific trip data
      localStorage.removeItem("myTrip");
      
      // 3. Clear the checklist items (we iterate through them)
      // Note: This matches the key format we used earlier: 'checklist_item_0', etc.
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("checklist_")) {
          localStorage.removeItem(key);
        }
      });

      // 4. Refresh page to show empty state
      location.reload(); 
    }
  });
}