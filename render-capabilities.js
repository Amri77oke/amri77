// Video encoding capability probing shared by every export path.
// Keeps a node-safe surface (mediabunny is imported dynamically) so tests can run without a browser.
export const FORMAT_CANDIDATES = [
  {id: 'h264-mp4', codec: 'h264', mediabunnyCodec: 'avc', container: 'mp4', extension: 'mp4', mime: 'video/mp4', label: 'H.264 (MP4)'},
  {id: 'vp9-webm', codec: 'vp9', mediabunnyCodec: 'vp9', container: 'webm', extension: 'webm', mime: 'video/webm', label: 'VP9 (WebM)'},
  {id: 'av1-mp4', codec: 'av1', mediabunnyCodec: 'av1', container: 'mp4', extension: 'mp4', mime: 'video/mp4', label: 'AV1 (MP4)'},
  {id: 'vp8-webm', codec: 'vp8', mediabunnyCodec: 'vp8', container: 'webm', extension: 'webm', mime: 'video/webm', label: 'VP8 (WebM)'},
];

const PREFERRED_ORDER = {mp4: ['h264-mp4', 'av1-mp4'], webm: ['vp9-webm', 'vp8-webm']};
const PREFERRED_LABEL = {mp4: 'MP4', webm: 'WebM'};

const hasWebCodecs = () => typeof window !== 'undefined' && 'VideoEncoder' in window;

export async function listEncodableFormats({width, height, fps, bitrate}) {
  if (!hasWebCodecs()) return [];
  const {canEncodeVideo} = await import('mediabunny');
  const options = {width, height, bitrate, frameRate: fps};
  const encodable = [];
  for (const candidate of FORMAT_CANDIDATES) {
    if (await canEncodeVideo(candidate.mediabunnyCodec, options)) encodable.push(candidate);
  }
  return encodable;
}

export async function pickVideoFormat({width, height, fps, bitrate, preferred = 'auto'}) {
  if (!hasWebCodecs()) {
    throw new Error('Browser ini tidak mendukung WebCodecs VideoEncoder sehingga video tidak dapat dienkode. '
      + 'Gunakan Chrome/Edge 94+, Safari 16.4+, atau Firefox 130+ versi terbaru.');
  }
  const encodable = await listEncodableFormats({width, height, fps, bitrate});
  const order = preferred === 'auto' ? FORMAT_CANDIDATES.map((c) => c.id) : (PREFERRED_ORDER[preferred] ?? []);
  for (const id of order) {
    const candidate = encodable.find((c) => c.id === id);
    if (candidate) return candidate;
  }
  if (encodable.length) {
    const fallback = encodable[0];
    const notice = 'Format ' + (PREFERRED_LABEL[preferred] ?? preferred)
      + ' tidak didukung encoder browser ini; otomatis memakai ' + fallback.label + '.';
    return {...fallback, notice};
  }
  throw new Error('Tidak ada encoder video di browser ini untuk ' + width + '×' + height
    + ' pada bitrate yang dipilih. Turunkan resolusi/kualitas atau perbarui browser '
    + '(Chrome/Edge 94+, Safari 16.4+, Firefox 130+).');
}