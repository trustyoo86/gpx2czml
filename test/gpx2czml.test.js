'use strict';

var expect = chai.expect;

var should = require('should');
var gpx2czml = require('../dist/pure/gpx2czml');
var sinon = require('sinon');
var $ = require('jquery');

describe('gpx2czml test', function () {
  describe('gpx2czml async test', function () {
    beforeEach(function () {
      sinon.spy($, 'ajax');
    });

    afterEach(function () {
      $.ajax.restore();
    });

    it ('gpx2czml module asnyc is function', function () {
      should(typeof gpx2czml.async).be.equal('function');
    });

    it ('gpx2czml module async is operated', function (done) {
      gpx2czml.async('/resources/584286796.gpx');
      expect($.ajax.calledOnce).be.false;
      done();
    });
  });

});
