import { test, expect, type Page } from '@playwright/test';

async function czmlOutput(page: Page) {
  const out = page.locator('#json');
  await expect(out).not.toHaveValue('', { timeout: 15_000 });
  return JSON.parse(await out.inputValue());
}

test.beforeEach(async ({ page }) => {
  await page.goto('/example/index.html');
});

test('load sample button converts fetched gpx to czml', async ({ page }) => {
  await page.click('#loadSample');
  const data = await czmlOutput(page);

  expect(data[0].name).toBe('StravaGPX');
  expect(data[0].version).toBe('1.1');
  expect(data[1].position.cartographicDegrees).toHaveLength(5043 * 4);
  expect(data[1].position.cartographicDegrees.slice(0, 4)).toEqual([
    0, 128.262641, 37.870556, 406.9,
  ]);
  expect(data[1].availability).toBe(data[0].clock.interval);
});

test('file input converts an uploaded gpx file', async ({ page }) => {
  await page.setInputFiles('#filereader', 'resources/584286796.gpx');
  const data = await czmlOutput(page);

  expect(data[0].name).toBe('StravaGPX');
  expect(data[1].position.cartographicDegrees).toHaveLength(5043 * 4);
  expect(data[1].position.epoch).toBe(data[0].clock.currentTime);
});

test('malformed upload reports an error result', async ({ page }) => {
  await page.setInputFiles('#filereader', {
    name: 'bad.gpx',
    mimeType: 'text/plain',
    buffer: Buffer.from('not xml at all'),
  });
  const data = await czmlOutput(page);

  expect(data.isError).toBe(true);
  expect(data.errorType).toBe('bindCzmlData');
});
