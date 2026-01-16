const DATA_PATH = "./data/";
const PRODUCTS_URL = DATA_PATH + "index.json";
let PRODUCTS = [];

// View management
const views = {
  home: document.getElementById("homeView"),
  table: document.getElementById("tableView"),
  compare: document.getElementById("compareView"),
};

function showView(viewName) {
  Object.keys(views).forEach((key) => {
    if (views[key]) {
      views[key].style.display = key === viewName ? "block" : "none";
    }
  });

  // Update active nav link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === viewName);
  });
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || "home";
  showView(hash);
  // Auto-load first product when entering table view
  if (hash === "table" && !cachedData && PRODUCTS.length) {
    loadProduct(PRODUCTS[0]).then((d) => renderTable(d));
  }
}

// Initialize routing
window.addEventListener("hashchange", handleRoute);
window.addEventListener("load", async () => {
  await initProducts();
  handleRoute();
});

const productSelect = document.getElementById("productSelect");
const container = document.getElementById("tableContainer");
const filterInput = document.getElementById("filter");
const clearFilterBtn = document.getElementById("clearFilter");
const compactToggle = document.getElementById("compactToggle");
const paginationControls = document.getElementById("paginationControls");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

// Compare view elements
const compareProduct1 = document.getElementById("compareProduct1");
const compareProduct2 = document.getElementById("compareProduct2");
const compareBtn = document.getElementById("compareBtn");
const compareContainer = document.getElementById("compareContainer");

// Cache for loaded data
let cachedData = null;
let currentProduct = "";
let sortColumn = -1;
let sortAscending = true;
let compactMode = false;
let currentPage = 1;
const PAGE_SIZE = 10;

function populateSelect() {
  PRODUCTS.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p.replace(/\.json$/, "");
    productSelect.appendChild(opt);
  });
}

function populateCompareSelects() {
  [compareProduct1, compareProduct2].forEach((select) => {
    if (select) {
      PRODUCTS.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p.replace(/\.json$/, "");
        select.appendChild(opt);
      });
    }
  });
}

async function fetchProductList() {
  try {
    const resp = await fetch(PRODUCTS_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const list = await resp.json();
    if (!Array.isArray(list)) return [];
    return list;
  } catch (e) {
    console.error("Failed to fetch product list:", e);
    return [];
  }
}

async function initProducts() {
  PRODUCTS = await fetchProductList();
  // Fallback: if no index provided, keep PRODUCTS empty and let user add manually
  populateSelect();
  populateCompareSelects();
}

function formatNumber(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

// Normalize keys to compare variants like "φNsa", "ϕNsa", "fNsa", or full labels
function normalizeKey(s) {
  if (s == null) return "";
  return String(s)
    .normalize()
    .replace(/\s+/g, "")
    .replace(/[(),\-_.]/g, "")
    .replace(/[φϕ]/g, "phi")
    .toLowerCase();
}

// Lookup by short φ-key (e.g. 'φVcp_cr', 'φNsa').
// Matches exact keys, normalized keys, and parenthetical tokens like '(φVcp,cr)'.
function getPhi(obj, phiKey) {
  if (!obj || !phiKey) return undefined;
  // direct exact property
  if (Object.prototype.hasOwnProperty.call(obj, phiKey)) return obj[phiKey];

  const target = normalizeKey(phiKey);

  const props = Object.keys(obj);
  for (const p of props) {
    // exact normalized match
    if (normalizeKey(p) === target) return obj[p];
    // parenthetical token match
    const m = p.match(/\(([^)]+)\)/);
    if (m && m[1]) {
      const par = normalizeKey(m[1]);
      if (par === target) return obj[p];
      if (par.includes(target)) return obj[p];
    }
    // also check if the property contains the token somewhere
    if (normalizeKey(p).includes(target)) return obj[p];
  }
  return undefined;
}

function getField(obj, candidates = []) {
  if (!obj) return undefined;
  // direct candidate check
  for (const c of candidates) {
    if (Object.prototype.hasOwnProperty.call(obj, c)) return obj[c];
  }
  // normalized & substring fallback (handles parenthetical codes like (φNsa))
  const props = Object.keys(obj);
  for (const p of props) {
    const np = normalizeKey(p);
    for (const c of candidates) {
      const nc = normalizeKey(c);
      if (!nc) continue;
      // exact normalized match
      if (np === nc) return obj[p];
      // if the normalized prop contains the candidate token (e.g., 'phinsa')
      if (np.includes(nc)) return obj[p];
      // check parenthetical token inside the original property name
      const m = p.match(/\(([^)]+)\)/);
      if (m && m[1]) {
        const par = normalizeKey(m[1]);
        if (par === nc) return obj[p];
        if (par.includes(nc)) return obj[p];
      }
    }
  }
  return undefined;
}

