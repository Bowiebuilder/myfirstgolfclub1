(function () {
  // --- ISO country list (shortened here; use your full list if you had one previously) ---
  const COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
    "Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
    "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
    "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
    "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
    "Qatar","Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam",
    "Yemen","Zambia","Zimbabwe"
  ];

  // --- Autocomplete (type-to-filter) ---
  function buildCountryAutocomplete(inputId='country', listId='country-suggestions') {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    function render(items) {
      list.innerHTML = '';
      items.slice(0, 50).forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'ac-item';
        div.setAttribute('role','option');
        div.textContent = name;
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = name;
          list.style.display = 'none';
          input.dispatchEvent(new Event('change'));
        });
        list.appendChild(div);
      });
      list.style.display = items.length ? 'block' : 'none';
    }

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) return render([]);
      const matches = COUNTRIES.filter(c => c.toLowerCase().includes(q));
      render(matches);
    });

    input.addEventListener('blur', () => setTimeout(() => list.style.display = 'none', 150));
    input.addEventListener('focus', () => {
      const q = input.value.trim().toLowerCase();
      const matches = q ? COUNTRIES.filter(c => c.toLowerCase().includes(q)) : [];
      render(matches);
    });
  }

  // --- Geocoder (Nominatim) returns lat/lng/address ---
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
      const { lat, lon, display_name } = json[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon), address: display_name || '' };
    } catch {
      return null;
    }
  }

  // Try: "club, city, country" → "city, country" → "country"
  async function geocodeWithFallback() {
    const form      = document.getElementById('mfgc-form');
    const clubEl    = form?.querySelector('#firstGolfClub');
    const cityEl    = form?.querySelector('input[name="city"]');
    const countryEl = form?.querySelector('input[name="country"]');

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

  function wireGeocoding() {
    const form      = document.getElementById('mfgc-form');
    if (!form) return;
    const latEl     = form.querySelector('#lat');
    const lngEl     = form.querySelector('#lng');
    const addrEl    = form.querySelector('#resolved-address');
    const statusEl  = document.getElementById('status');
    const fields    = ['#firstGolfClub', 'input[name="city"]', '#country'];

    async function resolveAndFill() {
      statusEl && (statusEl.textContent = 'Looking up location…');
      const result = await geocodeWithFallback();
      statusEl && (statusEl.textContent = '');
      if (result) {
        latEl && (latEl.value = String(result.lat));
        lngEl && (lngEl.value = String(result.lng));
        addrEl && (addrEl.value = result.address || '');
      }
    }

    // Resolve on blur of any key field
    fields.forEach(sel => {
      const el = form.querySelector(sel);
      if (el) el.addEventListener('blur', resolveAndFill);
    });

    // Ensure we have coords/address before submit
    form.addEventListener('submit', async (e) => {
      if (!latEl?.value || !lngEl?.value || !addrEl?.value) {
        e.preventDefault();
        await resolveAndFill();
        // re-submit after filling
        form.requestSubmit();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildCountryAutocomplete('country','country-suggestions');
    buildCountryAutocomplete('homeCountry','home-country-suggestions');
    wireGeocoding();
  });
})();
