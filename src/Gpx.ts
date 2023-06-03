import { getElements, getAttribute } from './ElementUtil';

class Gpx {
  private hasDOMParser: boolean;
  constructor() {
    this.hasDOMParser = !!window.DOMParser;
  }

  /**
   * Make window DOM parser
   * @returns window.DOMParser
   */
  makeDOMParser(): InstanceType<typeof window.DOMParser> | undefined {
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

  bindCzmlData(gpxNode: Element) {
    try {
      const elsFn = getElements(gpxNode);
      const trkContent = elsFn('trk');
      const trkFn = getElements(trkContent);
      const trkSeg = trkFn('trkseg');
      const trkPts = trkSeg.getElementsByTagName('trkpt');

      let startTime, startSeconds, currentEle;

      const czmlData = [
        {
          name: elsFn('creator'),
          version: elsFn('version'),
          clock: {
            interval: null,
            currentTime: startTime,
            multiplier: 1,
            range: 'CLAMPED',
          },
        },
        {
          position: {
            cartographicDegrees: [],
          },
        },
      ];

      for (let idx = 0, len = trkPts.length; idx < len; idx++) {
        const element = trkPts[idx];
        const targetAttrFunc = getAttribute(element);
        const targetElsFunc = getElements(element);
      }
    } catch (e: any) {
      return {
        isError: true,
        errorType: 'bindCzmlData',
        data: e.toString(),
      };
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
