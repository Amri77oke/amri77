export const PRESETS = {
  'SD 854×480': [854, 480], 'HD 1280×720': [1280, 720],
  'Full HD 1920×1080': [1920, 1080], 'QHD 2560×1440': [2560, 1440],
  '4K UHD 3840×2160': [3840, 2160], 'Persegi 1080×1080': [1080, 1080],
  'Vertikal HD 720×1280': [720, 1280], 'Vertikal Full HD 1080×1920': [1080, 1920],
};
export const MAX_DIMENSION = 4096;
export const MAX_FPS = 60;
export const MAX_DURATION = 300;
export function validateSettings(cfg) {
  for (const key of ['width', 'height']) {
    if (!Number.isInteger(cfg[key]) || cfg[key] < 2 || cfg[key] > MAX_DIMENSION || cfg[key] % 2) {
      throw new Error('Lebar dan tinggi harus bilangan genap antara 2–4096 piksel.');
    }
  }
  if (!Number.isInteger(cfg.fps) || cfg.fps < 1 || cfg.fps > MAX_FPS) throw new Error('FPS harus bilangan bulat antara 1–60.');
  if (!Number.isFinite(cfg.dur) || cfg.dur < 0.1 || cfg.dur > MAX_DURATION) throw new Error('Durasi harus antara 0,1–300 detik.');
  return Math.max(1, Math.round(cfg.dur * cfg.fps));
}
export function bitrateFor(cfg, quality) {
  const factor = {low: 0.08, medium: 0.14, high: 0.22, 'very-high': 0.32}[quality] ?? 0.22;
  return Math.round(Math.max(1_000_000, Math.min(100_000_000, cfg.width * cfg.height * cfg.fps * factor)));
}
export function estimatedBytesFor(cfg, quality) {
  return Math.round(bitrateFor(cfg, quality) / 8 * cfg.dur);
}
