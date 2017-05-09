angular.module('exampleApp', [
  'ngRoute',
  'ngGpx2czml'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/main', {
        templateUrl : 'client/views/main.html',
        controller : 'mainController as main'
      })
      .otherwise({
          redirectTo: '/main'
      });
  })
  .controller('mainController', function ($scope, gpx2czml) {
    console.log('main');
    //handle gpx file
    $scope.handleFile = function (e) {
      console.log('file is : ', e.target.files);
      gpx2czml.asyncFromFile(e, function (isError, czml) {
        if (isError) {
          console.log('error is : ', czml);
        } else {
          console.log('czml data is : ', czml);
          $scope.czmlResult = JSON.stringify(czml, null, 4);
        }
      });
    };

    //async http request
    $scope.getHttp = function () {
      var url = 'resources/584286793.gpx';

      gpx2czml.async(url, function (isError, czml) {
        if (isError) {
          console.log('error is : ', czml);
        } else {
          console.log('czml data is : ', czml);
          $scope.czmlResult = JSON.stringify(czml, null, 4);
        }
      });
    };
  });
