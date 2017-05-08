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
     * gpx file upload 프로세싱 처리
     * @param  {Object} files file Object
     */
    asyncFromFile : function (files, cbFunc) {
      var self = this;

      this.processingFiles(files, function (data) {
        var parsingData = self.parseGpxToCzml(data);

        console.log('parsing data is : ', parsingData);
      });
    },

    /**
     * gpx file upload 프로세싱 처리
     * @param  {Object} files file Object
     */
    processingFiles : function (e, cbFunc) {
      var self = this;
      var reader = new FileReader();
      var browser = 'chrome';

      var files = e.target.files;

      reader.onload = function (e) {
        var data;
        if (!e) {
          data = reader.content;
          browser = 'ie';
        } else {
          data = e.target.result;
        }

        typeof cbFunc == "function" && cbFunc(data);
      }

      //file을 읽게 한다.
      reader.readAsBinaryString(files[0]);
    },

    /**
     * gpx data를 czml 형태로 변환한다.
     * @param  {String} data gpx data
     * @return {Object}      czml data
     */
    parseGpxToCzml : function (data) {
      var gpxData = $($.parseXML(data)),
          gpxNode = gpxData.find('gpx'),
          trkSeg = gpxNode.find('trk trkseg'),
          trkpt = trkSeg.find('trkpt');

      var czmlData = [{
        version : gpxNode.attr('version')
      }, {
        position : {
          cartographicDegrees : [

          ]
        }
      }];

      _.forEach(trkpt, function (trk, idx) {
        var trkNode = trkpt.eq(idx);

        var lat = parseFloat(trkNode.attr('lat')),
            lon = parseFloat(trkNode.attr('lon')),
            ele = parseFloat(trkNode.find('ele').text());

        var infoArr = [0, lat, lon, ele];
        czmlData[1].position.cartographicDegrees.push(infoArr);
      });

      return czmlData;
    }
  };

  if (typeof exports !== 'undefined') {
    module.exports = gpx2czml;
  } else {
    window.gpx2czml = gpx2czml;
  }
})();
