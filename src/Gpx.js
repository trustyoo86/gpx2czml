import { getElements, getAttribute, getTextTag } from './ElementUtil';
class Gpx {
    hasDOMParser;
    constructor() {
        this.hasDOMParser = !!window.DOMParser;
    }
    /**
     * Make window DOM parser
     * @returns window.DOMParser
     */
    makeDOMParser() {
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
    /**
     * Parsing gpx element data
     * @param data element string
     * @returns any
     */
    parseGpx(data) {
        try {
            const czmlData = this.getGpxEls(data);
            /**
             * @todo gpx elements return
             */
            return this.bindCzmlData(czmlData);
        }
        catch (e) {
            return {
                isError: true,
                errorType: 'parseGpx',
                data: e.toString(),
            };
        }
    }
    bindCzmlData(gpxNode) {
        try {
            const elsFn = getElements(gpxNode);
            const trkContent = elsFn('trk');
            const trkFn = getElements(trkContent);
            const trkSeg = trkFn('trkseg');
            const trkPts = trkSeg.getElementsByTagName('trkpt');
            let startTime, startSeconds = 0, currentEle;
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
                const pointAttrs = this.makeTrkPointAttrs(targetAttrFunc, targetElsFunc);
                let nextEle;
                const { time, ele, lat, lon } = pointAttrs;
                const targetSeconds = new Date(time).getTime();
                const diffSeconds = idx === 0 ? 0 : (targetSeconds - startSeconds) / 1000;
                if (idx === 0) {
                    startTime = time;
                    startSeconds = targetSeconds;
                }
                if (ele) {
                    currentEle = pointAttrs;
                }
                else {
                    const nextPts = trkPts[idx + 1];
                    nextEle = nextPts
                        ? getTextTag(nextPts.getElementsByTagName('ele')[0])
                        : null;
                    for (let eidx = 0, len = trkPts.length; eidx < len; eidx++) {
                        const eleInfo = trkPts[eidx];
                        const targetEle = getTextTag(eleInfo.getElementsByTagName('ele')[0]);
                        if (targetEle) {
                            currentEle = parseFloat(targetEle);
                            break;
                        }
                    }
                }
                /* eslint-disable */
                const concatData = [
                    // @ts-ignore
                    ...czmlData[1].position?.cartographicDegrees,
                    [
                        diffSeconds,
                        lon,
                        lat,
                        ele
                            ? parseFloat(ele)
                            : nextEle
                                ? // @ts-ignore
                                    (currentEle + parseFloat(nextEle)) / 2
                                : currentEle,
                    ],
                ];
                /* eslint-enable */
                // @ts-ignore
                czmlData[1].position.cartographicDegrees = concatData;
                if (idx === trkPts.length - 1) {
                    // @ts-ignore
                    czmlData[0].clock.interval = `${startTime}/${time}`;
                    // @ts-ignore
                    czmlData[0].clock.currentTime = startTime;
                    // @ts-ignore
                    czmlData[1].availabbility = `${startTime}/${time}`;
                    // @ts-ignore
                    czmlData[1].position.epoch = startTime;
                }
            }
            return {
                isError: false,
                data: czmlData,
            };
        }
        catch (e) {
            return {
                isError: true,
                errorType: 'bindCzmlData',
                data: e.toString(),
            };
        }
    }
    /**
     * make point attributes
     * @param trkAttr tracking attribute function
     * @param trkEls tracking element function
     */
    makeTrkPointAttrs(trkAttr, trkEls) {
        return {
            lat: parseFloat(trkAttr('lat')),
            lon: parseFloat(trkAttr('lon')),
            ele: getTextTag(trkEls('ele')),
            time: getTextTag(trkEls('time')),
        };
    }
    /**
     * Get gpx elements
     * @param data response gpx data string
     * @returns Element
     */
    getGpxEls(data) {
        const tmp = new window.DOMParser();
        const xml = tmp.parseFromString(data, 'text/xml');
        return xml.getElementsByTagName('gpx')[0];
    }
}
export default Gpx;
