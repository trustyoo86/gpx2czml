gpx2czml
====

javascript gpx to czml data convert module

개요(Summary)
----

이 모듈은 gpx 데이터를 czml 데이터로 변환해주는 javascript 모듈입니다.<br/>
This module is a javascript module that converts gpx data to czml data.

czml로 변환한 데이터는 Cesium.js에 활용될 수 있습니다.<br/>
The data converted to czml can be used for Cesium.js.

설치(Setup)
----
gpx2czml.js는 두가지 방법으로 설치 가능합니다.<br/>
gpx2czml.js can be installed in two ways.

gpx2czml.js는 일반 javascript 버전인 gpx2czml.js 및 angular js를 이용한 ng-gpx2czml.js 를 사용하실 수 있습니다.<br/>
gpx2czml.js can use the general javascript versions gpx2czml.js and ng-gpx2czml.js using angular js.

각 버전은 dist폴더 내의 pure 및 angular 폴더에 위치하고 있습니다.<br/>
Each version is located in the pure and angular folders in the dist folder.

Browser Support
----

- IE : 10+
- Chrome, Firefox, Safari


#### HTML
```html
//pure javascript
<script src="path/to/gpx2czml.js"></script>
//pure javascript - minified
<script src="path/to/gpx2czml.min.js"></script>

//angular version
<script src="path/to/ng-gpx2czml.js"></script>
//angular version - minified
<script src="path/to/ng-gpx2czml.min.js"></script>
```

#### npm or common js

```bash
$npm install gpx2czml
```

javascript install

```js
//pure javascript
var gpx2czml = require('dist/pure/gpx2czml');

//angular
require('dist/angular/ng-gpx2czml');

angular.module('myApp', [
  'ngGpx2czml'
]);
```

사용법(Usage)
----

#### gpx2czml.js

gpx2czml.js를 사용하여 gpx를 czml로 컨버팅 하기 위해서는 두가지 방법으로 사용하실 수 있습니다.<br/>
There are two ways to convert gpx to czml using gpx2czml.js.

### 1) async

http request를 통해서 gpx를 czml로 변환하실 수 있습니다. 변환하는 방법은 url 및 callback function을 통해서 가능합니다.<br/>
You can do this through the url and callback functions.

```js
gpx2czml.async('your http request path', function (isError, result) {
  if (isError) {

  } else {
    //czml object data result
    console.log('result is : ', result);
  }
});
```

async function에서 사용되는 파라미터는 다음과 같습니다.<br/>
The parameters used in the async function are as follows

- url : 호출하고자 하는 http url<br/>
The http url you want to call

callback function에서 반환되는 파라미터는 다음과 같습니다.<br/>
The parameters returned by the callback function are:

- isError : 에러 여부, 처리 과정 중에 에러가 발생하면 true로 반환됩니다.<br/>
If an error occurs during processing, it is returned as true.

- result : 에러가 나지 않는다면, czml JSON object를 반환합니다.<br/>
If there are no errors, the czml JSON object is returned.

### 2) asyncFromFile

input file 태그를 사용하여 gpx 파일을 업로드 하여 사용하실 수 있습니다. 사용 방법은 다음과 같습니다.

###### HTML
```html
<input type="file" onchange="handleEvent(event)"/>
```

###### javascript

```js
function handleEvent(e) {
  gpx2czml.asyncFromFile(e, function (isError, czml) {
    if (isError) {

    } else {
      //czml object data result
      console.log('result is : ', result);
    }
  });
}
```

사용되는 파라미터는 async function과 동일합니다.<br/>
The parameters used are the same as the async function.

#### 3) Angular.js

angular js를 사용하시면, service 형태로 gpx2czml을 사용하실 수 있습니다.<br/>
If you use angular js, you can use gpx2czml as service type.

```js
angular.module('myApp', [
  'ngGpx2czml'
])
  .controller('myController', function (gpx2czml) {
    gpx2czml.async('your http request path', function (isError, result) {
      if (isError) {

      } else {
        //czml object data result
        console.log('result is : ', result);
      }
    });

    gpx2czml.asyncFromFile(e, function (isError, czml) {
      if (isError) {

      } else {
        //czml object data result
        console.log('result is : ', result);
      }
    });
  });
```

나머지는 gpx2czml과 동일하게 사용 가능합니다.<br/>
The rest is available as gpx2czml.
