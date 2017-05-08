angular.module('exampleApp', [
  'ngRoute'
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
  .controller('mainController', function ($scope) {
    console.log('main');
    //handle gpx file
    $scope.handleFile = function (e) {
      console.log('file is : ', e.target.files);
      gpx2czml.asyncFromFile(e);
    };
  });
