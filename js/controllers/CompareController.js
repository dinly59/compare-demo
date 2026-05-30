/**
 * CompareController - Controls product comparison view
 */
class CompareController {
  /**
   * Prepare chart data for the view (xLabels, groups, datasets)
   * @param {Array} productsData
   * @param {string} concreteState
   * @returns {Object} chartData
   */
  prepareChartData(productsData, concreteState) {
    // Helper to parse anchor size for sorting
    const parseSize = (s) => {
      if (!s) return 0;
      if (typeof s === "string" && s.includes("/")) {
        const [num, den] = s.replace('"', "").split("/");
        return parseFloat(num) / parseFloat(den);
      }
      return parseFloat(s) || 0;
    };

    const getAnchorSize = (anchor) =>
      anchor?.["Anchor Size"] || anchor?.anchorSize || anchor || {};
    const getEmbedmentDepths = (anchorSize) =>
      anchorSize?.["Effective Embedment Depth (hef)"] ||
      anchorSize?.effectiveEmbedmentDepths ||
      [];

    // Collect unique anchor sizes
    const uniqueSizes = new Set();
    productsData.forEach((product) => {
      (product.anchorSizes || []).forEach((a) => {
        const anchorSize = getAnchorSize(a);
        const size = anchorSize.value;
        if (size) uniqueSizes.add(size);
      });
    });

    const allSizes = Array.from(uniqueSizes).sort(
      (a, b) => parseSize(a) - parseSize(b),
    );

    // Build data structure: size -> hef -> [{product, h}]
    const dataBySizeThenHef = new Map();
    productsData.forEach((product) => {
      (product.anchorSizes || []).forEach((a) => {
        const anchorSize = getAnchorSize(a);
        const size = anchorSize.value;
        if (!size) return;
        const hefs = getEmbedmentDepths(anchorSize);
        hefs.forEach((h) => {
          if (!dataBySizeThenHef.has(size))
            dataBySizeThenHef.set(size, new Map());
          const hefMap = dataBySizeThenHef.get(size);
          if (!hefMap.has(h.value)) hefMap.set(h.value, []);
          hefMap.get(h.value).push({ product, h });
        });
      });
    });

    // Build x positions, xLabels, groups, positionToData
    const xPositions = [];
    const xLabels = [];
    const groups = [];
    const positionToData = [];
    let currentPos = 0;
    const groupSpacing = 3;

    allSizes.forEach((size) => {
      if (!dataBySizeThenHef.has(size)) return;
      const hefMap = dataBySizeThenHef.get(size);
      const hefs = Array.from(hefMap.keys()).sort(
        (a, b) => parseFloat(a) - parseFloat(b),
      );
      if (hefs.length === 0) return;
      const groupStart = currentPos;
      hefs.forEach((hef) => {
        xPositions.push(currentPos);
        xLabels.push(String(hef));
        positionToData.push({ size, hef });
        currentPos++;
      });
      const groupEnd = currentPos - 1;
      groups.push({ size, startIndex: groupStart, endIndex: groupEnd });
      currentPos += groupSpacing;
    });

    // Helper to get the correct phi value based on concrete state
    function getPhi(h, key) {
      if (key === "φNsa") return h.tensionSteelStrength ?? null;
      if (key === "φVsa") return h.shearSteelStrength ?? null;
      if (key === "φNcb") {
        return concreteState === "cracked"
          ? h.tensionBreakoutCracked
          : h.tensionBreakoutUncracked;
      }
      if (key === "φNp") {
        return concreteState === "cracked"
          ? h.pulloutCracked
          : h.pulloutUncracked;
      }
      if (key === "φVcp") {
        return concreteState === "cracked"
          ? h.pryoutCracked
          : h.pryoutUncracked;
      }
      return null;
    }

    function getMinimumPhi(h, keys) {
      const values = keys
        .map((key) => getPhi(h, key))
        .filter(
          (value) => value !== null && value !== undefined && value !== "",
        )
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value));

      if (values.length === 0) return null;

