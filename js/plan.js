document.addEventListener("DOMContentLoaded", function() {

  function getDays() {
    const saved = JSON.parse(localStorage.getItem("tripDays"));
    if (saved && saved.length > 0) return saved;

    const totalDays = parseInt(localStorage.getItem("selectedDays")) || 1;

    const newDays = [];
    for (let i = 1; i <= totalDays; i++) {
      newDays.push({ label: `Day ${i}`, activities: [] });
    }

    localStorage.setItem("tripDays", JSON.stringify(newDays));
    return newDays;
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

      const header = document.createElement("div");
      header.className = "day-header";
      header.innerHTML = `
        <h3>${day.label}</h3>
        <button class="delete-day-btn" title="Remove this day" data-day="${dayIndex}">✕ Remove day</button>
      `;
      card.appendChild(header);

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
        if (!confirm(`Remove ${getDays()[btn.dataset.day].label}?`)) return;
        const days = getDays();
        days.splice(Number(btn.dataset.day), 1);
        saveDays(days);
        render();
        showToast("Day removed", "warning");
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

    // 1. Clear the inputs
    document.getElementById("activityTime").value = "";
    const nameInput = document.getElementById("activityName");
    nameInput.value = "";

    // 2. Show the Saved Spots with "Remove" buttons
    renderSavedSuggestions(nameInput);

    document.getElementById("activityModal").classList.add("open");
    document.getElementById("activityTime").focus();
  }

  // --- NEW: Render Saved Spots as Tags with 'X' ---
  function renderSavedSuggestions(inputElement) {
    const saved = JSON.parse(localStorage.getItem("myTrip")) || [];
    const containerId = "saved-suggestions-container";
    
    // 1. Create the container div if it doesn't exist
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      // Style: Flexbox for tags
      container.style.cssText = "display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;";
      // Insert it right after the input field
      inputElement.parentNode.insertBefore(container, inputElement.nextSibling);
    }

    // 2. Clear current list
    container.innerHTML = "";

    if (saved.length === 0) return;

    // 3. Add a small label
    const label = document.createElement("div");
    label.textContent = "Saved Spots (Click to add, X to remove):";
    label.style.cssText = "width:100%; font-size:0.75rem; color:#94a3b8; margin-bottom:4px;";
    container.appendChild(label);

    // 4. Create a tag for each spot
    saved.forEach((spot, index) => {
      // Skip hotels
      if (spot.name.includes("🏨")) return;

      const chip = document.createElement("div");
      chip.style.cssText = `
        display:inline-flex; align-items:center; background:#f0f9ff; 
        border:1px solid #bae6fd; border-radius:16px; padding:5px 12px; 
        font-size:0.85rem; color:#0284c7; cursor:pointer; transition:all 0.2s;
      `;
      chip.onmouseover = () => chip.style.background = "#e0f2fe";
      chip.onmouseout  = () => chip.style.background = "#f0f9ff";

      // NAME part (Click to fill input)
      const text = document.createElement("span");
      text.textContent = spot.name;
      text.onclick = () => {
        inputElement.value = spot.name;
        inputElement.focus();
      };

      // DELETE part (Click to remove)
      const delBtn = document.createElement("span");
      delBtn.innerHTML = "&times;"; // The 'X' symbol
      delBtn.title = "Remove from saved";
      delBtn.style.cssText = `
        margin-left:8px; font-weight:bold; color:#7dd3fc; 
        border-left:1px solid #bae6fd; padding-left:8px;
        font-size:1.1rem; line-height:1;
      `;
      // Hover effect for the X
      delBtn.onmouseover = (e) => { e.stopPropagation(); delBtn.style.color = "#ef4444"; };
      delBtn.onmouseout  = (e) => { e.stopPropagation(); delBtn.style.color = "#7dd3fc"; };
      
      delBtn.onclick = (e) => {
        e.stopPropagation(); // Stop it from filling the input
        if (confirm(`Remove "${spot.name}" from your saved list?`)) {
            saved.splice(index, 1); // Remove from array
            localStorage.setItem("myTrip", JSON.stringify(saved)); // Update storage
            renderSavedSuggestions(inputElement); // Refresh the list
            showToast("Removed from saved list", "warning");
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

  // --- BUTTONS & LISTENERS ---

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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.getElementById("activityModal").classList.contains("open")) {
      document.getElementById("modalConfirm").click();
    }
    if (e.key === "Escape") closeModal();
  });
  
  // --- BUTTONS & EVENT LISTENERS (Must Keep These!) ---

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
  // DAY PICKER MODAL (IMPORT SPOTS)
  // ─────────────────────────────────────────

  let _pendingSpotToAdd = null;
  let _importQueue = [];

  function openDayPickerModal(spot) {
    _pendingSpotToAdd = spot;

    const days = getDays();
    const select = document.getElementById("dayPickerSelect");
    const text = document.getElementById("dayPickerText");

    text.textContent = `Schedule visit for: ${spot.name}`;

    // 1. DYNAMICALLY ADD TIME INPUT IF MISSING
    // This ensures we don't crash if your HTML doesn't have this input yet.
    let timeInput = document.getElementById("dayPickerTime");
    if (!timeInput) {
      timeInput = document.createElement("input");
      timeInput.id = "dayPickerTime";
      timeInput.type = "text";
      timeInput.placeholder = "Enter Time (e.g. 10:00 AM)";
      // Style it to match your other inputs
      timeInput.style.cssText = "display:block; width:100%; margin-top:10px; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px;";
      
      // Insert it right after the day dropdown
      select.insertAdjacentElement('afterend', timeInput);
    }
    
    // Clear previous value and focus
    timeInput.value = "";
    
    // Populate Days
    select.innerHTML = "";
    days.forEach((day, i) => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = day.label;
      select.appendChild(option);
    });

    document.getElementById("dayPickerModal").classList.add("open");
    
    // Focus the time input automatically for speed
    setTimeout(() => timeInput.focus(), 100);
  }

  function closeDayPickerModal() {
    document.getElementById("dayPickerModal").classList.remove("open");
    _pendingSpotToAdd = null;
  }

  document.getElementById("dayPickerCancel").addEventListener("click", () => {
    closeDayPickerModal();
    showToast("Import cancelled", "warning");
  });

  document.getElementById("dayPickerConfirm").addEventListener("click", () => {
    if (!_pendingSpotToAdd) return;

    const days = getDays();
    const selectedDay = Number(document.getElementById("dayPickerSelect").value);
    
    // 2. GET THE CHOSEN TIME
    const timeInput = document.getElementById("dayPickerTime");
    // Default to "TBD" if they leave it blank
    const selectedTime = timeInput && timeInput.value.trim() !== "" ? timeInput.value.trim() : "TBD";

    days[selectedDay].activities.push({
      time: selectedTime, // Use the user's input instead of "Saved"
      text: `${_pendingSpotToAdd.name} (${_pendingSpotToAdd.price})`
    });

    saveDays(days);
    render();
    closeDayPickerModal();

    if (_importQueue.length > 0) {
      setTimeout(() => {
        openDayPickerModal(_importQueue.shift());
      }, 200);
    } else {
      showToast("All spots imported ✓");
    }
  });

  // ─────────────────────────────────────────
  // IMPORT SPOTS FROM DESTINATION PAGE
  // ─────────────────────────────────────────

  function loadSavedActivities() {
    const pending = JSON.parse(localStorage.getItem("myTrip")) || [];
    if (pending.length === 0) return;

    const days = getDays();
    if (days.length === 0) {
      days.push({ label: "Day 1", activities: [] });
      saveDays(days);
    }

    _importQueue = [];

    pending.forEach((spot) => {
      if (!spot.name) return;

      // Hotel goes into savedHotel only
      if (spot.name.startsWith("🏨")) {
        const hotelName = spot.name.replace("🏨 ", "");
        localStorage.setItem("savedHotel", JSON.stringify({ name: hotelName, price: spot.price }));
        return;
      }

      // Avoid duplicates
      const alreadyIn = days.some(d =>
        d.activities.some(a => a.text === `${spot.name} (${spot.price})`)
      );

      if (!alreadyIn) _importQueue.push(spot);
    });

    localStorage.removeItem("myTrip");

    if (_importQueue.length > 0) {
      showToast(`${_importQueue.length} saved spot${_importQueue.length > 1 ? "s" : ""} to import`);
      openDayPickerModal(_importQueue.shift());
    }
  }

  // ─────────────────────────────────────────
  // HOTEL CARD
  // ─────────────────────────────────────────

  function renderHotelCard() {
    const hotel = JSON.parse(localStorage.getItem("savedHotel"));
    let card = document.getElementById("hotelCard");

    if (!card) {
      card = document.createElement("div");
      card.id = "hotelCard";
      card.style.cssText = `
        background: linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%);
        border-radius: 12px; padding: 16px 18px; margin-bottom: 16px;
        color: white;
      `;
      const sidebar = document.querySelector(".sidebar");
      sidebar.insertBefore(card, sidebar.firstChild);
    }

    if (!hotel) {
      card.innerHTML = `
        <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;
          letter-spacing:0.08em;opacity:0.8;margin-bottom:6px;">🏨 Your Hotel</div>
        <div style="font-size:0.85rem;opacity:0.7;">No hotel saved yet.</div>
        <a href="destination.html" style="display:inline-block;margin-top:10px;
          padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:20px;
          font-size:0.75rem;color:white;text-decoration:none;font-weight:600;">
          + Find a Hotel →
        </a>
      `;
      return;
    }

    card.innerHTML = `
      <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;
        letter-spacing:0.08em;opacity:0.8;margin-bottom:8px;">🏨 Your Hotel</div>
      <div style="font-size:1rem;font-weight:700;margin-bottom:4px;">${hotel.name}</div>
      <div style="font-size:0.82rem;opacity:0.85;">${hotel.price}</div>
      <button onclick="clearHotel()" style="
        margin-top:12px;padding:4px 10px;background:rgba(255,255,255,0.2);
        border:1px solid rgba(255,255,255,0.3);border-radius:20px;
        font-size:0.72rem;color:white;cursor:pointer;font-family:inherit;">
        ✕ Remove
      </button>
    `;
  }

  window.clearHotel = function() {
    if (!confirm("Remove saved hotel?")) return;
    localStorage.removeItem("savedHotel");
    renderHotelCard();
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
  // INIT
  // ─────────────────────────────────────────

  loadSavedActivities();
  render();
  renderHotelCard();
  setupChecklist();

  document.getElementById("mapToggleBtn").addEventListener("click", function() {
    window.toggleMap();
  });

  // ─────────────────────────────────────────
  // MAP (UNCHANGED)
  // ─────────────────────────────────────────

  let mapInstance    = null;
  let mapInitialised = false;

  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function fmtDist(km) { return km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`; }
  function walkTime(km) { const m=Math.round(km/0.083); return m<60?`${m}m walk`:`${Math.floor(m/60)}h ${m%60}m`; }
  function driveTime(km) { const m=Math.round(km/0.5); return m<60?`${m}m drive`:`${Math.floor(m/60)}h ${m%60}m`; }

  function makePin(label, color, size) {
    size = size || 34;
    return L.divIcon({
      className: "",
      html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);background:${color};border:3px solid white;
        box-shadow:0 3px 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-weight:700;color:white;
          font-size:${Math.round(size*0.34)}px;font-family:sans-serif;">${label}</span>
      </div>`,
      iconSize:    [size, size],
      iconAnchor:  [size/2, size],
      popupAnchor: [0, -size]
    });
  }

  async function geocodeAndRender(city) {
    const days    = getDays();
    const allActs = [];

    days.forEach(day => {
      day.activities.forEach(act => allActs.push({ text: act.text, time: act.time }));
    });

    if (allActs.length === 0) {
      document.getElementById("tripMap").innerHTML =
        `<div style="padding:40px;text-align:center;color:#94a3b8;">
          <div style="font-size:2rem;margin-bottom:10px;">📍</div>
          Add activities to your itinerary to see them on the map.
        </div>`;
      return;
    }

    document.getElementById("tripMap").innerHTML =
      `<div style="padding:40px;text-align:center;color:#94a3b8;">
        <div style="font-size:2rem;margin-bottom:10px;">⏳</div>
        Locating your spots… (${allActs.length} activities, ~${allActs.length}s)
      </div>`;

    const geocoded = [];
    for (const act of allActs) {
      const cleanName = act.text.replace(/🏨\s?/, "").split(" (")[0].trim();
      const isHotel   = act.text.startsWith("🏨");
      try {
        const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName + (city ? " " + city : ""))}&format=json&limit=1`;
        const res  = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        if (data && data[0]) {
          geocoded.push({
            name:    cleanName,
            lat:     parseFloat(data[0].lat),
            lng:     parseFloat(data[0].lon),
            isHotel, time: act.time
          });
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 1100));
    }

    if (geocoded.length === 0) {
      document.getElementById("tripMap").innerHTML =
        `<div style="padding:40px;text-align:center;color:#94a3b8;">
          <div style="font-size:2rem;margin-bottom:10px;">😕</div>
          Couldn't find locations. Try including a city name in your activities.
        </div>`;
      return;
    }

    renderMap(geocoded);
  }

  function renderMap(points) {
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }

    const mapDiv = document.getElementById("tripMap");
    mapDiv.innerHTML = "";
    mapDiv.style.height = "420px";

    mapInstance = L.map("tripMap").setView([points[0].lat, points[0].lng], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", maxZoom: 19
    }).addTo(mapInstance);

    L.control.zoom({ position: "topright" }).addTo(mapInstance);

    const hotel = points.find(p => p.isHotel);
    const spots  = points.filter(p => !p.isHotel);

    if (hotel) {
      spots.forEach(s => {
        L.polyline([[hotel.lat, hotel.lng], [s.lat, s.lng]], {
          color: "#00b4d8", weight: 2, opacity: 0.4, dashArray: "6,5"
        }).addTo(mapInstance);
      });
    }

    if (hotel) {
      L.marker([hotel.lat, hotel.lng], { icon: makePin("H", "#2563eb", 40) })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-size:0.65rem;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:4px;">🏨 Hotel</div>
          <div style="font-weight:700;font-size:0.9rem;">${hotel.name}</div>
          <div style="font-size:0.75rem;color:#64748b;">Your base for the trip</div>
        `);
    }

    spots.forEach((s, i) => {
      const dist = hotel ? haversine(hotel.lat, hotel.lng, s.lat, s.lng) : null;
      L.marker([s.lat, s.lng], { icon: makePin(i+1, "#00b4d8", 34) })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-size:0.65rem;font-weight:700;color:#00b4d8;text-transform:uppercase;margin-bottom:4px;">📍 Stop ${i+1}</div>
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${s.name}</div>
          ${s.time !== "Saved" ? `<div style="font-size:0.75rem;color:#64748b;">🕐 ${s.time}</div>` : ""}
          ${dist ? `<div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;">
            <span style="padding:2px 7px;border-radius:5px;font-size:0.68rem;font-weight:600;background:#f0f9ff;color:#0369a1;">${fmtDist(dist)}</span>
            <span style="padding:2px 7px;border-radius:5px;font-size:0.68rem;font-weight:600;background:#f0fdf4;color:#15803d;">🚶 ${walkTime(dist)}</span>
            <span style="padding:2px 7px;border-radius:5px;font-size:0.68rem;font-weight:600;background:#eff6ff;color:#1d4ed8;">🚗 ${driveTime(dist)}</span>
          </div>` : ""}
        `);
    });

    if (points.length > 1) mapInstance.fitBounds(points.map(p => [p.lat, p.lng]), { padding: [40, 40] });
  }

  window.toggleMap = function() {
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
      const city   = cached || prompt("Which city is your trip in? (helps pinpoint locations)", "") || "";
      if (city) localStorage.setItem("lastSearchedCity", city);
      geocodeAndRender(city);
    } else {
      if (mapInstance) setTimeout(() => mapInstance.invalidateSize(), 100);
    }
  };

}); // end DOMContentLoaded
