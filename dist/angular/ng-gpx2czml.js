(function (root, factory) {
   'use strict';

   //AMD mode
   if (typeof define === 'function' && define.amd) {
     define(['angular'], factory);
   } else if (typeof exports === 'object') {
     module.exports = factory(require('angular'));
   } else {
     factory(root.angular);
   }
 }(this, function (angular) {
   'use strict';

   /**
    * gpx2czml Angular 1.0 module
    * @module ngGpx2czml
    * @name ngGpx2czml
    */
   return angular.module('ngGpx2czml', [])
      /**
       * gpx2czml service
       * @name gpx2czml
       * @ngdoc service
       */
     .service('gpx2czml', function ($q, $http) {
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
            //  this.bindCzmlData(gpxNode, function (isError, czmlData) {
            //    typeof cbFunc == "function" && cbFunc(isError, czmlData);
            //  });
             this.parseXml(gpxNode);
           } catch (e) {
             typeof cbFunc == "function" && cbFunc(true, e.toString());
           }
         },

         parseXml : function (node) {
           console.log(node);
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

       return gpx2czml;
     });
 }));

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5nLWdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJuZy1ncHgyY3ptbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAvL0FNRCBtb2RlXG4gICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgIGRlZmluZShbJ2FuZ3VsYXInXSwgZmFjdG9yeSk7XG4gICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnYW5ndWxhcicpKTtcbiAgIH0gZWxzZSB7XG4gICAgIGZhY3Rvcnkocm9vdC5hbmd1bGFyKTtcbiAgIH1cbiB9KHRoaXMsIGZ1bmN0aW9uIChhbmd1bGFyKSB7XG4gICAndXNlIHN0cmljdCc7XG5cbiAgIC8qKlxuICAgICogZ3B4MmN6bWwgQW5ndWxhciAxLjAgbW9kdWxlXG4gICAgKiBAbW9kdWxlIG5nR3B4MmN6bWxcbiAgICAqIEBuYW1lIG5nR3B4MmN6bWxcbiAgICAqL1xuICAgcmV0dXJuIGFuZ3VsYXIubW9kdWxlKCduZ0dweDJjem1sJywgW10pXG4gICAgICAvKipcbiAgICAgICAqIGdweDJjem1sIHNlcnZpY2VcbiAgICAgICAqIEBuYW1lIGdweDJjem1sXG4gICAgICAgKiBAbmdkb2Mgc2VydmljZVxuICAgICAgICovXG4gICAgIC5zZXJ2aWNlKCdncHgyY3ptbCcsIGZ1bmN0aW9uICgkcSwgJGh0dHApIHtcbiAgICAgICB2YXIgZ3B4MmN6bWwgPSB7XG4gICAgICAgICBhc3luYyA6IGZ1bmN0aW9uICh1cmwsIGNiRnVuYykge1xuICAgICAgICAgICB2YXIgaHR0cFJlcXVlc3Q7XG4gICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAgICBpZiAod2luZG93LlhNTEh0dHBSZXF1ZXN0KSB7XG4gICAgICAgICAgICAgaHR0cFJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xuICAgICAgICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcbiAgICAgICAgICAgfVxuXG4gICAgICAgICAgIGh0dHBSZXF1ZXN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGdldEdweERhdGE7XG4gICAgICAgICAgIGh0dHBSZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCk7XG4gICAgICAgICAgIGh0dHBSZXF1ZXN0LnNlbmQoKTtcblxuICAgICAgICAgICBmdW5jdGlvbiBnZXRHcHhEYXRhKCkge1xuICAgICAgICAgICAgIGlmIChodHRwUmVxdWVzdC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICBpZiAoaHR0cFJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAgICAgICAgc2VsZi5wYXJzZUdweChodHRwUmVxdWVzdC5yZXNwb25zZVRleHQsIGZ1bmN0aW9uIChpc0Vycm9yLCByZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xuICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCAnaHR0cCByZXF1ZXN0IGVycm9yJyk7XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgICB9LFxuICAgICAgICAgLyoqXG4gICAgICAgICAgKiBncHggZmlsZSB1cGxvYWQg7ZSE66Gc7IS47IuxIOyymOumrChhc3luYylcbiAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gZmlsZXMgZmlsZSBPYmplY3RcbiAgICAgICAgICAqL1xuICAgICAgICAgYXN5bmNGcm9tRmlsZSA6IGZ1bmN0aW9uIChmaWxlcywgY2JGdW5jKSB7XG4gICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAgICB0aGlzLnByb2Nlc3NpbmdGaWxlcyhmaWxlcywgZnVuY3Rpb24gKGlzRXJyb3IsIHJlcykge1xuXG4gICAgICAgICAgICAgaWYgKGlzRXJyb3IpIHtcbiAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCByZXMpO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICBzZWxmLnBhcnNlR3B4KHJlcywgZnVuY3Rpb24gKGN6bWxFcnJvciwgY3ptbFJlcykge1xuICAgICAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoY3ptbEVycm9yLCBjem1sUmVzKTtcbiAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSk7XG4gICAgICAgICB9LFxuXG4gICAgICAgICAvKipcbiAgICAgICAgICAqIGdweCBmaWxlIG9iamVjdCDtlITroZzshLjsi7Eg7LKY66asXG4gICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGVzIGZpbGUgT2JqZWN0XG4gICAgICAgICAgKi9cbiAgICAgICAgIHByb2Nlc3NpbmdGaWxlcyA6IGZ1bmN0aW9uIChlLCBjYkZ1bmMpIHtcbiAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgdmFyIGJyb3dzZXIgPSAnY2hyb21lJztcblxuICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgIHZhciBmaWxlcyA9IGUudGFyZ2V0LmZpbGVzO1xuXG4gICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICB2YXIgZGF0YTtcbiAgICAgICAgICAgICAgIGlmICghZSkge1xuICAgICAgICAgICAgICAgICBkYXRhID0gcmVhZGVyLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgIGJyb3dzZXIgPSAnaWUnO1xuICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgZGF0YSA9IGUudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGZhbHNlLCBkYXRhKTtcbiAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgIGlmIChmaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlc1swXSwgJ1VURi04Jyk7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHRocm93IFwiZmlsZSBpcyBub3QgZGVmaW5lZFwiO1xuICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgIC8vZmlsZeydhCDsnb3qsowg7ZWc64ukLlxuICAgICAgICAgICAgIC8vcmVhZGVyLnJlYWRBc0JpbmFyeVN0cmluZyhmaWxlc1swXSk7XG4gICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgfVxuXG4gICAgICAgICB9LFxuXG4gICAgICAgICAvKipcbiAgICAgICAgICAqIHBhcnNpbmcgZ3B4IGRhdGFcbiAgICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gZGF0YSBwZ3ggc3RyaW5nIGRhdGFcbiAgICAgICAgICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBjYkZ1bmMgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY29udmVydCBjem1sIG9iamVjdCBkYXRhXG4gICAgICAgICAgKi9cbiAgICAgICAgIHBhcnNlR3B4IDogZnVuY3Rpb24gKGRhdGEsIGNiRnVuYykge1xuICAgICAgICAgICB2YXIgdG1wLHhtbDtcblxuICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgIC8vaWYgRE9NUGFyc2VyIGlzIGV4aXN0XG4gICAgICAgICAgICAgaWYgKHdpbmRvdy5ET01QYXJzZXIpIHtcbiAgICAgICAgICAgICAgIHRtcCA9IG5ldyBET01QYXJzZXIoKTtcbiAgICAgICAgICAgICAgIHhtbCA9IHRtcC5wYXJzZUZyb21TdHJpbmcoIGRhdGEsIFwidGV4dC94bWxcIiApO1xuICAgICAgICAgICAgIH0gZWxzZSB7ICAvL0lFIHZlcnNpb25cbiAgICAgICAgICAgICAgIHhtbCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTERPTVwiKTtcbiAgICAgICAgICAgICAgIHhtbC5hc3luYyA9IFwiZmFsc2VcIjtcbiAgICAgICAgICAgICAgIHhtbC5sb2FkWE1MKGRhdGEpO1xuICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgIC8vZ2V0IGdweCBub2RlIGZyb20geG1sIGRhdGFcbiAgICAgICAgICAgICB2YXIgZ3B4Tm9kZSA9IHhtbC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZ3B4JylbMF07XG5cbiAgICAgICAgICAgICAvL2JpbmQgY3ptbGRhdGFcbiAgICAgICAgICAgIC8vICB0aGlzLmJpbmRDem1sRGF0YShncHhOb2RlLCBmdW5jdGlvbiAoaXNFcnJvciwgY3ptbERhdGEpIHtcbiAgICAgICAgICAgIC8vICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhpc0Vycm9yLCBjem1sRGF0YSk7XG4gICAgICAgICAgICAvLyAgfSk7XG4gICAgICAgICAgICAgdGhpcy5wYXJzZVhtbChncHhOb2RlKTtcbiAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9LFxuXG4gICAgICAgICBwYXJzZVhtbCA6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgIGNvbnNvbGUubG9nKG5vZGUpO1xuICAgICAgICAgfSxcblxuICAgICAgICAgLyoqXG4gICAgICAgICAgKiBnZXQgdGV4dCBmcm9tIHRhZ1xuICAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfSB0YWcgdGFnIHN0cmluZ1xuICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSB0YWdTdHIgdGFnIHN0cmluZ1xuICAgICAgICAgICovXG4gICAgICAgICBnZXRUZXh0VGFnIDogZnVuY3Rpb24gKHRhZykge1xuICAgICAgICAgICAvL3ZhciB0YWdTdHIgPSB0YWcuaW5uZXJIVE1MLnJlcGxhY2UoLzxbXj5dKj4vZywgXCJcIik7XG4gICAgICAgICAgIHZhciB0YWdTdHIgPSB0YWcudGV4dENvbnRlbnQ7XG4gICAgICAgICAgIHRhZ1N0ci5yZXBsYWNlKC8oXlxccyopfChcXHMqJCkvZ2ksIFwiXCIpO1xuXG4gICAgICAgICAgIHJldHVybiB0YWdTdHI7XG4gICAgICAgICB9LFxuXG4gICAgICAgICAvKipcbiAgICAgICAgICAqIGN6bWwgZGF0YSBiaW5kaW5nXG4gICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGdweE5vZGUgZ3B4IHhtbCBkb20gbm9kZVxuICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBjem1sRGF0YSBjem1sIG9iamVjdCBkYXRhXG4gICAgICAgICAgKi9cbiAgICAgICAgIGJpbmRDem1sRGF0YSA6IGZ1bmN0aW9uIChncHhOb2RlLCBjYkZ1bmMpIHtcbiAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICB2YXIgc3VtRWxlID0gMDtcblxuICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgIC8veG1sIHBhcnNpbmdcbiAgICAgICAgICAgICB2YXIgbWV0YURhdGEgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdtZXRhZGF0YScpWzBdLCAvL21ldGFkYXRhXG4gICAgICAgICAgICAgICAgIHRya0NvbnRlbnQgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmsnKVswXSwgIC8vdHJhY2tpbmcgZGF0YVxuICAgICAgICAgICAgICAgICB0cmtTZWcgPSB0cmtDb250ZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCd0cmtzZWcnKVswXSwgIC8vdHJrc2VnXG4gICAgICAgICAgICAgICAgIHRya1B0cyA9IHRya1NlZy5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrcHQnKTsgIC8vdHJhY2tpbmcgcG9pbnQgYXJyYXlzXG5cbiAgICAgICAgICAgICAvL2dldCBzdGFydCB0aW1lXG4gICAgICAgICAgICAgdmFyIHN0YXJ0VGltZSxcbiAgICAgICAgICAgICAgICAgc3RhcnRTZWNvbmRzO1xuXG4gICAgICAgICAgICAgLy9iaW5kaW5nIHRhcmdldFxuICAgICAgICAgICAgIHZhciBjem1sRGF0YSA9IFt7XG4gICAgICAgICAgICAgICBuYW1lIDogZ3B4Tm9kZS5nZXRBdHRyaWJ1dGUoJ2NyZWF0b3InKSxcbiAgICAgICAgICAgICAgIHZlcnNpb24gOiBncHhOb2RlLmdldEF0dHJpYnV0ZSgndmVyc2lvbicpLFxuICAgICAgICAgICAgICAgY2xvY2sgOiB7XG4gICAgICAgICAgICAgICAgIGludGVydmFsIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgY3VycmVudFRpbWUgOiBzdGFydFRpbWUsXG4gICAgICAgICAgICAgICAgIG11bHRpcGxpZXIgOiAxLFxuICAgICAgICAgICAgICAgICByYW5nZSA6ICdDTEFNUEVEJ1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgIHBvc2l0aW9uIDoge1xuICAgICAgICAgICAgICAgICBlcG9jaCA6IHN0YXJ0VGltZSxcbiAgICAgICAgICAgICAgICAgY2FydG9ncmFwaGljRGVncmVlcyA6IFtdXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfV07XG5cbiAgICAgICAgICAgICAvL3NldCBjYXJ0b2dyYXBoaWNEZWdyZWVzIGluZm9cbiAgICAgICAgICAgICBmb3IodmFyIGlkeD0wOyBpZHggPCB0cmtQdHMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICAgICAgICAgdmFyIHRya0luZm8gPSB0cmtQdHNbaWR4XSxcbiAgICAgICAgICAgICAgICAgICBsYXQgPSBwYXJzZUZsb2F0KHRya0luZm8uZ2V0QXR0cmlidXRlKCdsYXQnKSksICAvL2xhdGl0dWRlXG4gICAgICAgICAgICAgICAgICAgbG9uID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbG9uJykpLCAgLy9sb25naXR1ZGVcbiAgICAgICAgICAgICAgICAgICBlbGUgPSBzZWxmLmdldFRleHRUYWcodHJrSW5mby5nZXRFbGVtZW50c0J5VGFnTmFtZSgnZWxlJylbMF0pLCAgLy9lbGVcbiAgICAgICAgICAgICAgICAgICB0aW1lID0gc2VsZi5nZXRUZXh0VGFnKHRya0luZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RpbWUnKVswXSksICAvL2ludGVydmFsIHRpbWVcbiAgICAgICAgICAgICAgICAgICB0YXJnZXRTZWNvbmRzID0gbmV3IERhdGUodGltZSkuZ2V0VGltZSgpLCAvL2ludGVydmFsIHRpbWUgZnJvbSBzdGFydFNlY29uZHNcbiAgICAgICAgICAgICAgICAgICBkZWZmU2Vjb25kcyA9IChpZHggPT0gMD8gMCA6ICgodGFyZ2V0U2Vjb25kcyAtIHN0YXJ0U2Vjb25kcykgLyAxMDAwKSk7ICAvL2NvbnZlcnQgc2Vjb25kXG5cbiAgICAgICAgICAgICAgIGlmIChpZHggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgc3RhcnRUaW1lID0gdGltZTtcbiAgICAgICAgICAgICAgICAgc3RhcnRTZWNvbmRzID0gdGFyZ2V0U2Vjb25kcztcbiAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgLy9lbGUgaW50ZXJwb2xhdGVcbiAgICAgICAgICAgICAgIHN1bUVsZSArPSAoZWxlP3BhcnNlRmxvYXQoZWxlKSA6IDApO1xuXG4gICAgICAgICAgICAgICB2YXIgYXZnRWxlID0gc3VtRWxlIC8gKGlkeCsxKTtcblxuICAgICAgICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGRlZmZTZWNvbmRzKTtcbiAgICAgICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChsb24pO1xuICAgICAgICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGxhdCk7XG4gICAgICAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2goZWxlPyBwYXJzZUZsb2F0KGVsZSkgOiBhdmdFbGUpO1xuXG4gICAgICAgICAgICAgICBpZiAoaWR4ID09ICh0cmtQdHMubGVuZ3RoIC0xKSkge1xuICAgICAgICAgICAgICAgICBjem1sRGF0YVswXS5jbG9jay5pbnRlcnZhbCA9IHN0YXJ0VGltZSArICcvJyArIHRpbWU7XG4gICAgICAgICAgICAgICAgIGN6bWxEYXRhWzFdLmF2YWlsYWJpbGl0eSA9IHN0YXJ0VGltZSArICcvJyArIHRpbWU7XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGZhbHNlLCBjem1sRGF0YSk7XG4gICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgIH07XG5cbiAgICAgICByZXR1cm4gZ3B4MmN6bWw7XG4gICAgIH0pO1xuIH0pKTtcbiJdfQ==
