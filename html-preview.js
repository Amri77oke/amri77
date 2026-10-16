// User documents run in an opaque-origin iframe, without access to the editor.
export function createPreviewDocument(source, mode) {
  const bridge = `<script>
    const report = (message) => parent.postMessage({type: 'animation-preview-error', message: String(message)}, '*');
    addEventListener('error', (event) => report(event.message || 'Aset gagal dimuat.'), true);
    addEventListener('unhandledrejection', (event) => report(event.reason?.message || event.reason));
  </script>`;
  if (mode === 'css') {
    // Keep CSS inside a style element even when pasted content contains HTML.
    const css = source.replace(/<\/style/gi, '<\\/style');
    return `<!doctype html><html><head><meta charset="utf-8">${bridge}<style>
      html,body{margin:0;min-height:100%;}body{display:grid;place-items:center;min-height:100vh;background:#182033;}
      ${css}</style></head><body><div class="scene"><div class="box">ANIMATE</div></div></body></html>`;
  }
  // Insert before user scripts so syntax/runtime errors are reported as well.
  const head = /<head(?:\s[^>]*)?>/i;
  if (head.test(source)) return source.replace(head, (tag) => tag + bridge);
  const doctype = /<!doctype[^>]*>/i;
  if (doctype.test(source)) return source.replace(doctype, (tag) => tag + bridge);
  return '<!doctype html>' + bridge + source;
}
