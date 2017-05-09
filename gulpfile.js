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
var ngAnnotate  = require('gulp-ng-annotate');
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
  del(['dist/pure/gpx2czml.js'], cb);
});

/**
 * clean angular gpx2czml
 * @name clean-angular
 */
gulp.task('clean-angular', function (cb) {
  del(['dist/angular/ng-gpx2czml.js'], cb);
});

/**
 * clean pure gpx2czml
 * @name clean-pure-prod
 */
gulp.task('clean-pure-prod', function (cb) {
  del(['dist/pure/gpx2czml.min.js'], cb);
});

/**
 * clean angular gpx2czml
 * @name clean-angular-prod
 */
gulp.task('clean-angular-prod', function (cb) {
  del(['dist/angular/ng-gpx2czml.min.js'], cb);
});

/**
 * browserify bundle pure version gpx2czml
 * @name bundle-pure
 */
gulp.task('bundle-pure', ['clean-pure'], function () {
  return gulp.src([
    'src/pure/gpx2czml.js'
  ])
    .pipe(gulpif(!global.isProd, sourcemaps.init()))
    .pipe(concat('gpx2czml.js'))
    .pipe(gulpif(!global.isProd, sourcemaps.write()))
    .pipe(gulp.dest('dist/pure'));
});

/**
 * browserify bundle pure version gpx2czml
 * @name bundle-pure-prod
 */
gulp.task('bundle-pure-prod', ['clean-pure-prod'], function () {
  return gulp.src([
    'src/pure/gpx2czml.js'
  ])
    .pipe(gulpif(!global.isProd, sourcemaps.init()))
    .pipe(uglify())
    .pipe(concat('gpx2czml.min.js'))
    .pipe(gulpif(!global.isProd, sourcemaps.write()))
    .pipe(gulp.dest('dist/pure'));
});

/**
 * bundling angular file
 * @name bundle-angular
 */
gulp.task('bundle-angular', ['clean-angular'], function () {
  return gulp.src([
    'src/angular/ng-gpx2czml.js'
  ])
    .pipe(gulpif(!global.isProd, sourcemaps.init()))
    .pipe(concat('ng-gpx2czml.js'))
    .pipe(gulpif(!global.isProd, sourcemaps.write()))
    .pipe(gulp.dest('dist/angular'));
});

/**
 * bundling angular file
 * @name bundle-angular-prod
 */
gulp.task('bundle-angular-prod', ['clean-angular-prod'], function () {
  return gulp.src([
    'src/angular/ng-gpx2czml.js'
  ])
    .pipe(gulpif(!global.isProd, sourcemaps.init()))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(concat('ng-gpx2czml.min.js'))
    .pipe(gulpif(!global.isProd, sourcemaps.write()))
    .pipe(gulp.dest('dist/angular'));
});


/**
 * development mode
 * @name dev
 */
gulp.task('dev', function (cb) {
  cb = cb || function () {};

  global.isProd = false;

  runSequence([
    'bundle-pure',
    'bundle-angular',
    'bundle-pure-prod',
    'bundle-angular-prod'
  ], 'watch', cb);
});

/**
 * development mode
 * @name prod
 */
gulp.task('prod', function (cb) {
  cb = cb || function () {};

  global.isProd = true;

  runSequence([
    'bundle-pure',
    'bundle-angular',
    'bundle-pure-prod',
    'bundle-angular-prod'
  ], cb);
});


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
 * file watch
 * @name watch
 */
gulp.task('watch', function () {
  watch('src/pure/**/*.js', function () {
    gulp.start('bundle-pure');
    gulp.start('bundle-pure-prod');
  });

  watch('src/angular/**/*.js', function () {
    gulp.start('bundle-angular');
    gulp.start('bundle-angular-prod');
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
