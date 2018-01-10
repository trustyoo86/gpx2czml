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
      let binary: string = '';
      const reader: any = new FileReader();
      // file reader onload event
      reader.onload = (e: object): void => {
        const bytes: any = new Uint8Array(reader.result);
        const length: number = bytes.byteLength;
        for (var i = 0; i < length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
          //pt.result  - readonly so assign binary
        this.content = binary;
        const event: object = new Event('onload');
        this.dispatchEvent(event);
      }
      reader.readAsArrayBuffer(fileData);
    };   
  }
};

export = fileLoader;