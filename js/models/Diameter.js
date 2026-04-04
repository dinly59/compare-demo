/**
 * Diameter - Represents diameter specifications
 */
class Diameter {
  constructor(data = {}) {
    const anchorSizeData = data["Anchor Size"] || {};
    this.anchorSize = new AnchorSize(anchorSizeData);
  }

  /**
   * Get anchor size value
   */
  getAnchorSizeValue() {
    return this.anchorSize.value;
  }

  /**
   * Get all embedment depths for this diameter
   */
  getEffectiveEmbedmentDepths() {
    return this.anchorSize.effectiveEmbedmentDepths;
  }
}
