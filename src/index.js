import Gpx from './Gpx';
if (FileReader && !FileReader.prototype.readAsBinaryString) {
    FileReader.prototype.readAsBinaryString = function (fileData) {
        let binary = '';
        const pt = this;
        const reader = new FileReader();
        reader.onload = function () {
            const bytes = new Uint8Array(reader.result);
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
function asyncFromApi(url, callback) {
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
            }
            else {
                isFunc &&
                    callback(true, '[gpx2czml > asnycApi] error: httpRequest response is error');
            }
        };
        httpRequest.onreadystatechange = getGpxData;
        httpRequest.open('GET', url);
        httpRequest.send();
    }
    catch (e) {
        return e;
    }
}
/**
 * get data from file
 * @param files Event
 * @param callback callback data
 */
async function asyncFromFile(files, callback) {
    const result = await processingFiles(files);
    if (!result.isError) {
        const gpx = new Gpx();
        const czmlData = gpx.parseGpx(result.data);
        typeof callback === 'function' && callback(false, czmlData);
    }
    else {
        typeof callback === 'function' && callback(result.isError, result.data);
    }
}
/**
 * process in files
 * @param ev Event
 * @returns result data
 */
function processingFiles(ev) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        try {
            const files = ev.target.files;
            reader.onload = function (event) {
                resolve({
                    isError: false,
                    data: event.target?.result,
                });
            };
            if (files && files.length > 0) {
                reader.readAsText(files[0], 'UTF-8');
            }
            else {
                throw new Error('File is not defined.');
            }
        }
        catch (error) {
            reject({
                isError: true,
                data: error.toString(),
            });
        }
    });
}
export { asyncFromApi, asyncFromFile };
