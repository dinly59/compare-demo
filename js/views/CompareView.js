/**
 * CompareView - Handles product comparison visualization
 */
class CompareView {
  constructor(model) {
    this.model = model;
    this.container = document.getElementById("compareContainer");
    this.colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="text-center py-16 text-slate-500 animate-pulse">
        <svg class="inline-block w-8 h-8 text-blue-600 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-lg">Loading comparison...</p>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="text-center py-16 text-red-600">
        <svg class="inline-block w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-lg font-semibold">${message}</p>
      </div>
    `;
  }

  /**
   * Render comparison view
   */
  render(productsData) {
    this.container.innerHTML = "";

    // Overview section
    this.renderOverview(productsData);

    // Charts section (if 2 products)
    if (productsData.length === 2) {
      this.renderChartsSection(productsData);
    }
  }

  /**
   * Render overview table
   */
  renderOverview(productsData) {
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

    // Header
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

    // Body
    const tbody = document.createElement("tbody");

    // Company row
    this.addOverviewRow(tbody, "Company", productsData, (data) => data.company || "-");

    // Diameter count row
    this.addOverviewRow(tbody, "Available Sizes", productsData,
      (data) => (data.diameters?.length || 0) + " sizes");

    // Total configurations row
    this.addOverviewRow(tbody, "Total Configurations", productsData,
      (data) => this.model.getTotalRowCount(data) + " configurations");

    table.appendChild(tbody);
    wrapper.appendChild(table);
    overviewSection.appendChild(wrapper);
    this.container.appendChild(overviewSection);
  }

  /**
   * Add a row to overview table
   */
  addOverviewRow(tbody, label, productsData, valueFn) {
    const row = document.createElement("tr");
    const labelCell = document.createElement("td");
    labelCell.className =
      "px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 sticky left-0";
    labelCell.textContent = label;
    row.appendChild(labelCell);

    productsData.forEach((data) => {
      const td = document.createElement("td");
      td.className = "px-4 py-3 text-sm text-slate-700 border-b border-slate-200";
      td.textContent = valueFn(data);
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  /**
   * Render charts section
   */
  renderChartsSection(productsData) {
    const chartsSection = document.createElement("div");
    chartsSection.className =
      "bg-white rounded-xl shadow-md border border-slate-200 p-6";

    const chartTitle = document.createElement("h2");
    chartTitle.className = "text-2xl font-bold text-slate-800 mb-4";
    chartTitle.textContent = "Diameter Specifications Comparison";
    chartsSection.appendChild(chartTitle);

    const chartsGrid = document.createElement("div");
    chartsGrid.className = "grid grid-cols-1 gap-6";

    // Tension chart
    const tensionChartDiv = this.createChartContainer(
      "tensionChart",
      "Tension Steel Strength (fNsa) by Diameter"
    );
    chartsGrid.appendChild(tensionChartDiv);

    // Shear chart
    const shearChartDiv = this.createChartContainer(
      "shearChart",
      "Shear Steel Strength (fVsa) by Diameter"
    );
    chartsGrid.appendChild(shearChartDiv);

    chartsSection.appendChild(chartsGrid);
    this.container.appendChild(chartsSection);

    // Render charts after DOM update
    setTimeout(() => {
      this.renderCharts(productsData);
    }, 100);
  }

  /**
   * Create chart container
   */
  createChartContainer(id, title) {
    const div = document.createElement("div");
    div.className = "bg-slate-50 p-4 rounded-lg";

    const titleEl = document.createElement("h3");
    titleEl.className = "text-lg font-semibold text-slate-700 mb-3 text-center";
    titleEl.textContent = title;
    div.appendChild(titleEl);

    const canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.style.width = "100%";
    canvas.style.height = "380px";
    div.appendChild(canvas);

    return div;
  }

  /**
   * Render comparison charts
   */
  renderCharts(productsData) {
    const { xPositions, xLabels, groups, positionToData } = this.prepareChartData(productsData);

    // Create plugin for group labels
    const groupLabelPlugin = this.createGroupLabelPlugin(groups, xLabels);

    // Prepare datasets
    const tensionDatasets = this.createTensionDatasets(productsData, positionToData);
    const shearDatasets = this.createShearDatasets(productsData, positionToData);

    // Render tension chart
    this.renderChart("tensionChart", tensionDatasets, xLabels, groupLabelPlugin,
      groups, "Tension Strength (lbs)", "hef (in.)");

    // Render shear chart
    this.renderChart("shearChart", shearDatasets, xLabels, groupLabelPlugin,
      groups, "Shear Strength (lbs)", "hef (in.)");
  }

  /**
   * Prepare chart data structure
   */
  prepareChartData(productsData) {
    const parseSize = (s) => {
      if (!s) return 0;
      if (s.includes("/")) {
        const [num, den] = s.replace('"', "").split("/");
        return parseFloat(num) / parseFloat(den);
      }
      return parseFloat(s) || 0;
    };

    // Collect unique diameters
    const uniqueDiameters = new Set();
    productsData.forEach((product) => {
      product.diameters?.forEach((d) => {
        const size = d["Anchor Size"]?.value;
        if (size) uniqueDiameters.add(size);
      });
    });

    const allDiameters = Array.from(uniqueDiameters).sort(
      (a, b) => parseSize(a) - parseSize(b)
    );

    // Build data structure
    const dataBySizeThenHef = new Map();
    productsData.forEach((product) => {
      product.diameters?.forEach((d) => {
        const size = d["Anchor Size"]?.value;
        if (!size) return;
        const hefs = d["Anchor Size"]?.["Effective Embedment Depth (hef)"] || [];
        hefs.forEach((h) => {
          if (!dataBySizeThenHef.has(size))
            dataBySizeThenHef.set(size, new Map());
          const hefMap = dataBySizeThenHef.get(size);
          if (!hefMap.has(h.value)) hefMap.set(h.value, []);
          hefMap.get(h.value).push({ product, h });
        });
      });
    });

    // Build x positions
    const xPositions = [];
    const xLabels = [];
    const groups = [];
    const positionToData = [];
    let currentPos = 0;
    const groupSpacing = 3;

    allDiameters.forEach((diameter) => {
      if (!dataBySizeThenHef.has(diameter)) return;

      const hefMap = dataBySizeThenHef.get(diameter);
      const hefs = Array.from(hefMap.keys()).sort(
        (a, b) => parseFloat(a) - parseFloat(b)
      );
      if (hefs.length === 0) return;

      const groupStart = currentPos;

      hefs.forEach((hef) => {
        xPositions.push(currentPos);
        xLabels.push(String(hef));
        positionToData.push({ size: diameter, hef });
        currentPos++;
      });

      const groupEnd = currentPos - 1;
      groups.push({ size: diameter, startIndex: groupStart, endIndex: groupEnd });

      currentPos += groupSpacing;
    });

    return { xPositions, xLabels, groups, positionToData };
  }

  /**
   * Create tension datasets
   */
  createTensionDatasets(productsData, positionToData) {
    return productsData.map((product, idx) => {
      const map = new Map();
      product.diameters?.forEach((d) => {
        const size = d["Anchor Size"]?.value;
        const hefs = d["Anchor Size"]?.["Effective Embedment Depth (hef)"] || [];
        hefs.forEach((h) => {
          map.set(`${size}-${h.value}`, this.model.getPhi(h, "φNsa"));
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
        borderColor: this.colors[idx % this.colors.length],
        backgroundColor: this.colors[idx % this.colors.length],
        borderWidth: 2,
      };
    });
  }

  /**
   * Create shear datasets
   */
  createShearDatasets(productsData, positionToData) {
    return productsData.map((product, idx) => {
      const map = new Map();
      product.diameters?.forEach((d) => {
        const size = d["Anchor Size"]?.value;
        const hefs = d["Anchor Size"]?.["Effective Embedment Depth (hef)"] || [];
        hefs.forEach((h) => {
          map.set(`${size}-${h.value}`, this.model.getPhi(h, "φVsa"));
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
        borderColor: this.colors[idx % this.colors.length],
        backgroundColor: this.colors[idx % this.colors.length],
        borderWidth: 2,
      };
    });
  }

  /**
   * Create group label plugin for Chart.js
   */
  createGroupLabelPlugin(groups, xLabels) {
    return {
      id: "groupLabels",
      afterDraw: (chart) => {
        const { ctx, chartArea, scales, options } = chart;
        const xScale = scales.x;
        const pluginOpts = (options?.plugins?.groupLabels) || {};
        const localGroups = pluginOpts.groups || groups || [];
        const localXLabels = pluginOpts.xLabels || xLabels || [];

        if (!localGroups.length) return;

        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";

        localGroups.forEach((g) => {
          if (g.startIndex == null || g.endIndex == null) return;
          const startPixel = xScale.getPixelForValue(g.startIndex);
          const endPixel = xScale.getPixelForValue(g.endIndex);
          if (!isFinite(startPixel) || !isFinite(endPixel)) return;

          const center = (startPixel + endPixel) / 2;
          const bracketY = chartArea.bottom + 8;
          const bracketHeight = 6;
          const labelY = chartArea.bottom + 28;

          ctx.beginPath();
          ctx.moveTo(startPixel, bracketY);
          ctx.lineTo(startPixel, bracketY + bracketHeight);
          ctx.moveTo(startPixel, bracketY + bracketHeight);
          ctx.lineTo(endPixel, bracketY + bracketHeight);
          ctx.moveTo(endPixel, bracketY);
          ctx.lineTo(endPixel, bracketY + bracketHeight);
          ctx.stroke();
          ctx.fillText(`Ø ${g.size}`, center, labelY);
        });

        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#0f172a";
        localXLabels.forEach((lab, i) => {
          if (lab) {
            const x = xScale.getPixelForValue(i);
            if (!isFinite(x)) return;
            ctx.fillText(lab, x, chartArea.bottom + 2);
          }
        });
        ctx.restore();
      },
    };
  }

  /**
   * Render a chart
   */
  renderChart(canvasId, datasets, xLabels, plugin, groups, yTitle, xTitle) {
    const ctx = document.getElementById(canvasId);
    if (ctx && window.Chart) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: xLabels,
          datasets: datasets,
        },
        plugins: [plugin],
        options: {
          responsive: true,
          maintainAspectRatio: true,
          categoryPercentage: 0.95,
          barPercentage: 0.85,
          plugins: {
            legend: {
              position: "bottom",
            },
            groupLabels: { groups, xLabels },
            tooltip: {
              callbacks: {
                label: function (context) {
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
                text: yTitle,
              },
            },
            x: {
              type: "category",
              title: {
                display: true,
                text: xTitle,
              },
              ticks: {
                maxRotation: 0,
                autoSkip: false,
                display: false,
              },
            },
          },
        },
      });
    }
  }
}
