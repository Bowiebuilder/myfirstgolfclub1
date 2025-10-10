(function () {
  // ISO Country list
  const COUNTRIES = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
    "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
    "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
    "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
    "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
    "Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
  ];

  // Autocomplete setup for any input + suggestion box pair
  function setupAutocomplete(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      list.innerHTML = "";
      if (!val) {
        list.style.display = "none";
        return;
      }
      const matches = COUNTRIES.filter(c => c.toLowerCase().includes(val)).slice(0, 10);
      matches.forEach(match => {
        const div = document.createElement("div");
        div.textContent = match;
        div.className = "ac-item";
        div.onclick = () => {
          input.value = match;
          list.style.display = "none";
        };
        list.appendChild(div);
      });
      list.style.display = matches.length ? "block" : "none";
    });

    document.addEventListener("click", e => {
      if (!list.contains(e.target) && e.target !== input) {
        list.style.display = "none";
      }
    });
  }

  // Setup country autocomplete for homeCountry + course country
  setupAutocomplete("homeCountry", "home-country-suggestions");
  setupAutocomplete("country", "country-suggestions");

  // Year dropdown (1900 → current year)
  const yearSelect = document.getElementById("startedYear");
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    }
  }

  // Leaflet picker map: ensure full sizing + center pin
  const picker = document.getElementById("picker-map");
  if (picker && window.L) {
    const map = L.map(picker).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    const marker = L.marker([20, 0], { draggable: true }).addTo(map);

    // Center pin when resized
    setTimeout(() => {
      map.invalidateSize();
      map.setView(marker.getLatLng(), 6);
    }, 300);

    // Update hidden fields
    function updateHidden(latlng) {
      document.getElementById("lat").value = latlng.lat;
      document.getElementById("lng").value = latlng.lng;
    }
    marker.on("dragend", () => updateHidden(marker.getLatLng()));
    updateHidden(marker.getLatLng());
  }
})();
