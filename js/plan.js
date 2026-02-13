function getDays() {
  return JSON.parse(localStorage.getItem("tripDays")) || [{ label: "Day 1", activities: [] }];
}

function saveDays(days) {
  localStorage.setItem("tripDays", JSON.stringify(days));
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
      toast.className = "toast";
  }, 2500);
}

// ─────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────

function render() {
  const days = getDays();
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";

  if (days.length === 0) {
      container.innerHTML = `<p class="empty-state">No days yet. Click "+ Add Day" to get started.</p>`;
      return;
  }

  days.forEach((day, dayIndex) => {
      const card = document.createElement("div");
      card.className = "day-card";

      // Day header with delete button
      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `
          <h3>${day.label}</h3>
          <button class="delete-day-btn" title="Remove this day" data-day="${dayIndex}">✕ Remove day</button>
      `;
      card.appendChild(header);

      // Activities
      if (day.activities.length === 0) {
          const empty = document.createElement("p");
          empty.className = "empty-state";
          empty.style.padding = "10px 0 5px";
          empty.textContent = "No activities yet.";
          card.appendChild(empty);
      } else {
          day.activities.forEach((act, actIndex) => {
              const row = document.createElement("div");
              row.className = "activity-item";
              const isSaved = act.time === "Saved";
              row.innerHTML = `
                  <span class="time ${isSaved ? "saved-tag" : ""}">${act.time}</span>
                  <span class="activity-text">${act.text}</span>
                  <button class="delete-btn" data-day="${dayIndex}" data-act="${actIndex}" title="Remove">✕</button>
              `;
              card.appendChild(row);
          });
      }

      // Add activity button
      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = "+ Add Activity";
      addBtn.dataset.day = dayIndex;
      card.appendChild(addBtn);

      container.appendChild(card);
  });

  // Wire up delete activity buttons
  container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
          const days = getDays();
          days[btn.dataset.day].activities.splice(Number(btn.dataset.act), 1);
          saveDays(days);
          render();
      });
  });

  // Wire up delete day buttons
  container.querySelectorAll(".delete-day-btn").forEach(btn => {
      btn.addEventListener("click", () => {
          if (!confirm(`Remove ${getDays()[btn.dataset.day].label}?`)) return;
          const days = getDays();
          days.splice(Number(btn.dataset.day), 1);
          saveDays(days);
          render();
          showToast("Day removed", "warning");
      });
  });

  // Wire up add activity buttons
  container.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => openModal(Number(btn.dataset.day)));
  });
}

// ─────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────

let _activeDayIndex = null;

function openModal(dayIndex) {
  _activeDayIndex = dayIndex;
  document.getElementById("activityTime").value = "";
  document.getElementById("activityName").value = "";
  document.getElementById("activityModal").classList.add("open");
  document.getElementById("activityTime").focus();
}

function closeModal() {
  document.getElementById("activityModal").classList.remove("open");
  _activeDayIndex = null;
}

document.getElementById("modalCancel").addEventListener("click", closeModal);

document.getElementById("activityModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.getElementById("modalConfirm").addEventListener("click", () => {
  const time = document.getElementById("activityTime").value.trim();
  const text = document.getElementById("activityName").value.trim();

  if (!time || !text) {
      showToast("Please fill in both fields", "error");
      return;
  }

  const days = getDays();
  days[_activeDayIndex].activities.push({ time, text });
  saveDays(days);
  closeModal();
  render();
  showToast("Activity added ✓");
});

// Allow Enter key to confirm
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("activityModal").classList.contains("open")) {
      document.getElementById("modalConfirm").click();
  }
  if (e.key === "Escape") closeModal();
});

// ─────────────────────────────────────────
// ADD DAY
// ─────────────────────────────────────────

document.getElementById("addDayBtn").addEventListener("click", () => {
  const days = getDays();
  days.push({ label: `Day ${days.length + 1}`, activities: [] });
  saveDays(days);
  render();
  showToast(`Day ${days.length} added ✓`);
});

// ─────────────────────────────────────────
// CLEAR ALL
// ─────────────────────────────────────────

document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (!confirm("Clear all days and activities? This cannot be undone.")) return;
  localStorage.removeItem("tripDays");
  render();
  showToast("All cleared", "warning");
});

// ─────────────────────────────────────────
// LOAD SPOTS FROM DESTINATIONS PAGE
// ─────────────────────────────────────────

function loadSavedActivities() {
  const pending = JSON.parse(localStorage.getItem("myTrip")) || [];
  if (pending.length === 0) return;

  const days = getDays();
  if (!days[0]) days.push({ label: "Day 1", activities: [] });

  let added = 0;
  pending.forEach((spot) => {
      const alreadyIn = days.some(d =>
          d.activities.some(a => a.text === `${spot.name} (${spot.price})`)
      );
      if (!alreadyIn) {
          days[0].activities.push({ time: "Saved", text: `${spot.name} (${spot.price})` });
          added++;
      }
  });

  saveDays(days);
  localStorage.removeItem("myTrip");

  if (added > 0) showToast(`${added} spot${added > 1 ? "s" : ""} added to Day 1 ✓`);
}

// ─────────────────────────────────────────
// CHECKLIST
// ─────────────────────────────────────────

function setupChecklist() {
  document.querySelectorAll('.sidebar input[type="checkbox"]').forEach((box, i) => {
      const key = `checklist_item_${i}`;
      if (localStorage.getItem(key) === "true") box.checked = true;
      box.addEventListener("change", () => localStorage.setItem(key, box.checked));
  });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

loadSavedActivities();
render();
setupChecklist();