function showLoading() {
  container.innerHTML = `
    <div class="loading">
      <svg class="inline-block w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-3">Loading product data...</p>
    </div>
  `;
}

function showError(message) {
  container.innerHTML = `
    <div class="error">
      <svg class="inline-block w-16 h-16 text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-lg font-semibold">⚠️ ${message}</p>
      <button onclick="location.reload()">Retry</button>
    </div>
  `;
}

function renderTable(data, filter = "") {
  container.innerHTML = "";
  if (!data) {
    showError("No data available");
    return;
  }

  const title = document.createElement("h2");
  title.textContent = data.name || "Product";
  title.className = "flex items-center gap-3";
  title.innerHTML = `
    <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
    ${data.name || "Product"}
  `;
  container.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const headers = [
    "Anchor Size",
    "Drill Bit",
    "hef",
    "hnom",
    "hhole",
    "Cracked",
    "Seismic",
    "Category",
    "φNsa",
    "φNcb",
    "φNcb_cr",
    "φNp_uncr",
    "φNp_cr",
    "φVsa",
    "φVcp_uncr",
    "φVcp_cr",
  ];
  headers.forEach((h, idx) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.cursor = "pointer";
    th.title = "Click to sort";
    if (sortColumn === idx) {
      th.textContent += sortAscending ? " ▲" : " ▼";
    }
    th.addEventListener("click", () => sortTable(idx));
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const rows = [];
  (data.diameters || []).forEach((d) => {
    const a = d["Anchor Size"] || d.anchorSize || d["anchorSize"] || {};
    const label = a.value || a["value"] || a.anchorSize || "n/a";
    const drill = a["Drill Bit Diameter"] || a.drill || "-";
    const hefs =
      a["Effective Embedment Depth (hef)"] ||
      a.effectiveEmbedmentDepth ||
      a.effective ||
      [];
    hefs.forEach((h) => {
      const row = document.createElement("tr");
      const cells = [
        label,
        drill,
        formatNumber(h.value),
        formatNumber(h["Nominal Embedment Depth (hnom)"] || h.hnom),
        formatNumber(h["Minimum Hole Depth (hhole)"] || h.hhole),
        h["Cracked Concrete Data"] ? "yes" : "no",
        h["Seismic Categories"] || h.Seismic || "-",
        h["Anchor Category"] || h.Anchor || "-",
        formatNumber(
          getField(h, [
            "Tension Steel Strength (φNsa)",

            "tensionSteelStrength",
            "φNsa",
            "ϕNsa",
          ])
        ),
        formatNumber(
          getField(h, [
            "Tension Breakout Strength - Uncracked Concrete (φNcb,uncr)",

            "φNcb",
            "ϕNcb",
          ])
        ),
        formatNumber(
          getField(h, [
            "Tension Breakout Strength - Cracked Concrete (φNcb,cr)",

            "φNcb_cr",
            "φNcb,cr",
          ])
        ),
        formatNumber(
          getField(h, [
            "Pullout Strength - Uncracked Concrete (φNp,uncr)",

            "φNp",
            "ϕNp",
          ])
        ),
        formatNumber(
          getField(h, [
            "Pullout Strength - Cracked Concrete (φNp,cr)",

            "φNp_cr",
            "φNp,cr",
          ])
        ),
        formatNumber(
          getField(h, [
            "Shear Steel Strength (φVsa)",

            "shearSteelStrength",
            "φVsa",
            "ϕVsa",
          ])
        ),
        formatNumber(
          getField(h, [
            "Pryout Strength - Uncracked Concrete (φVcp,uncr)",

            "φVcp",
            "φVcp_uncr",
          ])
        ),
        formatNumber(
          getField(h, [
            "Pryout Strength - Cracked Concrete (φVcp,cr)",

            "φVcp_cr",
            "φVcp,cr",
          ])
        ),
      ];

      // Normalize row text and filter to support searching for φ/ϕ and other variants
      const rowText = normalizeKey(cells.join(" "));
      const normalizedFilter = normalizeKey(filter || "");
      if (normalizedFilter && !rowText.includes(normalizedFilter)) return;

      headers.forEach((hdr, i) => {
        const td = document.createElement("td");
        td.setAttribute("data-label", hdr);
        td.textContent = cells[i];
        row.appendChild(td);
      });
      rows.push({ row, cells });
    });
  });

  // Apply sorting if active
  if (sortColumn !== -1) {
    rows.sort((a, b) => {
      const aVal = a.cells[sortColumn];
      const bVal = b.cells[sortColumn];
      const aNum = parseFloat(aVal.replace(/,/g, ""));
      const bNum = parseFloat(bVal.replace(/,/g, ""));

      let comparison = 0;
      if (!isNaN(aNum) && !isNaN(bNum)) {
        comparison = aNum - bNum;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      return sortAscending ? comparison : -comparison;
    });
  }

  // Append sorted rows
  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pagedRows = rows.slice(start, start + PAGE_SIZE);
  pagedRows.forEach((r) => tbody.appendChild(r.row));

  table.appendChild(tbody);

  // Add row count
  const rowCount = document.createElement("p");
  rowCount.className = "row-count";
  const total =
    data.diameters?.reduce(
      (sum, d) =>
        sum +
        (d["Anchor Size"]?.["Effective Embedment Depth (hef)"]?.length || 0),
      0
    ) || 0;
  rowCount.textContent = `Showing ${rows.length} of ${total} rows${
    filter ? " (filtered)" : ""
  }`;
  container.appendChild(rowCount);
  wrapper.appendChild(table);
  container.appendChild(wrapper);

  // Create/Update visible pagination bar under the table
  const existingBar = container.querySelector(".pagination");
  if (existingBar) existingBar.remove();
  if (rows.length > PAGE_SIZE) {
    const paginationEl = document.createElement("div");
    paginationEl.className = "pagination";
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Prev";
    prevBtn.disabled = currentPage <= 1;
    const info = document.createElement("span");
    info.id = "pageInfoInline";
    info.textContent = `${currentPage} / ${totalPages}`;
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.disabled = currentPage >= totalPages;

    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable(cachedData, filterInput.value.trim());
      }
    });
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable(cachedData, filterInput.value.trim());
      }
    });

    paginationEl.appendChild(prevBtn);
    paginationEl.appendChild(info);
    paginationEl.appendChild(nextBtn);
    container.appendChild(paginationEl);
  }
}

