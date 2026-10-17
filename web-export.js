import rasterizer from 'html-to-image/dist/html-to-image.js?raw';
import {Output, BufferTarget, Mp4OutputFormat, WebMOutputFormat, CanvasSource} from 'mediabunny';
import {createPreviewDocument} from './html-preview.js';
import {validateSettings, bitrateFor, estimatedBytesFor} from './export-settings.js';
import {pickVideoFormat} from './render-capabilities.js';

// Above this estimated size the MP4 muxer stops relocating metadata to the file head,
// trading fast-start playback for a lower memory ceiling on long renders.
const FAST_START_BUDGET_BYTES = 700_000_000;
const ASSET_TIMEOUT_MS = 60_000;
const frameTimeoutFor = (cfg) => Math.min(180_000, Math.round(30_000 * Math.max(1, (cfg.width * cfg.height) / (1280 * 720))));

// Runs only inside the opaque-origin render iframe. No access to the editor origin.
function captureBridge() {
  const realTimeout = window.setTimeout.bind(window);
  let time = 0, nextId = 1;
  const callbacks = new Map();
  const epoch = Date.now();
  Date.now = () => epoch + time;
  Object.defineProperty(performance, 'now', {value: () => time});
  window.requestAnimationFrame = (callback) => {const id = nextId++; callbacks.set(id, {callback, raf: true}); return id;};
  window.cancelAnimationFrame = (id) => callbacks.delete(id);
  window.setTimeout = (callback, delay = 0, ...args) => {
    const id = nextId++; callbacks.set(id, {callback, args, due: time + Math.max(0, Number(delay) || 0)}); return id;
  };
  window.setInterval = (callback, delay = 0, ...args) => {
    const id = nextId++; const interval = Math.max(1, Number(delay) || 0);
    callbacks.set(id, {callback, args, due: time + interval, interval}); return id;
  };
  window.clearTimeout = window.clearInterval = (id) => callbacks.delete(id);
  const reply = (data, transfer) => parent.postMessage({channel: 'web-export', ...data}, '*', transfer || []);
  let failure = '', fontCSS = null;
  addEventListener('error', (e) => {failure = e.message || 'Aset gagal dimuat.';}, true);
  addEventListener('unhandledrejection', (e) => {failure = String(e.reason?.message || e.reason);});
  const unsupported = () => document.querySelector('video,audio,iframe');
  addEventListener('DOMContentLoaded', () => {
    if (unsupported()) reply({error: 'Ekspor web belum mendukung video, audio, atau iframe tertanam. Gunakan mode Remotion untuk media.'});
  });
  addEventListener('load', async () => {
    try {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
      if (unsupported()) throw new Error('Ekspor web belum mendukung video, audio, atau iframe tertanam. Gunakan mode Remotion untuk media.');
      if (failure) throw new Error(failure);
      // Embed fonts once so every frame skips re-fetching font stylesheets.
      try {fontCSS = await window.htmlToImage.getFontEmbedCSS(document.documentElement) || null;} catch (e) {fontCSS = null;}
      reply({ready: true});
    } catch (e) {reply({error: e.message});}
  });
  addEventListener('message', async ({source, data}) => {
    if (source !== parent || data?.channel !== 'web-export' || data.type !== 'frame') return;
    try {
      const targetTime = data.time;
      let ticks = 0;
      while (true) {
        const due = [...callbacks].filter(([, task]) => !task.raf && task.due <= targetTime).sort((a, b) => a[1].due - b[1].due)[0];
        if (!due) break;
        if (++ticks > 10000) throw new Error('Terlalu banyak timer dalam satu frame.');
        const [id, task] = due; time = task.due;
        if (task.interval) task.due += task.interval; else callbacks.delete(id);
        if (typeof task.callback !== 'function') throw new Error('Timer berbasis string tidak didukung.');
        task.callback(...task.args);
      }
      time = targetTime;
      for (const [id, task] of [...callbacks]) {
        if (task.raf && callbacks.has(id)) {callbacks.delete(id); task.callback(time);}
      }
      await Promise.resolve();
      for (const animation of document.getAnimations()) {animation.pause(); animation.currentTime = time;}
      // Allow style/layout updates without advancing the animation clock.
      await new Promise((resolve) => realTimeout(resolve, 0));
      if (failure) throw new Error(failure);
      const options = {width: innerWidth, height: innerHeight, canvasWidth: innerWidth, canvasHeight: innerHeight,
        pixelRatio: 1, backgroundColor: '#182033', skipAutoScale: true};
      if (fontCSS) options.fontEmbedCSS = fontCSS;
      const canvas = await window.htmlToImage.toCanvas(document.documentElement, options);
      try {
        // Transfer a bitmap straight to the editor frame: no PNG encode/decode roundtrip.
        const bitmap = await createImageBitmap(canvas);
        parent.postMessage({channel: 'web-export', id: data.id, bitmap}, '*', [bitmap]);
      } catch (e) {reply({id: data.id, image: canvas.toDataURL('image/png')});}
    } catch (e) {reply({id: data.id, error: e.message});}
  });
}

