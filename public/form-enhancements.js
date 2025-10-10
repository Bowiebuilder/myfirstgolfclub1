(function(){
  const COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia",
    "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon",
    "Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo",
    "Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic",
    "DR Congo","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji",
    "Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau",
    "Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho",
    "Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali",
    "Malta","Mauritania","Mauritius","Mexico","Moldova","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
    "Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Macedonia","Norway","Oman",
    "Pakistan","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
    "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
    "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
    "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Suriname","Sweden",
    "Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago",
    "Tunisia","Turkey","Turkmenistan","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
    "Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  function setupAutocomplete(inputId, listId){
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    function render(items){
      list.innerHTML = items.map((c,i)=>`<div class="ac-item" role="option" data-val="${c}">${c}</div>`).join('');
      list.style.display = items.length ? 'block' : 'none';
    }
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { list.style.display='none'; return; }
      const matches = COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0, 10);
      render(matches);
    });
    input.addEventListener('blur', () => setTimeout(()=> list.style.display='none', 150));
    list.addEventListener('click', (e) => {
      const el = e.target.closest('.ac-item');
      if (!el) return;
      input.value = el.dataset.val || '';
      list.style.display = 'none';
      input.dispatchEvent(new Event('change'));
    });
  }

  // Build year dropdown (current → 1900)
  (function buildYears(){
    const sel = document.getElementById('startedYear');
    if (!sel) return;
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
      const opt = document.createElement('option');
      opt.value = String(y);
      opt.textContent = String(y);
      sel.appendChild(opt);
    }
  })();

  // Geocode helper (free Nominatim)
  async function geocodeQuery(q){
    if (!q) return null;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    try {
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const json = await res.json();
      if (!Array.isArray(json) || !json.length) return null;
      const top = json[0];
      return { lat: parseFloat(top.lat), lng: parseFloat(top.lon), address: top.display_name || '' };
    } catch { return null; }
  }

  async function geocodeWithFallback(form){
    const club   = form.querySelector('#firstGolfClub')?.value?.trim();
    const city   = form.querySelector('input[name="city"]')?.value?.trim();
    const ctry   = form.querySelector('#country')?.value?.trim();
    const full   = [club, city, ctry].filter(Boolean).join(', ');
    const cityCt = [city, ctry].filter(Boolean).join(', ');

    let r = await geocodeQuery(full);
    if (r) return r;
    r = await geocodeQuery(cityCt);
    if (r) return r;
    r = await geocodeQuery(ctry);
    return r;
  }

  function setResolved(form, info){
    const latEl = form.querySelector('#lat');
    const lngEl = form.querySelector('#lng');
    const adrEl = form.querySelector('#resolved-address');
    if (info){
      if (latEl) latEl.value = String(info.lat);
      if (lngEl) lngEl.value = String(info.lng);
      if (adrEl) adrEl.value = info.address || '';
    }
  }

  // Wire country autocompletes
  document.addEventListener('DOMContentLoaded', () => {
    setupAutocomplete('homeCountry','home-country-suggestions');
    setupAutocomplete('country','country-suggestions');

    const form   = document.getElementById('mfgc-form');
    const status = document.getElementById('status');
    if (!form) return;

    // Resolve address as the user finishes key fields
    ['#firstGolfClub','input[name="city"]','#country'].forEach(sel=>{
      const el = form.querySelector(sel);
      el && el.addEventListener('blur', async () => {
        const info = await geocodeWithFallback(form);
        if (info) setResolved(form, info);
      });
    });

    // Client-side gentle validation: only the three fields + consent
    form.addEventListener('submit', async (e) => {
      const firstName = form.firstName?.value?.trim();
      const homeC     = form.homeCountry?.value?.trim();
      const club      = form.firstGolfClub?.value?.trim();
      const consent   = form.consentMapPin?.checked;

      if (!firstName || !homeC || !club || !consent) {
        e.preventDefault();
        status.textContent = 'Please fill the required fields (First name, Home country, Course) and tick consent.';
        return;
      }

      // Ensure we have coordinates before posting
      const lat = form.lat?.value, lng = form.lng?.value, adr = form.resolvedAddress?.value;
      if (!lat || !lng || !adr) {
        e.preventDefault();
        status.textContent = 'Locating course…';
        const info = await geocodeWithFallback(form);
        setResolved(form, info);
        status.textContent = '';
        // submit again now that we’ve filled it
        form.requestSubmit();
      }
    });
  });
})();
