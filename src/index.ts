import Gpx from './Gpx';

if (FileReader && !FileReader.prototype.readAsBinaryString) {
  FileReader.prototype.readAsBinaryString = function (fileData) {
    let binary = '';
    const pt = this;

    const reader = new FileReader();
    reader.onload = function () {
      const bytes = new Uint8Array(reader.result as ArrayBufferLike);
      const length = bytes.byteLength;

      for (let i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      // @ts-ignore
      pt['content'] = binary;
    };
    reader.readAsArrayBuffer(fileData);
  };
}

function asyncFromApi(url: string, callback: Function) {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('[gpx2czml > asyncApi] error: url is not valid');
    }

    const gpx = new Gpx();
    const httpRequest = gpx.getHttpRequest();
    const isFunc = typeof callback === 'function';

    const getGpxData = () => {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          isFunc && callback(false, gpx.parseGpx(httpRequest.responseText));
        }
      } else {
        isFunc &&
          callback(
            true,
            '[gpx2czml > asnycApi] error: httpRequest response is error',
          );
      }
    };

    httpRequest.onreadystatechange = getGpxData;
    httpRequest.open('GET', url);
    httpRequest.send();
  } catch (e) {
    return e;
  }
}

export { asyncFromApi };
