/* Map + stats using Mapbox GL JS */
(function(){
  // --- Utils ---
  const $ = (sel, el=document) => el.querySelector(sel);
  const esc = (s) => String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  // Flag from country name (best-effort via ISO lookup on server data if available)
  function toFlag(countryName){
    // Expect backend stores homeCountry as country name (e.g. "Kenya")
    // If you later store ISO code, adapt to regional-indicator mapping
    return ""; // keep empty if you haven't wired ISO mapping here
  }

  // --- Map state ---
  let map;               // mapboxgl.Map
  let markers = [];      // array of mapboxgl.Marker
  let lastAddedId = null;

  // --- Player card HTML (popup) ---
  function playerCardHTML(item){
    const nameBits = [item.firstName, item.lastInitial ? item.lastInitial + '.' : '']
      .filter(Boolean).join(' ');
    const flag = item.homeCountry ? '' : ''; // plug toFlag(item.homeCountry) if you switch to ISO
    const loc  = [item.city, item.country].filter(Boolean).join(', ');
    const club = item.firstGolfClub ? esc(item.firstGolfClub) : '';
    const year = item.startedYear ? esc(item.startedYear)
               : (item.firstRoundDate ? esc(item.firstRoundDate) : '');
    const age  = item.ageWhenStarted ? `Started at ${esc(item.ageWhenStarted)}` : '';
    const dream= item.dreamCourse ? `Dream: ${esc(item.dreamCourse)}` : '';
    const how  = item.howGotIntoGolf ? esc(item.howGotIntoGolf) : '';
    const story= item.story ? esc(item.story) : '';

    const firstLine = club
      ? `<div class="pc-row"><span>First round:</span> ${club}${year ? ` (${year})` : ''}</div>`
      : (year ? `<div class="pc-row"><span>Started:</span> ${year}</div>` : '');

    return `
      <div class="player-card">
        <div class="pc-header">
          <div class="pc-avatar">${esc((item.firstName||'?')[0]).toUpperCase()}</div>
          <div>
            <div class="pc-name">${esc(nameBits || 'Someone')}${flag ? ` <span class="pc-flag">${flag}</span>` : ''}</div>
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

  // --- Stats ---
  function renderStats(rows){
    const totalEl = $('#stat-total');
    const avgAgeEl = $('#stat-avg-age');
    const youngestEl = $('#stat-youngest');
    const oldestEl = $('#stat-oldest');
    const topCountriesEl = $('#stat-top-countries');

    totalEl && (totalEl.textContent = String(rows.length));

    const ages = rows.map(r => Number(r.ageWhenStarted))
      .filter(n => Number.isFinite(n) && n >= 1 && n <= 120);
    const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0) / ages.length) : null;
    avgAgeEl && (avgAgeEl.textContent = avg ?? '—');

    const youngest = ages.length ? Math.min(...ages) : null;
    const oldest   = ages.length ? Math.max(...ages) : null;
    youngestEl && (youngestEl.textContent = youngest ?? '—');
    oldestEl && (oldestEl.textContent = oldest ?? '—');

    const counts = {};
    rows.forEach(r => {
      const c = (r.country || '').trim();
      if (!c) return;
      const key = c.toLowerCase();
      counts[key] = (counts[key] || { label: c, n: 0 });
      counts[key].n += 1;
    });
    const top = Object.values(counts).sort((a,b)=>b.n-a.n).slice(0,3).map(x=>`${x.label} (${x.n})`);
    topCountriesEl && (topCountriesEl.textContent = top.length ? top.join(', ') : '—');
  }

  // --- Build markers on Mapbox ---
  function clearMarkers(){
    markers.forEach(m => m.remove());
    markers = [];
  }

  function addMarkers(rows){
    clearMarkers();
    const bounds = new mapboxgl.LngLatBounds();

    rows.forEach(item => {
      const lat = Number(item.lat), lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#166534';
      el.style.boxShadow = '0 0 0 2px #fff';
      el.style.cursor = 'pointer';
      el.style.transform = 'scale(1)';
      el.style.transition = 'transform .12s ease';
      el.onmouseenter = () => el.style.transform = 'scale(1.2)';
      el.onmouseleave = () => el.style.transform = 'scale(1)';

      const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map);
      const popup  = new mapboxgl.Popup({ closeButton: true, offset: 16 })
        .setHTML(playerCardHTML(item));

      marker.getElement().addEventListener('mouseenter', () => popup.addTo(map).setLngLat([lng, lat]));
      marker.getElement().addEventListener('mouseleave', () => popup.remove());

      markers.push(marker);
      bounds.extend([lng, lat]);

      if (lastAddedId && item.id === lastAddedId){
        // Drop/bounce effect
        el.animate(
          [{ transform:'translateY(-20px)' }, { transform:'translateY(0)' }],
          { duration: 300, easing: 'ease-out' }
        );
        // Focus this marker
        map.easeTo({ center:[lng,lat], zoom: 8, duration: 800 });
        setTimeout(() => popup.addTo(map).setLngLat([lng, lat]), 900);
      }
    });

    if (!lastAddedId && markers.length){
      // Fit map to all markers
      map.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 800 });
    }
  }

  // --- Load data + init map ---
  async function boot(){
    // 1) Get token from /api/config
    let token = null;
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      const j = await r.json();
      token = j?.token || null;
    } catch {}

    if (!token){
      console.warn('Mapbox token missing. Set MAPBOX_PUBLIC_TOKEN in Cloudflare Pages env vars.');
      const mapBoxEl = document.getElementById('map');
      if (mapBoxEl){
        mapBoxEl.innerHTML = '<div style="padding:14px">Map unavailable. Missing Mapbox token.</div>';
      }
      // Still render stats from data:
      const rows = await (await fetch('/api/submissions')).json();
      renderStats(rows);
      return;
    }

    // 2) Init Mapbox map
    mapboxgl.accessToken = token;
    const mapEl = document.getElementById('map');
    map = new mapboxgl.Map({
      container: mapEl,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 1.5,
      cooperativeGestures: true
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    // Resize fix if container was hidden or just mounted
    map.on('load', () => {
      map.resize();
    });
    window.addEventListener('resize', () => map && map.resize());

    // 3) Load data, draw markers, compute stats
    const rows = await (await fetch('/api/submissions', { cache:'no-store' })).json();
    renderStats(rows);
    addMarkers(rows);
  }

  document.addEventListener('DOMContentLoaded', boot);

  // Expose a hook for “last added id” so submission flow can highlight it if you set it
  window.__setLastAddedId = (id) => { lastAddedId = id; };
})();
