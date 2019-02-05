'use strict';

require('babel-register');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
  url: 'http://localhost',
});

global.window = dom.window;
global.FileReader = global.window.FileReader;

const path = require('path');
const gpx2czml = require('../src/gpx2czml');
const expect = require('chai').expect;
const _ = require('lodash');

describe('[gpx2czml]', () => {
  const g2c = gpx2czml;

  describe('[hasDOMParser test]', () => {
    it('if window object has DOMParser, return true', () => {
      expect(g2c.hasDOMParser()).to.be.equal(true);
    });
  });

  describe('[makeDOMParser test]', () => {
    it('if window object has DOMParser, return DOMParser object', () => {
      expect(typeof g2c.makeDOMParser()).to.be.equal('object');
    });
  });

  describe('[isXMLHttpRequest test]', () => {
    it('if window object has XMLHttpRequest, return true', () => {
      expect(g2c.isXMLHttpRequest()).to.be.equal(true);
    });
  });

  describe('[isActiveXObject test]', () => {
    it('if window has not ActiveXObject, return false', () => {
      expect(g2c.isActiveXObject()).to.be.equal(false);
    });
  });

  describe('[getHttpRequest test]', () => {
    let httpRequest;

    before(() => {
      httpRequest = _.curryRight(g2c.getHttpRequest)(g2c.isActiveXObject)(g2c.isXMLHttpRequest);
    });

    it('if window object has xmlHttpRequest, return httpRequest object is new XMLHTTPRequest', () => {
      expect(typeof httpRequest).to.be.equal('object');
    });

    it('httpRequest has onreadystatechange object', () => {
      expect(typeof httpRequest.onreadystatechange).to.be.equal('object');
    });

    it('httpRequest has open function', () => {
      expect(typeof httpRequest.open).to.be.equal('function');
    });

    it('httpRequest has send function', () => {
      expect(typeof httpRequest.send).to.be.equal('function');
    });
  });

  describe('[async test]', () => {
    it('if url is not defined, async function must return error string', () => {
      expect(g2c.asyncFromAjax().message).to.be.equal('url is not defined.');
    });
    
    it('if url type is not string, async function must return error', () => {
      expect(g2c.asyncFromAjax(1) instanceof Error).to.be.equal(true);
    });
  });

  describe('[using gpx data]', () => {
    let gpxData;

    before((done) => {
      fs.readFile(path.join(__dirname, '..', 'resources', '584286793.gpx'), 'utf8', (err, data) => {
        gpxData = data;
        done();
      });
    });

    describe('[parseGpx test]', function() {
      this.timeout(50000);
      it('parseGpx should return xml data', () => {
        expect(typeof g2c.parseGpx(gpxData)).to.be.equal('object');
      });
    });

    describe('[getAttrs test]', () => {
      let attrFunc;
      
      before((done) => {
        attrFunc = _.flowRight(g2c.getAttr, g2c.getGpxEls)(gpxData);
        done();
      });
  
      it('When get creator, getAttr function should return string.', () => {
        expect(typeof attrFunc('creator')).to.be.equal('string');
      });
  
      it('When get version, getAttr should return string.', () => {
        expect(typeof attrFunc('version')).to.be.equal('string');
      });
    });

    describe('[getEls test]', () => {
      let elsFunc;
  
      before((done) => {
        elsFunc = _.flowRight(g2c.getEls, g2c.getGpxEls)(gpxData);
        done();
      });
  
      it('When get metadata, getEls should return Element object', () => {
        expect(typeof elsFunc('metadata')).to.be.equal('object');
      });
    });

    describe('[getTextTag test]', () => {
      let elsFunc;

      before((done) => {
        elsFunc = _.flowRight(g2c.getEls, g2c.getGpxEls)(gpxData);
        done();
      });

      it('When get text in tag, getTextTag should return string', () => {
        expect(typeof g2c.getTextTag(elsFunc('metadata'))).to.be.equal('string');
      });
    });
  });
});