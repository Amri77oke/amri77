# Remotion Studio Web
Deploy ke Netlify: push ke GitHub lalu "Import project" (build otomatis dari netlify.toml), atau `npm i && npm run build` lalu seret folder `dist` ke app.netlify.com/drop.
Ekspor video berjalan di browser melalui WebCodecs dengan pemilihan encoder otomatis: H.264 (MP4) → VP9 (WebM) → AV1 (MP4) → VP8 (WebM), sehingga bekerja di Chrome/Edge 94+, Safari 16.4+, dan Firefox 130+ versi terbaru. Dukungan encoder untuk resolusi dan bitrate yang dipilih diperiksa sebelum render; bila format yang dipilih tidak tersedia, browser otomatis memakai format terbaik yang ada dan memberi tahu pengguna. Status encoder terdeteksi ditampilkan di panel.

Editor mendukung tiga mode:

- **Remotion / TSX**: komponen React/TypeScript satu file dengan `export default`. Remotion dan semua paket pendamping dipatok pada versi 4.0.536 (versi npm terbaru saat pembaruan). Tersedia shapes, paths, noise, semua submodul transisi, media, layout-utils, motion-blur, animation-utils, gif, dan lottie. Daftar impor tersedia di editor. Enam contoh siap pakai: judul pegas, grafik batang, transisi & bentuk, partikel noise, teks gradasi, dan hitung mundur.
- **HTML + CSS + JS**: dokumen HTML lengkap atau fragmen dengan `<style>` dan `<script>`. Mendukung animasi browser seperti CSS keyframes, SVG, Canvas, Web Animations API, dan pustaka browser dari CDN yang mengizinkan pemuatan lintas origin. Gunakan URL absolut untuk aset dan impor modul browser.
- **CSS**: stylesheet dengan elemen contoh `.scene > .box`. Untuk markup khusus, gunakan mode HTML.

Setiap mode mempertahankan draf selama halaman terbuka. Buka file mendeteksi `.html`, `.htm`, `.css`, atau kode Remotion; Simpan kode mengunduh format sesuai mode. Tombol Putar ulang memuat ulang dokumen web beserta skripnya.

HTML dijalankan dalam iframe sandbox tanpa akses ke origin editor. Skrip Remotion dijalankan di konteks editor, jadi gunakan hanya kode tepercaya. Tidak semua kode animasi dapat dijalankan: API Node.js, impor file lokal/proyek multi-file, dan paket npm yang belum disediakan tidak didukung. Pustaka CDN bergantung pada jaringan, CORS, dan izin sandbox. Draf HTML/CSS perlu diunduh sebelum meninggalkan halaman.

Ekspor video (MP4/WebM) tersedia pada ketiga mode. Resolusi SD, HD, Full HD, QHD, 4K, persegi, vertikal, serta ukuran khusus dipakai bersama oleh pratinjau dan ekspor. Pratinjau web memakai viewport pada ukuran output dan diperkecil agar muat di panel. Ukuran H.264 harus genap (2–4096 px), FPS bulat 1–60, dan durasi 0,1–300 detik — jauh melampaui 30 detik. Jumlah frame dibulatkan dari durasi × FPS. Kualitas mengatur bitrate berdasarkan jumlah piksel dan FPS. Resolusi besar tetap bergantung pada kapasitas encoder dan memori perangkat; turunkan resolusi bila pemeriksaan gagal.

Render dipercepat pada mode HTML/CSS: CSS font dihitung satu kali dan dipakai ulang untuk semua frame, hasil rasterisasi dipindahkan sebagai ImageBitmap tanpa penyandian PNG, serta rasterisasi frame berikutnya berjalan paralel dengan penyandian frame saat ini. Batas waktu per frame menyesuaikan resolusi (30 detik pada 720p hingga 180 detik pada 4K), dan pemuatan aset diberi batas 60 detik. Untuk video yang diperkirakan lebih dari ±700 MB, muxer MP4 menulis metadata di akhir file agar penggunaan memori tetap stabil pada durasi panjang. Bila `delayRender` di komposisi Remotion butuh lebih lama, batas waktu dinaikkan menjadi 60 detik.

Remotion memakai renderer per frame dengan audio dari komposisi. HTML/CSS dirender dari awal dalam iframe sandbox terpisah: waktu CSS/Web Animations, requestAnimationFrame, Date.now/performance.now, dan timer dijalankan berdasarkan frame, kemudian DOM/SVG/Canvas dirasterisasi dan dienkode ke MP4/WebM. Render tidak merekam layar dan tidak bergantung pada kecepatan pemutaran pratinjau.

Ekspor frame PNG tersedia pada semua mode: mode Remotion memakai posisi playhead, sedangkan mode HTML/CSS merender waktu (detik) yang diketik di panel. Ekspor web menghasilkan video tanpa audio. Elemen video, audio, dan iframe tertanam ditolak dengan pesan yang jelas. GIF bergerak, WebGL tanpa preserveDrawingBuffer, beberapa efek CSS/filter, worker, interaksi pengguna, dan pustaka yang memakai jam sendiri belum dijamin. Aset/font dari luar harus mengizinkan CORS untuk origin sandbox; aset rusak, skrip bermasalah, dan pemuatan yang melebihi batas waktu menghasilkan kesalahan. Untuk animasi media atau sinkronisasi kompleks, gunakan Remotion. Kode browser arbitrer tidak dapat dijamin seluruhnya kompatibel dengan rasterisasi DOM.

Selama ekspor, kode dan pengaturan dikunci; Batalkan menghentikan render dan membersihkan iframe/encoder; progres ditampilkan dalam persen. Nama unduhan menyertakan resolusi, FPS, dan format. Output MP4/WebM disimpan di memori browser hingga selesai, jadi video panjang dengan resolusi besar memerlukan RAM yang cukup.

Validasi pengaturan dan daftar format encoder dapat diuji dengan `node --test export-settings.test.js`.
