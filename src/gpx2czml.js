'use strict';

const _ = require('lodash');

// if (FileReader && !FileReader.prototype.readAsBinaryString) {
//   FileReader.prototype.readAsBinaryString = function (fileData) {
//     let binary = '';
//     const pt = this;
//     const reader = new FileReader();
//     reader.onload = function (e) {
//       const bytes = new Uint8Array(reader.result);
//       const length = bytes.byteLength;
//       for (let i = 0; i < length; i++) {
//         binary += String.fromCharCode(bytes[i]);
//       }
//         //pt.result  - readonly so assign binary
//       pt.content = binary;
//       // $(pt).trigger('onload');
//     }
//     reader.readAsArrayBuffer(fileData);
//   };
// }

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

function async(url, callback) {
  try {
    if (!url) {
      throw new Error('url is not defined.');
    }
    
    if (typeof url !== 'string') {
      throw new Error('url type is not string.');
    }

    const httpRequest = _.curryRight(getHttpRequest)(isActiveXObject)(isXMLHttpRequest);
    
    httpRequest.onreadstatechange = getGpxData;
    httpRequest.open('GET', url);
    httpRequest.send();

    const getGpxData = () => {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          typeof callback === 'function' && callback(false, httpRequest.responseText);
        } else {
          typeof callback === 'function' && callback(true, 'async gpx data error');
        }
      }
    };
  } catch (e) {
    return e;
  }
}

function parseGpx(data) {
  let tmp, xml;

  try {
    if (hasDOMParser()) {
      tmp = new window.DOMParser();
      xml = tmp.parseFromString(data, 'text/xml');
    } else {
      xml = new window.ActiveXObject('Microsoft.XMLDOM');
      xml.async = 'false';
      xml.loadXML(data);
    }

    return xml.getElementsByTagName('gpx')[0];
  } catch (e) {
    return `parse GPX data error: ${e}`;
  }
}

function getEls(node) {
  const gpxNode = node;

  return (key) => {
    return gpxNode.getElementsByTagName(key)[0];
  };
}

function getAttr(node) {
  const gpxNode = node;
  return (key) => {
    return gpxNode.getAttribute(key);
  };
}

function getTextTag(tag) {
  try {
    const tagStr = tag.textContent;
    tagStr.replace(/(^\s*)|(\s*$)/gi, '');

    return tagStr;
  } catch (e) {
    return null;
  }
}

function bindCzmlData(gpxNode) {
  let sumEle = 0;
  
  try {
    const elsFunc = getEls(gpxNode);
    const metaData = elsFunc('metadata');
    const trkContent = elsFunc('trk');
    const trkFunc = getEls(trkContent);
    const trkSeg = trkFunc('trkseg');
    const elsPts = trkSeg.childNodes;
    const trkPts = trkFunc('trkpt');

    const czmlData = [
      {
        name: elsFunc('creator'),
        version: elsFunc('version'),
      }, {
        position: {
          cartographicDegrees: [],
        },
      },
    ];

    
  } catch(e) {

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
  parseGpx,
  hasDOMParser,
  makeDOMParser,
  isXMLHttpRequest,
  isActiveXObject,
  getHttpRequest,
  async,
  parseGpx,
  getAttr,
  getEls,
  getTextTag,
};