      return Math.min(...values);
    }

    // Build tension datasets
    const tensionDatasets = productsData.map((product, idx) => {
      const map = new Map();
      (product.anchorSizes || []).forEach((a) => {
        const anchorSize = getAnchorSize(a);
        const size = anchorSize.value;
        const hefs = getEmbedmentDepths(anchorSize);
        hefs.forEach((h) => {
          map.set(
            `${size}-${h.value}`,
            getMinimumPhi(h, ["φNsa", "φNcb", "φNp"]),
          );
        });
      });
      const data = positionToData.map((item) => {
        if (!item) return null;
        const key = `${item.size}-${item.hef}`;
        return map.has(key) ? map.get(key) : null;
      });
      return {
        label: product.name || `Product ${idx + 1}`,
        data: data,
        borderColor: this.view.colors[idx % this.view.colors.length],
        backgroundColor: this.view.colors[idx % this.view.colors.length],
        borderWidth: 2,
      };
    });

    // Build shear datasets
    const shearDatasets = productsData.map((product, idx) => {
      const map = new Map();
      (product.anchorSizes || []).forEach((a) => {
        const anchorSize = getAnchorSize(a);
        const size = anchorSize.value;
        const hefs = getEmbedmentDepths(anchorSize);
        hefs.forEach((h) => {
          map.set(`${size}-${h.value}`, getMinimumPhi(h, ["φVsa", "φVcp"]));
        });
      });
      const data = positionToData.map((item) => {
        if (!item) return null;
        const key = `${item.size}-${item.hef}`;
        return map.has(key) ? map.get(key) : null;
      });
      return {
        label: product.name || `Product ${idx + 1}`,
        data: data,
        borderColor: this.view.colors[idx % this.view.colors.length],
        backgroundColor: this.view.colors[idx % this.view.colors.length],
        borderWidth: 2,
      };
    });

    return {
      tension: {
        datasets: tensionDatasets,
        xLabels,
        groups,
      },
      shear: {
        datasets: shearDatasets,
        xLabels,
        groups,
      },
    };
  }

  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.initElements();
    this.bindEvents();
  }

  /**
   * Initialize DOM elements
   */
  initElements() {
    this.compareProduct1 = document.getElementById("compareProduct1");
    this.compareProduct2 = document.getElementById("compareProduct2");
    this.compareBtn = document.getElementById("compareBtn");
    this.concreteStateRadios = document.querySelectorAll(
      'input[name="concreteState"]',
    );
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.compareBtn?.addEventListener("click", () => this.handleCompare());
  }

  /**
   * Initialize with products
   */
  async initialize() {
    const products = this.model.getProducts();
    this.populateCompareSelects(products);
  }

  /**
   * Populate comparison dropdowns
   */
  populateCompareSelects(products) {
    [this.compareProduct1, this.compareProduct2].forEach((select) => {
      if (select) {
        select.innerHTML = '<option value="">Select a product...</option>';
        products.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p;
          opt.textContent = p.replace(/\.json$/, "");
          select.appendChild(opt);
        });
      }
    });
  }

  /**
   * Handle compare button click
   */
  async handleCompare() {
    const products = [
      this.compareProduct1?.value,
      this.compareProduct2?.value,
    ].filter(Boolean);
    const concreteState = this.getConcreteState();

    if (products.length !== 2) {
      this.view.showError("Please select exactly 2 products to compare");
      return;
    }

    if (!concreteState) {
      this.view.showError("Please select a concrete state");
      return;
    }

    this.view.showLoading();

    try {
      const productsData = await this.model.loadProductSchemas(products);
      const chartData = this.prepareChartData(productsData, concreteState);
      this.view.render(productsData, concreteState, chartData);
    } catch (e) {
      this.view.showError(`Failed to load comparison: ${e.message}`);
    }
  }

  getConcreteState() {
    for (const radio of this.concreteStateRadios) {
      if (radio.checked) {
        return radio.value;
      }
    }
    return null;
  }
}
