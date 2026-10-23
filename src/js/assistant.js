import { catalogItems } from "/src/data/catalog.js";

// Teks ini menjelaskan bagian situs saat pengunjung mengarahkan kursor atau fokus ke sana.
const TOPIC_GUIDES = {
  hero: "Ini bagian pembuka FD Culinary. Harga minuman dimulai dari Rp16.000; tekan “Lihat menu” untuk melihat pilihan.",
  navigation: "Gunakan menu di atas untuk berpindah ke Beranda, Menu, Cerita Kami, atau Review. Kotak pencarian membantu menemukan menu tertentu.",
  cart: "Keranjang berisi produk yang kamu pilih. Atur jumlahnya, periksa subtotal, lalu tekan Checkout untuk meneruskan pesanan ke WhatsApp.",
  story: "Di sini kamu bisa mengenal cara FD Culinary meracik minuman, bahan yang digunakan, dan komitmen kesegarannya.",
  catalog: "Ini katalog menu. Pilih Milk & Tea atau Coffee, atur ukuran 250 ml atau 1 L, lalu gunakan tombol + untuk menambah pesanan.",
  "video-review": "Bagian ini menampilkan video pengalaman pelanggan FD Culinary.",
  reviews: "Berikut ulasan pelanggan. Gunakan tombol panah untuk melihat cerita pelanggan berikutnya.",
  contact: "Untuk menanyakan ketersediaan, pengiriman, atau pesanan khusus, hubungi FD Culinary lewat WhatsApp di bagian bawah halaman."
};

// Kalimat ini merangkum komposisi yang sudah dijelaskan pada katalog dengan gaya promosi yang lugas.
const PRODUCT_COPY = {
  "roasted-jasmine": "Teh jasmine panggang dan susu segar berpadu dengan aroma floral yang lembut.",
  "roasted-oolong": "Teh oolong roasted bertemu tekstur susu yang creamy, dengan rasa hangat yang nyaman dinikmati.",
  "blooming-jasmine": "Teh jasmine bening dengan bunga jasmine asli untuk rasa yang fresh dan harum alami.",
  "matcha-latte": "Matcha lembut dan susu berpadu dengan rasa manis yang tetap seimbang.",
  "choco-hazelnut": "Cokelat pekat dan aroma hazelnut menyatu dalam rasa yang lembut dan kaya.",
  "palm-sugar-latte": "Kopi susu dan gula aren legit menyatu dengan rasa yang seimbang.",
  "creamy-butterscotch": "Kopi creamy berpadu dengan butterscotch bercita rasa manis-gurih.",
  "creamy-caramel": "Kopi susu klasik dengan sentuhan karamel yang lembut dan silky.",
  "fudgy-brownies": "Brownies cokelat pekat dengan bagian tengah fudgy yang memanjakan.",
  "basque-cheesecake": "Cheesecake creamy dengan permukaan karamel khas yang menggoda.",
  "butter-croissant": "Croissant berlapis dengan rasa buttery, ringan, dan renyah."
};

// Elemen penting chatbot dikumpulkan di sini agar pengelolaan antarmuka terpusat.
const chat = {
  panel: document.querySelector("#assistantPanel"), launcher: document.querySelector("#assistantLauncher"),
  close: document.querySelector("#assistantClose"), messages: document.querySelector("#assistantMessages"),
  context: document.querySelector("#assistantContext"), form: document.querySelector("#assistantForm"),
  input: document.querySelector("#assistantInput"), suggestions: document.querySelector("#assistantSuggestions")
};

// Catat konteks terakhir supaya pertanyaan pendek dapat dijawab sesuai produk yang dilihat.
let activeTopic = "hero";
let activeProduct = null;
let replyTimer;

/** Menambah pesan sebagai teks biasa agar masukan pengguna tidak dianggap markup HTML. */
function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className = `assistant-message ${sender}`;
  message.textContent = text;
  chat.messages.append(message);
  chat.messages.scrollTop = chat.messages.scrollHeight;
}

/** Membuka atau menutup panel percakapan dan menjaga status tombol aksesibel. */
function toggleChat(isOpen) {
  chat.panel.classList.toggle("is-open", isOpen);
  chat.launcher.setAttribute("aria-expanded", String(isOpen));
  chat.launcher.setAttribute("aria-label", isOpen ? "Tutup asisten FD Culinary" : "Buka asisten FD Culinary");
  if (isOpen) {
    chat.input.focus({ preventScroll: true });
  }
}

