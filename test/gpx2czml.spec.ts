'use strict';

import Gpx2czml = require('../src/gpx2czml');
import should = require('should');

describe('gpx2czml module test', () => {
  it ('file loader make readAsBinaryString prototype', () => {
    const gpx2czml = new Gpx2czml();
    should(typeof FileReader.prototype.readAsBinaryString).be.equal('function');
  });
});