function sortTable(columnIndex) {
  if (sortColumn === columnIndex) {
    sortAscending = !sortAscending;
  } else {
    sortColumn = columnIndex;
    sortAscending = true;
  }
  if (cachedData) renderTable(cachedData, filterInput.value.trim());
}

async function loadProduct(filename) {
  // Return cached if same product
  if (currentProduct === filename && cachedData) {
    return cachedData;
  }

  showLoading();
  try {
    const resp = await fetch(DATA_PATH + filename);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const j = await resp.json();
    cachedData = j;
    currentProduct = filename;
    return j;
  } catch (e) {
    showError(`Failed to load ${filename}: ${e.message}`);
    throw e;
  }
}

productSelect.addEventListener("change", async () => {
  const file = productSelect.value;
  const filter = filterInput.value.trim();
  const data = await loadProduct(file);
  currentPage = 1;
  renderTable(data, filter);
});

filterInput.addEventListener("input", () => {
  if (!cachedData) return;
  // Use cached data instead of re-fetching
  currentPage = 1;
  renderTable(cachedData, filterInput.value.trim());
});

clearFilterBtn.addEventListener("click", () => {
  filterInput.value = "";
  sortColumn = -1;
  currentPage = 1;
  if (cachedData) renderTable(cachedData);
});

compactToggle?.addEventListener("change", (e) => {
  compactMode = e.target.checked;
  document.documentElement.classList.toggle("compact", compactMode);
});

prevPageBtn?.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable(cachedData, filterInput.value.trim());
  }
});
nextPageBtn?.addEventListener("click", () => {
  // totalPages will be recalculated in renderTable
  currentPage++;
  renderTable(cachedData, filterInput.value.trim());
});