/** Mengganti petunjuk kecil di widget dengan penjelasan bagian yang sedang dilihat. */
function updateContext(topic, product = null) {
  activeTopic = topic;
  activeProduct = product;
  const message = product
    ? `${product.name}: ${product.description} Harga ${formatRupiah(product.price)} untuk 250 ml${product.price1L ? ` dan ${formatRupiah(product.price1L)} untuk 1 L` : ""}.`
    : TOPIC_GUIDES[topic] ?? TOPIC_GUIDES.hero;
  chat.context.lastElementChild.textContent = message;
}

/** Mengubah angka menjadi format rupiah untuk penjelasan menu. */
function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

/** Menulis penjelasan komposisi dan harga setiap kali pengunjung memilih produk. */
function explainProductSelection(product, card) {
  const selectedSize = card.querySelector(".size-option.is-selected")?.dataset.sizeValue;
  const isLiter = selectedSize === "1L" && product.price1L;
  const sizeLabel = isLiter ? "1 L" : product.size || "250 ml";
  const price = isLiter ? product.price1L : product.price;
  updateContext("catalog", product);
  addMessage(`${product.name}: ${PRODUCT_COPY[product.id] ?? product.description} Pilihan ${sizeLabel} tersedia seharga ${formatRupiah(price)}.`, "bot");
}

/** Menemukan produk dari nama, nomor kartu, atau bagian situs yang sedang diperhatikan. */
function findProduct(question) {
  const normalized = question.toLocaleLowerCase("id-ID");
  return catalogItems.find((product) => normalized.includes(product.name.toLocaleLowerCase("id-ID")));
}

/** Menjawab pertanyaan menggunakan katalog, harga, alur keranjang, dan konten situs. */
function createReply(question) {
  const normalized = question.toLocaleLowerCase("id-ID");
  const mentionedProduct = findProduct(normalized);
  const product = mentionedProduct ?? activeProduct;
  const asksProductDetails = /harga|berapa|ukuran|rasa|komposisi|tentang|ini\b|detail/.test(normalized);
  if (product && (mentionedProduct || (activeProduct && asksProductDetails))) {
    const sizePrice = product.price1L ? ` Ukuran 250 ml ${formatRupiah(product.price)} dan 1 L ${formatRupiah(product.price1L)}.` : ` Harga ${product.size} ${formatRupiah(product.price)}.`;
    const composition = PRODUCT_COPY[product.id] ?? product.description;
    return `${product.name}: ${composition}${sizePrice} Kamu bisa memilih ukuran dan jumlahnya langsung pada kartu menu.`;
  }
  if (/kurang manis|tidak terlalu manis|tidak manis|less sugar|manis.*sedikit/.test(normalized)) {
    const matcha = catalogItems.find((item) => item.id === "matcha-latte");
    return `Kalau kamu mencari rasa yang tidak terlalu manis, Matcha Latte bisa jadi pilihan. Matcha lembut dan susu berpadu dengan rasa manis yang seimbang. Harganya ${formatRupiah(matcha.price)} untuk 250 ml atau ${formatRupiah(matcha.price1L)} untuk 1 L.`;
  }
  if (/menu|produk|minuman|kopi|coffee|tea|teh|rasa|kue|brownies|croissant|cheese|latte/.test(normalized)) {
    const products = catalogItems.filter((item) => item.category === "drink" && (activeTopic !== "catalog" || !activeProduct || item.family === activeProduct.family));
    const menuList = products.map((item) => `${item.name} (${formatRupiah(item.price)})`).join(", ");
    return `Menu minuman kami: ${menuList}. Ada juga kue seperti Fudgy Chocolate Brownies, Basque Cheesecake, dan Butter Croissant. Pilih tab Milk & Tea atau Coffee untuk menyaring menu.`;
  }
  if (/harga|berapa|price|budget/.test(normalized)) {
    const drinks = catalogItems.filter((item) => item.category === "drink");
    const smallest = Math.min(...drinks.map((item) => item.price));
    const highest = Math.max(...drinks.map((item) => item.price));
    return `Harga minuman ukuran 250 ml mulai ${formatRupiah(smallest)} sampai ${formatRupiah(highest)}. Pilihan 1 L tersedia mulai ${formatRupiah(Math.min(...drinks.map((item) => item.price1L)))}. Tunjuk atau pilih menu untuk melihat harga ukurannya.`;
  }
  if (/keranjang|pesan|order|checkout|beli|cara/.test(normalized)) {
    return "Pilih ukuran menu, tekan tombol + untuk menentukan jumlah, lalu buka keranjang. Tekan Checkout untuk meneruskan pesanan ke WhatsApp FD Culinary.";
  }
  if (/kirim|antar|delivery|lokasi|alamat|ongkir|pengiriman/.test(normalized)) {
    return "Informasi jangkauan pengiriman dan ongkir dikonfirmasi langsung oleh admin. Kamu bisa pilih produk, lalu tekan Checkout untuk menghubungi FD Culinary lewat WhatsApp.";
  }
  if (/jam|buka|tutup|operasional/.test(normalized)) {
    return "Jam operasional belum dicantumkan di halaman ini. Hubungi admin melalui WhatsApp untuk memastikan jam layanan hari ini.";
  }
  if (/review|ulasan|pelanggan|testimoni/.test(normalized)) {
    return "Gulir ke bagian Review untuk melihat pengalaman pelanggan FD Culinary. Di bagian Cerita Kami, kamu juga bisa membaca tentang bahan dan cara peracikan kami.";
  }
  if (/halo|hai|hello|assalam|pagi|siang|sore|malam/.test(normalized)) {
    return "Hai! Senang bertemu denganmu. Kamu sedang melihat bagian ${contextName(activeTopic)}. Mau tanya soal menu, harga, atau cara pesan?";
  }
  return `Aku bisa bantu jelaskan ${contextName(activeTopic)}, menu dan harga, pilihan ukuran, atau cara memesan. Coba tanyakan “Menu apa yang tersedia?”`;
}

