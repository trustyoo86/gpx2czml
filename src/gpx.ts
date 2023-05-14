class Gpx {
  node: XMLDocument;
  constructor(xmls: XMLDocument) {
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
    return (key: string) => this.node.getElementsByTagName(key)[0];
  }

  
}