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
      console.log('getGpx url is : ', url);
      $.ajax({
        method : 'get',
        url : url,
        dataType : 'xml',
        timeout : 3000,
        success : function (res) {
          console.log('success : ', res);
          typeof cbFunc == "function" && cbFunc(false, res);
        },
        error : function (err) {
          console.log('error : ', err);
          typeof cbFunc == "function" && cbFunc(true, err);
        }
      });
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
          version : gpxNode.getAttribute('version')
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

          var trkItem = [deffSeconds, lat, lon, ele];
          czmlData[1].position.cartographicDegrees[idx] = trkItem;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJncHgyY3ptbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcclxuXHJcbihmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKCFGaWxlUmVhZGVyLnByb3RvdHlwZS5yZWFkQXNCaW5hcnlTdHJpbmcpIHtcclxuICAgIEZpbGVSZWFkZXIucHJvdG90eXBlLnJlYWRBc0JpbmFyeVN0cmluZyA9IGZ1bmN0aW9uIChmaWxlRGF0YSkge1xyXG4gICAgICB2YXIgYmluYXJ5ID0gXCJcIjtcclxuICAgICAgdmFyIHB0ID0gdGhpcztcclxuICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KHJlYWRlci5yZXN1bHQpO1xyXG4gICAgICAgIHZhciBsZW5ndGggPSBieXRlcy5ieXRlTGVuZ3RoO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgICAvL3B0LnJlc3VsdCAgLSByZWFkb25seSBzbyBhc3NpZ24gYmluYXJ5XHJcbiAgICAgICAgcHQuY29udGVudCA9IGJpbmFyeTtcclxuICAgICAgICAkKHB0KS50cmlnZ2VyKCdvbmxvYWQnKTtcclxuICAgICAgfVxyXG4gICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZURhdGEpO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHZhciBncHgyY3ptbCA9IHtcclxuICAgIGFzeW5jIDogZnVuY3Rpb24gKHVybCwgY2JGdW5jKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdnZXRHcHggdXJsIGlzIDogJywgdXJsKTtcclxuICAgICAgJC5hamF4KHtcclxuICAgICAgICBtZXRob2QgOiAnZ2V0JyxcclxuICAgICAgICB1cmwgOiB1cmwsXHJcbiAgICAgICAgZGF0YVR5cGUgOiAneG1sJyxcclxuICAgICAgICB0aW1lb3V0IDogMzAwMCxcclxuICAgICAgICBzdWNjZXNzIDogZnVuY3Rpb24gKHJlcykge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3MgOiAnLCByZXMpO1xyXG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGZhbHNlLCByZXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3IgOiBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnZXJyb3IgOiAnLCBlcnIpO1xyXG4gICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGVycik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgICAqIGdweCBmaWxlIHVwbG9hZCDtlITroZzshLjsi7Eg7LKY66asKGFzeW5jKVxyXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBmaWxlcyBmaWxlIE9iamVjdFxyXG4gICAgICovXHJcbiAgICBhc3luY0Zyb21GaWxlIDogZnVuY3Rpb24gKGZpbGVzLCBjYkZ1bmMpIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgdGhpcy5wcm9jZXNzaW5nRmlsZXMoZmlsZXMsIGZ1bmN0aW9uIChpc0Vycm9yLCByZXMpIHtcclxuXHJcbiAgICAgICAgaWYgKGlzRXJyb3IpIHtcclxuICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBzZWxmLnBhcnNlR3B4KHJlcywgZnVuY3Rpb24gKGN6bWxFcnJvciwgY3ptbFJlcykge1xyXG4gICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoY3ptbEVycm9yLCBjem1sUmVzKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ3B4IGZpbGUgb2JqZWN0IO2UhOuhnOyEuOyLsSDsspjrpqxcclxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZmlsZXMgZmlsZSBPYmplY3RcclxuICAgICAqL1xyXG4gICAgcHJvY2Vzc2luZ0ZpbGVzIDogZnVuY3Rpb24gKGUsIGNiRnVuYykge1xyXG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG4gICAgICB2YXIgYnJvd3NlciA9ICdjaHJvbWUnO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICB2YXIgZmlsZXMgPSBlLnRhcmdldC5maWxlcztcclxuXHJcbiAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICB2YXIgZGF0YTtcclxuICAgICAgICAgIGlmICghZSkge1xyXG4gICAgICAgICAgICBkYXRhID0gcmVhZGVyLmNvbnRlbnQ7XHJcbiAgICAgICAgICAgIGJyb3dzZXIgPSAnaWUnO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZGF0YSA9IGUudGFyZ2V0LnJlc3VsdDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGRhdGEpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlc1swXSwgJ1VURi04Jyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRocm93IFwiZmlsZSBpcyBub3QgZGVmaW5lZFwiO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9maWxl7J2EIOydveqyjCDtlZzri6QuXHJcbiAgICAgICAgLy9yZWFkZXIucmVhZEFzQmluYXJ5U3RyaW5nKGZpbGVzWzBdKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIHBhcnNpbmcgZ3B4IGRhdGFcclxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gZGF0YSBwZ3ggc3RyaW5nIGRhdGFcclxuICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYkZ1bmMgY2FsbGJhY2sgZnVuY3Rpb25cclxuICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY29udmVydCBjem1sIG9iamVjdCBkYXRhXHJcbiAgICAgKi9cclxuICAgIHBhcnNlR3B4IDogZnVuY3Rpb24gKGRhdGEsIGNiRnVuYykge1xyXG4gICAgICB2YXIgdG1wLHhtbDtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy9pZiBET01QYXJzZXIgaXMgZXhpc3RcclxuICAgICAgICBpZiAod2luZG93LkRPTVBhcnNlcikge1xyXG4gICAgICAgICAgdG1wID0gbmV3IERPTVBhcnNlcigpO1xyXG4gICAgICAgICAgeG1sID0gdG1wLnBhcnNlRnJvbVN0cmluZyggZGF0YSwgXCJ0ZXh0L3htbFwiICk7XHJcbiAgICAgICAgfSBlbHNlIHsgIC8vSUUgdmVyc2lvblxyXG4gICAgICAgICAgeG1sID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MRE9NXCIpO1xyXG4gICAgICAgICAgeG1sLmFzeW5jID0gXCJmYWxzZVwiO1xyXG4gICAgICAgICAgeG1sLmxvYWRYTUwoZGF0YSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL2dldCBncHggbm9kZSBmcm9tIHhtbCBkYXRhXHJcbiAgICAgICAgdmFyIGdweE5vZGUgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2dweCcpWzBdO1xyXG5cclxuICAgICAgICAvL2JpbmQgY3ptbGRhdGFcclxuICAgICAgICB0aGlzLmJpbmRDem1sRGF0YShncHhOb2RlLCBmdW5jdGlvbiAoaXNFcnJvciwgY3ptbERhdGEpIHtcclxuICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCBjem1sRGF0YSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGdldCB0ZXh0IGZyb20gdGFnXHJcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHRhZyB0YWcgc3RyaW5nXHJcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IHRhZ1N0ciB0YWcgc3RyaW5nXHJcbiAgICAgKi9cclxuICAgIGdldFRleHRUYWcgOiBmdW5jdGlvbiAodGFnKSB7XHJcbiAgICAgIC8vdmFyIHRhZ1N0ciA9IHRhZy5pbm5lckhUTUwucmVwbGFjZSgvPFtePl0qPi9nLCBcIlwiKTtcclxuICAgICAgdmFyIHRhZ1N0ciA9IHRhZy50ZXh0Q29udGVudDtcclxuICAgICAgdGFnU3RyLnJlcGxhY2UoLyheXFxzKil8KFxccyokKS9naSwgXCJcIik7XHJcblxyXG4gICAgICByZXR1cm4gdGFnU3RyO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIGN6bWwgZGF0YSBiaW5kaW5nXHJcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGdweE5vZGUgZ3B4IHhtbCBkb20gbm9kZVxyXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBjem1sRGF0YSBjem1sIG9iamVjdCBkYXRhXHJcbiAgICAgKi9cclxuICAgIGJpbmRDem1sRGF0YSA6IGZ1bmN0aW9uIChncHhOb2RlLCBjYkZ1bmMpIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvL3htbCBwYXJzaW5nXHJcbiAgICAgICAgdmFyIG1ldGFEYXRhID0gZ3B4Tm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnbWV0YWRhdGEnKVswXSwgLy9tZXRhZGF0YVxyXG4gICAgICAgICAgICB0aW1lRGF0YSA9IG1ldGFEYXRhLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aW1lJylbMF0sICAvL3RpbWVcclxuICAgICAgICAgICAgdHJrQ29udGVudCA9IGdweE5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RyaycpWzBdLCAgLy90cmFja2luZyBkYXRhXHJcbiAgICAgICAgICAgIHRya1NlZyA9IHRya0NvbnRlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3Rya3NlZycpWzBdLCAgLy90cmtzZWdcclxuICAgICAgICAgICAgdHJrUHRzID0gdHJrU2VnLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtwdCcpOyAgLy90cmFja2luZyBwb2ludCBhcnJheXNcclxuXHJcbiAgICAgICAgLy9nZXQgc3RhcnQgdGltZVxyXG4gICAgICAgIHZhciBzdGFydFRpbWUgPSB0aGlzLmdldFRleHRUYWcodGltZURhdGEpLFxyXG4gICAgICAgICAgICBzdGFydFNlY29uZHMgPSBuZXcgRGF0ZShzdGFydFRpbWUpLmdldFRpbWUoKTtcclxuXHJcbiAgICAgICAgLy9iaW5kaW5nIHRhcmdldFxyXG4gICAgICAgIHZhciBjem1sRGF0YSA9IFt7XHJcbiAgICAgICAgICB2ZXJzaW9uIDogZ3B4Tm9kZS5nZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nKVxyXG4gICAgICAgIH0sIHtcclxuICAgICAgICAgIHBvc2l0aW9uIDoge1xyXG4gICAgICAgICAgICBjYXJ0b2dyYXBoaWNEZWdyZWVzIDogW11cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XTtcclxuXHJcbiAgICAgICAgLy9zZXQgY2FydG9ncmFwaGljRGVncmVlcyBpbmZvXHJcbiAgICAgICAgZm9yKHZhciBpZHg9MDsgaWR4IDwgdHJrUHRzLmxlbmd0aDsgaWR4KyspIHtcclxuICAgICAgICAgIHZhciB0cmtJbmZvID0gdHJrUHRzW2lkeF0sXHJcbiAgICAgICAgICAgICAgbGF0ID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbGF0JykpLCAgLy9sYXRpdHVkZVxyXG4gICAgICAgICAgICAgIGxvbiA9IHBhcnNlRmxvYXQodHJrSW5mby5nZXRBdHRyaWJ1dGUoJ2xvbicpKSwgIC8vbG9uZ2l0dWRlXHJcbiAgICAgICAgICAgICAgZWxlID0gcGFyc2VGbG9hdChzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pKSwgIC8vZWxlXHJcbiAgICAgICAgICAgICAgdGltZSA9IHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0aW1lJylbMF0pLCAgLy9pbnRlcnZhbCB0aW1lXHJcbiAgICAgICAgICAgICAgZXh0ZW5zaW9ucyA9IHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdleHRlbnNpb25zJylbMF0pLCAgLy9leHRlbnNpb25zXHJcbiAgICAgICAgICAgICAgdGFyZ2V0U2Vjb25kcyA9IG5ldyBEYXRlKHRpbWUpLmdldFRpbWUoKSwgLy9pbnRlcnZhbCB0aW1lIGZyb20gc3RhcnRTZWNvbmRzXHJcbiAgICAgICAgICAgICAgZGVmZlNlY29uZHMgPSAodGFyZ2V0U2Vjb25kcyAtIHN0YXJ0U2Vjb25kcykgLyAxMDAwOyAgLy9jb252ZXJ0IHNlY29uZFxyXG5cclxuICAgICAgICAgIHZhciB0cmtJdGVtID0gW2RlZmZTZWNvbmRzLCBsYXQsIGxvbiwgZWxlXTtcclxuICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXNbaWR4XSA9IHRya0l0ZW07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGN6bWxEYXRhKTtcclxuICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBncHgyY3ptbDtcclxuICB9IGVsc2Uge1xyXG4gICAgd2luZG93LmdweDJjem1sID0gZ3B4MmN6bWw7XHJcbiAgfVxyXG59KSgpO1xyXG4iXX0=
