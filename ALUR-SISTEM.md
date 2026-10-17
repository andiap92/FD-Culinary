# Alur Sistem FD Culinary Saat Ini

Dokumen ini menggambarkan implementasi yang ada di repositori: katalog statis, server Node.js untuk menyajikan file, dan alur pemesanan yang berakhir di WhatsApp. Sistem saat ini tidak memiliki API, database, maupun pemrosesan pesanan di server.

## 1. Alur pengguna dan pemesanan

```mermaid
flowchart TD
    U[Pengunjung membuka situs] --> S[Server Node.js menerima HTTP request]
    S --> R{Path yang diminta}
    R -->|/| HTML[public/index.html]
    R -->|/src/*| SRC[src/ JavaScript dan CSS]
    R -->|/assets/*| ASSET[public/assets gambar dan video]
    HTML --> B[Browser menjalankan halaman]
    SRC --> B
    ASSET --> B
    B --> DATA[src/data/catalog.js: katalog, review, konfigurasi]
    DATA --> C[Katalog dan konten ditampilkan]
    C --> F[Pengunjung memilih kategori/keluarga produk atau mencari]
    F --> P[Daftar produk diperbarui di browser]
    P --> A[Pilih ukuran dan atur jumlah dengan kontrol − / +]
    A --> CART[Keranjang sementara di memori browser]
    CART --> BAR[Ringkasan jumlah dan total tampil di bar bawah]
    BAR --> EDIT[Buka keranjang untuk ubah jumlah atau hapus item]
    EDIT --> CHECKOUT[Tombol Checkout]
    CHECKOUT --> MESSAGE[Ringkasan item, jumlah, harga, dan total dirangkai per baris]
    MESSAGE --> ENCODE[Pesan di-encode dengan encodeURIComponent]
    ENCODE --> THANKS[Pop-up terima kasih tampil selama 3 detik]
    THANKS --> RESET[Keranjang dikosongkan dan halaman dimuat ulang]
    RESET --> WA[Buka WhatsApp dengan detail pesanan]
    WA --> SEND[Pengunjung memeriksa lalu mengirim pesan]
    A -->|Tidak| C
```

## 2. Komponen dan batas sistem

```mermaid
flowchart LR
    subgraph Browser[Browser pengunjung]
        UI[public/index.html + src/css/styles.css]
        APP[src/js/app.js: filter, pencarian, keranjang, checkout WhatsApp, review]
        STATE[State sementara: keranjang dan pilihan UI]
        UI <--> APP
        APP <--> STATE
    end
    subgraph Hosting[Server/hosting]
        NODE[server.js: HTTP static file server]
        FILES[public/ dan src/]
        NODE --> FILES
    end
    Browser -->|GET halaman, script, stylesheet, gambar, video| NODE
    APP -->|tautan wa.me dengan pesan awal| WA[WhatsApp eksternal]
    CONFIG[src/data/catalog.js: data katalog dan nomor WhatsApp] --> APP
```

## Catatan perilaku saat ini

- `server.js` hanya melayani file statis. Request `/` diarahkan ke `public/index.html`; file `/src/*` disajikan dari folder `src`, dan aset lain dari `public`.
- Data produk, ulasan, nomor WhatsApp, dan sumber video berada di `src/data/catalog.js`.
- Pencarian, filter, pengatur jumlah pada kartu, dan keranjang dijalankan di browser. Keranjang disimpan dalam `Map` di memori, sehingga tidak tersimpan setelah halaman dimuat ulang.
- Saat keranjang berisi produk, ringkasan item dan total beserta tombol **Lihat keranjang** muncul tetap di bagian bawah layar.
- Tombol **Checkout** merangkai nama produk, ukuran, jumlah, total tiap produk, dan total pesanan menjadi pesan berbaris. Pesan di-encode dengan `encodeURIComponent` sebelum ditambahkan ke tautan WhatsApp.
- Setelah checkout, pop-up ucapan terima kasih tampil selama 3 detik. Keranjang dikosongkan, halaman dimuat ulang, lalu browser beralih ke WhatsApp membawa detail pesanan.
- Checkout membuka percakapan WhatsApp yang dituju. Pelanggan memeriksa detail pesanan lalu mengirim pesan sendiri; pesanan tidak disimpan di server.
