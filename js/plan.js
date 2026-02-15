document.addEventListener("DOMContentLoaded", function() {

  function getDays() {
    return JSON.parse(localStorage.getItem("tripDays")) || [{ label: "Day 1", activities: [] }];
  }
  
  function saveDays(days) {
    localStorage.setItem("tripDays", JSON.stringify(days));
  }

  const TOTAL_BUDGET = 10000;

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
  
    // Update map pin count badge
    const count = days.reduce((n, d) => n + d.activities.length, 0);
    const badge = document.getElementById("mapPinCount");
    if (badge) badge.textContent = count > 0 ? `· ${count} spot${count > 1 ? "s" : ""}` : "";

    updateBudgetUI();
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
  
  // Wire map button via addEventListener (not inline onclick)
  document.getElementById("mapToggleBtn").addEventListener("click", function() {
    window.toggleMap();
  });
  
  // ─────────────────────────────────────────
  // MAP
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
  
    // Clear the loading message and set height
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
  
    // Lines from hotel to each spot
    if (hotel) {
      spots.forEach(s => {
        L.polyline([[hotel.lat, hotel.lng], [s.lat, s.lng]], {
          color: "#00b4d8", weight: 2, opacity: 0.4, dashArray: "6,5"
        }).addTo(mapInstance);
      });
    }
  
    // Hotel pin
    if (hotel) {
      L.marker([hotel.lat, hotel.lng], { icon: makePin("H", "#2563eb", 40) })
        .addTo(mapInstance)
        .bindPopup(`
          <div style="font-size:0.65rem;font-weight:700;color:#2563eb;text-transform:uppercase;margin-bottom:4px;">🏨 Hotel</div>
          <div style="font-weight:700;font-size:0.9rem;">${hotel.name}</div>
          <div style="font-size:0.75rem;color:#64748b;">Your base for the trip</div>
        `);
    }
  
    // Attraction pins
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
  
    // Fit all pins in view
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

  function getTotalSpent(days) {
    let total = 0;
  
    days.forEach(day => {
      day.activities.forEach(act => {
        // extract price inside ($43) or ($70/night)
        const match = act.text.match(/\(\$([0-9]+(\.[0-9]+)?)\/?.*?\)/);
  
        if (match) {
          total += parseFloat(match[1]);
        }
      });
    });
  
    return total;
  }
  
  function updateBudgetUI() {
    const days = getDays();
    const spent = getTotalSpent(days);
    const remaining = TOTAL_BUDGET - spent;
  
    document.getElementById("budgetTotal").textContent = `$${TOTAL_BUDGET.toLocaleString()}`;
    document.getElementById("budgetRemaining").textContent =
      `$${remaining.toLocaleString()}`;
  
    // Optional: turn red if over budget
    const remainingEl = document.getElementById("budgetRemaining");
    if (remaining < 0) {
      remainingEl.style.color = "red";
      remainingEl.style.fontWeight = "700";
    } else {
      remainingEl.style.color = "";
      remainingEl.style.fontWeight = "";
    }
  }
  
  
  
  }); 