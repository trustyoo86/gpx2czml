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
               czmlData[1].position.cartographicDegrees.push(lon);
               czmlData[1].position.cartographicDegrees.push(lat);
               czmlData[1].position.cartographicDegrees.push(ele);

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5nLWdweDJjem1sLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoibmctZ3B4MmN6bWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICd1c2Ugc3RyaWN0JztcblxuICAgLy9BTUQgbW9kZVxuICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICBkZWZpbmUoWydhbmd1bGFyJ10sIGZhY3RvcnkpO1xuICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ2FuZ3VsYXInKSk7XG4gICB9IGVsc2Uge1xuICAgICBmYWN0b3J5KHJvb3QuYW5ndWxhcik7XG4gICB9XG4gfSh0aGlzLCBmdW5jdGlvbiAoYW5ndWxhcikge1xuICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAvKipcbiAgICAqIGdweDJjem1sIEFuZ3VsYXIgMS4wIG1vZHVsZVxuICAgICogQG1vZHVsZSBuZ0dweDJjem1sXG4gICAgKiBAbmFtZSBuZ0dweDJjem1sXG4gICAgKi9cbiAgIHJldHVybiBhbmd1bGFyLm1vZHVsZSgnbmdHcHgyY3ptbCcsIFtdKVxuICAgICAgLyoqXG4gICAgICAgKiBncHgyY3ptbCBzZXJ2aWNlXG4gICAgICAgKiBAbmFtZSBncHgyY3ptbFxuICAgICAgICogQG5nZG9jIHNlcnZpY2VcbiAgICAgICAqL1xuICAgICAuc2VydmljZSgnZ3B4MmN6bWwnLCBmdW5jdGlvbiAoJHEsICRodHRwKSB7XG4gICAgICAgdmFyIGdweDJjem1sID0ge1xuICAgICAgICAgYXN5bmMgOiBmdW5jdGlvbiAodXJsLCBjYkZ1bmMpIHtcbiAgICAgICAgICAgdmFyIGh0dHBSZXF1ZXN0O1xuICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgaWYgKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICAgICAgIGh0dHBSZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LkFjdGl2ZVhPYmplY3QpIHtcbiAgICAgICAgICAgICBodHRwUmVxdWVzdCA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7XG4gICAgICAgICAgIH1cblxuICAgICAgICAgICBodHRwUmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBnZXRHcHhEYXRhO1xuICAgICAgICAgICBodHRwUmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwpO1xuICAgICAgICAgICBodHRwUmVxdWVzdC5zZW5kKCk7XG5cbiAgICAgICAgICAgZnVuY3Rpb24gZ2V0R3B4RGF0YSgpIHtcbiAgICAgICAgICAgICBpZiAoaHR0cFJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgaWYgKGh0dHBSZXF1ZXN0LnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgIHNlbGYucGFyc2VHcHgoaHR0cFJlcXVlc3QucmVzcG9uc2VUZXh0LCBmdW5jdGlvbiAoaXNFcnJvciwgcmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgcmVzKTtcbiAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgJ2h0dHAgcmVxdWVzdCBlcnJvcicpO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfVxuICAgICAgICAgfSxcbiAgICAgICAgIC8qKlxuICAgICAgICAgICogZ3B4IGZpbGUgdXBsb2FkIO2UhOuhnOyEuOyLsSDsspjrpqwoYXN5bmMpXG4gICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGZpbGVzIGZpbGUgT2JqZWN0XG4gICAgICAgICAgKi9cbiAgICAgICAgIGFzeW5jRnJvbUZpbGUgOiBmdW5jdGlvbiAoZmlsZXMsIGNiRnVuYykge1xuICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgdGhpcy5wcm9jZXNzaW5nRmlsZXMoZmlsZXMsIGZ1bmN0aW9uIChpc0Vycm9yLCByZXMpIHtcblxuICAgICAgICAgICAgIGlmIChpc0Vycm9yKSB7XG4gICAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgcmVzKTtcbiAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgc2VsZi5wYXJzZUdweChyZXMsIGZ1bmN0aW9uIChjem1sRXJyb3IsIGN6bWxSZXMpIHtcbiAgICAgICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKGN6bWxFcnJvciwgY3ptbFJlcyk7XG4gICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICB9XG4gICAgICAgICAgIH0pO1xuICAgICAgICAgfSxcblxuICAgICAgICAgLyoqXG4gICAgICAgICAgKiBncHggZmlsZSBvYmplY3Qg7ZSE66Gc7IS47IuxIOyymOumrFxuICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBmaWxlcyBmaWxlIE9iamVjdFxuICAgICAgICAgICovXG4gICAgICAgICBwcm9jZXNzaW5nRmlsZXMgOiBmdW5jdGlvbiAoZSwgY2JGdW5jKSB7XG4gICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgIHZhciBicm93c2VyID0gJ2Nocm9tZSc7XG5cbiAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICB2YXIgZmlsZXMgPSBlLnRhcmdldC5maWxlcztcblxuICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgdmFyIGRhdGE7XG4gICAgICAgICAgICAgICBpZiAoIWUpIHtcbiAgICAgICAgICAgICAgICAgZGF0YSA9IHJlYWRlci5jb250ZW50O1xuICAgICAgICAgICAgICAgICBicm93c2VyID0gJ2llJztcbiAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgIGRhdGEgPSBlLnRhcmdldC5yZXN1bHQ7XG4gICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyhmYWxzZSwgZGF0YSk7XG4gICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoZmlsZXNbMF0sICdVVEYtOCcpO1xuICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICB0aHJvdyBcImZpbGUgaXMgbm90IGRlZmluZWRcIjtcbiAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAvL2ZpbGXsnYQg7J296rKMIO2VnOuLpC5cbiAgICAgICAgICAgICAvL3JlYWRlci5yZWFkQXNCaW5hcnlTdHJpbmcoZmlsZXNbMF0pO1xuICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgdHlwZW9mIGNiRnVuYyA9PSBcImZ1bmN0aW9uXCIgJiYgY2JGdW5jKHRydWUsIGUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgIH1cblxuICAgICAgICAgfSxcblxuICAgICAgICAgLyoqXG4gICAgICAgICAgKiBwYXJzaW5nIGdweCBkYXRhXG4gICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGEgcGd4IHN0cmluZyBkYXRhXG4gICAgICAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gY2JGdW5jIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGN6bWxEYXRhIGNvbnZlcnQgY3ptbCBvYmplY3QgZGF0YVxuICAgICAgICAgICovXG4gICAgICAgICBwYXJzZUdweCA6IGZ1bmN0aW9uIChkYXRhLCBjYkZ1bmMpIHtcbiAgICAgICAgICAgdmFyIHRtcCx4bWw7XG5cbiAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAvL2lmIERPTVBhcnNlciBpcyBleGlzdFxuICAgICAgICAgICAgIGlmICh3aW5kb3cuRE9NUGFyc2VyKSB7XG4gICAgICAgICAgICAgICB0bXAgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgICAgICB4bWwgPSB0bXAucGFyc2VGcm9tU3RyaW5nKCBkYXRhLCBcInRleHQveG1sXCIgKTtcbiAgICAgICAgICAgICB9IGVsc2UgeyAgLy9JRSB2ZXJzaW9uXG4gICAgICAgICAgICAgICB4bWwgPSBuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxET01cIik7XG4gICAgICAgICAgICAgICB4bWwuYXN5bmMgPSBcImZhbHNlXCI7XG4gICAgICAgICAgICAgICB4bWwubG9hZFhNTChkYXRhKTtcbiAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAvL2dldCBncHggbm9kZSBmcm9tIHhtbCBkYXRhXG4gICAgICAgICAgICAgdmFyIGdweE5vZGUgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2dweCcpWzBdO1xuXG4gICAgICAgICAgICAgLy9iaW5kIGN6bWxkYXRhXG4gICAgICAgICAgICAvLyAgdGhpcy5iaW5kQ3ptbERhdGEoZ3B4Tm9kZSwgZnVuY3Rpb24gKGlzRXJyb3IsIGN6bWxEYXRhKSB7XG4gICAgICAgICAgICAvLyAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoaXNFcnJvciwgY3ptbERhdGEpO1xuICAgICAgICAgICAgLy8gIH0pO1xuICAgICAgICAgICAgIHRoaXMucGFyc2VYbWwoZ3B4Tm9kZSk7XG4gICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmModHJ1ZSwgZS50b1N0cmluZygpKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgfSxcblxuICAgICAgICAgcGFyc2VYbWwgOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICBjb25zb2xlLmxvZyhub2RlKTtcbiAgICAgICAgIH0sXG5cbiAgICAgICAgIC8qKlxuICAgICAgICAgICogZ2V0IHRleHQgZnJvbSB0YWdcbiAgICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gdGFnIHRhZyBzdHJpbmdcbiAgICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gdGFnU3RyIHRhZyBzdHJpbmdcbiAgICAgICAgICAqL1xuICAgICAgICAgZ2V0VGV4dFRhZyA6IGZ1bmN0aW9uICh0YWcpIHtcbiAgICAgICAgICAgLy92YXIgdGFnU3RyID0gdGFnLmlubmVySFRNTC5yZXBsYWNlKC88W14+XSo+L2csIFwiXCIpO1xuICAgICAgICAgICB2YXIgdGFnU3RyID0gdGFnLnRleHRDb250ZW50O1xuICAgICAgICAgICB0YWdTdHIucmVwbGFjZSgvKF5cXHMqKXwoXFxzKiQpL2dpLCBcIlwiKTtcblxuICAgICAgICAgICByZXR1cm4gdGFnU3RyO1xuICAgICAgICAgfSxcblxuICAgICAgICAgLyoqXG4gICAgICAgICAgKiBjem1sIGRhdGEgYmluZGluZ1xuICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBncHhOb2RlIGdweCB4bWwgZG9tIG5vZGVcbiAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gY3ptbERhdGEgY3ptbCBvYmplY3QgZGF0YVxuICAgICAgICAgICovXG4gICAgICAgICBiaW5kQ3ptbERhdGEgOiBmdW5jdGlvbiAoZ3B4Tm9kZSwgY2JGdW5jKSB7XG4gICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgIC8veG1sIHBhcnNpbmdcbiAgICAgICAgICAgICB2YXIgbWV0YURhdGEgPSBncHhOb2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdtZXRhZGF0YScpWzBdLCAvL21ldGFkYXRhXG4gICAgICAgICAgICAgICAgIHRpbWVEYXRhID0gbWV0YURhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RpbWUnKVswXSwgIC8vdGltZVxuICAgICAgICAgICAgICAgICB0cmtDb250ZW50ID0gZ3B4Tm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrJylbMF0sICAvL3RyYWNraW5nIGRhdGFcbiAgICAgICAgICAgICAgICAgdHJrU2VnID0gdHJrQ29udGVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgndHJrc2VnJylbMF0sICAvL3Rya3NlZ1xuICAgICAgICAgICAgICAgICB0cmtQdHMgPSB0cmtTZWcuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3Rya3B0Jyk7ICAvL3RyYWNraW5nIHBvaW50IGFycmF5c1xuXG4gICAgICAgICAgICAgLy9nZXQgc3RhcnQgdGltZVxuICAgICAgICAgICAgIHZhciBzdGFydFRpbWUgPSB0aGlzLmdldFRleHRUYWcodGltZURhdGEpLFxuICAgICAgICAgICAgICAgICBzdGFydFNlY29uZHMgPSBuZXcgRGF0ZShzdGFydFRpbWUpLmdldFRpbWUoKTtcblxuICAgICAgICAgICAgIC8vYmluZGluZyB0YXJnZXRcbiAgICAgICAgICAgICB2YXIgY3ptbERhdGEgPSBbe1xuICAgICAgICAgICAgICAgbmFtZSA6IGdweE5vZGUuZ2V0QXR0cmlidXRlKCdjcmVhdG9yJyksXG4gICAgICAgICAgICAgICB2ZXJzaW9uIDogZ3B4Tm9kZS5nZXRBdHRyaWJ1dGUoJ3ZlcnNpb24nKSxcbiAgICAgICAgICAgICAgIGNsb2NrIDoge1xuICAgICAgICAgICAgICAgICBpbnRlcnZhbCA6IG51bGwsXG4gICAgICAgICAgICAgICAgIGN1cnJlbnRUaW1lIDogc3RhcnRUaW1lLFxuICAgICAgICAgICAgICAgICBtdWx0aXBsaWVyIDogMSxcbiAgICAgICAgICAgICAgICAgcmFuZ2UgOiAnQ0xBTVBFRCdcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICBwb3NpdGlvbiA6IHtcbiAgICAgICAgICAgICAgICAgY2FydG9ncmFwaGljRGVncmVlcyA6IFtdXG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfV07XG5cbiAgICAgICAgICAgICAvL3NldCBjYXJ0b2dyYXBoaWNEZWdyZWVzIGluZm9cbiAgICAgICAgICAgICBmb3IodmFyIGlkeD0wOyBpZHggPCB0cmtQdHMubGVuZ3RoOyBpZHgrKykge1xuICAgICAgICAgICAgICAgdmFyIHRya0luZm8gPSB0cmtQdHNbaWR4XSxcbiAgICAgICAgICAgICAgICAgICBsYXQgPSBwYXJzZUZsb2F0KHRya0luZm8uZ2V0QXR0cmlidXRlKCdsYXQnKSksICAvL2xhdGl0dWRlXG4gICAgICAgICAgICAgICAgICAgbG9uID0gcGFyc2VGbG9hdCh0cmtJbmZvLmdldEF0dHJpYnV0ZSgnbG9uJykpLCAgLy9sb25naXR1ZGVcbiAgICAgICAgICAgICAgICAgICBlbGUgPSBwYXJzZUZsb2F0KHNlbGYuZ2V0VGV4dFRhZyh0cmtJbmZvLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdlbGUnKVswXSkpLCAgLy9lbGVcbiAgICAgICAgICAgICAgICAgICB0aW1lID0gc2VsZi5nZXRUZXh0VGFnKHRya0luZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RpbWUnKVswXSksICAvL2ludGVydmFsIHRpbWVcbiAgICAgICAgICAgICAgICAgICBleHRlbnNpb25zID0gc2VsZi5nZXRUZXh0VGFnKHRya0luZm8uZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2V4dGVuc2lvbnMnKVswXSksICAvL2V4dGVuc2lvbnNcbiAgICAgICAgICAgICAgICAgICB0YXJnZXRTZWNvbmRzID0gbmV3IERhdGUodGltZSkuZ2V0VGltZSgpLCAvL2ludGVydmFsIHRpbWUgZnJvbSBzdGFydFNlY29uZHNcbiAgICAgICAgICAgICAgICAgICBkZWZmU2Vjb25kcyA9ICh0YXJnZXRTZWNvbmRzIC0gc3RhcnRTZWNvbmRzKSAvIDEwMDA7ICAvL2NvbnZlcnQgc2Vjb25kXG5cbiAgICAgICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChkZWZmU2Vjb25kcyk7XG4gICAgICAgICAgICAgICBjem1sRGF0YVsxXS5wb3NpdGlvbi5jYXJ0b2dyYXBoaWNEZWdyZWVzLnB1c2gobG9uKTtcbiAgICAgICAgICAgICAgIGN6bWxEYXRhWzFdLnBvc2l0aW9uLmNhcnRvZ3JhcGhpY0RlZ3JlZXMucHVzaChsYXQpO1xuICAgICAgICAgICAgICAgY3ptbERhdGFbMV0ucG9zaXRpb24uY2FydG9ncmFwaGljRGVncmVlcy5wdXNoKGVsZSk7XG5cbiAgICAgICAgICAgICAgIGlmIChpZHggPT0gKHRya1B0cy5sZW5ndGggLTEpKSB7XG4gICAgICAgICAgICAgICAgIGN6bWxEYXRhWzBdLmNsb2NrLmludGVydmFsID0gc3RhcnRUaW1lICsgJy8nICsgdGltZTtcbiAgICAgICAgICAgICAgICAgY3ptbERhdGFbMV0uYXZhaWxhYmlsaXR5ID0gc3RhcnRUaW1lICsgJy8nICsgdGltZTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICB0eXBlb2YgY2JGdW5jID09IFwiZnVuY3Rpb25cIiAmJiBjYkZ1bmMoZmFsc2UsIGN6bWxEYXRhKTtcbiAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgIHR5cGVvZiBjYkZ1bmMgPT0gXCJmdW5jdGlvblwiICYmIGNiRnVuYyh0cnVlLCBlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgfTtcblxuICAgICAgIHJldHVybiBncHgyY3ptbDtcbiAgICAgfSk7XG4gfSkpO1xuIl19
