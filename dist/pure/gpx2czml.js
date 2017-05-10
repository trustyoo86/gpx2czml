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

          //ele interpolate
          sumEle += (ele?parseFloat(ele) : 0);

          var avgEle = sumEle / (idx+1);

          czmlData[1].position.cartographicDegrees.push(deffSeconds);
          czmlData[1].position.cartographicDegrees.push(lon);
          czmlData[1].position.cartographicDegrees.push(lat);
          czmlData[1].position.cartographicDegrees.push(ele? parseFloat(ele) : avgEle);

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJncHgyY3ptbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuKGZ1bmN0aW9uICgpIHtcbiAgaWYgKCFGaWxlUmVhZGVyLnByb3RvdHlwZS5yZWFkQXNCaW5hcnlTdHJpbmcpIHtcbiAgICBGaWxlUmVhZGVyLnByb3RvdHlwZS5yZWFkQXNCaW5hcnlTdHJpbmcgPSBmdW5jdGlvbiAoZmlsZURhdGEpIHtcbiAgICAgIHZhciBiaW5hcnkgPSBcIlwiO1xuICAgICAgdmFyIHB0ID0gdGhpcztcbiAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQpO1xuICAgICAgICB2YXIgbGVuZ3RoID0gYnl0ZXMuYnl0ZUxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICAgIC8vcHQucmVzdWx0ICAtIHJlYWRvbmx5IHNvIGFzc2lnbiBiaW5hcnlcbiAgICAgICAgcHQuY29udGVudCA9IGJpbmFyeTtcbiAgICAgICAgJChwdCkudHJpZ2dlcignb25sb2FkJyk7XG4gICAgICB9XG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZURhdGEpO1xuICAgIH07XG4gIH1cblxuICB2YXIgZ3B4MmN6bWwgPSB7XG4gICAgYXN5bmMgOiBmdW5jdGlvbiAodXJsLCBjYkZ1bmMpIHtcbiAgICAgIHZhciBodHRwUmVxdWVzdDtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgaWYgKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICBodHRwUmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgfSBlbHNlIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xuICAgICAgICBodHRwUmVxdWVzdCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG4gICAgICB9XG5cbiAgICAgIGh0dHBSZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGdldEdweERhdGE7XG4gICAgICBodHRwUmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgaHR0cFJlcXVlc3Quc2VuZCgpO1xuXG4gICAgICBmdW5jdGlvbiBnZXRHcHhEYXRhKCkge1xuICAgICAgICBpZiAoaHR0cFJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgIGlmIChodHRwUmVxdWVzdC5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgICAgc2VsZi5wYXJzZUdweChodHRwUmVxdWVzdC5yZXNwb25zZVRleHQsIGZ1bmN0aW9uIChpc0Vycm9yLCByZXMpIHtcbiAgICAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgcmVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgJ2h0dHAgcmVxdWVzdCBlcnJvcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogZ3B4IGZpbGUgdXBsb2FkIO2UhOuhnOyEuOyLsSDsspjrpqwoYXN5bmMpXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBmaWxlcyBmaWxlIE9iamVjdFxuICAgICAqL1xuICAgIGFzeW5jRnJvbUZpbGUgOiBmdW5jdGlvbiAoZmlsZXMsIGNiRnVuYykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB0aGlzLnByb2Nlc3NpbmdGaWxlcyhmaWxlcywgZnVuY3Rpb24gKGlzRXJyb3IsIHJlcykge1xuXG4gICAgICAgIGlmIChpc0Vycm9yKSB7XG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGlzRXJyb3IsIHJlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5wYXJzZUdweChyZXMsIGZ1bmN0aW9uIChjem1sRXJyb3IsIGN6bWxSZXMpIHtcbiAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhjem1sRXJyb3IsIGN6bWxSZXMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogZ3B4IGZpbGUgb2JqZWN0IO2UhOuhnOyEuOyLsSDsspjrpqxcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGVzIGZpbGUgT2JqZWN0XG4gICAgICovXG4gICAgcHJvY2Vzc2luZ0ZpbGVzIDogZnVuY3Rpb24gKGUsIGNiRnVuYykge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICB2YXIgYnJvd3NlciA9ICdjaHJvbWUnO1xuXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgZmlsZXMgPSBlLnRhcmdldC5maWxlcztcblxuICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgICBpZiAoIWUpIHtcbiAgICAgICAgICAgIGRhdGEgPSByZWFkZXIuY29udGVudDtcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnaWUnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gZS50YXJnZXQucmVzdWx0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhmYWxzZSwgZGF0YSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZXNbMF0sICdVVEYtOCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IFwiZmlsZSBpcyBub3QgZGVmaW5lZFwiO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9maWxl7J2EIOydveqyjCDtlZzri6QuXG4gICAgICAgIC8vcmVhZGVyLnJlYWRBc0JpbmFyeVN0cmluZyhmaWxlc1swXSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIHBhcnNpbmcgZ3B4IGRhdGFcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGEgcGd4IHN0cmluZyBkYXRhXG4gICAgICogQHBhcmFtICB7RnVuY3Rpb259IGNiRnVuYyBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY29udmVydCBjem1sIG9iamVjdCBkYXRhXG4gICAgICovXG4gICAgcGFyc2VHcHggOiBmdW5jdGlvbiAoZGF0YSwgY2JGdW5jKSB7XG4gICAgICB2YXIgdG1wLHhtbDtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgLy9pZiBET01QYXJzZXIgaXMgZXhpc3RcbiAgICAgICAgaWYgKHdpbmRvdy5ET01QYXJzZXIpIHtcbiAgICAgICAgICB0bXAgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgeG1sID0gdG1wLnBhcnNlRnJvbVN0cmluZyggZGF0YSwgXCJ0ZXh0L3htbFwiICk7XG4gICAgICAgIH0gZWxzZSB7ICAvL0lFIHZlcnNpb25cbiAgICAgICAgICB4bWwgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxET01cIik7XG4gICAgICAgICAgeG1sLmFzeW5jID0gXCJmYWxzZVwiO1xuICAgICAgICAgIHhtbC5sb2FkWE1MKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9nZXQgZ3B4IG5vZGUgZnJvbSB4bWwgZGF0YVxuICAgICAgICB2YXIgZ3B4Tm9kZSA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZ3B4JylbMF07XG5cbiAgICAgICAgLy9iaW5kIGN6bWxkYXRhXG4gICAgICAgIHRoaXMuYmluZEN6bWxEYXRhKGdweE5vZGUsIGZ1bmN0aW9uIChpc0Vycm9yLCBjem1sRGF0YSkge1xuICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCBjem1sRGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogZ2V0IHRleHQgZnJvbSB0YWdcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZyB0YWcgc3RyaW5nXG4gICAgICogQHJldHVybiB7U3RyaW5nfSB0YWdTdHIgdGFnIHN0cmluZ1xuICAgICAqL1xuICAgIGdldFRleHRUYWcgOiBmdW5jdGlvbiAodGFnKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgdGFnU3RyID0gdGFnLnRleHRDb250ZW50O1xuICAgICAgICB0YWdTdHIucmVwbGFjZSgvKF5cXHMqKXwoXFxzKiQpL2dpLCBcIlwiKTtcblxuICAgICAgICByZXR1cm4gdGFnU3RyO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogY3ptbCBkYXRhIGJpbmRpbmdcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGdweE5vZGUgZ3B4IHhtbCBkb20gbm9kZVxuICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY3ptbCBvYmplY3QgZGF0YVxuICAgICAqL1xuICAgIGJpbmRDem1sRGF0YSA6IGZ1bmN0aW9uIChncHhOb2RlLCBjYkZ1bmMpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBzdW1FbGUgPSAwO1xuXG4gICAgICB0cnkge1xuICAgICAgICAvL3htbCBwYXJzaW5nXG4gICAgICAgIHZhciBtZXRhRGF0YSA9IGdweE5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ21ldGFkYXRhJylbMF0sIC8vbWV0YWRhdGFcbiAgICAgICAgICAgIHRya0NvbnRlbnQgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmsnKVswXSwgIC8vdHJhY2tpbmcgZGF0YVxuICAgICAgICAgICAgdHJrU2VnID0gdHJrQ29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrc2VnJylbMF0sICAvL3Rya3NlZ1xuICAgICAgICAgICAgdHJrUHRzID0gdHJrU2VnLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtwdCcpOyAgLy90cmFja2luZyBwb2ludCBhcnJheXNcblxuICAgICAgICAvL2dldCBzdGFydCB0aW1lXG4gICAgICAgIHZhciBzdGFydFRpbWUsXG4gICAgICAgICAgICBzdGFydFNlY29uZHM7XG5cbiAgICAgICAgLy9iaW5kaW5nIHRhcmdldFxuICAgICAgICB2YXIgY3ptbERhdGEgPSBbe1xuICAgICAgICAgIG5hbWUgOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgnY3JlYXRvcicpLFxuICAgICAgICAgIHZlcnNpb24gOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgndmVyc2lvbicpLFxuICAgICAgICAgIGNsb2NrIDoge1xuICAgICAgICAgICAgaW50ZXJ2YWwgOiBudWxsLFxuICAgICAgICAgICAgY3VycmVudFRpbWUgOiBzdGFydFRpbWUsXG4gICAgICAgICAgICBtdWx0aXBsaWVyIDogMSxcbiAgICAgICAgICAgIHJhbmdlIDogJ0NMQU1QRUQnXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgcG9zaXRpb24gOiB7XG4gICAgICAgICAgICBlcG9jaCA6IHN0YXJ0VGltZSxcbiAgICAgICAgICAgIGNhcnRvZ3JhcGhpY0RlZ3JlZXMgOiBbXVxuICAgICAgICAgIH1cbiAgICAgICAgfV07XG5cbiAgICAgICAgLy9zZXQgY2FydG9ncmFwaGljRGVncmVlcyBpbmZvXG4gICAgICAgIGZvcih2YXIgaWR4PTA7IGlkeCA8IHRya1B0cy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICAgICAgdmFyIHRya0luZm8gPSB0cmtQdHNbaWR4XSxcbiAgICAgICAgICAgICAgbGF0ID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbGF0JykpLCAgLy9sYXRpdHVkZVxuICAgICAgICAgICAgICBsb24gPSBwYXJzZUZsb2F0KHRya0luZm8uZ2V0QXR0cmlidXRlKCdsb24nKSksICAvL2xvbmdpdHVkZVxuICAgICAgICAgICAgICBlbGUgPSBzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pLCAgLy9lbGVcbiAgICAgICAgICAgICAgdGltZSA9IHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aW1lJylbMF0pLCAgLy9pbnRlcnZhbCB0aW1lXG4gICAgICAgICAgICAgIHRhcmdldFNlY29uZHMgPSBuZXcgRGF0ZSh0aW1lKS5nZXRUaW1lKCksIC8vaW50ZXJ2YWwgdGltZSBmcm9tIHN0YXJ0U2Vjb25kc1xuICAgICAgICAgICAgICBkZWZmU2Vjb25kcyA9IChpZHggPT0gMD8gMCA6ICgodGFyZ2V0U2Vjb25kcyAtIHN0YXJ0U2Vjb25kcykgLyAxMDAwKSk7ICAvL2NvbnZlcnQgc2Vjb25kXG5cbiAgICAgICAgICBpZiAoaWR4ID09PSAwKSB7XG4gICAgICAgICAgICBzdGFydFRpbWUgPSB0aW1lO1xuICAgICAgICAgICAgc3RhcnRTZWNvbmRzID0gdGFyZ2V0U2Vjb25kcztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvL2VsZSBpbnRlcnBvbGF0ZVxuICAgICAgICAgIHN1bUVsZSArPSAoZWxlP3BhcnNlRmxvYXQoZWxlKSA6IDApO1xuXG4gICAgICAgICAgdmFyIGF2Z0VsZSA9IHN1bUVsZSAvIChpZHgrMSk7XG5cbiAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2goZGVmZlNlY29uZHMpO1xuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChsb24pO1xuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChsYXQpO1xuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChlbGU/IHBhcnNlRmxvYXQoZWxlKSA6IGF2Z0VsZSk7XG5cbiAgICAgICAgICBpZiAoaWR4ID09ICh0cmtQdHMubGVuZ3RoIC0xKSkge1xuICAgICAgICAgICAgY3ptbERhdGFbMF0uY2xvY2suaW50ZXJ2YWwgPSBzdGFydFRpbWUgKyAnLycgKyB0aW1lO1xuICAgICAgICAgICAgY3ptbERhdGFbMV0uYXZhaWxhYmlsaXR5ID0gc3RhcnRUaW1lICsgJy8nICsgdGltZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGN6bWxEYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGdweDJjem1sO1xuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5ncHgyY3ptbCA9IGdweDJjem1sO1xuICB9XG59KSgpO1xuIl19
