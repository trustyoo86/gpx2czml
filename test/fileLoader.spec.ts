/**
 * file loader test spec
 */
'use strict';

import fileLoader = require('../src/utils/fileLoader');
import should = require('should');

describe('file loader test', () => {
  it('file loader is object', () => {
    should(typeof fileLoader).be.equal('object');
  });

  it('file loader make readAsBinaryString prototype object', () => {
    fileLoader.init();

    should(typeof FileReader.prototype.readAsBinaryString).be.equal('function');
  });
});