/** Mengubah nama topik internal menjadi sebutan yang mudah dipahami pengunjung. */
function contextName(topic) {
  const names = { hero: "beranda FD Culinary", story: "cerita FD Culinary", catalog: "katalog menu", "video-review": "video review", reviews: "ulasan pelanggan", contact: "informasi kontak" };
  return activeProduct?.name ?? names[topic] ?? "halaman ini";
}

/** Menampilkan indikator sedang membalas sebelum memasukkan jawaban demo. */
function showReply(question) {
  const typing = document.createElement("div");
  typing.className = "assistant-typing";
  typing.setAttribute("aria-label", "Asisten sedang menulis");
  typing.innerHTML = "<i></i><i></i><i></i>";
  chat.messages.append(typing);
  chat.messages.scrollTop = chat.messages.scrollHeight;
  window.clearTimeout(replyTimer);
  replyTimer = window.setTimeout(() => {
    typing.remove();
    addMessage(createReply(question), "bot");
  }, 420);
}

/** Memproses pertanyaan pengunjung dan menambahkan pertanyaan itu ke percakapan. */
function submitQuestion(question) {
  const message = question.trim();
  if (!message) return;
  addMessage(message, "user");
  chat.input.value = "";
  showReply(message);
}

/** Memperbarui petunjuk saat pengunjung menjangkau bagian situs dengan papan ketik. */
function handleFocusContext(event) {
  const productCard = event.target.closest("[data-product-card]");
  if (productCard) {
    const product = catalogItems.find((item) => item.id === productCard.dataset.productCard);
    if (product) updateContext("catalog", product);
    return;
  }
  const section = event.target.closest("[data-assistant-topic]");
  if (section) updateContext(section.dataset.assistantTopic);
}

/** Menjelaskan produk setelah pengunjung memilih ukuran atau menambahkannya ke keranjang. */
function handleProductSelection(event) {
  const selection = event.target.closest("[data-size-option], [data-product-quantity]");
  if (!selection) return;
  if (selection.matches("[data-product-quantity]") && selection.dataset.delta !== "1") return;
  const card = selection.closest("[data-product-card]");
  const product = catalogItems.find((item) => item.id === card?.dataset.productCard);
  if (product) {
    if (!chat.panel.classList.contains("is-open")) toggleChat(true);
    explainProductSelection(product, card);
  }
}

/** Menghubungkan sapaan otomatis, tombol saran, formulir, dan deteksi konteks halaman. */
function bindAssistant() {
  chat.form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(chat.input.value);
  });
  chat.launcher.addEventListener("click", () => toggleChat(!chat.panel.classList.contains("is-open")));
  chat.close.addEventListener("click", () => toggleChat(false));
  chat.suggestions.addEventListener("click", (event) => {
    const suggestion = event.target.closest("[data-assistant-prompt]");
    if (suggestion) submitQuestion(suggestion.dataset.assistantPrompt);
  });
  document.addEventListener("focusin", handleFocusContext);
  document.addEventListener("click", handleProductSelection);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chat.panel.classList.contains("is-open")) toggleChat(false);
  });
  window.setTimeout(() => {
    toggleChat(true);
    if (!chat.messages.childElementCount) {
      addMessage("Hai, selamat datang di FD Culinary! Pilih menu untuk melihat komposisi dan harga, atau tanyakan apa saja di sini.", "bot");
    }
  }, 700);
}

// Mulai panduan kontekstual setelah semua elemen halaman tersedia.
bindAssistant();
