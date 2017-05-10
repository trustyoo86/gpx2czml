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
      //var tagStr = tag.innerHTML.replace(/<[^>]*>/g, "");
      var tagStr = tag.textContent;
      tagStr.replace(/(^\s*)|(\s*$)/gi, "");

      return tagStr;
    },

    /**
     * czml data binding
     * @param  {Object} gpxNode gpx xml dom node
     * @return {Object} czmlData czml object data
     */
    bindCzmlData : function (gpxNode, cbFunc) {
      var self = this;

      try {
        //xml parsing
        var metaData = gpxNode.getElementsByTagName('metadata')[0], //metadata
            timeData = metaData.getElementsByTagName('time')[0],  //time
            trkContent = gpxNode.getElementsByTagName('trk')[0],  //tracking data
            trkSeg = trkContent.getElementsByTagName('trkseg')[0],  //trkseg
            trkPts = trkSeg.getElementsByTagName('trkpt');  //tracking point arrays

        //get start time
        var startTime = this.getTextTag(timeData),
            startSeconds = new Date(startTime).getTime();

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
            cartographicDegrees : []
          }
        }];

        //set cartographicDegrees info
        for(var idx=0; idx < trkPts.length; idx++) {
          var trkInfo = trkPts[idx],
              lat = parseFloat(trkInfo.getAttribute('lat')),  //latitude
              lon = parseFloat(trkInfo.getAttribute('lon')),  //longitude
              ele = parseFloat(self.getTextTag(trkInfo.getElementsByTagName('ele')[0])),  //ele
              time = self.getTextTag(trkInfo.getElementsByTagName('time')[0]),  //interval time
              extensions = self.getTextTag(trkInfo.getElementsByTagName('extensions')[0]),  //extensions
              targetSeconds = new Date(time).getTime(), //interval time from startSeconds
              deffSeconds = (targetSeconds - startSeconds) / 1000;  //convert second

          czmlData[1].position.cartographicDegrees.push(deffSeconds);
          czmlData[1].position.cartographicDegrees.push(lat);
          czmlData[1].position.cartographicDegrees.push(lon);
          czmlData[1].position.cartographicDegrees.push(ele);

          if (idx == (trkPts.length -1)) {
            czmlData[0].clock.interval = startTime + '/' + time;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdweDJjem1sLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24gKCkge1xuICBpZiAoIUZpbGVSZWFkZXIucHJvdG90eXBlLnJlYWRBc0JpbmFyeVN0cmluZykge1xuICAgIEZpbGVSZWFkZXIucHJvdG90eXBlLnJlYWRBc0JpbmFyeVN0cmluZyA9IGZ1bmN0aW9uIChmaWxlRGF0YSkge1xuICAgICAgdmFyIGJpbmFyeSA9IFwiXCI7XG4gICAgICB2YXIgcHQgPSB0aGlzO1xuICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgIHZhciBsZW5ndGggPSBieXRlcy5ieXRlTGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgICAgLy9wdC5yZXN1bHQgIC0gcmVhZG9ubHkgc28gYXNzaWduIGJpbmFyeVxuICAgICAgICBwdC5jb250ZW50ID0gYmluYXJ5O1xuICAgICAgICAkKHB0KS50cmlnZ2VyKCdvbmxvYWQnKTtcbiAgICAgIH1cbiAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlRGF0YSk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBncHgyY3ptbCA9IHtcbiAgICBhc3luYyA6IGZ1bmN0aW9uICh1cmwsIGNiRnVuYykge1xuICAgICAgdmFyIGh0dHBSZXF1ZXN0O1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAod2luZG93LlhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB9IGVsc2UgaWYgKHdpbmRvdy5BY3RpdmVYT2JqZWN0KSB7XG4gICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgIH1cblxuICAgICAgaHR0cFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZ2V0R3B4RGF0YTtcbiAgICAgIGh0dHBSZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICBodHRwUmVxdWVzdC5zZW5kKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGdldEdweERhdGEoKSB7XG4gICAgICAgIGlmIChodHRwUmVxdWVzdC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKGh0dHBSZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICBzZWxmLnBhcnNlR3B4KGh0dHBSZXF1ZXN0LnJlc3BvbnNlVGV4dCwgZnVuY3Rpb24gKGlzRXJyb3IsIHJlcykge1xuICAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCAnaHR0cCByZXF1ZXN0IGVycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBncHggZmlsZSB1cGxvYWQg7ZSE66Gc7IS47IuxIOyymOumrChhc3luYylcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGVzIGZpbGUgT2JqZWN0XG4gICAgICovXG4gICAgYXN5bmNGcm9tRmlsZSA6IGZ1bmN0aW9uIChmaWxlcywgY2JGdW5jKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHRoaXMucHJvY2Vzc2luZ0ZpbGVzKGZpbGVzLCBmdW5jdGlvbiAoaXNFcnJvciwgcmVzKSB7XG5cbiAgICAgICAgaWYgKGlzRXJyb3IpIHtcbiAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgcmVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLnBhcnNlR3B4KHJlcywgZnVuY3Rpb24gKGN6bWxFcnJvciwgY3ptbFJlcykge1xuICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGN6bWxFcnJvciwgY3ptbFJlcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBncHggZmlsZSBvYmplY3Qg7ZSE66Gc7IS47IuxIOyymOumrFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZmlsZXMgZmlsZSBPYmplY3RcbiAgICAgKi9cbiAgICBwcm9jZXNzaW5nRmlsZXMgOiBmdW5jdGlvbiAoZSwgY2JGdW5jKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgIHZhciBicm93c2VyID0gJ2Nocm9tZSc7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBmaWxlcyA9IGUudGFyZ2V0LmZpbGVzO1xuXG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgIGlmICghZSkge1xuICAgICAgICAgICAgZGF0YSA9IHJlYWRlci5jb250ZW50O1xuICAgICAgICAgICAgYnJvd3NlciA9ICdpZSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGZhbHNlLCBkYXRhKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlc1swXSwgJ1VURi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgXCJmaWxlIGlzIG5vdCBkZWZpbmVkXCI7XG4gICAgICAgIH1cblxuICAgICAgICAvL2ZpbGXsnYQg7J296rKMIO2VnOuLpC5cbiAgICAgICAgLy9yZWFkZXIucmVhZEFzQmluYXJ5U3RyaW5nKGZpbGVzWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcGFyc2luZyBncHggZGF0YVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gZGF0YSBwZ3ggc3RyaW5nIGRhdGFcbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JGdW5jIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBjem1sRGF0YSBjb252ZXJ0IGN6bWwgb2JqZWN0IGRhdGFcbiAgICAgKi9cbiAgICBwYXJzZUdweCA6IGZ1bmN0aW9uIChkYXRhLCBjYkZ1bmMpIHtcbiAgICAgIHZhciB0bXAseG1sO1xuXG4gICAgICB0cnkge1xuICAgICAgICAvL2lmIERPTVBhcnNlciBpcyBleGlzdFxuICAgICAgICBpZiAod2luZG93LkRPTVBhcnNlcikge1xuICAgICAgICAgIHRtcCA9IG5ldyBET01QYXJzZXIoKTtcbiAgICAgICAgICB4bWwgPSB0bXAucGFyc2VGcm9tU3RyaW5nKCBkYXRhLCBcInRleHQveG1sXCIgKTtcbiAgICAgICAgfSBlbHNlIHsgIC8vSUUgdmVyc2lvblxuICAgICAgICAgIHhtbCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTERPTVwiKTtcbiAgICAgICAgICB4bWwuYXN5bmMgPSBcImZhbHNlXCI7XG4gICAgICAgICAgeG1sLmxvYWRYTUwoZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICAvL2dldCBncHggbm9kZSBmcm9tIHhtbCBkYXRhXG4gICAgICAgIHZhciBncHhOb2RlID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdncHgnKVswXTtcblxuICAgICAgICAvL2JpbmQgY3ptbGRhdGFcbiAgICAgICAgdGhpcy5iaW5kQ3ptbERhdGEoZ3B4Tm9kZSwgZnVuY3Rpb24gKGlzRXJyb3IsIGN6bWxEYXRhKSB7XG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGlzRXJyb3IsIGN6bWxEYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBnZXQgdGV4dCBmcm9tIHRhZ1xuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdGFnIHRhZyBzdHJpbmdcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHRhZ1N0ciB0YWcgc3RyaW5nXG4gICAgICovXG4gICAgZ2V0VGV4dFRhZyA6IGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIC8vdmFyIHRhZ1N0ciA9IHRhZy5pbm5lckhUTUwucmVwbGFjZSgvPFtePl0qPi9nLCBcIlwiKTtcbiAgICAgIHZhciB0YWdTdHIgPSB0YWcudGV4dENvbnRlbnQ7XG4gICAgICB0YWdTdHIucmVwbGFjZSgvKF5cXHMqKXwoXFxzKiQpL2dpLCBcIlwiKTtcblxuICAgICAgcmV0dXJuIHRhZ1N0cjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogY3ptbCBkYXRhIGJpbmRpbmdcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGdweE5vZGUgZ3B4IHhtbCBkb20gbm9kZVxuICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY3ptbCBvYmplY3QgZGF0YVxuICAgICAqL1xuICAgIGJpbmRDem1sRGF0YSA6IGZ1bmN0aW9uIChncHhOb2RlLCBjYkZ1bmMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgLy94bWwgcGFyc2luZ1xuICAgICAgICB2YXIgbWV0YURhdGEgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdtZXRhZGF0YScpWzBdLCAvL21ldGFkYXRhXG4gICAgICAgICAgICB0aW1lRGF0YSA9IG1ldGFEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aW1lJylbMF0sICAvL3RpbWVcbiAgICAgICAgICAgIHRya0NvbnRlbnQgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmsnKVswXSwgIC8vdHJhY2tpbmcgZGF0YVxuICAgICAgICAgICAgdHJrU2VnID0gdHJrQ29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrc2VnJylbMF0sICAvL3Rya3NlZ1xuICAgICAgICAgICAgdHJrUHRzID0gdHJrU2VnLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtwdCcpOyAgLy90cmFja2luZyBwb2ludCBhcnJheXNcblxuICAgICAgICAvL2dldCBzdGFydCB0aW1lXG4gICAgICAgIHZhciBzdGFydFRpbWUgPSB0aGlzLmdldFRleHRUYWcodGltZURhdGEpLFxuICAgICAgICAgICAgc3RhcnRTZWNvbmRzID0gbmV3IERhdGUoc3RhcnRUaW1lKS5nZXRUaW1lKCk7XG5cbiAgICAgICAgLy9iaW5kaW5nIHRhcmdldFxuICAgICAgICB2YXIgY3ptbERhdGEgPSBbe1xuICAgICAgICAgIG5hbWUgOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgnY3JlYXRvcicpLFxuICAgICAgICAgIHZlcnNpb24gOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgndmVyc2lvbicpLFxuICAgICAgICAgIGNsb2NrIDoge1xuICAgICAgICAgICAgaW50ZXJ2YWwgOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudFRpbWUgOiBzdGFydFRpbWUsXG4gICAgICAgICAgICBtdWx0aXBsaWVyIDogMSxcbiAgICAgICAgICAgIHJhbmdlIDogJ0NMQU1QRUQnXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgcG9zaXRpb24gOiB7XG4gICAgICAgICAgICBjYXJ0b2dyYXBoaWNEZWdyZWVzIDogW11cbiAgICAgICAgICB9XG4gICAgICAgIH1dO1xuXG4gICAgICAgIC8vc2V0IGNhcnRvZ3JhcGhpY0RlZ3JlZXMgaW5mb1xuICAgICAgICBmb3IodmFyIGlkeD0wOyBpZHggPCB0cmtQdHMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICAgIHZhciB0cmtJbmZvID0gdHJrUHRzW2lkeF0sXG4gICAgICAgICAgICAgIGxhdCA9IHBhcnNlRmxvYXQodHJrSW5mby5nZXRBdHRyaWJ1dGUoJ2xhdCcpKSwgIC8vbGF0aXR1ZGVcbiAgICAgICAgICAgICAgbG9uID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbG9uJykpLCAgLy9sb25naXR1ZGVcbiAgICAgICAgICAgICAgZWxlID0gcGFyc2VGbG9hdChzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pKSwgIC8vZWxlXG4gICAgICAgICAgICAgIHRpbWUgPSBzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGltZScpWzBdKSwgIC8vaW50ZXJ2YWwgdGltZVxuICAgICAgICAgICAgICBleHRlbnNpb25zID0gc2VsZi5nZXRUZXh0VGFnKHRya0luZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2V4dGVuc2lvbnMnKVswXSksICAvL2V4dGVuc2lvbnNcbiAgICAgICAgICAgICAgdGFyZ2V0U2Vjb25kcyA9IG5ldyBEYXRlKHRpbWUpLmdldFRpbWUoKSwgLy9pbnRlcnZhbCB0aW1lIGZyb20gc3RhcnRTZWNvbmRzXG4gICAgICAgICAgICAgIGRlZmZTZWNvbmRzID0gKHRhcmdldFNlY29uZHMgLSBzdGFydFNlY29uZHMpIC8gMTAwMDsgIC8vY29udmVydCBzZWNvbmRcblxuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChkZWZmU2Vjb25kcyk7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGxhdCk7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGxvbik7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGVsZSk7XG5cbiAgICAgICAgICBpZiAoaWR4ID09ICh0cmtQdHMubGVuZ3RoIC0xKSkge1xuICAgICAgICAgICAgY3ptbERhdGFbMF0uY2xvY2suaW50ZXJ2YWwgPSBzdGFydFRpbWUgKyAnLycgKyB0aW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhmYWxzZSwgY3ptbERhdGEpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ3B4MmN6bWw7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmdweDJjem1sID0gZ3B4MmN6bWw7XG4gIH1cbn0pKCk7XG4iXX0=
