import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, NgZone, OnDestroy, OnInit, Optional, Renderer, ViewChild, ViewEncapsulation } from '@angular/core';

import { Content } from '../content/content';
import { DomOp } from '../../util/dom-operation';
import { ImgLoader, ImgResponseMessage } from './img-loader';
import { isPresent, isTrueProperty } from '../../util/util';
import { nativeTimeout } from '../../util/dom';
import { Platform } from '../../platform/platform';


/**
 * @private
 */
@Component({
  selector: 'ion-img',
  template:
    '<div class="img-placeholder" [style.height]="_h" [style.width]="_w"></div>' +
    '<img #img>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class Img implements OnDestroy, OnInit {
  /** @internal */
  _src: string;
  /** @internal */
  _tmpDataUri: string;
  /** @internal */
  _isPaused: boolean;
  /** @internal */
  _init: boolean;
  /** @internal */
  _cache: boolean = true;
  /** @internal */
  _lazyLoad: boolean = true;
  /** @internal */
  _ww: boolean = true;
  /** @internal */
  _sub: any;
  /** @internal */
  _bounds: any;

  /** @private */
  _w: string;
  /** @private */
  _h: string;
  /** @private */
  @ViewChild('img') _img: ElementRef;
  /** @private */
  state: ImgState;


  constructor(
    private _ldr: ImgLoader,
    private _elementRef: ElementRef,
    private _renderer: Renderer,
    private _platform: Platform,
    private _zone: NgZone,
    @Optional() private _content: Content,
    private _dom: DomOp
  ) {
    this._loaded(false);
    this._content && this._content.addImg(this);
  }

  /**
   * @private
   */
  ngOnInit() {
    // img component is initialized now
    this._init = true;
    if (this.state === ImgState.Staged && this._src) {
      this._loadReqest(this._src);
    }
  }

  @Input()
  get src(): string {
    return this._src;
  }
  set src(val: string) {
    if (val === this._src) {
      // hey what's going on here, it's the same!
      console.debug(`img, new src the same: ${val}`);
      return;
    }

    // abort any active requests (if there is one)
    this.abort();

    if (!isValidSrc(val)) {
      console.debug(`img, invalid src: ${val}`);
      // eww, bad src value
      this._src = this._tmpDataUri = null;
      this.state = ImgState.Unset;
      this._loaded(false);

    } else {
      // woot! we've got a valid src
      this._src = val;

      // we haven't requested anything yet, let's just say it's staged
      this.state = ImgState.Staged;

      // reset any existing data we might have
      this._tmpDataUri = null;

      // new image, so let's set we're not loaded yet
      this._dom.write(() => {
        this._loaded(false);
      });

      // only start loading if the component has been initialized
      if (this._init) {
        // this component has been initialized
        // so let's do the actual update
        this._loadReqest(val);
      }
    }
  }

  /**
   * @private
   */
  pause() {
    this._isPaused = true;
  }

  /**
   * @private
   */
  play(requestIndex: number) {
    this._isPaused = false;

    if (this._tmpDataUri) {
      // we've already got a datauri to show!
      this._dom.write(() => {
        this._srcAttr(this._tmpDataUri);
        this._loaded(true);
        this._tmpDataUri = null;
      });

    } else if (this.state === ImgState.Staged && this._src) {
      // got a staged source ready to be requestd
      // let's load it up
      nativeTimeout(() => {
        this._loadReqest(this._src);
      }, requestIndex);

      // increment by one so the next request is +1
      return requestIndex++;
    }

    // load request didn't happen, so there is no new requestIndex
    return requestIndex;
  }

  /**
   * @private
   */
  abort() {
    if (this.state === ImgState.Requesting) {
      this._ldr.abort(this._src);
      this.state = ImgState.Unset;
      this._src = this._tmpDataUri = null;
    }
  }

  /**
   * @internal
   */
  _loadReqest(src: string) {
    if (this._ww) {
      // http request with the web worker, then the web worker
      // converts the response to a datauri, which then
      // passes it back to the main thread to put into the img src

      if (this._isPaused) {
        // currently paused, don't bother starting a new request
        // we might not even this this img if they're scrolling fast
        return;
      }

      this.state = ImgState.Requesting;

      if (!this._sub) {
        // create a subscription to the loader's update
        // if we don't already have one
        this._sub = this._ldr.update.subscribe((msg: ImgResponseMessage) => {
          this._loadResponse(msg);
        });
      }

      // tell the loader, to tell the web worker
      // to request the image and start receiving it
      this._ldr.load(src, this._cache);

    } else {
      // not using a web worker
      // just set the src directly
      this.state = ImgState.Loaded;
      this._tmpDataUri = null;
      this._srcAttr(src);
      this._loaded(true);
    }
  }

  /**
   * @internal
   */
  _loadResponse(msg: ImgResponseMessage) {
    if (msg.src !== this._src) {
      // this isn't the droid we're looking for
      return;
    }

    if (this.state !== ImgState.Requesting) {
      // umm, we're good here, but thanks
      return;
    }

    if (msg.status === 0) {
      // request was aborted it seems, so this is no good, go away
      return;
    }

    if (msg.status === 200) {
      // success :)

      if (this._isPaused) {
        // we're currently paused, so we don't want to render anything
        // but we did get back the data successfully, so let's remember it
        // and maybe we can use this to render it later
        this._tmpDataUri = msg.data;

      } else {
        // it's not paused, so it's safe to render the received datauri
        this.state = ImgState.Loaded;
        this._dom.write(() => {
          this._srcAttr(msg.data);
          this._loaded(true);
        });
      }

    } else {
      // error :(
      console.error(`img, status: ${msg.status} ${msg.msg}`);
      this.state = ImgState.Unset;
      this._src = this._tmpDataUri = null;
      this._dom.write(() => {
        this._srcAttr('');
        this._loaded(false);
      });
    }
  }

  /**
   * @internal
   */
  _srcAttr(srcValue: string) {
    if (this._img) {
      this._renderer.setElementAttribute(this._img.nativeElement, 'src', srcValue);
    }
  }

  /**
   * @internal
   */
  _loaded(isLoaded: boolean) {
    this._renderer.setElementClass(this._elementRef.nativeElement, 'img-loaded', isLoaded);
  }

  get top(): number {
    if (this._bounds) {
      return this._bounds.top;
    }
    return 0;
  }

  get bottom(): number {
    if (this._bounds) {
      return this._bounds.bottom;
    }
    return 0;
  }

  @Input()
  set bounds(b: any) {
    if (isPresent(b)) {
      this._bounds = b;
    }
  }

  @Input()
  get lazyLoad(): boolean {
    return !!this._lazyLoad;
  }
  set lazyLoad(val: boolean) {
    this._lazyLoad = isTrueProperty(val);
  }

  @Input()
  get webWorker(): boolean {
    return !!this._ww;
  }
  set webWorker(val: boolean) {
    this._ww = isTrueProperty(val);
  }

  @Input()
  get cache(): boolean {
    return this._cache;
  }
  set cache(val: boolean) {
    this._cache = val;
  }

  @Input()
  set width(val: string | number) {
    this._w = getUnitValue(val);
  }

  @Input()
  set height(val: string | number) {
    this._h = getUnitValue(val);
  }

  @Input() alt: string;

  @Input() title: string;

  @HostBinding('style.width')
  get _width(): string {
    return isPresent(this._w) ? this._w : '';
  }

  @HostBinding('style.height')
  get _height(): string {
    return isPresent(this._h) ? this._h : '';
  }

  ngOnDestroy() {
    this._sub && this._sub.unsubscribe();
    this._content.removeImg(this);
  }

}

function getUnitValue(val: any): string {
  if (isPresent(val)) {
    if (typeof val === 'string') {
      if (val.indexOf('%') > -1 || val.indexOf('px') > -1) {
        return val;
      }
      if (val.length) {
        return val + 'px';
      }

    } else if (typeof val === 'number') {
      return val + 'px';
    }
  }
  return '';
}


export function isValidSrc(src: string) {
  return isPresent(src) && src !== '';
}

export enum ImgState {
  Unset,
  Staged,
  Requesting,
  Loaded
};
