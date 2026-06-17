# gpx2czml

GPX 트랙 데이터를 Cesium.js용 CZML 데이터로 변환하는 모듈의 도메인 용어집.

## Language

**GPX**:
GPS 경로를 기록하는 XML 포맷. 변환의 입력. 단일 `gpx` 루트 엘리먼트를 가진다.
_Avoid_: GPS file, route XML

**CZML**:
Cesium.js가 시공간 데이터를 표현하는 JSON 포맷. 변환의 출력.
_Avoid_: cesium json

**Track Point**:
GPX 내 한 측정 지점. `lat`, `lon`, `ele`(고도), `time`을 가진다. GPX 태그명은 `trkpt`.
_Avoid_: waypoint, node, position(좌표 자체를 가리킬 때만 허용)

**Track Segment**:
연속된 Track Point들의 묶음. GPX 태그명은 `trkseg`. 변환은 단일 segment를 가정한다.
_Avoid_: path, line

**Elevation**:
Track Point의 고도값(`ele`). 일부 지점에 없을 수 있으며, 없으면 직전 유효 고도로 대체한다.
_Avoid_: altitude, height

**Cartographic Degrees**:
CZML position이 좌표를 나열하는 형식. `[시간오프셋, lon, lat, ele]` 4요소 반복.
_Avoid_: coordinates array
