import ElementUtil from './ElementUtil';

class Gpx {
  private hasDOMParser: boolean;
  constructor() {
    this.hasDOMParser = !!window.DOMParser;
  }

  /**
   * Make window DOM parser
   * @returns window.DOMParser
   */
  makeDOMParser(): InstanceType<typeof window.DOMParser> {
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
  getHttpRequest(): InstanceType<typeof window.XMLHttpRequest> {
    return new window.XMLHttpRequest();
  }

  /**
   * Parsing gpx element data
   * @param data element string
   * @returns any
   */
  parseGpx(data: string) {
    try {
      const element = this.getGpxEls(data);
      /**
       * @todo gpx elements return
       */
      console.log('element');
    } catch (e) {
      return e;
    }
  }

  /**
   * Get gpx elements
   * @param data response gpx data string
   * @returns Element
   */
  getGpxEls(data: string): Element {
    const tmp = new window.DOMParser();
    const xml = tmp.parseFromString(data, 'text/xml');

    return xml.getElementsByTagName('gpx')[0];
  }
}

export default Gpx;
