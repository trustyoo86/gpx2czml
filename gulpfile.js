var gulp        = require('gulp');
var uglify      = require('gulp-uglify');
var gulpif      = require('gulp-if');
var del         = require('del');
var watch       = require('gulp-watch');
var runSequence = require('run-sequence');
var sourcemaps  = require('gulp-sourcemaps');
var browserify  = require('browserify');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var karmaServer = require('karma').Server;
var concat      = require('gulp-concat');

//example server
var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');

/**
 * production mode
 * @type {Boolean}
 */
global.isProd = false;

/**
 * clean pure gpx2czml
 * @name clean-pure
 */
gulp.task('clean-pure', function (cb) {
  del(['dist/pure'], cb);
});

/**
 * browserify bundle pure version gpx2czml
 * @name bundle-pure
 */
gulp.task('bundle-pure', ['clean-pure'], function () {
  // return browserify({
  //   entries : 'gpx2czml.js',
  //   debug : !global.isProd,
  //   standalone : 'gpx2czml.js'
  // })
  //   .bundle()
  //   .pipe(source('gpx2czml.js'))
  //   .pipe(buffer())
  //   .pipe(gulp.dest('dist/pure'));
  return gulp.src([
    'src/utils/fileStream.js',
    'src/gpx2czml.js'
  ])
    .pipe(gulpif(global.isProd, uglify()))
    .pipe(gulpif(!global.isProd, sourcemaps.init()))
    .pipe(concat('gpx2czml.js'))
    .pipe(gulpif(!global.isProd, sourcemaps.write()))
    .pipe(gulp.dest('dist/pure'));
});

/**
 * development mode
 * @name dev
 */
gulp.task('dev', function (cb) {
  cb = cb || function () {};

  global.isProd = false;

  runSequence([
    'bundle-pure'
  ], 'watch', cb);
});

/**
 * example server start
 * @name server
 */
gulp.task('example', function () {
  var app = express();

  app.use(express.static('example'));
  app.use('/dist', express.static(path.join(__dirname, 'dist')));
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
 * file watch
 * @name watch
 */
gulp.task('watch', function () {
  watch('src/**/*.js', function () {
    gulp.start('bundle-pure');
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
