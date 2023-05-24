if (FileReader && !FileReader.prototype.readAsBinaryString) {
  FileReader.prototype.readAsBinaryString = function (fileData) {
    let binary = '';
    const pt = this;

    const reader = new FileReader();
    reader.onload = function () {
      const bytes = new Uint8Array(reader.result as ArrayBufferLike);
      const length = bytes.byteLength;

      for (let i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      // @ts-ignore
      pt['content'] = binary;
    };
    reader.readAsArrayBuffer(fileData);
  };
}

function test() {
  console.log('test');
}

export default test;
