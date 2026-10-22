import { catalogItems, reviews, siteConfig } from "/src/data/catalog.js";

const drinkSizes = [
  { key: "250ml", label: "250 ml" },
  { key: "1L", label: "1 L" }
];
// Kunci ini menyimpan tujuan checkout sementara sebelum halaman diarahkan ke WhatsApp.
const pendingCheckoutKey = "fdCulinaryPendingWhatsAppCheckout";

// Seluruh pilihan antarmuka disimpan di satu objek agar perubahan mudah dilacak.
const state = {
  activeCategory: "drink",
  activeProductFamily: "Milk & Tea Based",
  reviewIndex: 0,
  reviewTimer: null,
  searchQuery: "",
  cart: new Map(),
  selectedSizes: Object.fromEntries(
    catalogItems
      .filter((product) => product.category === "drink")
      .map((product) => [product.id, drinkSizes[0].key])
  )
};

const elements = {
  catalogResult: document.querySelector("#catalogResult"),
  familyFilterButtons: [...document.querySelectorAll("[data-product-family]")],
  currentYear: document.querySelector("#currentYear"),
  mobileMenuButton: document.querySelector("#mobileMenuButton"),
  navPanel: document.querySelector("#navPanel"),
  footerWhatsapp: document.querySelector("#footerWhatsapp"),
  openCartButtons: [...document.querySelectorAll("[data-open-cart]")],
  cartButton: document.querySelector("#cartButton"),
  cartCount: document.querySelector("#cartCount"),
  stickyCartBar: document.querySelector("#stickyCartBar"),
  stickyCartSummary: document.querySelector("#stickyCartSummary"),
  stickyCartOpen: document.querySelector("#stickyCartOpen"),
  cartDialog: document.querySelector("#cartDialog"),
  cartClose: document.querySelector("#cartClose"),
  cartEmpty: document.querySelector("#cartEmpty"),
  cartItems: document.querySelector("#cartItems"),
  cartSummary: document.querySelector("#cartSummary"),
  cartTotal: document.querySelector("#cartTotal"),
  continueShopping: document.querySelector("#continueShopping"),
  checkoutButton: document.querySelector("#checkoutButton"),
  checkoutThankYou: document.querySelector("#checkoutThankYou"),
  productGrid: document.querySelector("#productGrid"),
  reviewCard: document.querySelector("#reviewCard"),
  reviewHeading: document.querySelector("#reviewsTitle"),
  reviewNext: document.querySelector("#reviewNext"),
  reviewPrevious: document.querySelector("#reviewPrevious"),
  reviewProgress: document.querySelector("#reviewProgress"),
  reviewVideo: document.querySelector("#reviewVideo"),
  reviewVideoSection: document.querySelector("#video-review"),
  searchInput: document.querySelector("#searchInput"),
  videoPlaceholder: document.querySelector("#videoPlaceholder")
};

/** Memformat angka sebagai rupiah tanpa angka desimal. */
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

/** Memformat nilai pesanan agar ringkas saat dikirim melalui WhatsApp. */
function formatWhatsAppAmount(value) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

/** Mengambil harga dan label berdasarkan ukuran minuman yang dipilih. */
function getProductOption(product, size = state.selectedSizes[product.id] ?? drinkSizes[0].key) {
  const selectedSize = drinkSizes.find((option) => option.key === size) ?? drinkSizes[0];
  const isLiter = product.category === "drink" && selectedSize.key === drinkSizes[1].key;
  return {
    sizeKey: isLiter ? selectedSize.key : drinkSizes[0].key,
    sizeLabel: isLiter ? selectedSize.label : product.size,
    price: isLiter ? product.price1L : product.price
  };
}

/** Membuat tombol pilihan ukuran pada kartu minuman. */
function createSizeSelector(product, selectedSize) {
  return `
    <div class="size-selector" role="group" aria-label="Pilih ukuran ${product.name}">
      ${drinkSizes.map(({ key, label }) => `
        <button
          class="size-option${selectedSize === key ? " is-selected" : ""}"
          type="button"
          data-size-option="${product.id}"
          data-size-value="${key}"
          aria-pressed="${selectedSize === key}"
        >${label}</button>
      `).join("")}
    </div>`;
}

