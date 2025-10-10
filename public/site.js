(function(){
  // Map
  const map = L.map('map').setView([20,0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
  const cluster = L.markerClusterGroup().addTo(map);

  const markersById = new Map();

  async function fetchSubs(){
    const r = await fetch('/api/submissions', { headers:{'Accept':'application/json'} });
    if (!r.ok) return [];
    try { return await r.json(); } catch { return []; }
  }

  function popupHTML(s){
    const esc = (x)=> String(x||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const name = [s.name || s.firstName, (s.last_initial || s.lastInitial) ? (s.last_initial||s.lastInitial)+'.' : ''].filter(Boolean).join(' ');
    const loc  = [s.city, s.country].filter(Boolean).join(', ');
    const course = esc(s.course_name || s.firstGolfClub || '');
    const year = esc(s.startedYear || s.first_round_date || s.firstRoundDate || '');
    const age  = s.ageWhenStarted ? `Started at ${esc(s.ageWhenStarted)}` : '';
    const dream= s.dreamCourse ? `Dream: ${esc(s.dreamCourse)}` : '';
    const note = s.moment || s.story ? esc(s.moment || s.story) : '';
    return `
      <div class="popup-card">
        <strong>${esc(name||'Someone')}${s.homeCountry ? ' • '+esc(s.homeCountry) : ''}</strong><br/>
        ${course ? `First round: ${course}${year ? ` (${year})` : ''}<br/>` : (year ? `Started: ${year}<br/>` : '')}
        ${age ? `${age}<br/>` : ''}${dream ? `${dream}<br/>` : ''}
        ${note ? `<em>${note}</em>` : ''}
        ${loc ? `<div style="margin-top:6px;color:#6b7280">${esc(loc)}</div>` : ''}
      </div>
    `;
  }

  function renderStats(rows){
    const totalEl = document.getElementById('stat-total');
    const avgAgeEl = document.getElementById('stat-avg-age');
    const topCountriesEl = document.getElementById('stat-top-countries');

    totalEl && (totalEl.textContent = String(rows.length));
    const ages = rows.map(r => Number(r.ageWhenStarted || r.age_when_started)).filter(n => Number.isFinite(n) && n>0 && n<120);
    const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0)/ages.length) : null;
    avgAgeEl && (avgAgeEl.textContent = (avg ?? '—'));

    const counts = {};
    rows.forEach(r=>{
      const c = (r.country || '').trim();
      if (!c) return;
      counts[c] = (counts[c]||0)+1;
    });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} (${v})`);
    topCountriesEl && (topCountriesEl.textContent = top.length ? top.join(', ') : '—');
  }

  async function loadPins(){
    const rows = await fetchSubs();
    cluster.clearLayers();
    markersById.clear();

    const ms = [];
    rows.forEach(s=>{
      const lat = Number(s.lat), lng = Number(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const m = L.marker([lat,lng]).bindPopup(popupHTML(s), {minWidth:260,maxWidth:340});
      cluster.addLayer(m);
      ms.push(m);
      if (s.id) markersById.set(String(s.id), m);
    });

    if (ms.length){
      const group = L.featureGroup(ms);
      map.fitBounds(group.getBounds().pad(0.25));
    }

    renderStats(rows);
  }

  loadPins();

  // Success banner
  const banner = document.getElementById('success-banner');
  const closeBtn = document.getElementById('banner-close');
  closeBtn && (closeBtn.onclick = ()=> banner.classList.add('hidden'));

  function showBanner(){
    banner?.classList.remove('hidden');
    setTimeout(()=> banner?.classList.add('hidden'), 6000);
  }

  // Form submit
  const form = document.getElementById('mfgc-form');
  const status = document.getElementById('status');
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    status.textContent = 'Submitting...';
    const submitBtn = form.querySelector('button[type="submit"]'); submitBtn && (submitBtn.disabled = true);

    try{
      const fd = new FormData(form);
      const latVal = fd.get('lat'); const lngVal = fd.get('lng');

      const res = await fetch(form.action, { method:'POST', body: fd });
      let json = {};
      try{ json = await res.json(); }catch{}
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      status.textContent = '';
      showBanner();

      // Refresh pins
      await loadPins();

      // Try to open "your" pin
      let targetMarker = null;
      if (json.id && markersById.has(String(json.id))){
        targetMarker = markersById.get(String(json.id));
      } else if (latVal && lngVal){
        const lat = Number(latVal), lng = Number(lngVal);
        if (Number.isFinite(lat) && Number.isFinite(lng)){
          targetMarker = L.marker([lat,lng]).bindPopup('<div class="popup-card"><strong>✅ Your pin</strong></div>');
          targetMarker.addTo(map);
        }
      }
      if (targetMarker){
        const ll = targetMarker.getLatLng ? targetMarker.getLatLng() : null;
        if (ll) map.setView(ll, 8);
        targetMarker.openPopup && targetMarker.openPopup();
      }

      form.reset();
    }catch(err){
      status.textContent = 'Error: ' + (err?.message || err);
    }finally{
      submitBtn && (submitBtn.disabled = false);
    }
  });
})();
