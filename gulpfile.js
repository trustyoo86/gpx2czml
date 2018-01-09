var gulp        = require('gulp');
var karmaServer = require('karma').Server;

//example server
var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');

/**
 * example server start
 * @name server
 */
gulp.task('example', function () {
  var app = express();

  app.use(express.static('example'));
  app.use('/dist', express.static(path.join(__dirname, 'dist')));
  app.use('/resources', express.static(path.join(__dirname, 'resources')));
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, x-forwarded-for, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'example', 'index.html'));
  });

  var httpServer = http.createServer(app);

  httpServer.listen(4001, function () {
    console.log('example server listen port 4001');
  });
});

/**
 * test files
 * @name test
 */
gulp.task('test', function (done) {
  new karmaServer({
    configFile : __dirname + '/karma.conf.js',
    singleRun : true
  }, done).start();
});