/** Mengubah jumlah produk terpilih langsung dari kartu katalog. */
function changeProductQuantity(productId, delta) {
  const product = catalogItems.find((item) => item.id === productId);
  if (!product || product.category !== "drink") return;
  const option = getProductOption(product);
  const key = `${product.id}:${option.sizeKey}`;
  const current = state.cart.get(key);
  const nextQuantity = (current?.quantity ?? 0) + delta;
  if (nextQuantity <= 0) state.cart.delete(key);
  else state.cart.set(key, { key, productId: product.id, sizeKey: option.sizeKey, quantity: nextQuantity });
  renderCart();
  updateProductCard(product.id);
}

/** Menghitung ulang rincian keranjang berdasarkan data katalog terbaru. */
function getCartEntries() {
  return [...state.cart.values()].map((entry) => {
    const product = catalogItems.find((item) => item.id === entry.productId);
    if (!product) return null;
    const option = getProductOption(product, entry.sizeKey);
    return { ...entry, product, ...option, lineTotal: option.price * entry.quantity };
  }).filter(Boolean);
}

/** Menampilkan isi keranjang dan memperbarui jumlah item pada halaman. */
function renderCart() {
  const entries = getCartEntries();
  const itemCount = entries.reduce((total, item) => total + item.quantity, 0);
  const total = entries.reduce((sum, item) => sum + item.lineTotal, 0);
  elements.cartCount.textContent = String(itemCount);
  elements.cartButton.setAttribute("aria-label", `Buka keranjang, ${itemCount} produk`);
  elements.stickyCartBar.hidden = itemCount === 0;
  elements.stickyCartSummary.textContent = `${itemCount} item · ${formatCurrency(total)}`;
  elements.cartEmpty.hidden = entries.length > 0;
  elements.cartItems.innerHTML = entries.map((item) => `
    <article class="cart-item" data-cart-item="${item.key}">
      <div>
        <h3>${item.product.name}</h3>
        <p>${item.sizeLabel} · ${formatCurrency(item.price)} / botol</p>
      </div>
      <div class="cart-item-controls" aria-label="Jumlah ${item.product.name}">
        <button class="cart-quantity-button" type="button" data-cart-decrement="${item.key}" aria-label="Kurangi jumlah ${item.product.name}">−</button>
        <output>${item.quantity}</output>
        <button class="cart-quantity-button" type="button" data-cart-increment="${item.key}" aria-label="Tambah jumlah ${item.product.name}">+</button>
        <button class="icon-button" type="button" data-cart-remove="${item.key}" aria-label="Hapus ${item.product.name} dari keranjang">×</button>
      </div>
      <strong class="cart-line-total">${formatCurrency(item.lineTotal)}</strong>
    </article>`).join("");
  elements.cartSummary.hidden = entries.length === 0;
  elements.cartTotal.textContent = formatCurrency(total);
  elements.checkoutButton.disabled = entries.length === 0;
}

/** Membuka dialog keranjang dari tombol yang tersedia. */
function openCartDialog() {
  renderCart();
  elements.cartDialog.showModal();
}

/** Memperbarui atau menghapus baris produk dari dialog keranjang. */
function handleCartItemsClick(event) {
  const button = event.target.closest("[data-cart-increment], [data-cart-decrement], [data-cart-remove]");
  if (!button) return;
  const key = button.dataset.cartIncrement ?? button.dataset.cartDecrement ?? button.dataset.cartRemove;
  const entry = state.cart.get(key);
  if (!entry) return;
  const productId = entry.productId;
  if (button.hasAttribute("data-cart-remove") || (button.hasAttribute("data-cart-decrement") && entry.quantity <= 1)) {
    state.cart.delete(key);
  } else if (button.hasAttribute("data-cart-increment")) {
    entry.quantity += 1;
  } else {
    entry.quantity -= 1;
  }
  renderCart();
  updateProductCard(productId);
}

