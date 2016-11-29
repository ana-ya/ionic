import { Subject } from 'rxjs/Subject';


export class ImgLoader {
  private _w: Worker;

  update = new Subject<any>();

  load(src: string, cache: boolean) {
    console.debug(`img-loader, load: ${src}`);
    this.worker().postMessage({
      src: src,
      cache: cache
    });
  }

  abort(src: string) {
    console.debug(`img-loader, abort: ${src}`);
    this.worker().postMessage({
      src: src,
      type: 'abort'
    });
  }

  private worker() {
    if (!this._w) {
      // create a blob from the inline worker string
      const workerBlob = new Blob([INLINE_WORKER]);

      // obtain a blob URL reference to our worker 'file'.
      const blobURL = window.URL.createObjectURL(workerBlob);

      // create the worker
      this._w = new Worker(blobURL);

      // create worker onmessage handler
      this._w.onmessage = (ev: MessageEvent) => {
        // we got something back from the web worker
        // let's emit this out to everyone listening
        this.update.next(ev.data);
      };

      // create worker onerror handler
      this._w.onerror = (ev: ErrorEvent) => {
        console.error(`ImgWorker: ${ev.message}`);
        this.update.unsubscribe();
        this._w.terminate();
        this._w = null;
      };
    }

    // return that hard worker
    return this._w;
  }

}


const INLINE_WORKER = `/** minify-start **/

(function(){

  var imgs = {};
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';


  onmessage = function(msg) {
    var msgData = msg.data;
    var src = msgData.src;
    var imgData = imgs[src];

    if (msgData.type === 'abort') {
      if (imgData && imgData.x) {
        imgData.x.abort();
        imgData.x = null;
      }

    } else if (msgData.cache && imgData && imgData.d) {
      postMessage({
        src: src,
        status: 200,
        data: imgData.d
      });

    } else if (imgData && imgData.x) {
      return 0;

    } else {
      if (!imgData) {
        imgData = imgs[src] = {
          c: msgData.cache
        };
      }

      var x = imgData.x = new XMLHttpRequest();
      x.open('GET', src, true);
      x.responseType = 'arraybuffer';

      x.onreadystatechange = function() {
        if (x.readyState === 4) {
          var rsp = {
            src: src,
            status: x.status
          };

          if (x.status === 200) {
            rsp.data = getDataUri(x.getResponseHeader('Content-Type'), x.response);
            if (imgData.c) {
              imgData.d = rsp.data;

              while (Object.keys(imgs).length > 200) {
                delete imgs[Object.keys(imgs)[0]];
              }
            }
          }

          imgData.x = null;

          postMessage(rsp);
        }
      };

      x.onerror = function(e) {
        postMessage({
          src: src,
          status: 500,
          msg: e.message
        });
        imgData.x = null;
      };

      x.send();
    }

  };


  function getDataUri(contentType, arrayBuffer) {
    var base64 = 'data:' + contentType + ';base64,';
    var bytes = new Uint8Array(arrayBuffer);
    var byteLength = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength = byteLength - byteRemainder;
    var i, a, b, c, d, chunk;

    for (i = 0; i < mainLength; i = i + 3) {
      chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      a = (chunk & 16515072) >> 18;
      b = (chunk & 258048) >> 12;
      c = (chunk & 4032) >> 6;
      d = chunk & 63;
      base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    if (byteRemainder === 1) {
      chunk = bytes[mainLength];
      a = (chunk & 252) >> 2;
      b = (chunk & 3) << 4;
      base64 += encodings[a] + encodings[b] + '==';

    } else if (byteRemainder === 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
      a = (chunk & 64512) >> 10;
      b = (chunk & 1008) >> 4;
      c = (chunk & 15) << 2;
      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
    }

    return base64;
  }

})();

/** minify-end **/`;


export interface ImgResponseMessage {
  src: string;
  status?: number;
  data?: string;
  msg?: string;
}
