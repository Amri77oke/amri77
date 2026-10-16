import rasterizer from 'html-to-image/dist/html-to-image.js?raw';
import {Output, BufferTarget, Mp4OutputFormat, CanvasSource, canEncodeVideo} from 'mediabunny';
import {createPreviewDocument} from './html-preview.js';
import {validateSettings, bitrateFor} from './export-settings.js';

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
  const reply = (data) => parent.postMessage({channel: 'web-export', ...data}, '*');
  let failure = '';
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
      const image = await window.htmlToImage.toPng(document.documentElement, {
        width: innerWidth, height: innerHeight, canvasWidth: innerWidth, canvasHeight: innerHeight,
        pixelRatio: 1, backgroundColor: '#182033', skipAutoScale: true,
      });
      reply({id: data.id, image});
    } catch (e) {reply({id: data.id, error: e.message});}
  });
}

export async function exportWebAnimation({source, mode, cfg, quality, signal, onProgress}) {
  const frames = validateSettings(cfg), bitrate = bitrateFor(cfg, quality);
  if (!await canEncodeVideo('avc', {width: cfg.width, height: cfg.height, bitrate})) {
    throw new Error('Encoder H.264 tidak tersedia untuk resolusi ini. Gunakan Chrome/Edge terbaru atau turunkan resolusi.');
  }
  signal.throwIfAborted();
  const iframe = document.createElement('iframe');
  iframe.sandbox = 'allow-scripts';
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {position: 'fixed', left: '-20000px', top: '0', width: `${cfg.width}px`, height: `${cfg.height}px`, border: '0'});
  const canvas = document.createElement('canvas');
  canvas.width = cfg.width; canvas.height = cfg.height;
  const context = canvas.getContext('2d');
  const target = new BufferTarget();
  const output = new Output({format: new Mp4OutputFormat({fastStart: 'in-memory'}), target});
  const video = new CanvasSource(canvas, {codec: 'avc', bitrate});
  output.addVideoTrack(video, {frameRate: cfg.fps});
  let pending = null, readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => {readyResolve = resolve; readyReject = reject;});
  const timeout = setTimeout(() => readyReject(new Error('Pemuatan aset melebihi 30 detik. Periksa URL dan CORS aset.')), 30000);
  const receive = (event) => {
    if (event.source !== iframe.contentWindow || event.data?.channel !== 'web-export') return;
    const data = event.data;
    if (data.error) {
      const error = new Error(data.error);
      readyReject(error); pending?.reject(error);
    } else if (data.ready) readyResolve();
    else if (pending && data.id === pending.id) pending.resolve(data.image);
  };
  const cancel = () => {const error = new DOMException('Dibatalkan', 'AbortError'); readyReject(error); pending?.reject(error);};
  window.addEventListener('message', receive);
  signal.addEventListener('abort', cancel, {once: true});
  const bridge = `<script>const nativeTimeout = window.setTimeout.bind(window);\n(function(requestAnimationFrame, setTimeout){${rasterizer.replace(/<\/script/gi, '<\\/script')}\n}).call(window, (callback) => nativeTimeout(() => callback(0), 0), nativeTimeout);\n;(${captureBridge.toString()})();<\/script>`;
  iframe.srcdoc = createPreviewDocument(source, mode).replace(/<script>/, () => bridge + '<script>');
  document.body.append(iframe);
  let finalized = false;
  try {
    await ready; clearTimeout(timeout); signal.throwIfAborted();
    await output.start();
    for (let frame = 0; frame < frames; frame++) {
      signal.throwIfAborted();
      let frameTimeout;
      const image = await new Promise((resolve, reject) => {
        pending = {id: frame, resolve, reject};
        frameTimeout = setTimeout(() => reject(new Error('Render frame melebihi 30 detik. Periksa aset atau sederhanakan animasi.')), 30000);
        iframe.contentWindow.postMessage({channel: 'web-export', type: 'frame', id: frame, time: frame * 1000 / cfg.fps}, '*');
      }).finally(() => {clearTimeout(frameTimeout); pending = null;});
      signal.throwIfAborted();
      const bitmap = await createImageBitmap(await (await fetch(image)).blob());
      try {context.drawImage(bitmap, 0, 0);} finally {bitmap.close();}
      await video.add(frame / cfg.fps, 1 / cfg.fps);
      onProgress((frame + 1) / frames);
    }
    signal.throwIfAborted();
    video.close(); await output.finalize(); finalized = true;
    signal.throwIfAborted();
    return new Blob([target.buffer], {type: 'video/mp4'});
  } finally {
    clearTimeout(timeout); window.removeEventListener('message', receive);
    signal.removeEventListener('abort', cancel); iframe.remove();
    if (!finalized) await output.cancel().catch(() => {});
    canvas.width = canvas.height = 0;
  }
}
