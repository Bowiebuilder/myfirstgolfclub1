(function () {
  // -------- ISO 3166 country names --------
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

  const norm = s => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019]/g, "'")
    .trim();

  // -------- Country autocomplete (text input + dropdown) --------
  function buildCountryAutocomplete() {
    const input = document.getElementById('country');
    const list  = document.getElementById('country-suggestions');
    if (!input || !list) return;

    let currentIndex = -1;

    function optionsFor(q) {
      if (!q) return ISO_COUNTRIES.slice(0, 50);
      const nq = norm(q);
      const starts = [], contains = [];
      for (const name of ISO_COUNTRIES) {
        const n = norm(name);
        if (n.startsWith(nq)) starts.push(name);
        else if (n.includes(nq)) contains.push(name);
      }
      return starts.concat(contains);
    }

    function render(names) {
      list.innerHTML = "";
      currentIndex = -1;
      names.slice(0, 12).forEach((name) => {
        const div = document.createElement('div');
        div.className = 'ac-item';
        div.setAttribute('role', 'option');
        div.textContent = name;
        div.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = name;
          close();
        });
        list.appendChild(div);
      });
      list.style.display = names.length ? 'block' : 'none';
      list.style.minWidth = input.offsetWidth + 'px';
    }

    function highlight() {
      const items = list.querySelectorAll('.ac-item');
      items.forEach((el, i) => {
        el.classList.toggle('active', i === currentIndex);
        el.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
        if (i === currentIndex) el.scrollIntoView({ block: 'nearest' });
      });
    }

    function close() { list.style.display = 'none'; currentIndex = -1; }

    input.addEventListener('input', () => render(optionsFor(input.value)));
    document.addEventListener('click', (e) => {
      if (e.target !== input && !list.contains(e.target)) close();
    });

    input.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.ac-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!items.length) return;
        currentIndex = (currentIndex + 1) % items.length; highlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!items.length) return;
        currentIndex = (currentIndex - 1 + items.length) % items.length; highlight();
      } else if (e.key === 'Enter') {
        if (list.style.display === 'block' && currentIndex >= 0) {
          e.preventDefault();
          input.value = items[currentIndex].textContent || input.value;
          close();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    });

    // Only allow valid ISO names
    function validate() {
      const val = input.value.trim();
      const ok = ISO_COUNTRIES.some(n => norm(n) === norm(val));
      input.setCustomValidity(ok || !val ? "" : "Please choose a valid country from the list.");
    }
    input.addEventListener('blur', validate);

    const form = document.getElementById('mfgc-form');
    if (form) form.addEventListener('submit', (e) => {
      validate();
      if (!form.checkValidity()) {
        e.preventDefault();
        input.reportValidity();
      }
    });

    render([]);
  }

  // -------- Year/Month dropdowns (write YYYY-MM to hidden field) --------
  function buildMonthYear() {
    const monthInput = document.getElementById('firstRoundDate');
    const form = document.getElementById('mfgc-form');
    const yearSel  = document.getElementById('yearSelect');
    const monthSel = document.getElementById('monthSelect');
    if (!form || !monthInput || !yearSel || !monthSel) return;

    const now = new Date();
    const thisYear = now.getFullYear();

    // Years: current -> 1900
    for (let y = thisYear; y >= 1900; y--) {
      const o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      yearSel.appendChild(o);
    }
    // Months: names
    const months = [
      ['01','January'],['02','February'],['03','March'],['04','April'],['05','May'],['06','June'],
      ['07','July'],['08','August'],['09','September'],['10','October'],['11','November'],['12','December']
    ];
    months.forEach(([v, n]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = n;
      monthSel.appendChild(o);
    });

    // Cap future months for current year
    function capFuture() {
      const currentMonth = now.getMonth() + 1;
      Array.from(monthSel.options).forEach(opt => {
        const m = parseInt(opt.value, 10);
        opt.disabled = (parseInt(yearSel.value, 10) === thisYear && m > currentMonth);
      });
      if (monthSel.selectedOptions[0]?.disabled) {
        for (let i = monthSel.options.length - 1; i >= 0; i--) {
          if (!monthSel.options[i].disabled) { monthSel.value = monthSel.options[i].value; break; }
        }
      }
    }
    yearSel.addEventListener('change', capFuture);

    // Defaults
    yearSel.value  = String(thisYear);
    monthSel.value = String(now.getMonth() + 1).padStart(2, '0');
    capFuture();

    // On submit, write YYYY-MM
    form.addEventListener('submit', () => {
      monthInput.value = `${yearSel.value}-${monthSel.value}`;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildCountryAutocomplete();
    buildMonthYear();
  });
})();
