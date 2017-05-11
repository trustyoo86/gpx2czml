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
            eles = trkContent.getElementsByTagName('ele'),
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

        for(var idx=0; idx < eles.length; idx++) {
          var eleInfo = parseFloat(self.getTextTag(eles[idx]));

          sumEle += eleInfo;
        }

        var avgEle = sumEle / (eles.length);

        //set cartographicDegrees info
        for(var idx=0; idx < trkPts.length; idx++) {
          var trkInfo = trkPts[idx],
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

          czmlData[1].position.cartographicDegrees.push(deffSeconds);
          czmlData[1].position.cartographicDegrees.push(lon);
          czmlData[1].position.cartographicDegrees.push(lat);
          czmlData[1].position.cartographicDegrees.push(ele? parseFloat(ele) : Math.round(avgEle));

          if (idx == (trkPts.length -1)) {
            czmlData[0].clock.interval = startTime + '/' + time;
            czmlData[1].availability = startTime + '/' + time;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdweDJjem1sLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG4oZnVuY3Rpb24gKCkge1xuICBpZiAoIUZpbGVSZWFkZXIucHJvdG90eXBlLnJlYWRBc0JpbmFyeVN0cmluZykge1xuICAgIEZpbGVSZWFkZXIucHJvdG90eXBlLnJlYWRBc0JpbmFyeVN0cmluZyA9IGZ1bmN0aW9uIChmaWxlRGF0YSkge1xuICAgICAgdmFyIGJpbmFyeSA9IFwiXCI7XG4gICAgICB2YXIgcHQgPSB0aGlzO1xuICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkocmVhZGVyLnJlc3VsdCk7XG4gICAgICAgIHZhciBsZW5ndGggPSBieXRlcy5ieXRlTGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgICAgLy9wdC5yZXN1bHQgIC0gcmVhZG9ubHkgc28gYXNzaWduIGJpbmFyeVxuICAgICAgICBwdC5jb250ZW50ID0gYmluYXJ5O1xuICAgICAgICAkKHB0KS50cmlnZ2VyKCdvbmxvYWQnKTtcbiAgICAgIH1cbiAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlRGF0YSk7XG4gICAgfTtcbiAgfVxuXG4gIHZhciBncHgyY3ptbCA9IHtcbiAgICBhc3luYyA6IGZ1bmN0aW9uICh1cmwsIGNiRnVuYykge1xuICAgICAgdmFyIGh0dHBSZXF1ZXN0O1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAod2luZG93LlhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB9IGVsc2UgaWYgKHdpbmRvdy5BY3RpdmVYT2JqZWN0KSB7XG4gICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgIH1cblxuICAgICAgaHR0cFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZ2V0R3B4RGF0YTtcbiAgICAgIGh0dHBSZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICBodHRwUmVxdWVzdC5zZW5kKCk7XG5cbiAgICAgIGZ1bmN0aW9uIGdldEdweERhdGEoKSB7XG4gICAgICAgIGlmIChodHRwUmVxdWVzdC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKGh0dHBSZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICBzZWxmLnBhcnNlR3B4KGh0dHBSZXF1ZXN0LnJlc3BvbnNlVGV4dCwgZnVuY3Rpb24gKGlzRXJyb3IsIHJlcykge1xuICAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCAnaHR0cCByZXF1ZXN0IGVycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBncHggZmlsZSB1cGxvYWQg7ZSE66Gc7IS47IuxIOyymOumrChhc3luYylcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGVzIGZpbGUgT2JqZWN0XG4gICAgICovXG4gICAgYXN5bmNGcm9tRmlsZSA6IGZ1bmN0aW9uIChmaWxlcywgY2JGdW5jKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHRoaXMucHJvY2Vzc2luZ0ZpbGVzKGZpbGVzLCBmdW5jdGlvbiAoaXNFcnJvciwgcmVzKSB7XG5cbiAgICAgICAgaWYgKGlzRXJyb3IpIHtcbiAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgcmVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLnBhcnNlR3B4KHJlcywgZnVuY3Rpb24gKGN6bWxFcnJvciwgY3ptbFJlcykge1xuICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGN6bWxFcnJvciwgY3ptbFJlcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBncHggZmlsZSBvYmplY3Qg7ZSE66Gc7IS47IuxIOyymOumrFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZmlsZXMgZmlsZSBPYmplY3RcbiAgICAgKi9cbiAgICBwcm9jZXNzaW5nRmlsZXMgOiBmdW5jdGlvbiAoZSwgY2JGdW5jKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgIHZhciBicm93c2VyID0gJ2Nocm9tZSc7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBmaWxlcyA9IGUudGFyZ2V0LmZpbGVzO1xuXG4gICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgIHZhciBkYXRhO1xuICAgICAgICAgIGlmICghZSkge1xuICAgICAgICAgICAgZGF0YSA9IHJlYWRlci5jb250ZW50O1xuICAgICAgICAgICAgYnJvd3NlciA9ICdpZSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGZhbHNlLCBkYXRhKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlc1swXSwgJ1VURi04Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgXCJmaWxlIGlzIG5vdCBkZWZpbmVkXCI7XG4gICAgICAgIH1cblxuICAgICAgICAvL2ZpbGXsnYQg7J296rKMIO2VnOuLpC5cbiAgICAgICAgLy9yZWFkZXIucmVhZEFzQmluYXJ5U3RyaW5nKGZpbGVzWzBdKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogcGFyc2luZyBncHggZGF0YVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gZGF0YSBwZ3ggc3RyaW5nIGRhdGFcbiAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JGdW5jIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBjem1sRGF0YSBjb252ZXJ0IGN6bWwgb2JqZWN0IGRhdGFcbiAgICAgKi9cbiAgICBwYXJzZUdweCA6IGZ1bmN0aW9uIChkYXRhLCBjYkZ1bmMpIHtcbiAgICAgIHZhciB0bXAseG1sO1xuXG4gICAgICB0cnkge1xuICAgICAgICAvL2lmIERPTVBhcnNlciBpcyBleGlzdFxuICAgICAgICBpZiAod2luZG93LkRPTVBhcnNlcikge1xuICAgICAgICAgIHRtcCA9IG5ldyBET01QYXJzZXIoKTtcbiAgICAgICAgICB4bWwgPSB0bXAucGFyc2VGcm9tU3RyaW5nKCBkYXRhLCBcInRleHQveG1sXCIgKTtcbiAgICAgICAgfSBlbHNlIHsgIC8vSUUgdmVyc2lvblxuICAgICAgICAgIHhtbCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTERPTVwiKTtcbiAgICAgICAgICB4bWwuYXN5bmMgPSBcImZhbHNlXCI7XG4gICAgICAgICAgeG1sLmxvYWRYTUwoZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICAvL2dldCBncHggbm9kZSBmcm9tIHhtbCBkYXRhXG4gICAgICAgIHZhciBncHhOb2RlID0geG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdncHgnKVswXTtcblxuICAgICAgICAvL2JpbmQgY3ptbGRhdGFcbiAgICAgICAgdGhpcy5iaW5kQ3ptbERhdGEoZ3B4Tm9kZSwgZnVuY3Rpb24gKGlzRXJyb3IsIGN6bWxEYXRhKSB7XG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGlzRXJyb3IsIGN6bWxEYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBnZXQgdGV4dCBmcm9tIHRhZ1xuICAgICAqIEBwYXJhbSAge1N0cmluZ30gdGFnIHRhZyBzdHJpbmdcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHRhZ1N0ciB0YWcgc3RyaW5nXG4gICAgICovXG4gICAgZ2V0VGV4dFRhZyA6IGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB0YWdTdHIgPSB0YWcudGV4dENvbnRlbnQ7XG4gICAgICAgIHRhZ1N0ci5yZXBsYWNlKC8oXlxccyopfChcXHMqJCkvZ2ksIFwiXCIpO1xuXG4gICAgICAgIHJldHVybiB0YWdTdHI7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBjem1sIGRhdGEgYmluZGluZ1xuICAgICAqIEBwYXJhbSAge09iamVjdH0gZ3B4Tm9kZSBncHggeG1sIGRvbSBub2RlXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBjem1sRGF0YSBjem1sIG9iamVjdCBkYXRhXG4gICAgICovXG4gICAgYmluZEN6bWxEYXRhIDogZnVuY3Rpb24gKGdweE5vZGUsIGNiRnVuYykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHN1bUVsZSA9IDA7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8veG1sIHBhcnNpbmdcbiAgICAgICAgdmFyIG1ldGFEYXRhID0gZ3B4Tm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbWV0YWRhdGEnKVswXSwgLy9tZXRhZGF0YVxuICAgICAgICAgICAgdHJrQ29udGVudCA9IGdweE5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RyaycpWzBdLCAgLy90cmFja2luZyBkYXRhXG4gICAgICAgICAgICB0cmtTZWcgPSB0cmtDb250ZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtzZWcnKVswXSwgIC8vdHJrc2VnXG4gICAgICAgICAgICBlbGVzID0gdHJrQ29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJyksXG4gICAgICAgICAgICB0cmtQdHMgPSB0cmtTZWcuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3Rya3B0Jyk7ICAvL3RyYWNraW5nIHBvaW50IGFycmF5c1xuXG4gICAgICAgIC8vZ2V0IHN0YXJ0IHRpbWVcbiAgICAgICAgdmFyIHN0YXJ0VGltZSxcbiAgICAgICAgICAgIHN0YXJ0U2Vjb25kcztcblxuICAgICAgICAvL2JpbmRpbmcgdGFyZ2V0XG4gICAgICAgIHZhciBjem1sRGF0YSA9IFt7XG4gICAgICAgICAgbmFtZSA6IGdweE5vZGUuZ2V0QXR0cmlidXRlKCdjcmVhdG9yJyksXG4gICAgICAgICAgdmVyc2lvbiA6IGdweE5vZGUuZ2V0QXR0cmlidXRlKCd2ZXJzaW9uJyksXG4gICAgICAgICAgY2xvY2sgOiB7XG4gICAgICAgICAgICBpbnRlcnZhbCA6IG51bGwsXG4gICAgICAgICAgICBjdXJyZW50VGltZSA6IHN0YXJ0VGltZSxcbiAgICAgICAgICAgIG11bHRpcGxpZXIgOiAxLFxuICAgICAgICAgICAgcmFuZ2UgOiAnQ0xBTVBFRCdcbiAgICAgICAgICB9XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBwb3NpdGlvbiA6IHtcbiAgICAgICAgICAgIGVwb2NoIDogc3RhcnRUaW1lLFxuICAgICAgICAgICAgY2FydG9ncmFwaGljRGVncmVlcyA6IFtdXG4gICAgICAgICAgfVxuICAgICAgICB9XTtcblxuICAgICAgICBmb3IodmFyIGlkeD0wOyBpZHggPCBlbGVzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgICB2YXIgZWxlSW5mbyA9IHBhcnNlRmxvYXQoc2VsZi5nZXRUZXh0VGFnKGVsZXNbaWR4XSkpO1xuXG4gICAgICAgICAgc3VtRWxlICs9IGVsZUluZm87XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYXZnRWxlID0gc3VtRWxlIC8gKGVsZXMubGVuZ3RoKTtcblxuICAgICAgICAvL3NldCBjYXJ0b2dyYXBoaWNEZWdyZWVzIGluZm9cbiAgICAgICAgZm9yKHZhciBpZHg9MDsgaWR4IDwgdHJrUHRzLmxlbmd0aDsgaWR4KyspIHtcbiAgICAgICAgICB2YXIgdHJrSW5mbyA9IHRya1B0c1tpZHhdLFxuICAgICAgICAgICAgICBsYXQgPSBwYXJzZUZsb2F0KHRya0luZm8uZ2V0QXR0cmlidXRlKCdsYXQnKSksICAvL2xhdGl0dWRlXG4gICAgICAgICAgICAgIGxvbiA9IHBhcnNlRmxvYXQodHJrSW5mby5nZXRBdHRyaWJ1dGUoJ2xvbicpKSwgIC8vbG9uZ2l0dWRlXG4gICAgICAgICAgICAgIGVsZSA9IHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdlbGUnKVswXSksICAvL2VsZVxuICAgICAgICAgICAgICB0aW1lID0gc2VsZi5nZXRUZXh0VGFnKHRya0luZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RpbWUnKVswXSksICAvL2ludGVydmFsIHRpbWVcbiAgICAgICAgICAgICAgdGFyZ2V0U2Vjb25kcyA9IG5ldyBEYXRlKHRpbWUpLmdldFRpbWUoKSwgLy9pbnRlcnZhbCB0aW1lIGZyb20gc3RhcnRTZWNvbmRzXG4gICAgICAgICAgICAgIGRlZmZTZWNvbmRzID0gKGlkeCA9PSAwPyAwIDogKCh0YXJnZXRTZWNvbmRzIC0gc3RhcnRTZWNvbmRzKSAvIDEwMDApKTsgIC8vY29udmVydCBzZWNvbmRcblxuICAgICAgICAgIGlmIChpZHggPT09IDApIHtcbiAgICAgICAgICAgIHN0YXJ0VGltZSA9IHRpbWU7XG4gICAgICAgICAgICBzdGFydFNlY29uZHMgPSB0YXJnZXRTZWNvbmRzO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChkZWZmU2Vjb25kcyk7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGxvbik7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGxhdCk7XG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGVsZT8gcGFyc2VGbG9hdChlbGUpIDogTWF0aC5yb3VuZChhdmdFbGUpKTtcblxuICAgICAgICAgIGlmIChpZHggPT0gKHRya1B0cy5sZW5ndGggLTEpKSB7XG4gICAgICAgICAgICBjem1sRGF0YVswXS5jbG9jay5pbnRlcnZhbCA9IHN0YXJ0VGltZSArICcvJyArIHRpbWU7XG4gICAgICAgICAgICBjem1sRGF0YVsxXS5hdmFpbGFiaWxpdHkgPSBzdGFydFRpbWUgKyAnLycgKyB0aW1lO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhmYWxzZSwgY3ptbERhdGEpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZ3B4MmN6bWw7XG4gIH0gZWxzZSB7XG4gICAgd2luZG93LmdweDJjem1sID0gZ3B4MmN6bWw7XG4gIH1cbn0pKCk7XG4iXX0=
