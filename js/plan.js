document.addEventListener("DOMContentLoaded", function() {

  // ─────────────────────────────────────────
  // DATE LOGIC & STATE
  // ─────────────────────────────────────────

  function getStartDate() {
    return localStorage.getItem("tripStartDate") || null;
  }

  function setStartDate(dateString) {
    if (dateString) {
        localStorage.setItem("tripStartDate", dateString);
    } else {
        localStorage.removeItem("tripStartDate");
    }
  }

  function getDays() {
    const saved = JSON.parse(localStorage.getItem("tripDays"));
    const startDateRaw = getStartDate();
    let startDate = startDateRaw ? new Date(startDateRaw + "T00:00:00") : null;

    let totalDays = 0;
    if (saved && saved.length > 0) {
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

    localStorage.setItem("tripDays", JSON.stringify(days));
    return days;
  }

  function saveDays(days) {
    localStorage.setItem("tripDays", JSON.stringify(days));
  }

  // ─────────────────────────────────────────
  // TOAST (Notification)
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

  // ─────────────────────────────────────────
  // CUSTOM CONFIRM MODAL (Replaces Browser Alert)
  // ─────────────────────────────────────────

  function createConfirmModal() {
    if (document.getElementById("confirmModal")) return;

    // 1. Inject Styles dynamically
    const style = document.createElement("style");
    style.innerHTML = `
      #confirmModal {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 2000;
        opacity: 0; transition: opacity 0.2s ease;
      }
      #confirmModal.open { display: flex; opacity: 1; }
      #confirmModal .confirm-content {
        background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 320px;
        text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transform: scale(0.9); transition: transform 0.2s ease;
      }
      #confirmModal.open .confirm-content { transform: scale(1); }
      .confirm-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
      .confirm-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
      .confirm-cancel { background: #f1f5f9; color: #64748b; }
      .confirm-cancel:hover { background: #e2e8f0; }
      .confirm-ok { background: #ef4444; color: white; box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3); }
      .confirm-ok:hover { background: #dc2626; }
    `;
    document.head.appendChild(style);

    // 2. Inject HTML
    const modal = document.createElement("div");
    modal.id = "confirmModal";
    modal.innerHTML = `
      <div class="confirm-content">
        <div style="font-size:2rem; margin-bottom:10px;">⚠️</div>
        <h3 style="margin:0 0 8px; font-size:1.1rem; color:#1e293b;">Are you sure?</h3>
        <p id="confirmText" style="color:#64748b; font-size:0.9rem; margin:0; line-height:1.5;">Confirm action</p>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-cancel" id="confirmCancelBtn">Cancel</button>
          <button class="confirm-btn confirm-ok" id="confirmOkBtn">Yes, Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // 3. Close Logic
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeConfirm();
    });
    document.getElementById("confirmCancelBtn").addEventListener("click", closeConfirm);
  }

  let _confirmCallback = null;

  function showConfirm(message, onYes) {
    createConfirmModal(); // Ensure it exists
    
    const modal = document.getElementById("confirmModal");
    const text = document.getElementById("confirmText");
    const okBtn = document.getElementById("confirmOkBtn");

    text.textContent = message;
    _confirmCallback = onYes;

    // Clone button to remove old listeners (avoids duplicate actions)
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
  // SIDEBAR: DATE PICKER
  // ─────────────────────────────────────────

  function renderDatePicker() {
    let container = document.getElementById("datePickerContainer");
    
    if (!container) {
        container = document.createElement("div");
        container.id = "datePickerContainer";
        container.style.cssText = `
            background: white; padding: 16px; border-radius: 12px; 
            margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        `;
        const sidebar = document.querySelector(".sidebar");
        sidebar.insertBefore(container, sidebar.firstChild);
    }

    const savedDate = getStartDate() || "";

    container.innerHTML = `
        <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:8px;">
            📅 Trip Start Date
        </label>
        <input type="date" id="tripStartInput" value="${savedDate}" style="
            width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0; 
            border-radius: 6px; font-family: inherit; color: #334155;
            outline: none; transition: border 0.2s;
        ">
    `;

    const input = document.getElementById("tripStartInput");
    input.addEventListener("focus", () => input.style.borderColor = "#0ea5e9");
    input.addEventListener("blur", () => input.style.borderColor = "#e2e8f0");
    input.addEventListener("change", (e) => {
        setStartDate(e.target.value);
        render();
        showToast("Dates updated ✓");
    });
  }

  // ─────────────────────────────────────────
  // RENDER TIMELINE
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
          
          row.innerHTML = `
            <span class="time ${isSaved ? "saved-tag" : ""}">${act.time}</span>
            <span class="activity-text">${act.text}</span>
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

    // Delete Activity
    container.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const days = getDays();
        days[btn.dataset.day].activities.splice(Number(btn.dataset.act), 1);
        saveDays(days);
        render();
      });
    });

    // Remove Day (Updated to use Custom Modal)
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
    const nameInput = document.getElementById("activityName");
    nameInput.value = "";
    renderDaySelect(dayIndex);
    renderSavedSuggestions(nameInput);
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
      inputElement.parentNode.insertBefore(container, inputElement.nextSibling);
    }

    container.innerHTML = "";
    if (saved.length === 0) return;

    const label = document.createElement("div");
    label.textContent = "Saved Spots (Click to add, X to remove):";
    label.style.cssText = "width:100%; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;";
    container.appendChild(label);

    saved.forEach((spot, index) => {
      if (spot.name.includes("🏨")) return;

      const chip = document.createElement("div");
      chip.style.cssText = `
        display:inline-flex; align-items:center; background:#f0f9ff; 
        border:1px solid #bae6fd; border-radius:16px; padding:5px 12px; 
        font-size:0.85rem; color:#0284c7; cursor:pointer; transition:all 0.2s;
      `;
      chip.onmouseover = () => chip.style.background = "#e0f2fe";
      chip.onmouseout  = () => chip.style.background = "#f0f9ff";

      const text = document.createElement("span");
      text.textContent = spot.name;
      text.onclick = () => { inputElement.value = spot.name; inputElement.focus(); };

      const delBtn = document.createElement("span");
      delBtn.innerHTML = "&times;";
      delBtn.title = "Remove from saved";
      delBtn.style.cssText = "margin-left:8px; font-weight:bold; color:#7dd3fc; border-left:1px solid #bae6fd; padding-left:8px; font-size:1.1rem; line-height:1;";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${spot.name}" from your saved list?`)) {
            saved.splice(index, 1);
            localStorage.setItem("myTrip", JSON.stringify(saved));
            renderSavedSuggestions(inputElement);
        }
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
  if(modalCancel) modalCancel.addEventListener("click", closeModal);

  document.getElementById("activityModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  const modalConfirm = document.getElementById("modalConfirm");
  if(modalConfirm) modalConfirm.addEventListener("click", () => {
    const time = document.getElementById("activityTime").value.trim();
    const text = document.getElementById("activityName").value.trim();
    const select = document.getElementById("activityDaySelect");
    const targetDayIndex = select ? Number(select.value) : _activeDayIndex;

    if (!time || !text) { showToast("Please fill in both fields", "error"); return; }

    const days = getDays();
    if (days[targetDayIndex]) {
        days[targetDayIndex].activities.push({ time, text });
        saveDays(days);
        closeModal();
        render();
        showToast(`Activity added to ${days[targetDayIndex].label} ✓`);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.getElementById("activityModal").classList.contains("open")) {
      document.getElementById("modalConfirm").click();
    }
    if (e.key === "Escape") closeModal();
  });

  // ─────────────────────────────────────────
  // ADD DAY & CLEAR (Updated with Custom Modal)
  // ─────────────────────────────────────────

  document.getElementById("addDayBtn").addEventListener("click", () => {
    const days = getDays();
    days.push({ label: `Day ${days.length + 1}`, activities: [] });
    saveDays(days);
    render();
    showToast(`Day ${days.length} added ✓`);
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    // ⬇️ REPLACED browser confirm() with showConfirm()
    showConfirm("Clear all days and activities? This cannot be undone.", () => {
        localStorage.removeItem("tripDays");
        localStorage.removeItem("tripStartDate");
        document.getElementById("tripStartInput").value = "";
        render();
        showToast("All cleared", "warning");
    });
  });

  // ─────────────────────────────────────────
  // HOTEL CARD (Updated with Custom Modal)
  // ─────────────────────────────────────────

  function renderHotelCard() {
    const hotel = JSON.parse(localStorage.getItem("savedHotel"));
    let card = document.getElementById("hotelCard");

    if (!card) {
      card = document.createElement("div");
      card.id = "hotelCard";
      card.style.cssText = `background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%); border-radius: 12px; padding: 16px 18px; margin-bottom: 16px; color: white; box-shadow: 0 4px 12px rgba(3,105,161,0.15);`;
      const sidebar = document.querySelector(".sidebar");
      const datePicker = document.getElementById("datePickerContainer");
      if (datePicker) sidebar.insertBefore(card, datePicker.nextSibling);
      else sidebar.insertBefore(card, sidebar.firstChild);
    }

    if (!hotel) {
      card.innerHTML = `<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;margin-bottom:6px;">🏨 Your Hotel</div><div style="font-size:0.85rem;opacity:0.8;">No hotel saved yet.</div><a href="destination.html" style="display:inline-block;margin-top:10px;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:20px;font-size:0.75rem;color:white;text-decoration:none;font-weight:600;">+ Find Hotel</a>`;
      return;
    }

    card.innerHTML = `<div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;margin-bottom:8px;">🏨 Your Hotel</div><div style="font-size:1rem;font-weight:700;margin-bottom:4px;">${hotel.name}</div><div style="font-size:0.82rem;opacity:0.85;">${hotel.price}</div><button onclick="clearHotel()" style="margin-top:12px;padding:4px 10px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:20px;font-size:0.72rem;color:white;cursor:pointer;font-family:inherit;">✕ Remove</button>`;
  }

  window.clearHotel = function() {
    showConfirm("Remove this saved hotel?", () => {
        localStorage.removeItem("savedHotel");
        renderHotelCard();
        showToast("Hotel removed", "warning");
    });
  };

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
  // MAP LOGIC
  // ─────────────────────────────────────────
  
  let mapInstance = null;
  let mapInitialised = false;

  document.getElementById("mapToggleBtn").addEventListener("click", toggleMap);
  window.toggleMap = function() { toggleMap(); }

  function toggleMap() {
    const body = document.getElementById("mapBody");
    const btn  = document.getElementById("mapToggleBtn");
    if (body.style.display !== "none") {
      body.style.display = "none";
      btn.textContent = "Show Map";
      return;
    }
    body.style.display = "block";
    btn.textContent = "Hide Map";
    if (!mapInitialised) {
      mapInitialised = true;
      const cached = localStorage.getItem("lastSearchedCity") || "";
      const city = cached || prompt("Which city is this trip for?", "") || "";
      if (city) localStorage.setItem("lastSearchedCity", city);
      geocodeAndRender(city);
    } else {
      if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 100);
    }
  };

  async function geocodeAndRender(city) {
    const days = getDays();
    const allActs = [];
    days.forEach(day => {
      day.activities.forEach(act => allActs.push({ text: act.text, time: act.time }));
    });

    if (allActs.length === 0) {
      document.getElementById("tripMap").innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Add activities to see them on the map.</div>`;
      return;
    }

    document.getElementById("tripMap").innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Locating spots...</div>`;

    const geocoded = [];
    for (const act of allActs) {
      const cleanName = act.text.replace(/🏨\s?/, "").split(" (")[0].trim();
      const isHotel = act.text.startsWith("🏨");
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName + (city ? " " + city : ""))}&format=json&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data[0]) {
          geocoded.push({ name: cleanName, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), isHotel, time: act.time });
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 1100));
    }

    if (geocoded.length === 0) {
        document.getElementById("tripMap").innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Couldn't find locations.</div>`;
        return;
    }
    renderMap(geocoded);
  }

  function renderMap(points) {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    document.getElementById("tripMap").innerHTML = "";
    mapInstance = L.map("tripMap");
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(mapInstance);
    L.control.zoom({ position: "topright" }).addTo(mapInstance);
    const bounds = [];
    points.forEach(p => {
        L.marker([p.lat, p.lng]).addTo(mapInstance).bindPopup(`<b>${p.name}</b><br>${p.time}`);
        bounds.push([p.lat, p.lng]);
    });
    if (bounds.length > 0) mapInstance.fitBounds(bounds, { padding: [50, 50] });
  }

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  
  renderDatePicker();
  renderHotelCard();
  setupChecklist();

  const savedDays = JSON.parse(localStorage.getItem("tripDays"));
  if (!savedDays || savedDays.length === 0) {
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