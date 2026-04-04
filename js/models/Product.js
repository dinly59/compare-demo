/**
 * Product - Represents a complete product with diameters
 */
class Product {
  constructor(data = {}) {
    this.name = data.name || null;
    this.company = data.company || null;
    this.diameters = [];

    // Parse diameters
    const diameterArray = data.diameters || [];
    this.diameters = diameterArray.map((d) => new Diameter(d));
  }

  /**
   * Get all anchor sizes
   */
  getAnchorSizes() {
    return this.diameters.map((d) => d.anchorSize.value);
  }

  /**
   * Get diameter by anchor size value
   */
  getDiameterByAnchorSize(sizeValue) {
    return this.diameters.find((d) => d.anchorSize.value === sizeValue);
  }

  /**
   * Get total number of specifications
   */
  getTotalSpecCount() {
    return this.diameters.reduce(
      (sum, d) => sum + d.anchorSize.effectiveEmbedmentDepths.length,
      0,
    );
  }
}