/** Membentuk tautan WhatsApp dengan pesan yang telah dienkode dengan aman. */
function getWhatsAppUrl(message = siteConfig.whatsappMessage) {
  const recipient = siteConfig.whatsappNumber.replace(/\D/g, "");
  const whatsappRecipient = recipient.startsWith("0") ? `62${recipient.slice(1)}` : recipient;
  const baseUrl = recipient ? `https://wa.me/${whatsappRecipient}` : "https://wa.me/";
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

/** Menyiapkan ringkasan pesanan dan mengarahkannya ke nomor WhatsApp toko. */
function checkoutToWhatsApp() {
  const entries = getCartEntries();
  if (!entries.length) return;
  const total = entries.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemLines = entries.map((item) => {
    const size = item.sizeLabel.replace(/\s+/g, "");
    const quantity = item.quantity > 1 ? `*${item.quantity}` : "";
    return `${item.product.name}(${size})${quantity} : ${formatWhatsAppAmount(item.lineTotal)}`;
  });
  const message = [
    "Hay Kak FD Kulinary, aku ingin pesan",
    "",
    ...itemLines,
    "",
    `Total Pesanan: ${formatWhatsAppAmount(total)}`
  ].join("\n");
  sessionStorage.setItem(pendingCheckoutKey, getWhatsAppUrl(message));
  state.cart.clear();
  renderCart();
  [...elements.productGrid.querySelectorAll("[data-product-card]")]
    .forEach((card) => updateProductCard(card.dataset.productCard));
  elements.cartDialog.close();
  elements.checkoutThankYou.showModal();
  window.setTimeout(() => window.location.reload(), 3000);
}

/** Memilih produk sesuai kategori, jenis minuman, dan kata pencarian. */
function getVisibleProducts() {
  const query = state.searchQuery.toLocaleLowerCase("id-ID");
  return catalogItems.filter((product) => {
    const matchesCategory = product.category === state.activeCategory;
    const matchesFamily = product.family === state.activeProductFamily;
    const searchableText = `${product.name} ${product.family} ${product.description}`.toLocaleLowerCase("id-ID");
    return matchesCategory && matchesFamily && searchableText.includes(query);
  });
}

/** Membuat struktur kartu yang bermakna untuk satu produk katalog. */
function createProductCard(product, index) {
  const option = getProductOption(product);
  const sizeSelector = createSizeSelector(product, option.sizeKey);
  const cartEntry = state.cart.get(`${product.id}:${option.sizeKey}`);
  const quantity = cartEntry?.quantity ?? 0;
  return `
    <article class="product-card reveal-card" data-product-card="${product.id}" style="--delay: ${index * 55}ms">
      <div class="product-image interactive-image${option.sizeKey === drinkSizes[1].key ? " is-liter" : ""}">
        <img src="${product.image}" alt="${product.name}, ${option.sizeLabel}" loading="lazy" />
      </div>
      <div class="product-content">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-size-row">
          <span>Ukuran</span>
          ${sizeSelector}
        </div>
        <strong class="product-price">${formatCurrency(option.price)}</strong>
        <div class="product-quantity-row">
          <span>Jumlah</span>
          <div class="product-quantity" aria-label="Jumlah ${product.name} ${option.sizeLabel}">
            <button type="button" data-product-quantity="${product.id}" data-delta="-1" aria-label="Kurangi ${product.name}" ${quantity === 0 ? "disabled" : ""}>−</button>
            <output aria-live="polite">${quantity}</output>
            <button type="button" data-product-quantity="${product.id}" data-delta="1" aria-label="Tambah ${product.name}">+</button>
          </div>
        </div>
      </div>
    </article>`;
}

/** Menampilkan kartu katalog sesuai filter dan kata pencarian aktif. */
function renderProducts() {
  const products = getVisibleProducts();
  const familyName = state.activeProductFamily === "Milk & Tea Based" ? "Milk & Tea" : "Coffee";
  elements.catalogResult.textContent = `${products.length} menu ${familyName} ditemukan`;
  elements.productGrid.innerHTML = products.length
    ? products.map(createProductCard).join("")
    : `<div class="empty-state"><strong>Menu belum ditemukan.</strong><p>Coba kata kunci lain atau pilih kategori berbeda.</p></div>`;
}

/** Memperbarui kartu produk yang ukuran atau jumlah keranjangnya berubah. */
function updateProductCard(productId) {
  const card = [...elements.productGrid.querySelectorAll("[data-product-card]")]
    .find((item) => item.dataset.productCard === productId);
  const product = catalogItems.find((item) => item.id === productId);
  if (!card || !product) return;

  const option = getProductOption(product);
  const cartEntry = state.cart.get(`${product.id}:${option.sizeKey}`);
  card.querySelector(".product-quantity output").textContent = String(cartEntry?.quantity ?? 0);
  card.querySelector('[data-product-quantity][data-delta="-1"]').disabled = !cartEntry;
}

/** Mengganti jenis minuman aktif lalu menyegarkan katalog. */
function setActiveProductFamily(family) {
  if (state.activeProductFamily === family) return;
  state.activeProductFamily = family;
  elements.familyFilterButtons.forEach((button) => {
    const isActive = button.dataset.productFamily === family;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderProducts();
}

/** Menangani pemilihan filter Milk & Tea atau Coffee. */
function handleProductFamilyClick(event) {
  setActiveProductFamily(event.currentTarget.dataset.productFamily);
}

/** Memfilter katalog secara langsung saat pengunjung mengetik. */
function handleSearchInput(event) {
  state.searchQuery = event.target.value.trim();
  renderProducts();
  if (state.searchQuery) document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Memperbarui kartu minuman setelah ukuran pilihan berubah. */
function handleProductGridClick(event) {
  const quantityButton = event.target.closest("[data-product-quantity]");
  if (quantityButton) {
    changeProductQuantity(quantityButton.dataset.productQuantity, Number(quantityButton.dataset.delta));
    return;
  }
  const sizeButton = event.target.closest("[data-size-option]");
  if (!sizeButton) return;

  const productId = sizeButton.dataset.sizeOption;
  const selectedSize = sizeButton.dataset.sizeValue;
  const product = catalogItems.find((item) => item.id === productId);
  const card = sizeButton.closest("[data-product-card]");
  const validSize = drinkSizes.some(({ key }) => key === selectedSize);
  if (!product || product.category !== "drink" || !card || !validSize) return;

  state.selectedSizes[productId] = selectedSize;
  const option = getProductOption(product, selectedSize);

  card.querySelector(".product-image").classList.toggle("is-liter", selectedSize === drinkSizes[1].key);
  card.querySelector(".product-image img").alt = `${product.name}, ${option.sizeLabel}`;
  card.querySelector(".product-price").textContent = formatCurrency(option.price);
  updateProductCard(productId);
  card.querySelectorAll("[data-size-option]").forEach((button) => {
    const isSelected = button.dataset.sizeValue === selectedSize;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

/** Membuat tampilan untuk satu ulasan pelanggan. */
function createReviewMarkup(review) {
  return `
    <div class="review-photo interactive-image"><img src="${review.image}" alt="${review.name} bersama produk FD Drinks" /></div>
    <div class="review-content">
      <div class="stars" aria-label="${review.rating} dari 5 bintang">${"★".repeat(review.rating)}</div>
      <blockquote>“${review.quote}”</blockquote>
      <div class="review-author"><strong>${review.name}</strong><span>${review.role}</span></div>
    </div>`;
}

/** Menampilkan ulasan terpilih dan memperbarui penanda posisinya. */
function showReview(index) {
  const visibleReviews = getVisibleReviews();
  if (!visibleReviews.length) {
    state.reviewIndex = 0;
    elements.reviewCard.classList.remove("is-entering");
    elements.reviewCard.innerHTML = `
      <div class="review-empty">
        <strong>Belum ada review ${state.activeCategory === "drink" ? "minuman" : "kue"}.</strong>
        <p>Review untuk kategori ini akan tampil di sini.</p>
      </div>`;
    return;
  }

  state.reviewIndex = (index + visibleReviews.length) % visibleReviews.length;
  elements.reviewCard.classList.remove("is-entering");
  void elements.reviewCard.offsetWidth;
  elements.reviewCard.innerHTML = createReviewMarkup(visibleReviews[state.reviewIndex]);
  elements.reviewCard.classList.add("is-entering");
  [...elements.reviewProgress.children].forEach((bar, barIndex) => bar.classList.toggle("active", barIndex === state.reviewIndex));
}

/** Mengambil ulasan sesuai kategori yang sedang ditampilkan. */
function getVisibleReviews() {
  return reviews.filter((review) => review.category === state.activeCategory);
}

/** Menyegarkan judul, daftar ulasan, dan kontrol sesuai kategori aktif. */
function renderReviewsForActiveCategory() {
  const categoryName = state.activeCategory === "drink" ? "Minuman" : "Kue";
  elements.reviewHeading.textContent = `Review ${categoryName} dari pelanggan kami.`;
  elements.reviewVideoSection.classList.toggle("is-category-hidden", state.activeCategory !== "drink");
  renderReviewProgress();
  showReview(0);
  restartReviewAutoplay();
}

/** Membuat tombol penanda posisi untuk daftar ulasan. */
function renderReviewProgress() {
  const visibleReviews = getVisibleReviews();
  const hasMultipleReviews = visibleReviews.length > 1;
  elements.reviewPrevious.hidden = !hasMultipleReviews;
  elements.reviewNext.hidden = !hasMultipleReviews;
  elements.reviewProgress.hidden = !hasMultipleReviews;
  elements.reviewProgress.innerHTML = visibleReviews
    .map((review, index) => `<button type="button" aria-label="Tampilkan review ${review.name}" data-review-index="${index}"></button>`)
    .join("");
}

/** Berpindah ke ulasan pelanggan berikutnya. */
function showNextReview() {
  if (getVisibleReviews().length < 2) return;
  showReview(state.reviewIndex + 1);
  restartReviewAutoplay();
}

/** Berpindah kembali ke ulasan pelanggan sebelumnya. */
function showPreviousReview() {
  if (getVisibleReviews().length < 2) return;
  showReview(state.reviewIndex - 1);
  restartReviewAutoplay();
}

/** Memulai pergantian ulasan secara otomatis. */
function startReviewAutoplay() {
  window.clearInterval(state.reviewTimer);
  if (getVisibleReviews().length < 2) return;
  state.reviewTimer = window.setInterval(() => showReview(state.reviewIndex + 1), 6200);
}

/** Mengatur ulang jeda pergantian ulasan setelah interaksi manual. */
function restartReviewAutoplay() {
  window.clearInterval(state.reviewTimer);
  startReviewAutoplay();
}
  
/** Menangani pemilihan ulasan melalui tombol penanda posisi. */
function handleReviewProgressClick(event) {
  const button = event.target.closest("[data-review-index]");
  if (!button) return;
  showReview(Number(button.dataset.reviewIndex));
  restartReviewAutoplay();
}

/** Menampilkan bagian halaman saat bagian tersebut masuk ke layar. */
function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    },
    { rootMargin: "-8% 0px", threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((section) => observer.observe(section));
}

/** Membuka atau menutup navigasi pada layar kecil. */
function toggleMobileMenu() {
  const isOpen = elements.navPanel.classList.toggle("is-open");
  elements.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
}

/** Menutup navigasi kecil setelah pengunjung memilih tautan. */
function closeMobileMenu(event) {
  if (!event.target.closest("a")) return;
  elements.navPanel.classList.remove("is-open");
  elements.mobileMenuButton.setAttribute("aria-expanded", "false");
}

/** Memuat video ulasan lokal jika sumbernya tersedia di konfigurasi. */
function setupVideoSource() {
  if (!siteConfig.videoSource) return;
  elements.reviewVideo.src = siteConfig.videoSource;
  elements.reviewVideo.controls = true;
  elements.videoPlaceholder.hidden = true;
}

/** Menghubungkan kontrol halaman dengan fungsi interaksinya. */
function bindEvents() {
  elements.familyFilterButtons.forEach((button) => button.addEventListener("click", handleProductFamilyClick));
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.productGrid.addEventListener("click", handleProductGridClick);
  elements.openCartButtons.forEach((button) => button.addEventListener("click", openCartDialog));
  elements.cartItems.addEventListener("click", handleCartItemsClick);
  elements.cartClose.addEventListener("click", () => elements.cartDialog.close());
  elements.stickyCartOpen.addEventListener("click", openCartDialog);
  elements.continueShopping.addEventListener("click", () => {
    elements.cartDialog.close();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.checkoutButton.addEventListener("click", checkoutToWhatsApp);
  elements.reviewNext.addEventListener("click", showNextReview);
  elements.reviewPrevious.addEventListener("click", showPreviousReview);
  elements.reviewProgress.addEventListener("click", handleReviewProgressClick);
  elements.mobileMenuButton.addEventListener("click", toggleMobileMenu);
  elements.navPanel.addEventListener("click", closeMobileMenu);
}

/** Menyiapkan konten dinamis dan perilaku halaman saat halaman dimuat. */
function initializeApp() {
  const pendingCheckoutUrl = sessionStorage.getItem(pendingCheckoutKey);
  if (pendingCheckoutUrl) {
    sessionStorage.removeItem(pendingCheckoutKey);
    window.location.replace(pendingCheckoutUrl);
    return;
  }
  document.body.classList.add("js-ready");
  elements.currentYear.textContent = String(new Date().getFullYear());
  elements.footerWhatsapp.href = getWhatsAppUrl();
  renderReviewsForActiveCategory();
  renderProducts();
  renderCart();
  setupVideoSource();
  setupRevealAnimations();
  bindEvents();
}

initializeApp();
