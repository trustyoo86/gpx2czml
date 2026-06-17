# gpx2czml

GPX 데이터를 [Cesium.js](https://cesium.com/)용 CZML 데이터로 변환하는 모듈.<br/>
A module that converts GPX data to CZML data for Cesium.js.

## 설치 (Install)

```bash
npm install gpx2czml
# or
yarn add gpx2czml
```

Node 환경에서는 XML 파싱을 위해 `@xmldom/xmldom`가 함께 설치됩니다. 브라우저에서는 네이티브 `DOMParser`를 사용합니다.

## 사용 (Usage)

ESM / CommonJS / UMD 세 형식을 지원합니다.

### ESM

```js
import { parseGpx } from 'gpx2czml';

const result = parseGpx(gpxString);
if (!result.isError) {
  console.log(result.data); // czml packets
}
```

### CommonJS

```js
const { parseGpx } = require('gpx2czml');
```

### UMD (browser `<script>` / CDN)

```html
<script src="https://unpkg.com/gpx2czml"></script>
<script>
  const result = gpx2czml.parseGpx(gpxString);
</script>
```

## API

### `parseGpx(data: string): ParseResult`

GPX 문자열을 CZML로 변환합니다.

- `data` — GPX XML 문자열
- 반환: `{ isError: false, data: CzmlData }` 또는 `{ isError: true, errorType, data }`

### `asyncFromFile(event, callback)` — 브라우저 전용

`<input type="file">` change 이벤트에서 GPX 파일을 읽어 변환합니다.

```html
<input type="file" onchange="handleEvent(event)" />
```

```js
function handleEvent(e) {
  gpx2czml.asyncFromFile(e, (isError, result) => {
    if (!isError) console.log(result.data);
  });
}
```

## 개발 (Development)

```bash
yarn install
yarn build      # dist/ 에 ESM/CJS/UMD + 타입 생성
yarn test       # vitest
yarn typecheck  # tsc --noEmit
```

## 문의 (Contact)

email: trustyoo86@gmail.com
