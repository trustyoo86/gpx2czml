class ElementUtil {
  node: Element;
  constructor(xmls: Element) {
    if (!xmls) {
      throw new Error('xmls error: gpx data is not defined.');
    }

    this.node = xmls;
  }

  /**
   * get node elements
   * @returns {Function} return element data using key
   */
  getElements() {
    /**
     * @params key search key
     * @returns {Element} element after search
     */
    return (key: string): Element => this.node.getElementsByTagName(key)[0];
  }

  getAttribute() {
    return (key: string): string | null => this.node.getAttribute(key);
  }

  /**
   * Get text in tag
   * @params tag tag element
   * @returns tag string
   */
  getTextTag(tag: Element): string | null {
    try {
      const tagStr = tag.textContent;
      tagStr?.replace(/(^\s*)|(\s*$)/gi, '');

      return tagStr;
    } catch (e) {
      return null;
    }
  }
}

export default ElementUtil;
