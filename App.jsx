import React, {useState, useEffect, useRef} from 'react';
import {Player} from '@remotion/player';
import {transform} from 'sucrase';
import * as R from 'remotion';
import * as shapes from '@remotion/shapes';
import * as paths from '@remotion/paths';
import * as noise from '@remotion/noise';
import * as tr from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {flip} from '@remotion/transitions/flip';
import * as transition0 from '@remotion/transitions/clock-wipe';
import * as transition1 from '@remotion/transitions/book-flip';
import * as transition2 from '@remotion/transitions/zoom-blur';
import * as transition3 from '@remotion/transitions/dreamy-zoom';
import * as transition4 from '@remotion/transitions/film-burn';
import * as transition5 from '@remotion/transitions/linear-blur';
import * as transition6 from '@remotion/transitions/zoom-in-out';
import * as transition7 from '@remotion/transitions/none';
import * as transition8 from '@remotion/transitions/iris';
import * as transition9 from '@remotion/transitions/dissolve';
import * as transition10 from '@remotion/transitions/ripple';
import * as transition11 from '@remotion/transitions/crosswarp';
import * as transition12 from '@remotion/transitions/cross-zoom';
import * as transition13 from '@remotion/transitions/swap';
import * as transition14 from '@remotion/transitions/push-cut';
import * as transition15 from '@remotion/transitions/blur-slide';
import {renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb} from '@remotion/web-renderer';
import {PRESETS, validateSettings, bitrateFor, MAX_DURATION} from './export-settings.js';
import {pickVideoFormat, listEncodableFormats} from './render-capabilities.js';
import {exportWebAnimation, exportWebStill} from './web-export.js';
import {createPreviewDocument} from './html-preview.js';
import * as media from '@remotion/media';
import * as layout from '@remotion/layout-utils';
import * as blur from '@remotion/motion-blur';
import * as animation from '@remotion/animation-utils';
import * as gif from '@remotion/gif';
import * as lottie from '@remotion/lottie';
import * as jsxRuntime from 'react/jsx-runtime';
import {HTML_TEMPLATE, CSS_TEMPLATE} from './web-templates.js';
import {TEMPLATES} from './templates.js';

const MODS = {'@remotion/transitions/clock-wipe': transition0, '@remotion/transitions/book-flip': transition1, '@remotion/transitions/zoom-blur': transition2, '@remotion/transitions/dreamy-zoom': transition3, '@remotion/transitions/film-burn': transition4, '@remotion/transitions/linear-blur': transition5, '@remotion/transitions/zoom-in-out': transition6, '@remotion/transitions/none': transition7, '@remotion/transitions/iris': transition8, '@remotion/transitions/dissolve': transition9, '@remotion/transitions/ripple': transition10, '@remotion/transitions/crosswarp': transition11, '@remotion/transitions/cross-zoom': transition12, '@remotion/transitions/swap': transition13, '@remotion/transitions/push-cut': transition14, '@remotion/transitions/blur-slide': transition15, 'react/jsx-runtime': jsxRuntime, '@remotion/media': media, '@remotion/layout-utils': layout,
  '@remotion/motion-blur': blur, '@remotion/animation-utils': animation, '@remotion/gif': gif, '@remotion/lottie': lottie, react: React, remotion: R, '@remotion/shapes': shapes, '@remotion/paths': paths,
  '@remotion/noise': noise, '@remotion/transitions': tr, '@remotion/transitions/fade': {fade},
  '@remotion/transitions/slide': {slide}, '@remotion/transitions/wipe': {wipe}, '@remotion/transitions/flip': {flip}};

