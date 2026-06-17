import { parseGpx, asyncFromFile } from '../dist/gpx2czml.js';

const out = document.getElementById('json');
const show = (result) => {
  out.value = JSON.stringify(result.isError ? result : result.data, null, 4);
};

document.getElementById('filereader').addEventListener('change', (e) => {
  asyncFromFile(e, (_isError, result) => {
    show(result);
    e.target.value = null;
  });
});

document.getElementById('loadSample').addEventListener('click', async () => {
  const gpx = await fetch('../resources/584286793.gpx').then((r) => r.text());
  show(parseGpx(gpx));
});
