# FD Culinary

Katalog web statis yang dilayani dengan server Node.js kecil.

## Menjalankan lokal

Gunakan Node.js 24 LTS (versi stabil terbaru yang dipilih untuk proyek ini):

```sh
npm install
npm run dev
```

Buka `http://localhost:3000`.

Versi runtime yang digunakan ditetapkan pada `.nvmrc`, `package.json`, dan `render.yaml` agar lingkungan lokal dan hosting tetap selaras. Kode menggunakan JavaScript modern berbasis modul ES, yang dijalankan langsung oleh Node.js 24 tanpa proses kompilasi tambahan.

## Hosting preview gratis di Render

Konfigurasi layanan Render sudah tersedia di `render.yaml`.

1. Push folder proyek ini ke repository GitHub.
2. Di Render, pilih **New → Blueprint** dan hubungkan repository tersebut.
3. Pilih paket **Free** saat diminta. Render membaca `render.yaml`, lalu membangun dan menerbitkan situs.
4. Setelah deployment selesai, buka alamat `onrender.com` yang ditampilkan Render.

Render akan menerbitkan ulang perubahan setiap kali ada push ke branch yang terhubung. Layanan gratis akan tidur setelah 15 menit tanpa trafik, sehingga kunjungan pertama setelah jeda bisa memerlukan sekitar satu menit untuk aktif kembali. Paket ini sesuai untuk preview development, bukan layanan produksi.