// Boots a sandboxed iframe with the virtual animation clock and returns a frame requester.
// Only one frame request may be outstanding at a time; the bridge relies on that ordering.
function createRenderSession({source, mode, cfg, signal}) {
  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts';
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {position: 'fixed', left: '-20000px', top: '0', width: `${cfg.width}px`, height: `${cfg.height}px`, border: '0'});
  let pending = null, readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {readyResolve = resolve; readyReject = reject;});
  const timeout = setTimeout(() => readyReject(new Error('Pemuatan aset melebihi 60 detik. Periksa URL dan CORS aset.')), ASSET_TIMEOUT_MS);
  const settlePending = (fn) => {const p = pending; pending = null; clearTimeout(p.timer); fn(p);};
  const receive = (event) => {
    if (event.source !== iframe.contentWindow || event.data?.channel !== 'web-export') return;
    const data = event.data;
    if (data.ready) {readyResolve(); return;}
    if (data.error) {
      const error = new Error(data.error);
      if (pending && data.id === pending.id) settlePending((p) => p.reject(error));
      else readyReject(error);
      return;
    }
    if (pending && data.id === pending.id) {
      const value = data.bitmap ?? data.image;
      settlePending((p) => p.resolve(value));
    }
  };
  const cancel = () => {
    const error = new DOMException('Dibatalkan', 'AbortError');
    readyReject(error);
    if (pending) settlePending((p) => p.reject(error));
  };
  window.addEventListener('message', receive);
  signal?.addEventListener('abort', cancel, {once: true});
  const bridge = `<script>const nativeTimeout = window.setTimeout.bind(window);\n(function(requestAnimationFrame, setTimeout){${rasterizer.replace(/<\/script/gi, '<\\/script')}\n}).call(window, (callback) => nativeTimeout(() => callback(0), 0), nativeTimeout);\n;(${captureBridge.toString()})();<\/script>`;
  iframe.srcdoc = createPreviewDocument(source, mode).replace(/<script>/, () => bridge + '<script>');
  document.body.append(iframe);
  const requestFrame = (id, timeMs) => new Promise((resolve, reject) => {
    const limit = frameTimeoutFor(cfg);
    pending = {id, resolve, reject, timer: setTimeout(() => {
      const error = new Error('Render frame melebihi ' + Math.round(limit / 1000) + ' detik. Periksa aset atau sederhanakan animasi.');
      pending = null; reject(error);
    }, limit)};
    iframe.contentWindow.postMessage({channel: 'web-export', type: 'frame', id, time: timeMs}, '*');
  });
  const cleanup = () => {
    clearTimeout(timeout);
    window.removeEventListener('message', receive);
    signal?.removeEventListener('abort', cancel);
    if (pending) settlePending(() => {});
    iframe.remove();
  };
  return {ready, requestFrame, cleanup};
}

function drawFrame(context, image) {
  if (typeof image === 'string') {
    return (async () => {
      const bitmap = await createImageBitmap(await (await fetch(image)).blob());
      try {context.drawImage(bitmap, 0, 0);} finally {bitmap.close();}
    })();
  }
  try {context.drawImage(image, 0, 0);} finally {image.close();}
  return Promise.resolve();
}

export async function exportWebAnimation({source, mode, cfg, quality, signal, onProgress, format}) {
  const frames = validateSettings(cfg), bitrate = bitrateFor(cfg, quality);
  const chosen = format ?? await pickVideoFormat({...cfg, bitrate});
  signal.throwIfAborted();
  const outputFormat = chosen.container === 'mp4'
    ? new Mp4OutputFormat({fastStart: estimatedBytesFor(cfg, quality) <= FAST_START_BUDGET_BYTES ? 'in-memory' : false})
    : new WebMOutputFormat();
  const canvas = document.createElement('canvas');
  canvas.width = cfg.width; canvas.height = cfg.height;
  const context = canvas.getContext('2d');
  const target = new BufferTarget();
  const output = new Output({format: outputFormat, target});
  const video = new CanvasSource(canvas, {codec: chosen.mediabunnyCodec, bitrate});
  output.addVideoTrack(video, {frameRate: cfg.fps});
  const session = createRenderSession({source, mode, cfg, signal});
  let finalized = false;
  try {
    await session.ready;
    signal.throwIfAborted();
    await output.start();
    // Pipeline: frame N+1 is rasterized inside the iframe while frame N is encoded here.
    let next = session.requestFrame(0, 0);
    for (let frame = 0; frame < frames; frame++) {
      const image = await next;
      next = frame + 1 < frames ? session.requestFrame(frame + 1, Math.round((frame + 1) * 1000 / cfg.fps)) : null;
      signal.throwIfAborted();
      await drawFrame(context, image);
      await video.add(frame / cfg.fps, 1 / cfg.fps);
      onProgress((frame + 1) / frames);
    }
    signal.throwIfAborted();
    video.close(); await output.finalize(); finalized = true;
    signal.throwIfAborted();
    return new Blob([target.buffer], {type: chosen.mime});
  } finally {
    session.cleanup();
    if (!finalized) await output.cancel().catch(() => {});
    canvas.width = canvas.height = 0;
  }
}

export async function exportWebStill({source, mode, cfg, timeMs, signal}) {
  validateSettings(cfg);
  signal.throwIfAborted();
  const session = createRenderSession({source, mode, cfg, signal});
  try {
    await session.ready;
    signal.throwIfAborted();
    const image = await session.requestFrame(0, Math.max(0, Math.round(timeMs)));
    const canvas = document.createElement('canvas');
    canvas.width = cfg.width; canvas.height = cfg.height;
    const context = canvas.getContext('2d');
    await drawFrame(context, image);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('PNG tidak dapat dibuat.')), 'image/png'));
    canvas.width = canvas.height = 0;
    return blob;
  } finally {session.cleanup();}
}