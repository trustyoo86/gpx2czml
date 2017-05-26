'use strict';

(function () {
  if (!FileReader.prototype.readAsBinaryString) {
    FileReader.prototype.readAsBinaryString = function (fileData) {
      var binary = "";
      var pt = this;
      var reader = new FileReader();
      reader.onload = function (e) {
        var bytes = new Uint8Array(reader.result);
        var length = bytes.byteLength;
        for (var i = 0; i < length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
          //pt.result  - readonly so assign binary
        pt.content = binary;
        $(pt).trigger('onload');
      }
      reader.readAsArrayBuffer(fileData);
    };
  }

  var gpx2czml = {
    async : function (url, cbFunc) {
      var httpRequest;
      var self = this;

      if (window.XMLHttpRequest) {
        httpRequest = new XMLHttpRequest();
      } else if (window.ActiveXObject) {
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
      }

      httpRequest.onreadystatechange = getGpxData;
      httpRequest.open('GET', url);
      httpRequest.send();

      function getGpxData() {
        if (httpRequest.readyState === 4) {
          if (httpRequest.status === 200) {
            self.parseGpx(httpRequest.responseText, function (isError, res) {
                typeof cbFunc == "function" && cbFunc(isError, res);
            });
          } else {
            typeof cbFunc == "function" && cbFunc(true, 'http request error');
          }
        }
      }
    },
    /**
     * gpx file upload 프로세싱 처리(async)
     * @param  {Object} files file Object
     */
    asyncFromFile : function (files, cbFunc) {
      var self = this;

      this.processingFiles(files, function (isError, res) {

        if (isError) {
          typeof cbFunc == "function" && cbFunc(isError, res);
        } else {
          self.parseGpx(res, function (czmlError, czmlRes) {
            typeof cbFunc == "function" && cbFunc(czmlError, czmlRes);
          });
        }
      });
    },

    /**
     * gpx file object 프로세싱 처리
     * @param  {Object} files file Object
     */
    processingFiles : function (e, cbFunc) {
      var self = this;
      var reader = new FileReader();
      var browser = 'chrome';

      try {
        var files = e.target.files;

        reader.onload = function (e) {
          var data;
          if (!e) {
            data = reader.content;
            browser = 'ie';
          } else {
            data = e.target.result;
          }

          typeof cbFunc == "function" && cbFunc(false, data);
        }


        if (files.length > 0) {
          reader.readAsText(files[0], 'UTF-8');
        } else {
          throw "file is not defined";
        }

        //file을 읽게 한다.
        //reader.readAsBinaryString(files[0]);
      } catch (e) {
        typeof cbFunc == "function" && cbFunc(true, e.toString());
      }

    },

    /**
     * parsing gpx data
     * @param  {String} data pgx string data
     * @param  {Function} cbFunc callback function
     * @return {Object} czmlData convert czml object data
     */
    parseGpx : function (data, cbFunc) {
      var tmp,xml;

      try {
        //if DOMParser is exist
        if (window.DOMParser) {
          tmp = new DOMParser();
          xml = tmp.parseFromString( data, "text/xml" );
        } else {  //IE version
          xml = new ActiveXObject("Microsoft.XMLDOM");
          xml.async = "false";
          xml.loadXML(data);
        }

        //get gpx node from xml data
        var gpxNode = xml.getElementsByTagName('gpx')[0];

        //bind czmldata
        this.bindCzmlData(gpxNode, function (isError, czmlData) {
          typeof cbFunc == "function" && cbFunc(isError, czmlData);
        });
      } catch (e) {
        typeof cbFunc == "function" && cbFunc(true, e.toString());
      }
    },

    /**
     * get text from tag
     * @param  {String} tag tag string
     * @return {String} tagStr tag string
     */
    getTextTag : function (tag) {
      try {
        var tagStr = tag.textContent;
        tagStr.replace(/(^\s*)|(\s*$)/gi, "");

        return tagStr;
      } catch (e) {
        return null;
      }
    },

    /**
     * czml data binding
     * @param  {Object} gpxNode gpx xml dom node
     * @return {Object} czmlData czml object data
     */
    bindCzmlData : function (gpxNode, cbFunc) {
      var self = this;
      var sumEle = 0;

      try {
        //xml parsing
        var metaData = gpxNode.getElementsByTagName('metadata')[0], //metadata
            trkContent = gpxNode.getElementsByTagName('trk')[0],  //tracking data
            trkSeg = trkContent.getElementsByTagName('trkseg')[0],  //trkseg
            elePts = trkSeg.childNodes,
            trkPts = trkSeg.getElementsByTagName('trkpt');  //tracking point arrays

        //get start time
        var startTime,
            startSeconds;

        //binding target
        var czmlData = [{
          name : gpxNode.getAttribute('creator'),
          version : gpxNode.getAttribute('version'),
          clock : {
            interval : null,
            currentTime : startTime,
            multiplier : 1,
            range : 'CLAMPED'
          }
        }, {
          position : {
            epoch : startTime,
            cartographicDegrees : []
          }
        }];

        var currentEle;

        //set cartographicDegrees info
        for(var idx=0; idx < trkPts.length; idx++) {
          var trkInfo = trkPts[idx],
              cnt = 0,
              lat = parseFloat(trkInfo.getAttribute('lat')),  //latitude
              lon = parseFloat(trkInfo.getAttribute('lon')),  //longitude
              ele = self.getTextTag(trkInfo.getElementsByTagName('ele')[0]),  //ele
              time = self.getTextTag(trkInfo.getElementsByTagName('time')[0]),  //interval time
              targetSeconds = new Date(time).getTime(), //interval time from startSeconds
              deffSeconds = (idx == 0? 0 : ((targetSeconds - startSeconds) / 1000));  //convert second

          if (idx === 0) {
            startTime = time;
            startSeconds = targetSeconds;
          }

          //if ele info is empty
          if (ele) {
            currentEle = parseFloat(ele);
          } else {
            var nextPts = trkPts[idx + 1],
                nextEle = nextPts ? self.getTextTag(nextPts.getElementsByTagName('ele')[0]) : null;

            for(var eidx=0; eidx < trkPts.length; eidx++) {
              var eleInfo = trkPts[eidx],
                  targetEle = self.getTextTag(eleInfo.getElementsByTagName('ele')[0]);

              if (targetEle) {
                currentEle = parseFloat(targetEle);
                break;
              }
            }
          }

          czmlData[1].position.cartographicDegrees.push(deffSeconds);
          czmlData[1].position.cartographicDegrees.push(lon);
          czmlData[1].position.cartographicDegrees.push(lat);
          czmlData[1].position.cartographicDegrees.push(ele? parseFloat(ele) : (nextEle? (currentEle + parseFloat(nextEle)) / 2 : currentEle));

          if (idx == (trkPts.length -1)) {
            czmlData[0].clock.interval = startTime + '/' + time;
            czmlData[0].clock.currentTime = startTime;
            czmlData[1].availability = startTime + '/' + time;
            czmlData[1].position.epoch = startTime;
          }
        }

        typeof cbFunc == "function" && cbFunc(false, czmlData);
      } catch (e) {
        typeof cbFunc == "function" && cbFunc(true, e.toString());
      }
    }
  };

  if (typeof exports !== 'undefined') {
    module.exports = gpx2czml;
  } else {
    window.gpx2czml = gpx2czml;
  }
})();
