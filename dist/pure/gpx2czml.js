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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ3B4MmN6bWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbihmdW5jdGlvbiAoKSB7XG4gIGlmICghRmlsZVJlYWRlci5wcm90b3R5cGUucmVhZEFzQmluYXJ5U3RyaW5nKSB7XG4gICAgRmlsZVJlYWRlci5wcm90b3R5cGUucmVhZEFzQmluYXJ5U3RyaW5nID0gZnVuY3Rpb24gKGZpbGVEYXRhKSB7XG4gICAgICB2YXIgYmluYXJ5ID0gXCJcIjtcbiAgICAgIHZhciBwdCA9IHRoaXM7XG4gICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICB2YXIgYnl0ZXMgPSBuZXcgVWludDhBcnJheShyZWFkZXIucmVzdWx0KTtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGJ5dGVzLmJ5dGVMZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgICAvL3B0LnJlc3VsdCAgLSByZWFkb25seSBzbyBhc3NpZ24gYmluYXJ5XG4gICAgICAgIHB0LmNvbnRlbnQgPSBiaW5hcnk7XG4gICAgICAgICQocHQpLnRyaWdnZXIoJ29ubG9hZCcpO1xuICAgICAgfVxuICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGVEYXRhKTtcbiAgICB9O1xuICB9XG5cbiAgdmFyIGdweDJjem1sID0ge1xuICAgIGFzeW5jIDogZnVuY3Rpb24gKHVybCwgY2JGdW5jKSB7XG4gICAgICB2YXIgaHR0cFJlcXVlc3Q7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGlmICh3aW5kb3cuWE1MSHR0cFJlcXVlc3QpIHtcbiAgICAgICAgaHR0cFJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIH0gZWxzZSBpZiAod2luZG93LkFjdGl2ZVhPYmplY3QpIHtcbiAgICAgICAgaHR0cFJlcXVlc3QgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxIVFRQXCIpO1xuICAgICAgfVxuXG4gICAgICBodHRwUmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBnZXRHcHhEYXRhO1xuICAgICAgaHR0cFJlcXVlc3Qub3BlbignR0VUJywgdXJsKTtcbiAgICAgIGh0dHBSZXF1ZXN0LnNlbmQoKTtcblxuICAgICAgZnVuY3Rpb24gZ2V0R3B4RGF0YSgpIHtcbiAgICAgICAgaWYgKGh0dHBSZXF1ZXN0LnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICBpZiAoaHR0cFJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgIHNlbGYucGFyc2VHcHgoaHR0cFJlcXVlc3QucmVzcG9uc2VUZXh0LCBmdW5jdGlvbiAoaXNFcnJvciwgcmVzKSB7XG4gICAgICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGlzRXJyb3IsIHJlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsICdodHRwIHJlcXVlc3QgZXJyb3InKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIGdweCBmaWxlIHVwbG9hZCDtlITroZzshLjsi7Eg7LKY66asKGFzeW5jKVxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZmlsZXMgZmlsZSBPYmplY3RcbiAgICAgKi9cbiAgICBhc3luY0Zyb21GaWxlIDogZnVuY3Rpb24gKGZpbGVzLCBjYkZ1bmMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgdGhpcy5wcm9jZXNzaW5nRmlsZXMoZmlsZXMsIGZ1bmN0aW9uIChpc0Vycm9yLCByZXMpIHtcblxuICAgICAgICBpZiAoaXNFcnJvcikge1xuICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYucGFyc2VHcHgocmVzLCBmdW5jdGlvbiAoY3ptbEVycm9yLCBjem1sUmVzKSB7XG4gICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoY3ptbEVycm9yLCBjem1sUmVzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGdweCBmaWxlIG9iamVjdCDtlITroZzshLjsi7Eg7LKY66asXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBmaWxlcyBmaWxlIE9iamVjdFxuICAgICAqL1xuICAgIHByb2Nlc3NpbmdGaWxlcyA6IGZ1bmN0aW9uIChlLCBjYkZ1bmMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgdmFyIGJyb3dzZXIgPSAnY2hyb21lJztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGZpbGVzID0gZS50YXJnZXQuZmlsZXM7XG5cbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgICAgaWYgKCFlKSB7XG4gICAgICAgICAgICBkYXRhID0gcmVhZGVyLmNvbnRlbnQ7XG4gICAgICAgICAgICBicm93c2VyID0gJ2llJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IGUudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGRhdGEpO1xuICAgICAgICB9XG5cblxuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGZpbGVzWzBdLCAnVVRGLTgnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBcImZpbGUgaXMgbm90IGRlZmluZWRcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZmlsZeydhCDsnb3qsowg7ZWc64ukLlxuICAgICAgICAvL3JlYWRlci5yZWFkQXNCaW5hcnlTdHJpbmcoZmlsZXNbMF0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBwYXJzaW5nIGdweCBkYXRhXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBkYXRhIHBneCBzdHJpbmcgZGF0YVxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYkZ1bmMgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGN6bWxEYXRhIGNvbnZlcnQgY3ptbCBvYmplY3QgZGF0YVxuICAgICAqL1xuICAgIHBhcnNlR3B4IDogZnVuY3Rpb24gKGRhdGEsIGNiRnVuYykge1xuICAgICAgdmFyIHRtcCx4bWw7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIC8vaWYgRE9NUGFyc2VyIGlzIGV4aXN0XG4gICAgICAgIGlmICh3aW5kb3cuRE9NUGFyc2VyKSB7XG4gICAgICAgICAgdG1wID0gbmV3IERPTVBhcnNlcigpO1xuICAgICAgICAgIHhtbCA9IHRtcC5wYXJzZUZyb21TdHJpbmcoIGRhdGEsIFwidGV4dC94bWxcIiApO1xuICAgICAgICB9IGVsc2UgeyAgLy9JRSB2ZXJzaW9uXG4gICAgICAgICAgeG1sID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MRE9NXCIpO1xuICAgICAgICAgIHhtbC5hc3luYyA9IFwiZmFsc2VcIjtcbiAgICAgICAgICB4bWwubG9hZFhNTChkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vZ2V0IGdweCBub2RlIGZyb20geG1sIGRhdGFcbiAgICAgICAgdmFyIGdweE5vZGUgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2dweCcpWzBdO1xuXG4gICAgICAgIC8vYmluZCBjem1sZGF0YVxuICAgICAgICB0aGlzLmJpbmRDem1sRGF0YShncHhOb2RlLCBmdW5jdGlvbiAoaXNFcnJvciwgY3ptbERhdGEpIHtcbiAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgY3ptbERhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGdldCB0ZXh0IGZyb20gdGFnXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSB0YWcgdGFnIHN0cmluZ1xuICAgICAqIEByZXR1cm4ge1N0cmluZ30gdGFnU3RyIHRhZyBzdHJpbmdcbiAgICAgKi9cbiAgICBnZXRUZXh0VGFnIDogZnVuY3Rpb24gKHRhZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHRhZ1N0ciA9IHRhZy50ZXh0Q29udGVudDtcbiAgICAgICAgdGFnU3RyLnJlcGxhY2UoLyheXFxzKil8KFxccyokKS9naSwgXCJcIik7XG5cbiAgICAgICAgcmV0dXJuIHRhZ1N0cjtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIGN6bWwgZGF0YSBiaW5kaW5nXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBncHhOb2RlIGdweCB4bWwgZG9tIG5vZGVcbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGN6bWxEYXRhIGN6bWwgb2JqZWN0IGRhdGFcbiAgICAgKi9cbiAgICBiaW5kQ3ptbERhdGEgOiBmdW5jdGlvbiAoZ3B4Tm9kZSwgY2JGdW5jKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB2YXIgc3VtRWxlID0gMDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgLy94bWwgcGFyc2luZ1xuICAgICAgICB2YXIgbWV0YURhdGEgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdtZXRhZGF0YScpWzBdLCAvL21ldGFkYXRhXG4gICAgICAgICAgICB0cmtDb250ZW50ID0gZ3B4Tm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrJylbMF0sICAvL3RyYWNraW5nIGRhdGFcbiAgICAgICAgICAgIHRya1NlZyA9IHRya0NvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3Rya3NlZycpWzBdLCAgLy90cmtzZWdcbiAgICAgICAgICAgIGVsZVB0cyA9IHRya1NlZy5jaGlsZE5vZGVzLFxuICAgICAgICAgICAgdHJrUHRzID0gdHJrU2VnLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtwdCcpOyAgLy90cmFja2luZyBwb2ludCBhcnJheXNcblxuICAgICAgICAvL2dldCBzdGFydCB0aW1lXG4gICAgICAgIHZhciBzdGFydFRpbWUsXG4gICAgICAgICAgICBzdGFydFNlY29uZHM7XG5cbiAgICAgICAgLy9iaW5kaW5nIHRhcmdldFxuICAgICAgICB2YXIgY3ptbERhdGEgPSBbe1xuICAgICAgICAgIG5hbWUgOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgnY3JlYXRvcicpLFxuICAgICAgICAgIHZlcnNpb24gOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgndmVyc2lvbicpLFxuICAgICAgICAgIGNsb2NrIDoge1xuICAgICAgICAgICAgaW50ZXJ2YWwgOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudFRpbWUgOiBzdGFydFRpbWUsXG4gICAgICAgICAgICBtdWx0aXBsaWVyIDogMSxcbiAgICAgICAgICAgIHJhbmdlIDogJ0NMQU1QRUQnXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgcG9zaXRpb24gOiB7XG4gICAgICAgICAgICBlcG9jaCA6IHN0YXJ0VGltZSxcbiAgICAgICAgICAgIGNhcnRvZ3JhcGhpY0RlZ3JlZXMgOiBbXVxuICAgICAgICAgIH1cbiAgICAgICAgfV07XG5cbiAgICAgICAgdmFyIGN1cnJlbnRFbGU7XG5cbiAgICAgICAgLy9zZXQgY2FydG9ncmFwaGljRGVncmVlcyBpbmZvXG4gICAgICAgIGZvcih2YXIgaWR4PTA7IGlkeCA8IHRya1B0cy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgICAgdmFyIHRya0luZm8gPSB0cmtQdHNbaWR4XSxcbiAgICAgICAgICAgICAgY250ID0gMCxcbiAgICAgICAgICAgICAgbGF0ID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbGF0JykpLCAgLy9sYXRpdHVkZVxuICAgICAgICAgICAgICBsb24gPSBwYXJzZUZsb2F0KHRya0luZm8uZ2V0QXR0cmlidXRlKCdsb24nKSksICAvL2xvbmdpdHVkZVxuICAgICAgICAgICAgICBlbGUgPSBzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pLCAgLy9lbGVcbiAgICAgICAgICAgICAgdGltZSA9IHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aW1lJylbMF0pLCAgLy9pbnRlcnZhbCB0aW1lXG4gICAgICAgICAgICAgIHRhcmdldFNlY29uZHMgPSBuZXcgRGF0ZSh0aW1lKS5nZXRUaW1lKCksIC8vaW50ZXJ2YWwgdGltZSBmcm9tIHN0YXJ0U2Vjb25kc1xuICAgICAgICAgICAgICBkZWZmU2Vjb25kcyA9IChpZHggPT0gMD8gMCA6ICgodGFyZ2V0U2Vjb25kcyAtIHN0YXJ0U2Vjb25kcykgLyAxMDAwKSk7ICAvL2NvbnZlcnQgc2Vjb25kXG5cbiAgICAgICAgICBpZiAoaWR4ID09PSAwKSB7XG4gICAgICAgICAgICBzdGFydFRpbWUgPSB0aW1lO1xuICAgICAgICAgICAgc3RhcnRTZWNvbmRzID0gdGFyZ2V0U2Vjb25kcztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvL2lmIGVsZSBpbmZvIGlzIGVtcHR5XG4gICAgICAgICAgaWYgKGVsZSkge1xuICAgICAgICAgICAgY3VycmVudEVsZSA9IHBhcnNlRmxvYXQoZWxlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5leHRQdHMgPSB0cmtQdHNbaWR4ICsgMV0sXG4gICAgICAgICAgICAgICAgbmV4dEVsZSA9IG5leHRQdHMgPyBzZWxmLmdldFRleHRUYWcobmV4dFB0cy5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pIDogbnVsbDtcblxuICAgICAgICAgICAgZm9yKHZhciBlaWR4PTA7IGVpZHggPCB0cmtQdHMubGVuZ3RoOyBlaWR4KyspIHtcbiAgICAgICAgICAgICAgdmFyIGVsZUluZm8gPSB0cmtQdHNbZWlkeF0sXG4gICAgICAgICAgICAgICAgICB0YXJnZXRFbGUgPSBzZWxmLmdldFRleHRUYWcoZWxlSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pO1xuXG4gICAgICAgICAgICAgIGlmICh0YXJnZXRFbGUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50RWxlID0gcGFyc2VGbG9hdCh0YXJnZXRFbGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGRlZmZTZWNvbmRzKTtcbiAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2gobG9uKTtcbiAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2gobGF0KTtcbiAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2goZWxlPyBwYXJzZUZsb2F0KGVsZSkgOiAobmV4dEVsZT8gKGN1cnJlbnRFbGUgKyBwYXJzZUZsb2F0KG5leHRFbGUpKSAvIDIgOiBjdXJyZW50RWxlKSk7XG5cbiAgICAgICAgICBpZiAoaWR4ID09ICh0cmtQdHMubGVuZ3RoIC0xKSkge1xuICAgICAgICAgICAgY3ptbERhdGFbMF0uY2xvY2suaW50ZXJ2YWwgPSBzdGFydFRpbWUgKyAnLycgKyB0aW1lO1xuICAgICAgICAgICAgY3ptbERhdGFbMV0uYXZhaWxhYmlsaXR5ID0gc3RhcnRUaW1lICsgJy8nICsgdGltZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGN6bWxEYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdweDJjem1sO1xuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5ncHgyY3ptbCA9IGdweDJjem1sO1xuICB9XG59KSgpO1xuIl19
