'use strict';

const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const app = express();

app.use('/resources', express.static(path.join(__dirname, '..', 'resources')));

app.route('*', (req, res, next) => {
  console.log('req', req);
  next();
});

app.get('/gpx/:gpxId', (req, res) => {
  const gpxId = req.params.gpxId;

  fs.readFile(path.join(__dirname, '..', 'resources', `${gpxId}.gpx`), (err, data) => {
    res.send(data);
  });
});

this.server = http.createServer(app, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end('Hello, world!\n');
});

exports.listen = function () {
  this.server.listen.apply(this.server, arguments);
};

exports.close = function (callback) {
  this.server.close(callback);
};