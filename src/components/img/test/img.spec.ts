import { ElementRef, Renderer } from '@angular/core';
import { Content } from '../../content/content';
import { Img, isValidSrc, ImgState } from '../img';
import { ImgLoader, ImgResponseMessage } from '../img-loader';
import { mockContent, mockDomOp, mockElementRef, mockPlatform, mockRenderer, mockZone } from '../../../util/mock-providers';
import { Platform } from '../../../platform/platform';


describe('Img', () => {

  describe('_loadResponse', () => {

    it('should set src attr empty if error', () => {
      spyOn(img, '_loaded');
      spyOn(img, '_srcAttr');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = false;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 500,
        msg: 'error'
      };
      img._loadResponse(msg);

      expect(img._srcAttr).toHaveBeenCalledWith('');
      expect(img._loaded).toHaveBeenCalledWith(false);
    });

    it('should null src if error', () => {
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = false;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 500,
        msg: 'error'
      };
      img._loadResponse(msg);

      expect(img.state).toEqual(ImgState.Unset);
      expect(img._src).toEqual(null);
      expect(img._tmpDataUri).toEqual(null);
    });

    it('should unsubscribe if not paused and status 200', () => {
      img._sub = loader.update.subscribe(() => {});
      spyOn(img._sub, 'unsubscribe');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = false;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 200,
        data: 'datauri'
      };
      img._loadResponse(msg);

      expect(img._sub.unsubscribe).toHaveBeenCalled();
    });

    it('should call loaded(true) if not paused and status 200', () => {
      spyOn(img, '_loaded');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = false;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 200,
        data: 'datauri'
      };
      img._loadResponse(msg);

      expect(img._loaded).toHaveBeenCalledWith(true);
    });

    it('should set src attr if not paused and status 200', () => {
      spyOn(img, '_srcAttr');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = false;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 200,
        data: 'datauri'
      };
      img._loadResponse(msg);

      expect(img._srcAttr).toHaveBeenCalledWith('datauri');
    });

    it('should set tmp datauri if paused and status 200', () => {
      spyOn(img, '_srcAttr');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;
      img._isPaused = true;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 200,
        data: 'datauri'
      };
      img._loadResponse(msg);

      expect(img._tmpDataUri).toEqual('datauri');
      expect(img._srcAttr).not.toHaveBeenCalled();
    });

    it('should do nothing if the status is 0', () => {
      spyOn(img, '_loaded');
      img._src = 'image.jpg';
      img.state = ImgState.Requesting;

      const msg: ImgResponseMessage = {
        src: 'image.jpg',
        status: 0
      };
      img._loadResponse(msg);

      expect(img._loaded).not.toHaveBeenCalled();
    });

    it('should do nothing if the state isnt requesting', () => {
      spyOn(img, '_loaded');
      img._src = 'image.jpg';
      img.state = ImgState.Loaded;

      const msg: ImgResponseMessage = {
        src: 'image.jpg'
      };
      img._loadResponse(msg);

      expect(img._loaded).not.toHaveBeenCalled();
    });

    it('should do nothing if the worker response src is different than src', () => {
      spyOn(img, '_loaded');
      img._src = 'newSrc.jpg';

      const msg: ImgResponseMessage = {
        src: 'oldSrc.jpg'
      };
      img._loadResponse(msg);

      expect(img._loaded).not.toHaveBeenCalled();
    });

  });

  describe('_loadReqest, web worker true', () => {

    it('should not subscribe to loader update if already set', () => {
      img._sub = loader.update.subscribe(() => {});
      spyOn(loader.update, 'subscribe');

      img.webWorker = true;
      img._loadReqest('image.jpg');

      expect(loader.update.subscribe).not.toHaveBeenCalled();
      expect(img._sub).not.toEqual(null);
    });

    it('should subscribe to loader update if not already set', () => {
      spyOn(loader.update, 'subscribe');
      img._sub = null;

      img.webWorker = true;
      img._loadReqest('image.jpg');

      expect(loader.update.subscribe).toHaveBeenCalled();
      expect(img._sub).not.toEqual(null);
    });

    it('should not call loader load if paused', () => {
      spyOn(loader, 'load');

      img.webWorker = true;
      img.cache = true;
      img._isPaused = true;
      img._loadReqest('image.jpg');

      expect(loader.load).not.toHaveBeenCalled();
    });

    it('should call loader load if not paused', () => {
      spyOn(loader, 'load');

      img.webWorker = true;
      img.cache = true;
      img._loadReqest('image.jpg');

      expect(loader.load).toHaveBeenCalledWith('image.jpg', true);
    });

  });

  describe('_loadReqest, web worker false', () => {

    it('should set loaded state', () => {
      img.webWorker = false;
      img._loadReqest('image.jpg');

      expect(img.state).toEqual(ImgState.Loaded);
    });

    it('should null _tmpDataUri src', () => {
      img._tmpDataUri = 'datauri://';

      img.webWorker = false;
      img._loadReqest('image.jpg');

      expect(img._tmpDataUri).toEqual(null);
    });

    it('should set src attr', () => {
      spyOn(img, '_srcAttr');

      img.webWorker = false;
      img._loadReqest('image.jpg');

      expect(img._srcAttr).toHaveBeenCalledWith('image.jpg');
    });

    it('should call _loaded(true)', () => {
      spyOn(img, '_loaded');

      img.webWorker = false;
      img._loadReqest('image.jpg');

      expect(img._loaded).toHaveBeenCalledWith(true);
    });

  });

  describe('play', () => {

    it('should loadRequest if theres a staged src', () => {
      spyOn(img, '_loadReqest');

      img.state = ImgState.Staged;
      img._src = 'request.jpg';
      img.play(0);

      expect(img._loadReqest).toHaveBeenCalledWith('request.jpg');
    });

    it('should do nothing if _loadedSrc already set', () => {
      spyOn(img, '_loadReqest');
      spyOn(img, '_srcAttr');

      img._src = 'image.jpg';

      expect(img._loadReqest).not.toHaveBeenCalled();
      expect(img._srcAttr).not.toHaveBeenCalled();
    });

    it('should set null tmp datauri if _tmpDataUri', () => {
      spyOn(img, '_srcAttr');

      img._tmpDataUri = 'datauri://...';
      img.play(0);

      expect(img._tmpDataUri).toEqual(null);
    });

    it('should set _srcAttr(true) when theres a tmp datauri', () => {
      spyOn(img, '_srcAttr');

      img._tmpDataUri = 'datauri://...';
      img.play(0);

      expect(img._srcAttr).toHaveBeenCalledWith('datauri://...');
    });

    it('should call _loaded(true) when theres a tmp datauri', () => {
      spyOn(img, '_loaded');

      img._tmpDataUri = 'datauri://...';
      img.play(0);

      expect(img._loaded).toHaveBeenCalledWith(true);
    });

    it('should set _isPaused false', () => {
      img._isPaused = true;
      img.play(0);
      expect(img._isPaused).toEqual(false);
    });

  });

  describe('pause', () => {

    it('should set _isPaused true', () => {
      img._isPaused = false;
      img.pause();
      expect(img._isPaused).toEqual(true);
    });

  });

  describe('abort', () => {

    it('should call loader abort if requesting state', () => {
      spyOn(loader, 'abort');
      img._src = 'requesting.jpg';
      img.state = ImgState.Requesting;

      img.abort();

      expect(img.state).toEqual(ImgState.Unset);
      expect(img._src).toEqual(null);
      expect(loader.abort).toHaveBeenCalledWith('requesting.jpg');
    });

    it('should not call loader abort if not requesting state', () => {
      spyOn(loader, 'abort');
      img._src = 'image.jpg';
      img.state = ImgState.Staged;

      img.abort();

      expect(img.state).toEqual(ImgState.Staged);
      expect(img._src).toEqual('image.jpg');
      expect(loader.abort).not.toHaveBeenCalled();
    });

  });

  describe('ngOnInit', () => {

    it('should set _init true', () => {
      img._init = false;
      img.ngOnInit();

      expect(img._init).toEqual(true);
    });

  });

  describe('src setter', () => {

    it('should start load request if initialized', () => {
      spyOn(img, '_loadReqest');

      img._init = true;
      img.src = 'valid.jpg';

      expect(img._loadReqest).toHaveBeenCalledWith('valid.jpg');
    });

    it('should not start load request if not initialized', () => {
      spyOn(img, '_loadReqest');

      img._init = false;
      img.src = 'valid.jpg';

      expect(img._loadReqest).not.toHaveBeenCalled();
    });

    it('should null tmp datauri if set invalid src', () => {
      img._tmpDataUri = 'datauri://...';
      img.src = null;

      expect(img._tmpDataUri).toEqual(null);
    });

    it('should null tmp datauri if set src', () => {
      img._tmpDataUri = 'datauri://...';
      img.src = 'valid.jpg';

      expect(img._tmpDataUri).toEqual(null);
    });

    it('should set staged state if valid src', () => {
      img.src = 'valid.jpg';

      expect(img.state).toEqual(ImgState.Staged);
    });

    it('should have called _loaded(false) for valid src', () => {
      spyOn(img, '_loaded');

      img.src = 'valid.jpg';

      expect(img._loaded).toHaveBeenCalledWith(false);
    });

    it('should have called _loaded(false) for invalid src', () => {
      spyOn(img, '_loaded');

      img.src = null;

      expect(img._loaded).toHaveBeenCalledWith(false);
    });

    it('should abort requesting src when invalid src', () => {
      spyOn(loader, 'abort');

      img.state = ImgState.Requesting;
      img._src = 'requesting.jpg';
      img.src = null;

      expect(loader.abort).toHaveBeenCalledWith('requesting.jpg');
    });

    it('should not set src if not valid src', () => {
      img._src = 'loaded.jpg';
      img.src = null;
      expect(img._src).toEqual(null);
      expect(img.state).toEqual(ImgState.Unset);
    });

    it('should do nothing if new value is same as existing src', () => {
      spyOn(img, '_loaded');

      img._src = 'image.jpg';
      img.src = 'image.jpg';

      expect(img._loaded).not.toHaveBeenCalled();
    });

  });

  describe('src getter', () => {

    it('should get pending src if both set', () => {
      img._src = 'loaded.jpg';
      expect(img.src).toEqual('loaded.jpg');
    });

  });

  describe('isValidSrc', () => {

    it('should be valid for any string', () => {
      expect(isValidSrc('image.jpg')).toEqual(true);
    });

    it('should not be valid for empty string', () => {
      expect(isValidSrc('')).toEqual(false);
    });

    it('should not be valid for undefined/null', () => {
      expect(isValidSrc(null)).toEqual(false);
      expect(isValidSrc(undefined)).toEqual(false);
    });

  });


  let img: Img;
  let loader: ImgLoader;
  let elementRef: ElementRef;
  let renderer: Renderer;
  let platform: Platform;
  let content: Content;

  beforeEach(() => {
    content = mockContent();
    loader = new ImgLoader();
    elementRef = mockElementRef();
    renderer = mockRenderer();
    platform = mockPlatform();
    img = new Img(loader, elementRef, renderer, platform, mockZone(), content, mockDomOp());
  });

});
