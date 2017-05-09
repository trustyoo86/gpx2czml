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
