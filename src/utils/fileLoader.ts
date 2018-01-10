/**
 * File loader utils
 */
'use strict';

/**
 * file loader objects
 * @name fileLoader
 */
const fileLoader = {
  /**
   * initialize
   */
  init(): boolean {
    if (!FileReader.prototype.readAsBinaryString) {
      this.bindBinary();
      return true;
    } else {
      return false;
    }
  },
  /**
   * bind binary function
   */
  bindBinary(): void {
    FileReader.prototype.readAsBinaryString = function(fileData: any) {
      let binary = "";
      const pt = this;
      const reader = new FileReader();
      // file reader onload event
      reader.onload = (e: object): void => {
        var bytes = new Uint8Array(reader.result);
        var length = bytes.byteLength;
        for (var i = 0; i < length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
          //pt.result  - readonly so assign binary
        pt.content = binary;
        const event = new Event('onload');
        pt.dispatchEvent(event);
      }
      reader.readAsArrayBuffer(fileData);
    };   
  }
};

export = fileLoader;