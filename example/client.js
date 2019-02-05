'use strict';

function initHandler() {
  const fileReader = $('[data-input=filereader]');
  fileReader.off('change').on('change', function (e) {
    gpx2czml.asyncFromFile(e, function (isError, data) {
      $('[data-input=json]').val(JSON.stringify(data, undefined, 4));
      e.target.value = null;
    });
  });
}

function initialize() {
  initHandler();

  gpx2czml.asyncFromAjax('../resources/584286793.gpx', function (isError, data) {
    console.log('data', data);
    $('[data-input=json]').val(JSON.stringify(data, undefined, 4));
  });
}

$(() => {
  initialize();
});