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

  function buildCountryAutocomplete(inputId, listId){
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    let active = -1;
    function render(items){
      list.innerHTML = items.map((n,i)=>`<div class="ac-item" data-i="${i}" role="option">${n}</div>`).join('');
      list.style.display = items.length ? 'block' : 'none';
      active = -1;
    }
    function filter(){
      const q = input.value.trim().toLowerCase();
      if (!q){ render([]); return; }
      const items = ISO_COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0,20);
      render(items);
    }
    input.addEventListener('input', filter);
    input.addEventListener('focus', filter);
    input.addEventListener('blur', ()=> setTimeout(()=> list.style.display='none', 100));

    list.addEventListener('click', (e)=>{
      const el = e.target.closest('.ac-item');
      if (!el) return;
      input.value = el.textContent;
      list.style.display='none';
      input.dispatchEvent(new Event('change'));
    });

    input.addEventListener('keydown', (e)=>{
      const items = Array.from(list.querySelectorAll('.ac-item'));
      if (!items.length) return;
      if (e.key === 'ArrowDown'){ e.preventDefault(); active = Math.min(active+1, items.length-1); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); active = Math.max(active-1, 0); }
      else if (e.key === 'Enter'){ e.preventDefault(); if (active>=0){ items[active].click(); } }
      items.forEach((el,i)=> el.classList.toggle('active', i===active));
    });
  }

  function populateStartedYears(){
    const sel = document.getElementById('startedYear');
    if (!sel) return;
    const now = new Date().getFullYear();
    const min = 1900;
    sel.innerHTML = '<option value="" disabled selected>Select year</option>' +
      Array.from({length: now-min+1}, (_,k)=> now-k)
        .map(y=>`<option value="${y}">${y}</option>`).join('');
  }

  // --- Geocoding fallback & mini picker ---
  async function geocodeQuery(q){
    if (!q) return null;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    try{
      const res = await fetch(url.toString(), { headers:{'Accept':'application/json'} });
      if (!res.ok) return null;
      const json = await res.json();
      if (!Array.isArray(json) || json.length===0) return null;
      return { lat: +json[0].lat, lng: +json[0].lon };
    }catch{ return null; }
  }

  function buildGeocodeHelpers(){
    const form = document.getElementById('mfgc-form');
    if (!form) return;
    const clubEl = form.querySelector('input[name="firstGolfClub"]');
    const cityEl = form.querySelector('input[name="city"]');
    const countryEl = form.querySelector('input[name="country"]');
    const latEl = document.getElementById('lat');
    const lngEl = document.getElementById('lng');

    async function doGeocode(){
      if (!countryEl?.value) return;
      const full = [clubEl?.value, cityEl?.value, countryEl?.value].filter(Boolean).join(', ');
      const city = [cityEl?.value, countryEl?.value].filter(Boolean).join(', ');
      const only = (countryEl?.value||'').trim();
      let r = await geocodeQuery(full) || await geocodeQuery(city) || await geocodeQuery(only);
      if (r){ latEl.value = String(r.lat); lngEl.value = String(r.lng); }
    }

    [clubEl, cityEl, countryEl].forEach(el=>{
      el && el.addEventListener('blur', doGeocode);
    });
  }

function buildMiniPicker() {
  const pickerEl = document.getElementById('picker-map');
  const latEl = document.getElementById('lat');
  const lngEl = document.getElementById('lng');
  if (!pickerEl || !latEl || !lngEl || !window.L) return;

  // Create map
  const map = L.map('picker-map', { attributionControl: false, zoomControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

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
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 13);
    }
  }

  // Make sure it fills the container
  const kick = () => map.invalidateSize();
  setTimeout(kick, 0);
  setTimeout(kick, 250);
  window.addEventListener('resize', kick);

  // If your form uses step transitions, call kick again when step becomes visible.
  // We also recenter shortly after.
  setTimeout(tryCenter, 800);
  ['input','change'].forEach(ev=>{
    latEl.addEventListener(ev, tryCenter);
    lngEl.addEventListener(ev, tryCenter);
  });
}

  document.addEventListener('DOMContentLoaded', ()=>{
    buildCountryAutocomplete('country','country-suggestions');
    buildCountryAutocomplete('homeCountry','home-country-suggestions');
    populateStartedYears();
    buildGeocodeHelpers();
    buildMiniPicker();
  });
})();
