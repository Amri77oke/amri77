# Remotion Studio Web
Deploy ke Netlify: push ke GitHub lalu "Import project" (build otomatis dari netlify.toml), atau `npm i && npm run build` lalu seret folder `dist` ke app.netlify.com/drop.
Ekspor MP4 berjalan di browser (WebCodecs): Chrome/Edge 94+, Firefox 130+, Safari 26+.

Editor mendukung tiga mode:

- **Remotion / TSX**: komponen React/TypeScript satu file dengan `export default`. Remotion dan semua paket pendamping dipatok pada versi 4.0.536 (versi npm terbaru saat pembaruan). Tersedia shapes, paths, noise, semua submodul transisi, media, layout-utils, motion-blur, animation-utils, gif, dan lottie. Daftar impor tersedia di editor.
- **HTML + CSS + JS**: dokumen HTML lengkap atau fragmen dengan `<style>` dan `<script>`. Mendukung animasi browser seperti CSS keyframes, SVG, Canvas, Web Animations API, dan pustaka browser dari CDN yang mengizinkan pemuatan lintas origin. Gunakan URL absolut untuk aset dan impor modul browser.
- **CSS**: stylesheet dengan elemen contoh `.scene > .box`. Untuk markup khusus, gunakan mode HTML.

Setiap mode mempertahankan draf selama halaman terbuka. Buka file mendeteksi `.html`, `.htm`, `.css`, atau kode Remotion; Simpan kode mengunduh format sesuai mode. Tombol Putar ulang memuat ulang dokumen web beserta skripnya.

HTML dijalankan dalam iframe sandbox tanpa akses ke origin editor. Skrip Remotion dijalankan di konteks editor, jadi gunakan hanya kode tepercaya. Tidak semua kode animasi dapat dijalankan: API Node.js, impor file lokal/proyek multi-file, dan paket npm yang belum disediakan tidak didukung. Pustaka CDN bergantung pada jaringan, CORS, dan izin sandbox. Draf HTML/CSS perlu diunduh sebelum meninggalkan halaman.

Ekspor MP4 dan PNG hanya tersedia pada mode Remotion dan bergantung pada dukungan browser serta fitur web renderer. Pratinjau HTML/CSS berjalan langsung mengikuti waktu browser dan belum memiliki ekspor video atau sinkronisasi frame dengan FPS/durasi Remotion.
