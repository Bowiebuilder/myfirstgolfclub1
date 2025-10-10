(function(){
  const ageSelect = document.getElementById("ageWhenStarted");
  if (ageSelect) {
    for (let i = 1; i <= 120; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = i;
      ageSelect.appendChild(opt);
    }
  }

  async function fakeGeocode(query) {
    // Here you’d use Mapbox Places API
    return { address: "123 Golf Lane, Sample City", lat: 51.5, lng: -0.12 };
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
        const result = await fakeGeocode(document.getElementById("startLocation").value);
        addrEl.value = result.address;
        latEl.value = result.lat;
        lngEl.value = result.lng;
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
