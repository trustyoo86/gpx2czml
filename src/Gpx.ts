class Gpx {
  private hasDOMParser: boolean;
  private isHttpRequest: boolean;
  constructor() {
    this.hasDOMParser = !!window.DOMParser;
    this.isHttpRequest = !!window.XMLHttpRequest;
  }

  /**
   * Make window DOM parser
   * @returns window.DOMParser
   */
  makeDOMParser(): typeof window.DOMParser {
    let tmp;
    if (this.hasDOMParser) {
      tmp = new window.DOMParser();
    }

    return tmp;
  }

  /**
   * Get xml http request
   * @returns window.XMLHttpRequest
   */
  getHttpRequest() {
    return new window.XMLHttpRequest();
  }
}

export default Gpx;
