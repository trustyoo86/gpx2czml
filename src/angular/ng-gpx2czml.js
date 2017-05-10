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
