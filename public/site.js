(function () {
  const COUNTRY_TO_CODE = {
"Afghanistan":"AF","Albania":"AL","Algeria":"DZ","Andorra":"AD","Angola":"AO","Antigua and Barbuda":"AG","Argentina":"AR","Armenia":"AM","Australia":"AU","Austria":"AT","Azerbaijan":"AZ",
"Bahamas":"BS","Bahrain":"BH","Bangladesh":"BD","Barbados":"BB","Belarus":"BY","Belgium":"BE","Belize":"BZ","Benin":"BJ","Bhutan":"BT","Bolivia":"BO","Bosnia and Herzegovina":"BA","Botswana":"BW","Brazil":"BR","Brunei":"BN","Bulgaria":"BG","Burkina Faso":"BF","Burundi":"BI",
"Cabo Verde":"CV","Cambodia":"KH","Cameroon":"CM","Canada":"CA","Central African Republic":"CF","Chad":"TD","Chile":"CL","China":"CN","Colombia":"CO","Comoros":"KM","Congo (Congo-Brazzaville)":"CG","Costa Rica":"CR","Côte d’Ivoire":"CI","Croatia":"HR","Cuba":"CU","Cyprus":"CY","Czechia":"CZ",
"Democratic Republic of the Congo":"CD","Denmark":"DK","Djibouti":"DJ","Dominica":"DM","Dominican Republic":"DO",
"Ecuador":"EC","Egypt":"EG","El Salvador":"SV","Equatorial Guinea":"GQ","Eritrea":"ER","Estonia":"EE","Eswatini":"SZ","Ethiopia":"ET",
"Fiji":"FJ","Finland":"FI","France":"FR",
"Gabon":"GA","Gambia":"GM","Georgia":"GE","Germany":"DE","Ghana":"GH","Greece":"GR","Grenada":"GD","Guatemala":"GT","Guinea":"GN","Guinea-Bissau":"GW","Guyana":"GY",
"Haiti":"HT","Honduras":"HN","Hungary":"HU",
"Iceland":"IS","India":"IN","Indonesia":"ID","Iran":"IR","Iraq":"IQ","Ireland":"IE","Israel":"IL","Italy":"IT",
"Jamaica":"JM","Japan":"JP","Jordan":"JO",
"Kazakhstan":"KZ","Kenya":"KE","Kiribati":"KI","Kuwait":"KW","Kyrgyzstan":"KG",
"Laos":"LA","Latvia":"LV","Lebanon":"LB","Lesotho":"LS","Liberia":"LR","Libya":"LY","Liechtenstein":"LI","Lithuania":"LT","Luxembourg":"LU",
"Madagascar":"MG","Malawi":"MW","Malaysia":"MY","Maldives":"MV","Mali":"ML","Malta":"MT","Marshall Islands":"MH","Mauritania":"MR","Mauritius":"MU","Mexico":"MX","Micronesia":"FM","Moldova":"MD","Monaco":"MC","Mongolia":"MN","Montenegro":"ME","Morocco":"MA","Mozambique":"MZ","Myanmar":"MM",
"Namibia":"NA","Nauru":"NR","Nepal":"NP","Netherlands":"NL","New Zealand":"NZ","Nicaragua":"NI","Niger":"NE","Nigeria":"NG","North Korea":"KP","North Macedonia":"MK","Norway":"NO",
"Oman":"OM",
"Pakistan":"PK","Palau":"PW","Panama":"PA","Papua New Guinea":"PG","Paraguay":"PY","Peru":"PE","Philippines":"PH","Poland":"PL","Portugal":"PT",
"Qatar":"QA",
"Romania":"RO","Russia":"RU","Rwanda":"RW",
"Saint Kitts and Nevis":"KN","Saint Lucia":"LC","Saint Vincent and the Grenadines":"VC","Samoa":"WS","San Marino":"SM","Sao Tome and Principe":"ST","Saudi Arabia":"SA","Senegal":"SN","Serbia":"RS","Seychelles":"SC","Sierra Leone":"SL","Singapore":"SG","Slovakia":"SK","Slovenia":"SI","Solomon Islands":"SB","Somalia":"SO","South Africa":"ZA","South Korea":"KR","South Sudan":"SS","Spain":"ES","Sri Lanka":"LK","Sudan":"SD","Suriname":"SR","Sweden":"SE","Switzerland":"CH","Syria":"SY",
"Taiwan":"TW","Tajikistan":"TJ","Tanzania":"TZ","Thailand":"TH","Timor-Leste":"TL","Togo":"TG","Tonga":"TO","Trinidad and Tobago":"TT","Tunisia":"TN","Turkey":"TR","Turkmenistan":"TM","Tuvalu":"TV",
"Uganda":"UG","Ukraine":"UA","United Arab Emirates":"AE","United Kingdom":"GB","United States":"US","Uruguay":"UY","Uzbekistan":"UZ",
"Vanuatu":"VU","Vatican City":"VA","Venezuela":"VE","Vietnam":"VN",
"Yemen":"YE","Zambia":"ZM","Zimbabwe":"ZW"
  };
  const toFlag = (name) => {
    const code = (COUNTRY_TO_CODE[name] || "").toUpperCase();
    if (code.length !== 2) return "";
    return String.fromCodePoint(0x1F1E6 + (code.charCodeAt(0)-65)) +
           String.fromCodePoint(0x1F1E6 + (code.charCodeAt(1)-65));
  };
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                                .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const map = L.map('map', { scrollWheelZoom: true, worldCopyJump: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  map.setView([20, 0], 2);

  const cluster = L.markerClusterGroup();
  map.addLayer(cluster);

  fetch('/api/submissions', { headers: { 'Accept': 'application/json' } })
    .then(r => r.ok ? r.json() : [])
    .then(rows => {
      renderMarkers(rows);
      renderStats(rows);
    })
    .catch(()=>{});

  function renderMarkers(rows){
    cluster.clearLayers();
    const markers = [];
    rows.forEach(item => {
      const lat = Number(item.lat), lng = Number(item.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const name = [item.firstName, item.lastInitial ? (item.lastInitial + '.') : '']
        .filter(Boolean).join(' ');
      const flag = item.homeCountry ? toFlag(item.homeCountry) : '';
      const loc  = [item.city, item.country].filter(Boolean).join(', ');
      const club = item.firstGolfClub ? esc(item.firstGolfClub) : '';
      const year = item.startedYear ? esc(item.startedYear) : (item.firstRoundDate ? esc(item.firstRoundDate) : '');
      const age  = item.ageWhenStarted ? `Started at ${esc(item.ageWhenStarted)}` : '';
      const dream= item.dreamCourse ? `Dream: ${esc(item.dreamCourse)}` : '';
      const how  = item.howGotIntoGolf ? esc(item.howGotIntoGolf) : '';
      const story= item.story ? esc(item.story) : '';

      const firstLine = club
        ? `<div class="pc-row"><span>First round:</span> ${club}${year ? ` (${year})` : ''}</div>`
        : (year ? `<div class="pc-row"><span>Started:</span> ${year}</div>` : '');

      const popupHTML = `
        <div class="player-card">
          <div class="pc-header">
            <div class="pc-avatar">${flag || esc((item.firstName||'?')[0]).toUpperCase()}</div>
            <div>
              <div class="pc-name">${esc(name || 'Someone')} ${flag ? `<span class="pc-flag">${flag}</span>` : ''}</div>
              <div class="pc-meta">${esc(loc)}</div>
            </div>
          </div>
          <div class="pc-body">
            ${firstLine}
            ${age ? `<div class="pc-row">${age}</div>` : ''}
            ${dream ? `<div class="pc-row">${dream}</div>` : ''}
            ${how ? `<div class="pc-note">“${how}”</div>` : ''}
            ${story ? `<div class="pc-note small">“${story}”</div>` : ''}
          </div>
        </div>
      `;

      const m = L.marker([lat,lng]).bindPopup(popupHTML, { minWidth: 260, maxWidth: 340 });
      m.on('mouseover', () => m.openPopup());
      m.on('mouseout', () => m.closePopup());
      cluster.addLayer(m);
      markers.push(m);
    });

    if (markers.length) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.25));
    }
  }

  function renderStats(rows){
    const totalEl = document.getElementById('stat-total');
    const avgAgeEl = document.getElementById('stat-avg-age');
    const topCountriesEl = document.getElementById('stat-top-countries');

    totalEl && (totalEl.textContent = String(rows.length));

    const ages = rows.map(r => Number(r.ageWhenStarted)).filter(n => Number.isFinite(n) && n>0 && n<120);
    const avg = ages.length ? Math.round(ages.reduce((a,b)=>a+b,0) / ages.length) : null;
    avgAgeEl && (avgAgeEl.textContent = avg ? String(avg) : '—');

    const counts = {};
    rows.forEach(r => {
      const c = (r.country || '').trim();
      if (!c) return;
      counts[c] = (counts[c] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v]) => `${k} (${v})`);
    topCountriesEl && (topCountriesEl.textContent = top.length ? top.join(', ') : '—');
  }
})();
