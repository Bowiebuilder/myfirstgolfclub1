(function () {
  // --- Map init ---
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const map = L.map('map', { scrollWheelZoom: true, worldCopyJump: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(map);
  map.setView([20, 0], 2);

  // Fetch submissions & render
  fetch('/api/submissions', { headers: { 'Accept': 'application/json' } })
    .then(r => r.ok ? r.json() : [])
    .then(data => {
      if (!Array.isArray(data)) return;
      renderMarkers(data);
      renderStats(data);
    })
    .catch(() => { /* soft fail */ });

  function renderMarkers(rows) {
    const markers = [];
    rows.forEach(item => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const popupHTML = playerCardHTML(item);
      const marker = L.marker([lat, lng]).addTo(map).bindPopup(popupHTML, { minWidth: 260, maxWidth: 320 });

      // Hover preview: open on mouseover, close on mouseout
      marker.on('mouseover', () => marker.openPopup());
      marker.on('mouseout', () => marker.closePopup());

      markers.push(marker);
    });

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.25));
    }
  }

  function playerCardHTML(item) {
    // Defensive: escape
    const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

    const name = [item.firstName, item.lastInitial ? (item.lastInitial + '.') : ''].filter(Boolean).join(' ');
    const loc  = [item.city, item.country].filter(Boolean).join(', ');
    const club = item.firstGolfClub ? esc(item.firstGolfClub) : '';
    const date = item.firstRoundDate ? esc(item.firstRoundDate) : '';
    const age  = item.ageWhenStarted ? `Started at ${esc(item.ageWhenStarted)}` : '';
    const dream= item.dreamCourse ? `Dream: ${esc(item.dreamCourse)}` : '';
    const how  = item.howGotIntoGolf ? esc(item.howGotIntoGolf) : '';
    const story= item.story ? esc(item.story) : '';

    return `
      <div class="player-card">
        <div class="pc-header">
          <div class="pc-avatar" aria-hidden="true">${esc((item.firstName||'?')[0]).toUpperCase()}</div>
          <div>
            <div class="pc-name">${esc(name || 'Someone')}</div>
            <div class="pc-meta">${esc(loc)}</div>
          </div>
        </div>
        <div class="pc-body">
          ${club ? `<div class="pc-row"><span>First round:</span> ${club}${date ? ` (${date})` : ''}</div>` : ''}
          ${age ? `<div class="pc-row">${age}</div>` : ''}
          ${dream ? `<div class="pc-row">${dream}</div>` : ''}
          ${how ? `<div class="pc-note">“${how}”</div>` : ''}
          ${story ? `<div class="pc-note small">“${story}”</div>` : ''}
        </div>
      </div>
    `;
  }

  // --- Stats ---
  function renderStats(rows) {
    const totalEl = document.getElementById('stat-total');
    const avgAgeEl = document.getElementById('stat-avg-age');
    const topCountriesEl = document.getElementById('stat-top-countries');

    // Total
    totalEl && (totalEl.textContent = String(rows.length));

    // Average ageWhenStarted (numeric only)
    const ages = rows
      .map(r => Number(r.ageWhenStarted))
      .filter(n => Number.isFinite(n) && n > 0 && n < 120);
    const avg = ages.length ? (ages.reduce((a,b)=>a+b,0) / ages.length) : null;
    avgAgeEl && (avgAgeEl.textContent = avg ? Math.round(avg).toString() : '—');

    // Top 3 countries
    const counts = {};
    rows.forEach(r => {
      const c = (r.country || '').trim();
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k,v]) => `${k} (${v})`);
    topCountriesEl && (topCountriesEl.textContent = top.length ? top.join(', ') : '—');
  }
})();
