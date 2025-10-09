// src/map.ts
async function fetchSubmissions() {
  const res = await fetch('/api/submissions');
  return await res.json();
}

function createMap() {
  const map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  return map;
}

(async () => {
  // @ts-ignore - Leaflet global
  const map = createMap();
  const subs = await fetchSubmissions();
  subs.forEach((s) => {
    if (s.lat && s.lng) {
      // @ts-ignore - Leaflet global
      L.marker([s.lat, s.lng]).addTo(map).bindPopup(
        `<strong>${s.course_name}</strong><br/>${s.city ? s.city + ', ' : ''}${s.country}<br/><em>${s.name}${s.last_initial ? ' ' + s.last_initial + '.' : ''}</em>${s.first_round_date ? ' • ' + s.first_round_date : ''}<br/>${s.story ? s.story.replace(/</g,'&lt;').slice(0, 180) + '…' : ''}`
      );
    }
  });
})();