function compile(src) {
  const {code} = transform(src, {transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', production: true});
  const mod = {exports: {}};
  const req = (n) => { if (!(n in MODS)) throw new Error('Modul "' + n + '" tidak tersedia. Yang ada: ' + Object.keys(MODS).join(', ')); return MODS[n]; };
  new Function('require', 'module', 'exports', 'React', code)(req, mod, mod.exports, React);
  const ex = mod.exports;
  const comp = ex.default || Object.values(ex).find((v) => typeof v === 'function');
  if (!comp) throw new Error('Komponen tidak ditemukan. Gunakan: export default function Nama() {...}');
  return {comp, config: ex.config || {}};
}
const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };


export default function App() {
  const first = Object.keys(TEMPLATES)[0];
  const [code, setCode] = useState(() => localStorage.getItem('rsw-code') || TEMPLATES[first]);
  const [mode, setMode] = useState('remotion');
  const [html, setHtml] = useState(HTML_TEMPLATE);
  const [css, setCss] = useState(CSS_TEMPLATE);
  const [previewKey, setPreviewKey] = useState(0);
  const iframe = useRef(null), stage = useRef(null);
  const [stageWidth, setStageWidth] = useState(640);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stage.current); return () => observer.disconnect();
  }, []);
  const source = mode === 'html' ? html : mode === 'css' ? css : code;
  const updateSource = mode === 'html' ? setHtml : mode === 'css' ? setCss : setCode;
  const [documentSource, setDocumentSource] = useState('');
  const [preparedSource, setPreparedSource] = useState('');
  const [cfg, setCfg] = useState({width: 1280, height: 720, fps: 30, dur: 4});
  const [comp, setComp] = useState(null);
  const [err, setErr] = useState('');
  const [quality, setQuality] = useState('high');
  const [format, setFormat] = useState('auto');
  const [stillTime, setStillTime] = useState(1);
  const [encoders, setEncoders] = useState(null);
  const [prog, setProg] = useState(null);
  const [jobKind, setJobKind] = useState('');
  const [msg, setMsg] = useState('');
  const player = useRef(null), abort = useRef(null), lastCfg = useRef('');
  const previewScale = stageWidth / cfg.width;
  const frames = Math.max(1, Math.round(cfg.dur * cfg.fps));
  const set = (k) => (e) => setCfg((c) => ({...c, [k]: Number(e.target.value)}));
  let settingsError = '';
  try { validateSettings(cfg); } catch (e) { settingsError = e.message; }
  const busy = prog !== null;

  useEffect(() => {
    let alive = true;
    listEncodableFormats({width: 1280, height: 720, fps: 30, bitrate: 4_000_000})
      .then((list) => { if (alive) setEncoders(list.map((f) => f.label)); })
      .catch(() => { if (alive) setEncoders([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const receive = (event) => {
      if (event.source === iframe.current?.contentWindow && event.data?.type === 'animation-preview-error') {
        setErr(String(event.data.message).slice(0, 2000));
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    if (busy) return;
    const t = setTimeout(() => {
      setErr('');
      if (mode !== 'remotion') {
        setDocumentSource(createPreviewDocument(source, mode));
        setPreparedSource(mode + source);
        return;
      }
      try {
        const r = compile(code);
        setComp(() => r.comp); setErr(''); setPreparedSource(mode + source);
        const key = JSON.stringify(r.config);
        if (key !== lastCfg.current) {
          lastCfg.current = key;
          const {width, height, fps, durationInFrames} = r.config;
          setCfg((c) => ({...c, ...(width && {width}), ...(height && {height}), ...(fps && {fps}),
            ...(durationInFrames && {dur: durationInFrames / (fps || c.fps)})}));
        }
        localStorage.setItem('rsw-code', code);
      } catch (e) { setComp(null); setErr(String(e.message || e)); }
    }, 500);
    return () => clearTimeout(t);
  }, [code, source, mode, busy]);

  const composition = () => ({id: 'main', component: comp, durationInFrames: frames, fps: cfg.fps, width: cfg.width, height: cfg.height});

  async function exportMp4() {
    if (abort.current) return;
    const controller = new AbortController(); abort.current = controller;
    setJobKind('video'); setMsg('Memeriksa encoder…'); setProg(0);
    try {
      validateSettings(cfg);
      const videoBitrate = bitrateFor(cfg, quality);
      const fmt = await pickVideoFormat({...cfg, bitrate: videoBitrate, preferred: format});
      controller.signal.throwIfAborted();
      setMsg('Mengenkode dengan ' + fmt.label + (fmt.notice ? ' — ' + fmt.notice : '') + '…');
      let blob;
      if (mode === 'remotion') {
        const chk = await canRenderMediaOnWeb({width: cfg.width, height: cfg.height, container: fmt.container, videoCodec: fmt.codec, videoBitrate});
        controller.signal.throwIfAborted();
        if (!chk.canRender) throw new Error(chk.issues.map((i) => i.message).join('\n'));
        const {getBlob} = await renderMediaOnWeb({composition: composition(), container: fmt.container, videoCodec: fmt.codec,
          videoBitrate, delayRenderTimeoutInMilliseconds: 60000, signal: controller.signal, onProgress: (p) => setProg(Math.min(1, p.progress))});
        blob = await getBlob();
      } else {
        blob = await exportWebAnimation({source, mode, cfg: {...cfg}, quality, signal: controller.signal, onProgress: setProg, format: fmt});
      }
      controller.signal.throwIfAborted();
      if (!blob.size) throw new Error('Hasil video kosong.');
      const filename = `animasi-${cfg.width}x${cfg.height}-${cfg.fps}fps.${fmt.extension}`;
      save(blob, filename); setMsg('Selesai: ' + filename + ' terunduh (' + fmt.label + ').');
    } catch (e) { setMsg(controller.signal.aborted ? 'Ekspor dibatalkan.' : 'Gagal ekspor: ' + (e.message || e)); }
    finally {abort.current = null; setProg(null);}
  }
  async function exportPng() {
    if (abort.current) return;
    const controller = new AbortController(); abort.current = controller; setJobKind('png'); setProg(0); setMsg('Merender PNG…');
    try {
      validateSettings(cfg);
      let blob, name;
      if (mode === 'remotion') {
        const frame = player.current?.getCurrentFrame() ?? 0;
        ({blob} = await renderStillOnWeb({composition: composition(), frame, imageFormat: 'png', signal: controller.signal}));
        name = 'frame-' + frame + '.png';
      } else {
        const timeMs = Math.round(Math.max(0, Math.min(stillTime, cfg.dur)) * 1000);
        blob = await exportWebStill({source, mode, cfg: {...cfg}, timeMs, signal: controller.signal});
        name = 'frame-' + (timeMs / 1000) + 's.png';
      }
      controller.signal.throwIfAborted();
      save(blob, name); setMsg('PNG terunduh: ' + name);
    } catch (e) { setMsg(controller.signal.aborted ? 'Ekspor dibatalkan.' : 'Gagal ekspor PNG: ' + (e.message || e)); }
    finally {abort.current = null; setProg(null);}
  }
  const onTab = (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = e.target.selectionStart;
    updateSource(source.slice(0, s) + '  ' + source.slice(e.target.selectionEnd)); requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }); } };
  const openFile = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const text = await f.text();
      const next = /\.html?$/i.test(f.name) ? 'html' : /\.css$/i.test(f.name) ? 'css' : 'remotion';
      if (next === 'html') setHtml(text); else if (next === 'css') setCss(text); else setCode(text);
      setMode(next); setMsg('');
    } catch (error) { setMsg('Gagal membuka file: ' + error.message); }
  };

  return (
    <div className="app">
      <header>
        <h1>Remotion Studio Web</h1>
        <fieldset disabled={busy} className="row controls">
          <select onChange={(e) => e.target.value && (setCode(TEMPLATES[e.target.value]), setMode('remotion'))} defaultValue="">
            <option value="">Contoh kode…</option>{Object.keys(TEMPLATES).map((k) => <option key={k}>{k}</option>)}
          </select>
          <label className="btn">Buka file<input type="file" accept=".tsx,.jsx,.ts,.js,.txt,.html,.htm,.css" hidden onChange={openFile} /></label>
          <button onClick={() => save(new Blob([source], {type: mode === 'html' ? 'text/html' : mode === 'css' ? 'text/css' : 'text/plain'}), 'animasi.' + (mode === 'html' ? 'html' : mode === 'css' ? 'css' : 'tsx'))}>Simpan kode</button>
          <button onClick={async () => { try { await navigator.clipboard.writeText(source); setMsg('Kode disalin.'); } catch { setMsg('Tidak dapat menyalin. Gunakan Simpan kode.'); } }}>Salin</button>
        </fieldset>
      </header>
      <main>
        <section className="editor">
          <div className="mode-bar" role="group" aria-label="Jenis kode animasi">
            {[['remotion', 'Remotion / TSX'], ['html', 'HTML + CSS + JS'], ['css', 'CSS']].map(([value, label]) =>
              <button disabled={busy} key={value} aria-pressed={mode === value} onClick={() => {setMode(value); setErr(''); setMsg('');}}>{label}</button>)}
          </div>
          <textarea disabled={busy} spellCheck={false} value={source} onChange={(e) => updateSource(e.target.value)} onKeyDown={onTab} aria-label="Kode animasi" />
          {err && <pre className="err">{err}</pre>}
        </section>
        <section className="side">
          <div ref={stage} className="stage" style={{aspectRatio: cfg.width + '/' + cfg.height}}>
            {mode !== 'remotion' ? (!settingsError && <div style={{width: cfg.width, height: cfg.height, transform: `scale(${previewScale})`, transformOrigin: 'top left'}}><iframe key={previewKey} ref={iframe} title="Pratinjau animasi web" sandbox="allow-scripts" srcDoc={documentSource} /></div>) : comp && !settingsError && <Player ref={player} component={comp} durationInFrames={frames} fps={cfg.fps}
              compositionWidth={cfg.width} compositionHeight={cfg.height} controls loop style={{width: '100%', height: '100%'}}
              errorFallback={({error}) => <pre className="err">{error.message}</pre>} />}
          </div>
          {mode !== 'remotion' && <div className="row"><button disabled={busy} onClick={() => {setErr(''); setPreviewKey((key) => key + 1);}}>Putar ulang animasi</button><span className="hint">Pratinjau browser langsung</span></div>}
          <fieldset disabled={busy} className="grid controls">
            <label>Ukuran<select onChange={(e) => { const [w, h] = PRESETS[e.target.value]; setCfg((c) => ({...c, width: w, height: h})); }} value="">
              <option value="" disabled>{cfg.width}×{cfg.height}</option>{Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>Lebar (px)<input type="number" value={cfg.width} min="2" max="4096" step="2" onChange={set('width')} /></label>
            <label>Tinggi (px)<input type="number" value={cfg.height} min="2" max="4096" step="2" onChange={set('height')} /></label>
            <label>FPS<input type="number" value={cfg.fps} min="1" max="60" onChange={set('fps')} /></label>
            <label>Durasi (detik)<input type="number" step="0.5" value={cfg.dur} min="0.1" max={MAX_DURATION} onChange={set('dur')} /></label>
            <label>Kualitas<select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="very-high">Sangat tinggi</option></select></label>
            <label>Format video<select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="auto">Otomatis (browser ini)</option><option value="mp4">MP4 · H.264</option><option value="webm">WebM · VP9</option></select></label>
            {mode !== 'remotion' && <label>Waktu PNG (detik)<input type="number" step="0.25" value={stillTime} min="0" max={cfg.dur} onChange={(e) => setStillTime(Math.max(0, Number(e.target.value) || 0))} /></label>}
          </fieldset>
          {settingsError && <p className="err">{settingsError}</p>}
          <div className="row">
            <button className="primary" disabled={(mode === 'remotion' && !comp) || !!err || !!settingsError || preparedSource !== mode + source || busy} onClick={exportMp4}>Ekspor video</button>
            <button disabled={(mode === 'remotion' && !comp) || !!err || !!settingsError || preparedSource !== mode + source || busy} onClick={exportPng}>Ekspor frame PNG</button>
            {prog !== null && <button onClick={() => abort.current?.abort()}>Batalkan</button>}
          </div>
          {prog !== null && <progress value={prog} max="1" />}
          {prog !== null && jobKind === 'video' && <p className="msg">{Math.round(prog * 100)}% terender</p>}
          {msg && <p className="msg" role="status">{msg}</p>}
          <p className="hint">{mode === 'remotion'
            ? `${frames} frame · Remotion 4.0.536. Gunakan export default untuk komponen dan export const config untuk ukuran/FPS/durasi. Modul tersedia: ${Object.keys(MODS).join(', ')}.`
            : mode === 'html' ? 'Tempel dokumen HTML atau fragmen dengan <style> dan <script>. Mendukung CSS keyframes, SVG, Canvas, Web Animations API, serta pustaka browser melalui CDN. Gunakan URL aset absolut. Ekspor video/PNG mengikuti resolusi, FPS, dan durasi di atas; PNG dirender pada waktu yang dipilih.'
            : 'Tulis CSS termasuk @keyframes. Elemen contoh: .scene > .box. Gunakan mode HTML untuk markup sendiri. Ekspor video/PNG mengikuti resolusi, FPS, dan durasi di atas; PNG dirender pada waktu yang dipilih.'}</p>
          <p className="hint">{encoders === null ? 'Memeriksa dukungan encoder video…'
            : encoders.length ? 'Encoder video di browser ini: ' + encoders.join(', ') + '. Format “Otomatis” memilih yang terbaik dan tercepat.'
            : 'Browser ini tidak mendukung enkoding WebCodecs, sehingga ekspor video tidak tersedia.'}</p>
          <p className="hint">HTML berjalan dalam sandbox. Remotion menjalankan JavaScript di editor: buka hanya kode tepercaya. Paket npm di luar daftar, API Node.js, dan proyek multi-file belum didukung. Ekspor video memakai WebCodecs dengan fallback otomatis H.264 → VP9 → AV1 → VP8 (MP4/WebM); dukungan terbaik: Chrome/Edge 94+, Safari 16.4+, Firefox 130+ versi terbaru. Ekspor HTML/CSS tanpa audio; aset memerlukan CORS. Video/iframe tertanam, GIF bergerak, dan beberapa efek CSS tidak didukung. Gunakan Remotion untuk media dan sinkronisasi kompleks.</p>
        </section>
      </main>
    </div>
  );
}