// Compare functionality
compareBtn?.addEventListener("click", async () => {
  const products = [compareProduct1?.value, compareProduct2?.value].filter(
    Boolean
  );

  if (products.length !== 2) {
    compareContainer.innerHTML = `
      <div class="text-center py-16 text-red-600">
        <svg class="inline-block w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-semibold">Please select exactly 2 products to compare</p>
      </div>
    `;
    return;
  }

  compareContainer.innerHTML = `
    <div class="text-center py-16 text-slate-500 animate-pulse">
      <svg class="inline-block w-8 h-8 text-blue-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-lg">Loading comparison...</p>
    </div>
  `;

  try {
    const dataPromises = products.map((p) =>
      fetch(DATA_PATH + p).then((r) => r.json())
    );
    const productsData = await Promise.all(dataPromises);

    // Backwards-compatible wrapper: older code calls renderComparison
    if (typeof renderComparison === 'function') {
      renderComparison(productsData);
    } else {
      // fall back to new function
      renderComparisonCharts(productsData);
    }
  } catch (e) {
    compareContainer.innerHTML = `
      <div class="text-center py-16 text-red-600">
        <svg class="inline-block w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-semibold">Failed to load comparison: ${e.message}</p>
      </div>
    `;
  }
});

// Backwards-compatible renderComparison entrypoint (keeps prior callers working)
function renderComparison(productsData) {
  // Build the common overview table and then render charts
  compareContainer.innerHTML = "";

  const overviewSection = document.createElement("div");
  overviewSection.className =
    "bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden";

  const title = document.createElement("h2");
  title.className =
    "text-2xl font-bold text-slate-800 px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-slate-50";
  title.textContent = "Product Comparison Overview";
  overviewSection.appendChild(title);

  const wrapper = document.createElement("div");
  wrapper.className = "overflow-x-auto";

  const table = document.createElement("table");
  table.className = "w-full border-collapse";

  // simple header with product names
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const th1 = document.createElement("th");
  th1.className =
    "px-4 py-3 text-left text-xs font-semibold text-slate-700 bg-slate-100 border-b-2 border-slate-300 uppercase sticky left-0";
  th1.textContent = "Specification";
  headerRow.appendChild(th1);

  productsData.forEach((data) => {
    const th = document.createElement("th");
    th.className =
      "px-4 py-3 text-left text-xs font-semibold text-slate-700 bg-slate-100 border-b-2 border-slate-300 uppercase";
    th.textContent = data.name || "Product";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  // company row
  const companyRow = document.createElement("tr");
  const companyLabel = document.createElement("td");
  companyLabel.className =
    "px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 sticky left-0";
  companyLabel.textContent = "Company";
  companyRow.appendChild(companyLabel);
  productsData.forEach((data) => {
    const td = document.createElement("td");
    td.className = "px-4 py-3 text-sm text-slate-700 border-b border-slate-200";
    td.textContent = data.company || "-";
    companyRow.appendChild(td);
  });
  tbody.appendChild(companyRow);

  table.appendChild(tbody);
  wrapper.appendChild(table);
  overviewSection.appendChild(wrapper);
  compareContainer.appendChild(overviewSection);

  // prepare chart canvases (Tension above Shear)
  const chartsSection = document.createElement('section');
  chartsSection.className = 'grid gap-6';
  chartsSection.innerHTML = `
    <div class="bg-white rounded-xl shadow-md p-4 border border-slate-200">
      <h3 class="text-lg font-semibold mb-2">Tension</h3>
      <div style="height:420px">
        <canvas id="tensionChart"></canvas>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-md p-4 border border-slate-200">
      <h3 class="text-lg font-semibold mb-2">Shear</h3>
      <div style="height:320px">
        <canvas id="shearChart"></canvas>
      </div>
    </div>
  `;
  compareContainer.appendChild(chartsSection);

  // then render charts
  renderComparisonCharts(productsData);
}

function renderComparisonCharts(productsData) {
  const colors = ["#FFBE98", "#C5D3E8", "#98D8C8", "#F7DC6F", "#BB8FCE"];

  // Helper to parse anchor size strings
  const parseSize = (s) => {
    if (!s) return 0;
    const cleaned = s.replace(/["\s]/g, '');
    if (cleaned.includes("/")) {
      const [num, den] = cleaned.split("/");
      return parseFloat(num) / parseFloat(den);
    }
    return parseFloat(cleaned) || 0;
  };

  // Helper to convert decimal to fraction display
  const toFraction = (val) => {
    if (!val) return val;
    const num = parseFloat(val);
    if (num % 1 === 0) return num.toString();
    
    const fracs = {
      0.125: "1/8", 0.25: "1/4", 0.375: "3/8", 0.5: "1/2",
      0.625: "5/8", 0.75: "3/4", 0.875: "7/8"
    };
    
    const whole = Math.floor(num);
    const decimal = num - whole;
    const fracStr = fracs[Math.round(decimal * 8) / 8];
    
    if (whole > 0 && fracStr) return `${whole}-${fracStr}`;
    if (fracStr) return fracStr;
    return val;
  };

  // Step 1: Collect all unique diameters
  const uniqueDiameters = new Set();
  productsData.forEach((product) => {
    product.diameters?.forEach((d) => {
      const size = d["Anchor Size"]?.value;
      if (size) uniqueDiameters.add(size);
    });
  });

  const sortedDiameters = Array.from(uniqueDiameters).sort(
    (a, b) => parseSize(a) - parseSize(b)
  );

  // Step 2: Build flat array of all bars with their data
  const allBars = [];
  
  sortedDiameters.forEach((diameter) => {
    // Collect all (hef, product) combinations for this diameter
    const diameterBars = [];
    
    productsData.forEach((product, productIdx) => {
      const diameterData = product.diameters?.find(
        d => d["Anchor Size"]?.value === diameter
      );
      
      if (diameterData) {
        const hefs = diameterData["Anchor Size"]?.["Effective Embedment Depth (hef)"] || [];
        hefs.forEach((h) => {
          diameterBars.push({
            diameter,
            hef: h.value,
            productIdx,
            productName: product.name || `Product ${productIdx + 1}`,
            tensionValue: getPhi(h, "φNsa"),
            shearValue: getPhi(h, "φVsa")
          });
        });
      }
    });
    
    // Sort bars by hef first, then by productIdx (so same hef values are adjacent)
    diameterBars.sort((a, b) => {
      const hefDiff = parseFloat(a.hef) - parseFloat(b.hef);
      if (hefDiff !== 0) return hefDiff;
      return a.productIdx - b.productIdx;
    });
    
    allBars.push(...diameterBars);
  });

  // Step 3: Build labels and positions
  const labels = allBars.map((bar, idx) => `${bar.diameter}_${bar.hef}_${bar.productIdx}`);
  const xLabels = allBars.map(bar => toFraction(bar.hef));
  
  // Step 4: Create ONE dataset per product with sparse data
  const tensionDatasets = productsData.map((product, productIdx) => {
    const data = allBars.map(bar => 
      bar.productIdx === productIdx ? bar.tensionValue : null
    );
    
    return {
      label: product.name || `Product ${productIdx + 1}`,
      data: data,
      backgroundColor: colors[productIdx % colors.length],
      borderColor: colors[productIdx % colors.length],
      borderWidth: 1,
      barThickness: 'flex',
      maxBarThickness: 40,
    };
  });

  const shearDatasets = productsData.map((product, productIdx) => {
    const data = allBars.map(bar => 
      bar.productIdx === productIdx ? bar.shearValue : null
    );
    
    return {
      label: product.name || `Product ${productIdx + 1}`,
      data: data,
      backgroundColor: colors[productIdx % colors.length],
      borderColor: colors[productIdx % colors.length],
      borderWidth: 1,
      barThickness: 'flex',
      maxBarThickness: 40,
    };
  });

  // Step 5: Calculate diameter group boundaries
  const groupBoundaries = [];
  let currentDiameter = null;
  let groupStart = 0;
  
  allBars.forEach((bar, idx) => {
    if (bar.diameter !== currentDiameter) {
      if (currentDiameter !== null) {
        groupBoundaries.push({
          diameter: currentDiameter,
          start: groupStart,
          end: idx - 1
        });
      }
      currentDiameter = bar.diameter;
      groupStart = idx;
    }
  });
  
  // Don't forget last group
  if (currentDiameter !== null) {
    groupBoundaries.push({
      diameter: currentDiameter,
      start: groupStart,
      end: allBars.length - 1
    });
  }

  // Step 6: Custom plugin for diameter labels and separators
  const diameterLabelPlugin = {
    id: "diameterGroupLabels",
    afterDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      
      if (!xScale || !chartArea) return;
      
      ctx.save();
      
      groupBoundaries.forEach((group, groupIdx) => {
        const startPixel = xScale.getPixelForValue(group.start);
        const endPixel = xScale.getPixelForValue(group.end);
        const centerPixel = (startPixel + endPixel) / 2;
        
        // Draw diameter label
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`Ø ${group.diameter}`, centerPixel, chartArea.bottom + 40);
        
        // Draw separator line between groups (except after last)
        if (groupIdx < groupBoundaries.length - 1) {
          const nextGroup = groupBoundaries[groupIdx + 1];
          const separatorX = (endPixel + xScale.getPixelForValue(nextGroup.start)) / 2;
          
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(separatorX, chartArea.top);
          ctx.lineTo(separatorX, chartArea.bottom);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        
        // Draw hef labels for each bar in this group
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#475569";
        
        const drawnHefs = new Set();
        for (let i = group.start; i <= group.end; i++) {
          const bar = allBars[i];
          const hefLabel = toFraction(bar.hef);
          
          // Only draw hef label once per unique hef value
          if (!drawnHefs.has(bar.hef)) {
            // Find all bars with this hef in this group
            const samHefBars = [];
            for (let j = group.start; j <= group.end; j++) {
              if (allBars[j].hef === bar.hef) {
                samHefBars.push(j);
              }
            }
            
            // Calculate center position of this hef group
            const firstIdx = samHefBars[0];
            const lastIdx = samHefBars[samHefBars.length - 1];
            const hefStartPixel = xScale.getPixelForValue(firstIdx);
            const hefEndPixel = xScale.getPixelForValue(lastIdx);
            const hefCenterPixel = (hefStartPixel + hefEndPixel) / 2;
            
            ctx.fillText(hefLabel, hefCenterPixel, chartArea.bottom + 20);
            drawnHefs.add(bar.hef);
          }
        }
      });
      
      ctx.restore();
    },
  };

  // Chart configuration
  const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    skipNull: false,
    interaction: {
      mode: 'point',
      intersect: true,
    },
    layout: {
      padding: {
        bottom: 70
      }
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 20,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            const idx = context[0].dataIndex;
            const bar = allBars[idx];
            return `Ø ${bar.diameter} @ hef ${toFraction(bar.hef)}"`;
          },
          label: function(context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString() + " lbs";
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          font: { size: 13, weight: 'bold' }
        },
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        },
        grid: {
          color: '#e5e7eb'
        }
      },
      x: {
        type: 'category',
        offset: true,
        title: {
          display: true,
          text: "hef (in.)",
          font: { size: 13, weight: 'bold' },
          padding: { top: 50 }
        },
        ticks: {
          display: false, // Hide default ticks, we draw custom ones
        },
        grid: {
          display: false,
          offset: false,
        }
      },
    },
  };

  // Render Tension Chart
  const tensionCtx = document.getElementById("tensionChart");
  if (tensionCtx && window.Chart) {
    const existingChart = Chart.getChart(tensionCtx);
    if (existingChart) existingChart.destroy();
    
    new Chart(tensionCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: tensionDatasets,
      },
      plugins: [diameterLabelPlugin],
      options: {
        ...chartConfig,
        scales: {
          ...chartConfig.scales,
          y: {
            ...chartConfig.scales.y,
            title: {
              ...chartConfig.scales.y.title,
              text: "Tension Steel Strength (φNsa) - lbs"
            }
          }
        }
      },
    });
  }

  // Render Shear Chart
  const shearCtx = document.getElementById("shearChart");
  if (shearCtx && window.Chart) {
    const existingChart = Chart.getChart(shearCtx);
    if (existingChart) existingChart.destroy();
    
    new Chart(shearCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: shearDatasets,
      },
      plugins: [diameterLabelPlugin],
      options: {
        ...chartConfig,
        scales: {
          ...chartConfig.scales,
          y: {
            ...chartConfig.scales.y,
            title: {
              ...chartConfig.scales.y.title,
              text: "Shear Steel Strength (φVsa) - lbs"
            }
          }
        }
      },
    });
  }
}
// Initialize
populateSelect();
populateCompareSelects();
