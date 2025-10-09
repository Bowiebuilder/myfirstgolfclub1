(function () {
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
    "Yemen","Zambia","Zimbabwe"
  ];
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2019]/g,"'").trim();

  function buildCountryAutocomplete(inputId, listId) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    let currentIndex = -1;

    function optionsFor(q){
      if (!q) return ISO_COUNTRIES.slice(0, 50);
      const nq = norm(q);
      const starts=[], contains=[];
      for (const name of ISO_COUNTRIES) {
        const n = norm(name);
        if (n.startsWith(nq)) starts.push(name);
        else if (n.includes(nq)) contains.push(name);
      }
      return starts.concat(contains).slice(0, 12);
    }
    function render(names){
      list.innerHTML = ""; currentIndex = -1;
      names.forEach(name => {
        const div = document.createElement('div');
        div.className = 'ac-item';
        div.setAttribute('role','option');
        div.textContent = name;
        div.addEventListener('mousedown', e => {
          e.preventDefault(); input.value = name; close();
        });
        list.appendChild(div);
      });
      list.style.display = names.length ? 'block' : 'none';
      list.style.minWidth = input.offsetWidth + 'px';
    }
    function close(){ list.style.display='none'; currentIndex=-1; }
    input.addEventListener('input', ()=> render(optionsFor(input.value)));
    document.addEventListener('click', e=>{ if (e.target!==input && !list.contains(e.target)) close(); });
    input.addEventListener('keydown', e=>{
      const items = list.querySelectorAll('.ac-item');
      if (e.key==='ArrowDown'){ e.preventDefault(); if(!items.length) return; currentIndex=(currentIndex+1)%items.length; items.forEach((el,i)=>el.classList.toggle('active',i===currentIndex)); }
      else if (e.key==='ArrowUp'){ e.preventDefault(); if(!items.length) return; currentIndex=(currentIndex-1+items.length)%items.length; items.forEach((el,i)=>el.classList.toggle('active',i===currentIndex)); }
      else if (e.key==='Enter'){ if (list.style.display==='block' && currentIndex>=0){ e.preventDefault(); input.value = items[currentIndex].textContent || input.value; close(); } }
      else if (e.key==='Escape'){ close(); }
    });

    function validate() {
      const val = input.value.trim();
      const ok = ISO_COUNTRIES.some(n => norm(n) === norm(val));
      input.setCustomValidity(ok || !val ? "" : "Please choose a valid country from the list.");
    }
    input.addEventListener('blur', validate);

    render([]);
  }

  // Free client-side geocoding (Nominatim) with fallback
  function buildGeocoder() {
    const form = document.getElementById('mfgc-form');
    if (!form) return;

    const clubEl    = form.querySelector('input[name="firstGolfClub"]');
    const cityEl    = form.querySelector('input[name="city"]');
    const countryEl = form.querySelector('input[name="country"]');
    const latEl     = form.querySelector('input[name="lat"]');
    const lngEl     = form.querySelector('input[name="lng"]');
    const statusEl  = document.getElementById('status');

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

    form.addEventListener('submit', async (e) => {
      if (!latEl?.value || !lngEl?.value) {
        try {
          statusEl && (statusEl.textContent = 'Locating course…');
          const coords = await geocodeWithFallback();
          if (coords) { latEl.value = String(coords.lat); lngEl.value = String(coords.lng); }
        } finally {
          statusEl && (statusEl.textContent = '');
        }
      }
    });

    countryEl?.addEventListener('blur', async () => {
      if (latEl?.value && lngEl?.value) return;
      const coords = await geocodeWithFallback();
      if (coords) { latEl.value = String(coords.lat); lngEl.value = String(coords.lng); }
    });
  }

  // Mini picker map
  function buildMiniPicker() {
    const pickerEl = document.getElementById('picker-map');
    const latEl = document.getElementById('lat');
    const lngEl = document.getElementById('lng');
    if (!pickerEl || !latEl || !lngEl) return;

    const map = L.map('picker-map', { attributionControl: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const start = [20, 0];
    map.setView(start, 2);

    const marker = L.marker(start, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      latEl.value = String(p.lat.toFixed(6));
      lngEl.value = String(p.lng.toFixed(6));
    });

    function tryCenter() {
      const lat = Number(latEl.value), lng = Number(lngEl.value);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        map.setView([lat, lng], 13);
        marker.setLatLng([lat, lng]);
      }
    }
    setTimeout(tryCenter, 800);
    ['input','change'].forEach(ev=>{
      latEl.addEventListener(ev, tryCenter);
      lngEl.addEventListener(ev, tryCenter);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildCountryAutocomplete('country','country-suggestions');
    buildCountryAutocomplete('homeCountry','home-country-suggestions');
    buildGeocoder();
    buildMiniPicker();
  });
})();
