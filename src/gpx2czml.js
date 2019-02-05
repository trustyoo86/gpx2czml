'use strict';

const _ = require('lodash');

if (FileReader && !FileReader.prototype.readAsBinaryString) {
  FileReader.prototype.readAsBinaryString = function (fileData) {
    let binary = '';
    const pt = this;
    const reader = new FileReader();
    reader.onload = function (e) {
      const bytes = new Uint8Array(reader.result);
      const length = bytes.byteLength;
      for (let i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
        //pt.result  - readonly so assign binary
      pt.content = binary;
    }
    reader.readAsArrayBuffer(fileData);
  };
}


function hasDOMParser() {
  return !!window.DOMParser;
}

function makeDOMParser() {
  let tmp;
  if (hasDOMParser()) {
    tmp = new window.DOMParser();
  }

  return tmp;
}

function isXMLHttpRequest() {
  return !!window.XMLHttpRequest;
}

function isActiveXObject() {
  return !!window.isActiveXObject;
}

function getHttpRequest(isXmlHttpRequest, isActiveXObject) {
  let httpRequest;

  if (isXmlHttpRequest) {
    httpRequest = new window.XMLHttpRequest();
  } else if (isActiveXObject) {
    httpRequest = new window.ActiveXObject();
  }

  return httpRequest;
}

/**
 * data process from file
 * 
 * @param {Object} file file object
 * @param {Function} callback function after file processing
 */
async function asyncFromFile(files, callback) {
  const result = await processingFiles(files);

  if (!result.isError) {
    const czmlData = parseGpx(result.data);
    typeof callback === 'function' && callback(false, czmlData);
  } else {
    typeof callback === 'function' && callback(result.isError, result.data);
  }
}

/**
 * process file reader
 * 
 * @param {Object} ev event object
 * @param {Function} callback callback function after file event
 */
function processingFiles(ev, callback) {
  const reader = new FileReader();
  let browser = 'chrome';

  return new Promise((resolve, reject) => {
    try {
      const files = ev.target.files;
  
      reader.onload = function (e) {
        let data;
  
        if (!e) {
          data = reader.content;
          browser = 'ie';
        } else {
          data = e.target.result;
        }
  
        resolve({
          isError: false,
          data,
        });
      }
  
      if (files.length > 0) {
        reader.readAsText(files[0], 'UTF-8');
      } else {
        throw new Error('file is not defined');
      }
    } catch(e) {
      reject({
        isError: true,
        data: e.toString(),
      });
    }
  });
}

/**
 * asnyc gpx data
 * 
 * @param {string} url url string
 * @param {Function} callback callback function after parse gpx data
 */
function asyncFromAjax(url, callback) {
  try {
    if (!url) {
      throw new Error('url is not defined.');
    }
    
    if (typeof url !== 'string') {
      throw new Error('url type is not string.');
    }

    const httpRequest = _.curryRight(getHttpRequest)(isActiveXObject)(isXMLHttpRequest);

    const getGpxData = () => {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          typeof callback === 'function' && callback(false, parseGpx(httpRequest.responseText));
        } else {
          typeof callback === 'function' && callback(true, 'async gpx data error');
        }
      }
    };

    httpRequest.onreadstatechange = getGpxData;
    httpRequest.open('GET', url);
    httpRequest.send();
  } catch (e) {
    return e;
    typeof callback === 'function' && callback(true, e.toString());
  }
}

/**
 * parse gpx data
 * 
 * @param {Object} data gpx data
 * @return {*} parsed data
 */
function parseGpx(data) {
  try {
    const czmlData = getGpxEls(data);

    return bindCzmlData(czmlData);
  } catch (e) {
    return {
      isError: true,
      errorType: 'parseGpx',
      data: e.toString(),
    };
  }
}

/**
 * get gpx elements
 * 
 * @param {Object} data data object
 * @return {Element} gpx element
 */
function getGpxEls(data) {
  let tmp, xml;

  if (hasDOMParser()) {
    tmp = new window.DOMParser();
    xml = tmp.parseFromString(data, 'text/xml');
  } else {
    xml = new window.ActiveXObject('Microsoft.XMLDOM');
    xml.async = 'false';
    xml.loadXML(data);
  }

  return xml.getElementsByTagName('gpx')[0];
}

/**
 * get elements
 * 
 * @param {Element} node target element
 * @return {Function} return element data using key
 */
