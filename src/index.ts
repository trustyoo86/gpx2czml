import { DOMParser as XmlDOMParser } from '@xmldom/xmldom';

export interface ClockPacket {
  name: string | null;
  version: string | null;
  clock: {
    interval: string | null;
    currentTime: string | null;
    multiplier: number;
    range: string;
  };
}

export interface PositionPacket {
  availability?: string;
  position: {
    epoch?: string;
    cartographicDegrees: number[];
  };
}

export type CzmlData = [ClockPacket, PositionPacket];

export type ParseResult =
  | { isError: false; data: CzmlData }
  | { isError: true; errorType: string; data: string };

export type FileCallback = (isError: boolean, data: ParseResult) => void;

// ponytail: browser uses native DOMParser; Node falls back to @xmldom/xmldom (external, not bundled).
function getParser(): DOMParser {
  const Native = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  const P = Native ?? (XmlDOMParser as unknown as typeof DOMParser);
  return new P();
}

function getGpxEls(data: string): Element {
  const xml = getParser().parseFromString(data, 'text/xml');
  return xml.getElementsByTagName('gpx')[0];
}

function getTextTag(tag: Element | undefined | null): string | null {
  if (!tag) return null;
  return (tag.textContent ?? '').trim();
}

function getAttr(node: Element) {
  return (key: string): string | null => node.getAttribute(key);
}

function getEls(node: Element) {
  return (key: string): Element | undefined => node.getElementsByTagName(key)[0];
}

function makeTrkPointArrs(trkAttr: ReturnType<typeof getAttr>, trkEls: ReturnType<typeof getEls>) {
  return {
    lat: parseFloat(trkAttr('lat') ?? ''),
    lon: parseFloat(trkAttr('lon') ?? ''),
    ele: getTextTag(trkEls('ele')),
    time: getTextTag(trkEls('time')),
  };
}

function bindCzmlData(gpxNode: Element): ParseResult {
  try {
    const gpxAttr = getAttr(gpxNode);
    const trk = getEls(gpxNode)('trk')!;
    const trkSeg = getEls(trk)('trkseg')!;
    const trkPts = trkSeg.getElementsByTagName('trkpt');

    let startTime: string | null = null;
    let startSeconds = 0;
    let lastEle = 0; // ponytail: missing ele -> reuse last valid elevation (0 until first seen)
    let endTime: string | null = null;

    const czml: CzmlData = [
      {
        name: gpxAttr('creator'),
        version: gpxAttr('version'),
        clock: { interval: null, currentTime: null, multiplier: 1, range: 'CLAMPED' },
      },
      { position: { cartographicDegrees: [] } },
    ];

    for (let idx = 0; idx < trkPts.length; idx++) {
      const el = trkPts[idx];
      const { lat, lon, ele, time } = makeTrkPointArrs(getAttr(el), getEls(el));
      const seconds = new Date(time ?? '').getTime();

      if (idx === 0) {
        startTime = time;
        startSeconds = seconds;
      }

      const diffSeconds = idx === 0 ? 0 : (seconds - startSeconds) / 1000;
      const elevation = ele ? parseFloat(ele) : lastEle;
      if (ele) lastEle = elevation;

      czml[1].position.cartographicDegrees.push(diffSeconds, lon, lat, elevation);
      endTime = time;
    }

    if (startTime && endTime) {
      czml[0].clock.interval = `${startTime}/${endTime}`;
      czml[0].clock.currentTime = startTime;
      czml[1].availability = `${startTime}/${endTime}`;
      czml[1].position.epoch = startTime;
    }

    return { isError: false, data: czml };
  } catch (e) {
    return { isError: true, errorType: 'bindCzmlData', data: String(e) };
  }
}

/**
 * GPX 문자열을 CZML 데이터로 변환.
 */
export function parseGpx(data: string): ParseResult {
  try {
    return bindCzmlData(getGpxEls(data));
  } catch (e) {
    return { isError: true, errorType: 'parseGpx', data: String(e) };
  }
}

/**
 * <input type="file"> change 이벤트에서 GPX 파일을 읽어 CZML로 변환 (브라우저 전용).
 */
export function asyncFromFile(ev: { target: { files: FileList } }, callback: FileCallback): void {
  const files = ev?.target?.files;
  if (!files || files.length === 0) {
    callback?.(true, { isError: true, errorType: 'asyncFromFile', data: 'file is not defined' });
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = parseGpx(String(e.target?.result ?? ''));
    callback?.(result.isError, result);
  };
  reader.onerror = () =>
    callback?.(true, { isError: true, errorType: 'asyncFromFile', data: 'file read error' });
  reader.readAsText(files[0], 'UTF-8');
}
