/**
 * CompareController - Controls product comparison view
 */
class CompareController {
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
    const products = [this.compareProduct1?.value, this.compareProduct2?.value].filter(
      Boolean
    );

    if (products.length !== 2) {
      this.view.showError("Please select exactly 2 products to compare");
      return;
    }

    this.view.showLoading();

    try {
      const productsData = await this.model.loadProducts(products);
      this.view.render(productsData);
    } catch (e) {
      this.view.showError(`Failed to load comparison: ${e.message}`);
    }
  }
}