function getEls(node) {
  const gpxNode = node;

  /**
   * return gpx node
   * 
   * @param {string} key search key
   * @return {Element} target node element
   */
  return (key) => {
    return gpxNode.getElementsByTagName(key)[0];
  };
}

/**
 * get attributes
 * 
 * @param {Element} node target element
 * @return {Function} return element attribute function
 */
function getAttr(node) {
  const gpxNode = node;

  /**
   * return node's attribute
   * 
   * @param {string} key search element attribute key
   * @return {string} search element's attribute
   */
  return (key) => {
    return gpxNode.getAttribute(key);
  };
}

/**
 * get text in tag
 * 
 * @param {Element} tag element
 * @return {string} text in tag
 */
function getTextTag(tag) {
  try {
    const tagStr = tag.textContent;
    tagStr.replace(/(^\s*)|(\s*$)/gi, '');

    return tagStr;
  } catch (e) {
    return null;
  }
}

/**
 * bind czml converted data
 * 
 * @param {Element} gpxNode gpx node element
 * @return {Object} gpx node data
 */
function bindCzmlData(gpxNode) {
  let sumEle = 0;
  
  try {
    const elsFunc = getEls(gpxNode);
    const gpxAttrFunc = getAttr(gpxNode);
    const metaData = elsFunc('metadata');
    const trkContent = elsFunc('trk');
    const trkFunc = getEls(trkContent);
    const trkSeg = trkFunc('trkseg');
    const elsPts = trkSeg.childNodes;
    const trkPts = trkSeg.getElementsByTagName('trkpt');

    let startTime, startSeconds, currentEle;

    const czmlData = [
      {
        name: gpxAttrFunc('creator'),
        version: gpxAttrFunc('version'),
        clock: {
          interval: null,
          currentTime: startTime,
          multiplier: 1,
          range: 'CLAMPED',
        },
      }, {
        position: {
          cartographicDegrees: [],
        },
      },
    ];

    for (let idx = 0; idx < trkPts.length; idx++) {
      const element = trkPts[idx];
      const targetAttrFunc = getAttr(element);
      const targetElsFunc = getEls(element);
      const pointAttrs = makeTrkPointArrs(targetAttrFunc, targetElsFunc);
      const { time, ele, lat, lon } = pointAttrs;
      const targetSeconds = new Date(time).getTime();
      const diffSeconds = (idx === 0? 0 : ((targetSeconds - startSeconds) / 1000));

      if (idx === 0) {
        startTime = time;
        startSeconds = targetSeconds;
      }

      if (ele) {
        currentEle = pointAttrs
      } else {
        const nextPts = trkPts[idx + 1];
        const nextEle = nextPts ? getTextTag(nextPts.getElementsByTagName('ele')[0]) : null;

        for (let eidx = 0; eidx < trkPts.length; eidx++) {
          const targetEle = getTextTag(eleInfo.getElementsByTagName('ele')[0]);

          if (targetEle) {
            currentEle = parseFloat(targetEle);
            break;
          }
        }
      }

      const concatData = _.concat(czmlData[1].position.cartographicDegrees, [diffSeconds, lon, lat, (ele ? parseFloat(ele) : (nextEle? (currentEle + parseFloat(nextEle)) / 2 : currentEle))]);
      czmlData[1].position.cartographicDegrees = concatData;

      if (idx === (trkPts.length - 1)) {
        czmlData[0].clock.interval = `${startTime}/${time}`;
        czmlData[0].clock.currentTime = startTime;
        czmlData[1].availabbility = `${startTime}/${time}`;
        czmlData[1].position.epoch = startTime;
      }
    }

    return {
      isError: false,
      data: czmlData,
    };
  } catch(e) {
    return {
      isError: true,
      errorType: 'bindCzmlData',
      data: e.toString(),
    };
  }
}

function makeTrkPointArrs(trkAttr, trkEls) {
  return {
    lat: parseFloat(trkAttr('lat')),
    lon: parseFloat(trkAttr('lon')),
    ele: getTextTag(trkEls('ele')),
    time: getTextTag(trkEls('time')),
  };
}

module.exports = {
  asyncFromFile,
  parseGpx,
  hasDOMParser,
  makeDOMParser,
  isXMLHttpRequest,
  isActiveXObject,
  getHttpRequest,
  asyncFromAjax,
  parseGpx,
  getAttr,
  getEls,
  getGpxEls,
  getTextTag,
};
