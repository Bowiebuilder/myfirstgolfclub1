mapboxgl.accessToken = "pk.eyJ1IjoiYm93aWViZW5kZXIiLCJhIjoiY21nbDFvbHRmMDRtcTJsc2FoaGRtZjNudCJ9.Op70cN8itrQlnUH3vVQ49A";

async function loadPins() {
  const res = await fetch("/api/submissions");
  const data = await res.json();

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [0, 20],
    zoom: 1.5
  });

  data.forEach(row => {
    if (!row.lat || !row.lng) return;
    const popupHTML = `
      <div class="player-card">
        <h3>${row.name || "Anonymous"} ${row.homeCountry ? row.homeCountry : ""}</h3>
        ${row.photo_key ? `<img src="/uploads/${row.photo_key}" alt="Photo" />` : ""}
        <div class="meta"><strong>Age started:</strong> ${row.ageWhenStarted || "—"}</div>
        <div class="meta"><strong>Dream course:</strong> ${row.dreamCourse || "—"}</div>
        <div class="meta"><strong>Memory:</strong> ${row.story || "—"}</div>
      </div>
    `;
    new mapboxgl.Marker()
      .setLngLat([row.lng, row.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML))
      .addTo(map);
  });
}

document.addEventListener("DOMContentLoaded", loadPins);
