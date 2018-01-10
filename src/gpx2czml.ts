'use strict';

import fileLoader = require('./utils/fileLoader');

/**
 * gpx2czml module
 * @name Gpx2czml
 */
class Gpx2czml {
  constructor() {
    // file loader prototype setting
    fileLoader.init();
  }

  async(url: string, callback: Function): void {
    
  }

  asyncFromFile(files: object, callback: Function) {

  }

  private processingFiles(ev: object, callback: Function) {
    const reader = new FileReader();
  }
}

export = Gpx2czml;