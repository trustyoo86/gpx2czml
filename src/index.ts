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

/**
 * get data from file
 * @param files Event
 * @param callback callback data
 */
async function asyncFromFile(files: Event, callback: Function) {
  const result = await processingFiles(files);

  if (!result.isError) {
    const gpx = new Gpx();
    const czmlData = gpx.parseGpx(result.data as string);
    typeof callback === 'function' && callback(false, czmlData);
  } else {
    typeof callback === 'function' && callback(result.isError, result.data);
  }
}

/**
 * process in files
 * @param ev Event
 * @returns result data
 */
function processingFiles(
  ev: Event,
): Promise<{ isError: boolean; data: string }> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    try {
      const files = (ev.target as HTMLInputElement).files;

      reader.onload = function (event) {
        resolve({
          isError: false,
          data: event.target?.result as string,
        });
      };

      if (files && files.length > 0) {
        reader.readAsText(files[0], 'UTF-8');
      } else {
        throw new Error('File is not defined.');
      }
    } catch (error: any) {
      reject({
        isError: true,
        data: error.toString(),
      });
    }
  });
}

export { asyncFromApi, asyncFromFile };
