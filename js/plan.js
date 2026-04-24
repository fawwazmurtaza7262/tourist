document.addEventListener("DOMContentLoaded", function() {

  // ─────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────

  function getStartDate() {
    return localStorage.getItem("tripStartDate") || null;
  }

  function setStartDate(dateString) {
    if (dateString) localStorage.setItem("tripStartDate", dateString);
    else localStorage.removeItem("tripStartDate");
  }

  function getBudget() {
    return parseFloat(localStorage.getItem("tripBudget")) || 0;
  }

  function setBudget(amount) {
    localStorage.setItem("tripBudget", amount);
  }

  function getDays() {
    const saved = JSON.parse(localStorage.getItem("tripDays"));
    const startDateRaw = getStartDate();
    let startDate = startDateRaw ? new Date(startDateRaw + "T00:00:00") : null;

    let totalDays = 0;
    if (saved !== null) {
      totalDays = saved.length;
    } else {
      totalDays = parseInt(localStorage.getItem("selectedDays")) || 1;
    }

    const days = [];
    for (let i = 0; i < totalDays; i++) {
      let label = `Day ${i + 1}`;
      let subLabel = "";

      if (startDate) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        label = current.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
        subLabel = `Day ${i + 1}`;
      }

      const existingActs = (saved && saved[i]) ? saved[i].activities : [];

      days.push({
        label: label,
        subLabel: subLabel,
        activities: existingActs
      });
    }

    if (saved === null && days.length > 0) {
      localStorage.setItem("tripDays", JSON.stringify(days));
    }

    return days;
  }

  function saveDays(days) {
    localStorage.setItem("tripDays", JSON.stringify(days));
  }

  // ─────────────────────────────────────────
  // TOAST & CUSTOM MODALS
  // ─────────────────────────────────────────

  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = "toast";
    }, 2500);
  }

  function createConfirmModal() {
    if (document.getElementById("confirmModal")) return;

    const style = document.createElement("style");
    style.innerHTML = `
      #confirmModal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 10000; opacity: 0; transition: opacity 0.2s ease; }
      #confirmModal.open { display: flex; opacity: 1; }
      #confirmModal .confirm-content { background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); transform: scale(0.9); transition: transform 0.2s ease; }
      #confirmModal.open .confirm-content { transform: scale(1); }
      .confirm-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
      .confirm-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
      .confirm-cancel { background: #f1f5f9; color: #64748b; }
      .confirm-cancel:hover { background: #e2e8f0; }
      .confirm-ok { background: #ef4444; color: white; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3); }
      .confirm-ok:hover { background: #dc2626; }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "confirmModal";
    modal.innerHTML = `
      <div class="confirm-content">
        <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
        <h3 style="margin:0 0 8px; font-size:1.1rem; color:#1e293b;">Are you sure?</h3>
        <p id="confirmText" style="color:#64748b; font-size:0.9rem; margin:0; line-height:1.5;">Confirm action</p>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-cancel" id="confirmCancelBtn">Cancel</button>
          <button class="confirm-btn confirm-ok" id="confirmOkBtn">Yes, Remove</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => { if (e.target === modal) closeConfirm(); });
    document.getElementById("confirmCancelBtn").addEventListener("click", closeConfirm);
  }

  let _confirmCallback = null;
  function showConfirm(message, onYes) {
    createConfirmModal();
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const okBtn = document.getElementById("confirmOkBtn");

    text.textContent = message;
    _confirmCallback = onYes;

    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);

    newOk.addEventListener("click", () => {
      if (_confirmCallback) _confirmCallback();
      closeConfirm();
    });
    modal.classList.add("open");
  }

  function closeConfirm() {
    const modal = document.getElementById("confirmModal");
    if (modal) modal.classList.remove("open");
    _confirmCallback = null;
  }

  // ─────────────────────────────────────────
  // SIDEBAR COMPONENTS
  // ─────────────────────────────────────────

  function renderDatePicker() {
    let container = document.getElementById("datePickerContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "datePickerContainer";
      container.style.cssText = `background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);`;
      const sidebar = document.querySelector(".sidebar");
      sidebar.insertBefore(container, sidebar.firstChild);
    }
    const savedDate = getStartDate() || "";
    container.innerHTML = `
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:8px;">📅 Trip Start Date</label>
      <input type="date" id="tripStartInput" value="${savedDate}" style="width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-family: inherit; color: #334155; outline: none; transition: border 0.2s;">
    `;
    const input = document.getElementById("tripStartInput");
    input.addEventListener("focus", () => input.style.borderColor = "#C4623A");
    input.addEventListener("blur", () => input.style.borderColor = "#e2e8f0");
    input.addEventListener("change", (e) => {
      setStartDate(e.target.value);
      render();
      showToast("Dates updated ✓");
    });
  }

  function renderBudgetTracker() {
    let card = document.getElementById("budgetCard");
    const sidebar = document.querySelector(".sidebar");

    if (!card) {
      card = document.createElement("div");
      card.id = "budgetCard";
      card.style.cssText = `background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 16px; color: #166534;`;
      const hotelCard = document.getElementById("hotelCard");
      if (hotelCard) sidebar.insertBefore(card, hotelCard.nextSibling);
      else sidebar.appendChild(card);
    }

    const days = getDays();
    let totalSpent = 0;
    days.forEach(day => {
      day.activities.forEach(act => {
        if (act.cost) totalSpent += parseFloat(act.cost);
      });
    });

    const budget = getBudget();
    const percent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
    const barColor = totalSpent > budget ? "#ef4444" : "#22c55e";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; opacity:0.8;">💸 Budget</div>
        <button id="editBudgetBtn" style="background:none; border:none; text-decoration:underline; font-size:0.7rem; color:#15803d; cursor:pointer;">Edit Max</button>
      </div>
      <div style="font-size:0.9rem; font-weight:600; margin-bottom:6px;">
        Spent $${totalSpent.toLocaleString()} <span style="font-weight:400; font-size:0.8rem; color:#15803d;">of $${budget.toLocaleString()}</span>
      </div>
      <div style="background:rgba(255,255,255,0.6); height:8px; border-radius:4px; overflow:hidden; margin-bottom:4px;">
        <div style="width:${percent}%; height:100%; background:${barColor}; transition:width 0.5s ease;"></div>
      </div>
      ${totalSpent > budget ? `<div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-top:4px;">⚠️ Over Budget!</div>` : ""}
    `;

    document.getElementById("editBudgetBtn").addEventListener("click", () => {
      const newBudget = prompt("Enter your total trip budget ($):", budget);
      if (newBudget !== null) {
        const cleanBudget = parseFloat(newBudget.replace(/[^0-9.]/g, "")) || 0;
        setBudget(cleanBudget);
        renderBudgetTracker();
      }
    });
  }

  // ─────────────────────────────────────────
  // HOTEL CARD — reads from "myTrip"
  // ─────────────────────────────────────────

  function renderHotelCard() {
    const trip = JSON.parse(localStorage.getItem("myTrip")) || [];
    const hotel = trip.find(s => s.name.startsWith("🏨"));

    let card = document.getElementById("hotelCard");
    const sidebar = document.querySelector(".sidebar");

    if (!card) {
      card = document.createElement("div");
      card.id = "hotelCard";
      card.style.cssText = `background: #C4623A; border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; color: white;`;
      const datePicker = document.getElementById("datePickerContainer");
      if (datePicker) sidebar.insertBefore(card, datePicker.nextSibling);
      else sidebar.insertBefore(card, sidebar.firstChild);
    }

    if (!hotel) {
      card.innerHTML = `
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;margin-bottom:6px;">🏨 Your Hotel</div>
        <div style="font-size:0.85rem;opacity:0.8;">No hotel saved yet.</div>
        <a href="destination.html" style="display:inline-block;margin-top:10px;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:20px;font-size:0.75rem;color:white;text-decoration:none;font-weight:600;">+ Find Hotel</a>
      `;
      return;
    }

    const cleanName = hotel.name.replace("🏨 ", "");
    card.innerHTML = `
      <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;margin-bottom:8px;">🏨 Your Hotel</div>
      <div style="font-size:1rem;font-weight:700;margin-bottom:4px;">${cleanName}</div>
      <div style="font-size:0.82rem;opacity:0.85;">${hotel.price}</div>
      <button onclick="clearHotel()" style="margin-top:12px;padding:4px 10px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:20px;font-size:0.72rem;color:white;cursor:pointer;font-family:inherit;">✕ Remove</button>
    `;
  }

  window.clearHotel = function() {
    showConfirm("Remove this saved hotel?", () => {
      const trip = JSON.parse(localStorage.getItem("myTrip")) || [];
      const filtered = trip.filter(s => !s.name.startsWith("🏨"));
      localStorage.setItem("myTrip", JSON.stringify(filtered));
      renderHotelCard();
      showToast("Hotel removed", "warning");
    });
  };

  // ─────────────────────────────────────────
  // RENDER ITINERARY
  // ─────────────────────────────────────────

  function render() {
    const days = getDays();
    const container = document.getElementById("daysContainer");
    container.innerHTML = "";

    renderDatePicker();
    renderHotelCard();
    renderBudgetTracker();
    setupChecklist();

    if (days.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center;"><div style="font-size:3rem; margin-bottom:10px; opacity:0.3;">🗓️</div><p>No days yet.</p><button id="startEmptyBtn" style="margin-top:10px; padding:8px 16px; background:#C4623A; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">+ Add Day 1</button></div>`;
      document.getElementById("startEmptyBtn").addEventListener("click", () => {
        days.push({ label: "Day 1", activities: [] });
        saveDays(days);
        render();
      });
      return;
    }

    days.forEach((day, dayIndex) => {
      const card = document.createElement("div");
      card.className = "day-card";

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `
        <div style="display:flex; flex-direction:column;">
          <h3 style="margin-bottom:2px; font-size:1.1rem;">${day.label}</h3>
          ${day.subLabel ? `<span style="font-size:0.75rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">${day.subLabel}</span>` : ""}
        </div>
        <button class="delete-day-btn" title="Remove this day" data-day="${dayIndex}" style="font-size:0.8rem;">✕ Remove</button>
      `;
      card.appendChild(header);

      if (day.activities.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.style.padding = "12px 0 8px";
        empty.textContent = "No activities yet.";
        card.appendChild(empty);
      } else {
        day.activities.forEach((act, actIndex) => {
          const row = document.createElement("div");
          row.className = "activity-item";
          const isSaved = act.time === "Saved";
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.text)}`;

          row.innerHTML = `
            <span class="time ${isSaved ? "saved-tag" : ""}">${act.time}</span>
            <div style="display:flex; flex-direction:column; justify-content:center; margin-left:10px;">
              <span class="activity-text">${act.text}</span>
              ${act.cost ? `<span style="font-size:0.75rem; color:#15803d; font-weight:600;">$${act.cost}</span>` : ""}
            </div>
            <a href="${mapUrl}" target="_blank" title="Get Directions" style="margin-left:auto; margin-right:12px; text-decoration:none; color:#C4623A; font-size:0.85rem; font-weight:600; display:flex; align-items:center; gap:4px; border:1px solid #EDE3CC; padding:4px 8px; border-radius:20px; background:white;">
              🚗 Navigate ↗
            </a>
            <button class="delete-btn" data-day="${dayIndex}" data-act="${actIndex}" title="Remove">✕</button>
          `;
          card.appendChild(row);
        });
      }

      const addBtn = document.createElement("button");
      addBtn.className = "add-btn";
      addBtn.textContent = "+ Add Activity";
      addBtn.dataset.day = dayIndex;
      card.appendChild(addBtn);

      container.appendChild(card);
    });

    container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const days = getDays();
        days[btn.dataset.day].activities.splice(Number(btn.dataset.act), 1);
        saveDays(days);
        render();
      });
    });

    container.querySelectorAll(".delete-day-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const dayLabel = getDays()[btn.dataset.day].label;
        showConfirm(`Remove ${dayLabel} and its activities?`, () => {
          const days = getDays();
          days.splice(Number(btn.dataset.day), 1);
          saveDays(days);
          render();
          showToast("Day removed", "warning");
        });
      });
    });

    container.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => openModal(Number(btn.dataset.day)));
    });

    const count = days.reduce((n, d) => n + d.activities.length, 0);
    const badge = document.getElementById("mapPinCount");
    if (badge) badge.textContent = count > 0 ? `· ${count} spot${count > 1 ? "s" : ""}` : "";
  }

  // ─────────────────────────────────────────
  // MODAL (ADD ACTIVITY)
  // ─────────────────────────────────────────

  let _activeDayIndex = null;

  function openModal(dayIndex) {
    _activeDayIndex = dayIndex;

    document.getElementById("activityTime").value = "";
    document.getElementById("activityName").value = "";

    let costGroup = document.getElementById("costInputGroup");
    if (!costGroup) {
      costGroup = document.createElement("div");
      costGroup.id = "costInputGroup";
      costGroup.style.marginBottom = "15px";
      costGroup.innerHTML = `
        <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Cost ($)</label>
        <input type="number" id="activityCost" placeholder="0" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.95rem; color: #334155; outline: none;">
      `;
      const activityInput = document.getElementById("activityName");
      activityInput.parentNode.insertBefore(costGroup, activityInput.nextSibling);
    }
    document.getElementById("activityCost").value = "";

    renderDaySelect(dayIndex);
    renderSavedSuggestions(document.getElementById("activityName"));

    document.getElementById("activityModal").classList.add("open");
    document.getElementById("activityTime").focus();
  }

  function renderDaySelect(selectedIndex) {
    const timeInput = document.getElementById("activityTime");
    let container = document.getElementById("daySelectContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "daySelectContainer";
      container.style.marginBottom = "15px";
      const label = document.createElement("label");
      label.textContent = "CHOOSE DAY";
      label.style.cssText = "display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:6px; letter-spacing:0.05em;";
      const select = document.createElement("select");
      select.id = "activityDaySelect";
      select.style.cssText = "width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; background: white; font-size: 0.95rem; color: #334155; outline: none;";
      container.appendChild(label);
      container.appendChild(select);

      const prev = timeInput.previousElementSibling;
      if (prev && prev.tagName === "LABEL") timeInput.parentNode.insertBefore(container, prev);
      else timeInput.parentNode.insertBefore(container, timeInput);
    }

    const select = document.getElementById("activityDaySelect");
    select.innerHTML = "";
    const days = getDays();
    days.forEach((day, index) => {
      const option = document.createElement("option");
      option.value = index;
      let text = day.label;
      if (day.subLabel) text += ` (${day.subLabel})`;
      option.textContent = text;
      select.appendChild(option);
    });
    select.value = selectedIndex;
  }

  function renderSavedSuggestions(inputElement) {
    const saved = JSON.parse(localStorage.getItem("myTrip")) || [];
    const containerId = "saved-suggestions-container";
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.cssText = "display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;";

      const costGroup = document.getElementById("costInputGroup");
      if (costGroup) costGroup.parentNode.insertBefore(container, costGroup.nextSibling);
      else inputElement.parentNode.insertBefore(container, inputElement.nextSibling);
    }

    container.innerHTML = "";
    if (saved.length === 0) return;

    const label = document.createElement("div");
    label.textContent = "Saved Spots (Click to add):";
    label.style.cssText = "width:100%; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;";
    container.appendChild(label);

    saved.forEach((spot, index) => {
      if (spot.name.includes("🏨")) return;

      const chip = document.createElement("div");
      chip.style.cssText = `display:inline-flex; align-items:center; background:#FFF5F0; border:1px solid #EDE3CC; border-radius:16px; padding:5px 12px; font-size:0.85rem; color:#C4623A; cursor:pointer; transition:all 0.2s;`;
      chip.onmouseover = () => chip.style.background = "#FDEEE8";
      chip.onmouseout  = () => chip.style.background = "#FFF5F0";

      const text = document.createElement("span");
      text.textContent = spot.name;

      text.onclick = () => {
        inputElement.value = spot.name;
        if (spot.price) {
          const nums = spot.price.toString().replace(/[^0-9.]/g, "");
          const costInput = document.getElementById("activityCost");
          if (costInput && nums) costInput.value = nums;
        }
        saved.splice(index, 1);
        localStorage.setItem("myTrip", JSON.stringify(saved));
        renderSavedSuggestions(inputElement);
        inputElement.focus();
      };

      const delBtn = document.createElement("span");
      delBtn.innerHTML = "×";
      delBtn.title = "Remove";
      delBtn.style.cssText = "margin-left:8px; font-weight:bold; color:#D4924A; border-left:1px solid #EDE3CC; padding-left:8px; font-size:1.1rem; line-height:1;";

      delBtn.onclick = (e) => {
        e.stopPropagation();
        showConfirm(`Remove "${spot.name}" from your saved list?`, () => {
          saved.splice(index, 1);
          localStorage.setItem("myTrip", JSON.stringify(saved));
          renderSavedSuggestions(inputElement);
        });
      };

      chip.appendChild(text);
      chip.appendChild(delBtn);
      container.appendChild(chip);
    });
  }

  function closeModal() {
    document.getElementById("activityModal").classList.remove("open");
    _activeDayIndex = null;
  }

  const modalCancel = document.getElementById("modalCancel");
  if (modalCancel) modalCancel.addEventListener("click", closeModal);
  document.getElementById("activityModal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeModal(); });

  const modalConfirm = document.getElementById("modalConfirm");
  if (modalConfirm) modalConfirm.addEventListener("click", () => {
    const time = document.getElementById("activityTime").value.trim();
    const text = document.getElementById("activityName").value.trim();
    const cost = document.getElementById("activityCost").value.trim();

    const select = document.getElementById("activityDaySelect");
    const targetDayIndex = select ? Number(select.value) : _activeDayIndex;

    if (!time || !text) { showToast("Please fill in Time and Activity", "error"); return; }

    const days = getDays();
    if (days[targetDayIndex]) {
      days[targetDayIndex].activities.push({ time, text, cost: cost || 0 });
      saveDays(days);
      closeModal();
      render();
      showToast(`Activity added ✓`);
    }
  });

  // ─────────────────────────────────────────
  // GLOBAL LISTENERS & INIT
  // ─────────────────────────────────────────

  document.getElementById("addDayBtn").addEventListener("click", () => {
    const days = getDays();
    days.push({ label: `Day ${days.length + 1}`, activities: [] });
    saveDays(days);
    render();
    showToast(`Day ${days.length} added ✓`);
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    showConfirm("Clear everything? This will reset all trip data.", () => {
      localStorage.clear();
      render();
      showToast("All data cleared", "warning");
      // Reset the map
      if (mapInstance) { mapInstance.remove(); mapInstance = null; }
      const mapDiv = document.getElementById("tripMap");
      if (mapDiv) mapDiv.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Add activities to see them on the map.</div>`;
    });
  });

  function setupChecklist() {
    document.querySelectorAll('.sidebar input[type="checkbox"]').forEach((box, i) => {
      const key = `checklist_item_${i}`;
      if (localStorage.getItem(key) === "true") box.checked = true;
      box.addEventListener("change", () => localStorage.setItem(key, box.checked));
    });
  }

  // ─────────────────────────────────────────
  // MAP
  // ─────────────────────────────────────────

  const toggleBtn = document.getElementById("mapToggleBtn");
  if (toggleBtn) toggleBtn.remove();

  const mapBody = document.getElementById("mapBody");
  if (mapBody) {
    mapBody.style.display = "block";
    const mapDiv = document.getElementById("tripMap");
    if (mapDiv) mapDiv.style.height = "420px";
  }

  let mapInstance = null;
  setTimeout(autoInitMap, 500);

  function autoInitMap() {
    const city = localStorage.getItem("lastSearchedCity") || "";
    console.log("lastSearchedCity:", city);
    geocodeAndRender(city);
  }

  async function geocodeAndRender(city) {
    console.log("Geocoding with city:", city);

    const days = getDays();
    const allActs = [];

    // Add activities
    days.forEach(day => day.activities.forEach(act => {
      allActs.push({ text: act.text, time: act.time, isHotel: false });
    }));

    // Add hotel from myTrip
    const trip = JSON.parse(localStorage.getItem("myTrip")) || [];
    const hotel = trip.find(s => s.name.startsWith("🏨"));
    if (hotel) {
      allActs.push({
        text: hotel.name.replace("🏨 ", "").trim(),
        time: "Hotel",
        isHotel: true
      });
    }

    const mapDiv = document.getElementById("tripMap");
    if (allActs.length === 0) {
      mapDiv.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Add activities to see them on the map.</div>`;
      return;
    }

    mapDiv.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Locating spots...</div>`;

    const geocoded = [];
    for (const act of allActs) {
      const fullName = act.text.replace(/🏨\s?/, "").split(" (")[0].trim();
      const cleanName = act.isHotel
        ? fullName.split(" ").slice(0, 4).join(" ")
        : fullName;
      try {
        // Query with just "name city" — no bias coords which were causing wrong country matches
        const query = city ? `${cleanName} ${city}` : cleanName;
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Geocode result for:", cleanName, data);
        if (data.features && data.features[0]) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          geocoded.push({ name: cleanName, lat, lng, isHotel: act.isHotel, time: act.time });
        }
      } catch (err) {
        console.error("Geocode failed for:", cleanName, err);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log("All acts being geocoded:", allActs);
    console.log("Final geocoded points:", geocoded);
    renderMap(geocoded);
  }

  function renderMap(points) {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }

    const mapDiv = document.getElementById("tripMap");
    mapDiv.innerHTML = "";

    mapInstance = L.map("tripMap", { zoomControl: false });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19
    }).addTo(mapInstance);

    L.control.zoom({ position: "topright" }).addTo(mapInstance);

    // Draw dashed lines between consecutive points
    if (points.length > 1) {
      for (let i = 0; i < points.length - 1; i++) {
        L.polyline(
          [[points[i].lat, points[i].lng], [points[i+1].lat, points[i+1].lng]],
          { color: "#EDE3CC", weight: 2, dashArray: "6, 6", opacity: 0.8 }
        ).addTo(mapInstance);
      }
    }

    const bounds = [];
    points.forEach(p => {
      const color = p.isHotel ? "#C4623A" : "#D4924A";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([p.lat, p.lng], { icon })
        .bindPopup(`<b>${p.name}</b><br><span style="color:#888;font-size:0.8rem;">${p.time}</span>`, {
          closeButton: false,
          offset: [0, -8]
        })
        .addTo(mapInstance);

      marker.on("mouseover", function() { this.openPopup(); });
      marker.on("mouseout", function() { this.closePopup(); });

      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length > 0) {
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
    } else {
      mapInstance.setView([20, 0], 2);
    }

    setTimeout(() => mapInstance.invalidateSize(), 300);
  }

  // ─────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────

  const savedDays = JSON.parse(localStorage.getItem("tripDays"));
  if (savedDays === null) {
    const savedSpots = JSON.parse(localStorage.getItem("myTrip")) || [];
    if (savedSpots.length > 0) {
      const days = getDays();
      if (days.length === 0) {
        days.push({ label: "Day 1", activities: [] });
        localStorage.setItem("tripDays", JSON.stringify(days));
      }
    }
  }
  render();
});