import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseGpx, asyncFromFile } from '../src/index';

const gpx = readFileSync(resolve(__dirname, '../resources/584286793.gpx'), 'utf-8');

describe('parseGpx', () => {
  it('converts gpx to czml without error', () => {
    const result = parseGpx(gpx);
    expect(result.isError).toBe(false);
  });

  it('produces two czml packets with cartographicDegrees in [t, lon, lat, ele] groups', () => {
    const result = parseGpx(gpx);
    if (result.isError) throw new Error(result.data);

    const [clock, position] = result.data;
    expect(clock.version).toBe('1.1');
    expect(position.position.cartographicDegrees.length % 4).toBe(0);
    expect(position.position.cartographicDegrees.length).toBeGreaterThan(0);

    // first point: time offset 0, valid lon/lat
    const [t, lon, lat] = position.position.cartographicDegrees;
    expect(t).toBe(0);
    expect(lon).toBeCloseTo(128.26, 1);
    expect(lat).toBeCloseTo(37.87, 1);
  });

  it('sets clock interval and availability from first/last point', () => {
    const result = parseGpx(gpx);
    if (result.isError) throw new Error(result.data);
    expect(result.data[0].clock.interval).toMatch(/^.+\/.+$/);
    expect(result.data[1].availability).toBe(result.data[0].clock.interval);
  });

  it('returns isError for malformed input', () => {
    const result = parseGpx('not xml at all');
    expect(result.isError).toBe(true);
  });
});

// minimal gpx builder for behavior tests
function buildGpx(points: Array<{ lat: number; lon: number; ele?: number; time: string }>): string {
  const pts = points
    .map(
      (p) =>
        `<trkpt lat="${p.lat}" lon="${p.lon}">${p.ele !== undefined ? `<ele>${p.ele}</ele>` : ''}<time>${p.time}</time></trkpt>`,
    )
    .join('');
  return `<?xml version="1.0"?><gpx creator="test" version="1.1"><trk><trkseg>${pts}</trkseg></trk></gpx>`;
}

// returns the ele values from cartographicDegrees ([t, lon, lat, ele] groups)
function eles(result: ReturnType<typeof parseGpx>): number[] {
  if (result.isError) throw new Error(result.data);
  const arr = result.data[1].position.cartographicDegrees;
  return arr.filter((_, i) => i % 4 === 3);
}

describe('resource golden dataset', () => {
  const files = ['584286793.gpx', '584286796.gpx'];

  it.each(files)('converts %s to the expected czml dataset', (name) => {
    const src = readFileSync(resolve(__dirname, '../resources', name), 'utf-8');
    const result = parseGpx(src);
    if (result.isError) throw new Error(result.data);

    const [meta, position] = result.data;
    const coords = position.position.cartographicDegrees;

    // expected shape: 5043 points x [t, lon, lat, ele]
    expect(coords.length).toBe(5043 * 4);
    expect(meta.name).toBe('StravaGPX');
    expect(meta.version).toBe('1.1');

    // known first/last <trkpt> of the fixture: [t, lon, lat, ele]
    expect(coords.slice(0, 4)).toEqual([0, 128.262641, 37.870556, 406.9]);
    expect(coords.slice(-4)).toEqual([20164, 128.262522, 37.87059, 410.3]);

    // time offsets are monotonically non-decreasing
    const offsets = coords.filter((_, i) => i % 4 === 0);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1]);
    }

    // epoch/availability anchored to the first point's time
    const startTime = meta.clock.interval!.split('/')[0];
    expect(meta.clock.currentTime).toBe(startTime);
    expect(position.position.epoch).toBe(startTime);
    expect(position.availability).toBe(meta.clock.interval);

    // golden checksum locks the whole dataset without a 40k-line snapshot
    const sum = coords.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(54360362.4874, 3);
  });
});

describe('elevation fallback', () => {
  it('reuses the last valid elevation when a track point has no <ele>', () => {
    const result = parseGpx(
      buildGpx([
        { lat: 1, lon: 1, ele: 100, time: '2020-01-01T00:00:00Z' },
        { lat: 2, lon: 2, time: '2020-01-01T00:00:04Z' }, // no ele -> 100
        { lat: 3, lon: 3, ele: 200, time: '2020-01-01T00:00:08Z' },
      ]),
    );
    expect(eles(result)).toEqual([100, 100, 200]);
  });

  it('falls back to 0 when no elevation has been seen yet', () => {
    const result = parseGpx(
      buildGpx([
        { lat: 1, lon: 1, time: '2020-01-01T00:00:00Z' }, // no ele, none seen -> 0
        { lat: 2, lon: 2, ele: 50, time: '2020-01-01T00:00:04Z' },
      ]),
    );
    expect(eles(result)).toEqual([0, 50]);
  });
});

describe('asyncFromFile', () => {
  it('reports an error when no file is selected', () => {
    let isError: boolean | undefined;
    asyncFromFile({ target: { files: [] as unknown as FileList } }, (err) => {
      isError = err;
    });
    expect(isError).toBe(true);
  });

  it('reads a gpx file and returns czml', () =>
    new Promise<void>((done) => {
      const content = buildGpx([
        { lat: 1, lon: 1, ele: 10, time: '2020-01-01T00:00:00Z' },
        { lat: 2, lon: 2, ele: 20, time: '2020-01-01T00:00:04Z' },
      ]);
      const file = new File([content], 'track.gpx', { type: 'application/gpx+xml' });
      asyncFromFile({ target: { files: [file] as unknown as FileList } }, (err, result) => {
        expect(err).toBe(false);
        expect(eles(result)).toEqual([10, 20]);
        done();
      });
    }));
});

describe('time offsets', () => {
  it('encodes seconds elapsed since the first point', () => {
    const result = parseGpx(
      buildGpx([
        { lat: 1, lon: 1, ele: 0, time: '2020-01-01T00:00:00Z' },
        { lat: 2, lon: 2, ele: 0, time: '2020-01-01T00:00:04Z' },
        { lat: 3, lon: 3, ele: 0, time: '2020-01-01T00:00:30Z' },
      ]),
    );
    if (result.isError) throw new Error(result.data);
    const arr = result.data[1].position.cartographicDegrees;
    const offsets = arr.filter((_, i) => i % 4 === 0);
    expect(offsets).toEqual([0, 4, 30]);
  });
});
