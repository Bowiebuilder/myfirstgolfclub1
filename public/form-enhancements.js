(function(){
  // --- Countries (ISO names) ---
  const ISO_COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
    "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France",
    "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
    "Haiti","Honduras","Hungary",
    "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
    "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
    "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman",
    "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
    "Qatar",
    "Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam",
    "Yemen",
    "Zambia","Zimbabwe"
  ];

  /* ===== Autocomplete (country fields) ===== */
  function buildCountryAutocomplete(inputId, listId){
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    function render(){
      const q = (input.value || "").trim().toLowerCase();
      const items = ISO_COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0, 50);
      list.innerHTML = items.map(c => `<div class="ac-item" role="option">${c}</div>`).join("");
      list.style.display = items.length ? "block" : "none";
    }
    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("blur", () => setTimeout(()=> list.style.display = "none", 150));
    list.addEventListener("click", (e) => {
      const el = e.target.closest(".ac-item");
      if (!el) return;
      input.value = el.textContent;
      list.style.display = "none";
      input.dispatchEvent(new Event("change"));
    });
  }

  /* ===== Geocoding with fallback ===== */
  async function geocodeQuery(q) {
    if (!q) return null;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    try {
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) return null;
      const { lat, lon } = json[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    } catch { return null; }
  }

  /* ===== Mini Picker Map (robust sizing + centering) ===== */
  let pickerMap = null, pickerMarker = null;

  // Expose a helper: center the map & put the pin in the middle.
  window.setPickerLocation = function(lat, lng, zoom = 13){
    if (!pickerMap || !pickerMarker) return;
    pickerMarker.setLatLng([lat, lng]);
    pickerMap.setView([lat, lng], zoom, { animate: true });
    // After animation/layout, ensure tiles fill the box
    setTimeout(()=> pickerMap.invalidateSize(), 150);
  };

  function buildMiniPicker() {
    const el = document.getElementById('picker-map');
    const latEl = document.getElementById('lat');
    const lngEl = document.getElementById('lng');
    if (!el || !latEl || !lngEl || !window.L) return;

    pickerMap = L.map('picker-map', { attributionControl: false, zoomControl: true });
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    tiles.addTo(pickerMap);

    // Initial view
    const start = [20,0];
    pickerMap.setView(start, 2);
    pickerMarker = L.marker(start, { draggable: true }).addTo(pickerMap);

    pickerMarker.on('dragend', () => {
      const p = pickerMarker.getLatLng();
      latEl.value = String(p.lat.toFixed(6));
      lngEl.value = String(p.lng.toFixed(6));
    });

    // If lat/lng already set (e.g., after geocode), center on them
    const tryCenter = () => {
      const lat = Number(latEl.value), lng = Number(lngEl.value);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        window.setPickerLocation(lat, lng, 13);
      }
    };

    // Robust sizing: multiple kicks + ResizeObserver + tile load
    const kick = () => pickerMap && pickerMap.invalidateSize();
    setTimeout(kick, 0);
    setTimeout(kick, 120);
    setTimeout(kick, 400);
    tiles.on('load', kick);
    window.addEventListener('resize', kick);

    if ('ResizeObserver' in window){
      const ro = new ResizeObserver(kick);
      ro.observe(el);
      // Also observe the step/card container if present
      const card = el.closest('.card') || el.parentElement;
      if (card) ro.observe(card);
    }

    // Recenter when inputs change
    ['input','change'].forEach(ev=>{
      latEl.addEventListener(ev, tryCenter);
      lngEl.addEventListener(ev, tryCenter);
    });

    // Give the DOM a moment, then center if we already have coords
    setTimeout(tryCenter, 600);
  }

  /* ===== Geocoder wiring to call setPickerLocation ===== */
  function buildGeocoder(){
    const form = document.getElementById('mfgc-form') || document.querySelector('form');
    if (!form) return;
    const clubEl    = form.querySelector('input[name="firstGolfClub"]');
    const cityEl    = form.querySelector('input[name="city"]');
    const countryEl = form.querySelector('input[name="country"]');
    const latEl     = form.querySelector('input[name="lat"]');
    const lngEl     = form.querySelector('input[name="lng"]');
    const statusEl  = document.getElementById('status');

    async function geocodeWithFallback() {
      const full = [clubEl?.value, cityEl?.value, countryEl?.value].filter(Boolean).join(', ').trim();
      const city = [cityEl?.value, countryEl?.value].filter(Boolean).join(', ').trim();
      const only = (countryEl?.value || '').trim();

      let result = await geocodeQuery(full);
      if (result) return result;

      result = await geocodeQuery(city);
      if (result) return result;

      result = await geocodeQuery(only);
      if (result) return result;

      return null;
    }

    // On submit, if missing coords, geocode; then center the map
    form.addEventListener('submit', async (e) => {
      if (!latEl?.value || !lngEl?.value) {
        try {
          statusEl && (statusEl.textContent = 'Locating course…');
          const coords = await geocodeWithFallback();
          if (coords) {
            latEl.value = String(coords.lat);
            lngEl.value = String(coords.lng);
            if (window.setPickerLocation) window.setPickerLocation(coords.lat, coords.lng, 15);
          }
        } finally {
          statusEl && (statusEl.textContent = '');
        }
      }
    });

    // On blur of country/club, try early geocode and center
    [countryEl, clubEl].forEach(el => {
      el?.addEventListener('blur', async () => {
        if (latEl?.value && lngEl?.value) return;
        const coords = await geocodeWithFallback();
        if (coords) {
          latEl.value = String(coords.lat);
          lngEl.value = String(coords.lng);
          if (window.setPickerLocation) window.setPickerLocation(coords.lat, coords.lng, 15);
        }
      });
    });
  }

  /* ===== Init ===== */
  document.addEventListener('DOMContentLoaded', () => {
    buildCountryAutocomplete('country','country-suggestions');
    buildCountryAutocomplete('homeCountry','home-country-suggestions');
    buildGeocoder();
    buildMiniPicker();
  });
})();
