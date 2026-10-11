# FD Culinary

Katalog web statis yang dilayani dengan server Node.js kecil.

## Menjalankan lokal

Gunakan Node.js 20 atau lebih baru:

```sh
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Hosting preview gratis di Render

Konfigurasi layanan Render sudah tersedia di `render.yaml`.

1. Push folder proyek ini ke repository GitHub.
2. Di Render, pilih **New → Blueprint** dan hubungkan repository tersebut.
3. Pilih paket **Free** saat diminta. Render membaca `render.yaml`, lalu membangun dan menerbitkan situs.
4. Setelah deployment selesai, buka alamat `onrender.com` yang ditampilkan Render.

Render akan menerbitkan ulang perubahan setiap kali ada push ke branch yang terhubung. Layanan gratis akan tidur setelah 15 menit tanpa trafik, sehingga kunjungan pertama setelah jeda bisa memerlukan sekitar satu menit untuk aktif kembali. Paket ini sesuai untuk preview development, bukan layanan produksi.
