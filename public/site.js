// Map setup
const map = L.map('map').setView([20,0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

const markers = L.markerClusterGroup().addTo(map);

// Load existing submissions
async function loadPins() {
  const res = await fetch('/api/submissions');
  if (!res.ok) return;
  const subs = await res.json();
  markers.clearLayers();
  subs.forEach(s => {
    if (!s.lat || !s.lng) return;
    const card = `
      <div class="popup-card">
        <strong>${s.name} ${s.last_initial || ''} ${s.homeCountry ? '🌍 '+s.homeCountry : ''}</strong><br/>
        Started: ${s.startedYear || '—'} (Age ${s.ageWhenStarted||'?'})<br/>
        Course: ${s.course_name} (${s.city||''}, ${s.country})<br/>
        ${s.moment ? `<em>${s.moment}</em><br/>`:''}
        ${s.dreamCourse ? `Dream: ${s.dreamCourse}<br/>`:''}
      </div>`;
    const m = L.marker([s.lat, s.lng]).bindPopup(card);
    markers.addLayer(m);
  });
}
loadPins();

// Success banner
const banner = document.getElementById('success-banner');
document.getElementById('banner-close').onclick = ()=> banner.classList.add('hidden');

// Form submit
const form = document.getElementById('mfgc-form');
const status = document.getElementById('status');
form.addEventListener('submit', async e => {
  e.preventDefault();
  status.textContent = 'Submitting...';
  try {
    const res = await fetch(form.action, { method:'POST', body:new FormData(form) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error||'Submission failed');
    status.textContent = '';
    banner.classList.remove('hidden');
    await loadPins();
    // Zoom to newest pin
    if (json.lat && json.lng) {
      const newMarker = L.marker([json.lat,json.lng]);
      newMarker.addTo(map).bindPopup("✅ You!").openPopup();
      map.setView([json.lat,json.lng], 8);
    }
    form.reset();
  } catch(err) {
    status.textContent = 'Error: '+err.message;
  }
});
