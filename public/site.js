(function(){
  // --- Map ---
  let map, cluster;

  function toFlag(countryName) {
    // Minimal mapper (optional: improve with ISO map)
    return '';
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function playerCardHTML(item){
    const name = [item.firstName, item.lastInitial ? (item.lastInitial + '.') : '']
      .filter(Boolean).join(' ');
    const loc  = [item.city, item.country].filter(Boolean).join(', ');
    const club = item.firstGolfClub ? esc(item.firstGolfClub) : '';
    const year = item.startedYear ? esc(item.startedYear) :
                 (item.firstRoundDate ? esc(item.firstRoundDate) : '');
    const age  = item.ageWhenStarted ? `Started at ${esc(item.ageWhenStarted)}` : '';
    const dream= item.dreamCourse ? `Dream: ${esc(item.dreamCourse)}` : '';
    const how  = item.howGotIntoGolf ? esc(item.howGotIntoGolf) : '';
    const story= item.story ? esc(item.story) :
                 (item.moment ? esc(item.moment) : '');

    const firstLine = club
      ? `<div class="pc-row"><span>First round:</span> ${club}${year ? ` (${year})` : ''}</div>`
      : (year ? `<div class="pc-row"><span>Started:</span> ${year}</div>` : '');

    return `
      <div class="player-card">
        <div class="pc-header">
          <div class="pc-avatar">${esc((item.firstName||'?')[0]).toUpperCase()}</div>
          <div>
            <div class="pc-name">${esc(name || 'Someone')}</div>
            <div class="pc-meta">${esc(loc)}</div>
          </div>
        </div>
        <div class="pc-body">
          ${firstLine}
          ${age ? `<div class="pc-row">${age}</div>` : ''}
          ${dream ? `<div class="pc-row">${dream}</div>` : ''}
          ${how ? `<div class="pc-note">“${how}”</div>` : ''}
          ${story ? `<div class="pc-note small">“${story}”</div>` : ''}
        </div>
      </div>
    `;
  }

  function initMap(){
    map = L.map('map', { attributionControl: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.setView([20,0], 2);
    cluster = L.markerClusterGroup();
    map.addLayer(cluster);

    // Fix gray areas if container size changes
    setTimeout(()=> map.invalidateSize(), 100);
    window.addEventListener('resize', () => map.invalidateSize());
  }

  async function loadData(){
    const res = await fetch('/api/submissions', { headers: { 'Accept': 'application/json' } });
    const rows = await res.json();
    renderMap(rows);
    renderStats(rows);
  }

  function renderMap(rows){
    cluster.clearLayers();
    const markers = [];
    rows.forEach(item => {
      const lat = Number(item.lat), lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const m = L.marker([lat,lng]).bindPopup(playerCardHTML(item), { minWidth: 260, maxWidth: 340 });
      cluster.addLayer(m);
      markers.push(m);
    });
    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.25));
    }
  }

  // --- New Stats ---
  function renderStats(rows){
    const totalEl       = document.getElementById('stat-total');
    const avgAgeEl      = document.getElementById('stat-avg-age');
    const youngestEl    = document.getElementById('stat-youngest');
    const oldestEl      = document.getElementById('stat-oldest');
    const topCountriesEl= document.getElementById('stat-top-countries');

    // Total users
    totalEl && (totalEl.textContent = String(rows.length));

    // Ages: numeric, sensible bounds
    const ages = rows
      .map(r => Number(r.ageWhenStarted))
      .filter(n => Number.isFinite(n) && n >= 3 && n <= 100);

    // Average
    const avg = ages.length ? (ages.reduce((a,b)=>a+b,0) / ages.length) : null;
    avgAgeEl && (avgAgeEl.textContent = (avg !== null) ? String(Math.round(avg)) : '—');

    // Youngest / Oldest
    const youngest = ages.length ? Math.min(...ages) : null;
    const oldest   = ages.length ? Math.max(...ages) : null;
    youngestEl && (youngestEl.textContent = (youngest !== null) ? String(youngest) : '—');
    oldestEl && (oldestEl.textContent   = (oldest   !== null) ? String(oldest)   : '—');

    // Top 3 countries to start golf (count by r.country, case-insensitive, ignore blanks)
    const counts = {};
    rows.forEach(r => {
      const c = (r.country || '').trim();
      if (!c) return;
      const key = c.toLowerCase();
      counts[key] = (counts[key] || { label: c, n: 0 });
      counts[key].n += 1;
    });
    const top = Object.values(counts)
      .sort((a,b)=> b.n - a.n)
      .slice(0,3)
      .map(x => `${x.label} (${x.n})`);

    topCountriesEl && (topCountriesEl.textContent = top.length ? top.join(', ') : '—');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
  });
})();
