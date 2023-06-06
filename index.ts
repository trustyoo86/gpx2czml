import { asyncFromApi } from './src/index';

function main() {
  asyncFromApi('./resources/584286793.gpx', (isError, data) => {
    console.log('result', isError, data);
  });
}

export default main();
