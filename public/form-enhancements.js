(function(){
  const MAPBOX_KEY = "pk.eyJ1IjoiYm93aWViZW5kZXIiLCJhIjoiY21nbDFvbHRmMDRtcTJsc2FoaGRtZjNudCJ9.Op70cN8itrQlnUH3vVQ49A";

  // Age dropdown
  const ageSelect = document.getElementById("ageWhenStarted");
  if (ageSelect) {
    for (let i = 1; i <= 120; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i;
      ageSelect.appendChild(opt);
    }
  }

  async function geocodeWithMapbox(query) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_KEY}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.features && data.features.length) {
      const f = data.features[0];
      return { 
        address: f.place_name,
        lat: f.center[1],
        lng: f.center[0]
      };
    }
    return null;
  }

  const form = document.getElementById("mfgc-form");
  const addrEl = document.getElementById("resolved-address");
  const latEl = document.getElementById("lat");
  const lngEl = document.getElementById("lng");
  const status = document.getElementById("status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Submitting...";
    try {
      if (!latEl.value || !lngEl.value) {
        const result = await geocodeWithMapbox(document.getElementById("startLocation").value);
        if (result) {
          addrEl.value = result.address;
          latEl.value = result.lat;
          lngEl.value = result.lng;
        }
      }
      const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      status.textContent = "✅ Your story has been added!";
      form.reset();
    } catch (err) {
      status.textContent = "Error: " + err.message;
    }
  });
})();
