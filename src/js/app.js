import { catalogItems, reviews, siteConfig } from "/src/data/catalog.js";

const drinkSizes = [
  { key: "250ml", label: "250 ml" },
  { key: "1L", label: "1 L" }
];

const state = {
  activeCategory: "drink",
  activeProductFamily: "Milk & Tea Based",
  reviewIndex: 0,
  reviewTimer: null,
  searchQuery: "",
  cart: new Map(),
  draftOrder: null,
  finalInvoice: null,
  invoicePreviewUrl: null,
  invoiceTemplateImage: null,
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
  addCartDialog: document.querySelector("#addCartDialog"),
  addCartClose: document.querySelector("#addCartClose"),
  addedProductName: document.querySelector("#addedProductName"),
  addedProductDetails: document.querySelector("#addedProductDetails"),
  continueAfterAdd: document.querySelector("#continueAfterAdd"),
  openCartButtons: [...document.querySelectorAll("[data-open-cart]")],
  cartButton: document.querySelector("#cartButton"),
  cartCount: document.querySelector("#cartCount"),
  cartDialog: document.querySelector("#cartDialog"),
  cartClose: document.querySelector("#cartClose"),
  cartEmpty: document.querySelector("#cartEmpty"),
  cartItems: document.querySelector("#cartItems"),
  cartSummary: document.querySelector("#cartSummary"),
  cartTotal: document.querySelector("#cartTotal"),
  continueShopping: document.querySelector("#continueShopping"),
  createDraftInvoice: document.querySelector("#createDraftInvoice"),
  invoiceDialog: document.querySelector("#invoiceDialog"),
  invoiceClose: document.querySelector("#invoiceClose"),
  invoicePreview: document.querySelector("#invoicePreview"),
  invoiceDraftStage: document.querySelector("#invoiceDraftStage"),
  invoiceSuccess: document.querySelector("#invoiceSuccess"),
  invoiceNumberNotice: document.querySelector("#invoiceNumberNotice"),
  invoiceError: document.querySelector("#invoiceError"),
  backToCart: document.querySelector("#backToCart"),
  confirmInvoice: document.querySelector("#confirmInvoice"),
  continueToWhatsapp: document.querySelector("#continueToWhatsapp"),
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

/** Formats a number as Indonesian rupiah without decimal digits. */
function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value);
}

/** Returns the selected unit price and label for a drink. */
function getProductOption(product, size = state.selectedSizes[product.id] ?? drinkSizes[0].key) {
  const selectedSize = drinkSizes.find((option) => option.key === size) ?? drinkSizes[0];
  const isLiter = product.category === "drink" && selectedSize.key === drinkSizes[1].key;
  return {
    sizeKey: isLiter ? selectedSize.key : drinkSizes[0].key,
    sizeLabel: isLiter ? selectedSize.label : product.size,
    price: isLiter ? product.price1L : product.price
  };
}

/** Builds the segmented size selector for a drink card. */
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

/** Adds the currently selected drink option to the in-memory cart. */
function addToCart(productId) {
  const product = catalogItems.find((item) => item.id === productId);
  if (!product || product.category !== "drink") return;
  const option = getProductOption(product);
  const key = `${product.id}:${option.sizeKey}`;
  const current = state.cart.get(key);
  state.cart.set(key, {
    key,
    productId: product.id,
    sizeKey: option.sizeKey,
    quantity: (current?.quantity ?? 0) + 1
  });
  renderCart();
}

/** Recalculates cart display values from the catalog source data. */
function getCartEntries() {
  return [...state.cart.values()].map((entry) => {
    const product = catalogItems.find((item) => item.id === entry.productId);
    if (!product) return null;
    const option = getProductOption(product, entry.sizeKey);
    return { ...entry, product, ...option, lineTotal: option.price * entry.quantity };
  }).filter(Boolean);
}

/** Renders the in-memory cart and its item count. */
function renderCart() {
  const entries = getCartEntries();
  const itemCount = entries.reduce((total, item) => total + item.quantity, 0);
  const total = entries.reduce((sum, item) => sum + item.lineTotal, 0);
  elements.cartCount.textContent = String(itemCount);
  elements.cartButton.setAttribute("aria-label", `Buka keranjang, ${itemCount} produk`);
  elements.cartEmpty.hidden = entries.length > 0;
  elements.cartItems.innerHTML = entries.map((item) => `
    <article class="cart-item" data-cart-item="${item.key}">
      <div>
        <h3>${item.product.name}</h3>
        <p>${item.sizeLabel} · ${formatCurrency(item.price)} per item · ${formatCurrency(item.lineTotal)}</p>
      </div>
      <div class="cart-item-controls" aria-label="Jumlah ${item.product.name}">
        <button class="cart-quantity-button" type="button" data-cart-decrement="${item.key}" aria-label="Kurangi jumlah ${item.product.name}">−</button>
        <output>${item.quantity}</output>
        <button class="cart-quantity-button" type="button" data-cart-increment="${item.key}" aria-label="Tambah jumlah ${item.product.name}">+</button>
        <button class="icon-button" type="button" data-cart-remove="${item.key}" aria-label="Hapus ${item.product.name} dari keranjang">×</button>
      </div>
    </article>`).join("");
  elements.cartSummary.hidden = entries.length === 0;
  elements.cartTotal.textContent = formatCurrency(total);
  elements.createDraftInvoice.disabled = entries.length === 0;
}

/** Opens the cart dialog from any cart CTA. */
function openCartDialog() {
  renderCart();
  elements.cartDialog.showModal();
}

/** Shows a styled confirmation after a catalog product enters the cart. */
function showAddCartConfirmation(productId) {
  const product = catalogItems.find((item) => item.id === productId);
  if (!product) return;
  const option = getProductOption(product);
  elements.addedProductName.textContent = product.name;
  elements.addedProductDetails.textContent = `${option.sizeLabel} · ${formatCurrency(option.price)} per botol`;
  elements.addCartDialog.showModal();
}

/** Updates or removes a cart line from the cart dialog. */
function handleCartItemsClick(event) {
  const button = event.target.closest("[data-cart-increment], [data-cart-decrement], [data-cart-remove]");
  if (!button) return;
  const key = button.dataset.cartIncrement ?? button.dataset.cartDecrement ?? button.dataset.cartRemove;
  const entry = state.cart.get(key);
  if (!entry) return;
  if (button.hasAttribute("data-cart-remove") || (button.hasAttribute("data-cart-decrement") && entry.quantity <= 1)) {
    state.cart.delete(key);
  } else if (button.hasAttribute("data-cart-increment")) {
    entry.quantity += 1;
  } else {
    entry.quantity -= 1;
  }
  renderCart();
}

/** Loads the supplied invoice artwork so every export uses the approved design. */
async function loadInvoiceTemplate() {
  if (state.invoiceTemplateImage) return state.invoiceTemplateImage;
  const image = new Image();
  image.src = "/assets/images/invoice-template.png";
  if (image.decode) await image.decode();
  else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
  state.invoiceTemplateImage = image;
  return image;
}

function tileTemplatePatch(context, template, sourceX, sourceY, sourceWidth, height, targetX, targetY, targetWidth) {
  for (let offset = 0; offset < targetWidth; offset += sourceWidth) {
    const chunkWidth = Math.min(sourceWidth, targetWidth - offset);
    context.drawImage(template, sourceX, sourceY, chunkWidth, height, targetX + offset, targetY, chunkWidth, height);
  }
}

/** Renders the uploaded invoice artwork with only the order fields replaced. */
async function createInvoiceCanvas(order, invoiceNumber = "Draft Invoice") {
  const template = await loadInvoiceTemplate();
  const width = 1024;
  const height = 1536;
  const tableX = 73;
  const tableTop = 713;
  const headerHeight = 73;
  const rowHeight = 88;
  const bodyTop = tableTop + headerHeight;
  const tableBottom = bodyTop + rowHeight * order.length;
  const extraHeight = Math.max(0, order.length - 2) * rowHeight;
  const lowerContentSourceY = 987;
  const lowerContentY = lowerContentSourceY + extraHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height + extraHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat menyiapkan invoice.");

  context.fillStyle = "#fff8eb";
  context.fillRect(0, 0, width, canvas.height);
  context.drawImage(template, 0, 0, width, lowerContentSourceY, 0, 0, width, lowerContentSourceY);
  context.drawImage(
    template,
    0, lowerContentSourceY, width, height - lowerContentSourceY,
    0, lowerContentY, width, height - lowerContentSourceY
  );
  if (extraHeight > 0) {
    context.fillStyle = "#a47526";
    context.fillRect(18, lowerContentSourceY, 4, extraHeight);
    context.fillRect(width - 22, lowerContentSourceY, 4, extraHeight);
    context.fillStyle = "#c99b4f";
    context.fillRect(31, lowerContentSourceY, 2, extraHeight);
    context.fillRect(width - 33, lowerContentSourceY, 2, extraHeight);
  }

  const dateLabel = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  tileTemplatePatch(context, template, 523, 590, 60, 80, 193, 590, 300);
  tileTemplatePatch(context, template, 523, 590, 60, 80, 670, 590, 263);
  context.fillStyle = "#17150f";
  context.font = "25px Arial, sans-serif";
  context.textBaseline = "alphabetic";
  context.fillText("No. Invoice", 199, 620);
  context.font = "bold 29px Arial, sans-serif";
  context.fillText(invoiceNumber, 199, 656, 292);
  context.font = "25px Arial, sans-serif";
  context.fillText("Tanggal Pesanan", 677, 620);
  context.font = "bold 29px Arial, sans-serif";
  context.fillText(dateLabel, 677, 656, 253);

  context.fillStyle = "#fff9ef";
  context.fillRect(tableX, bodyTop, 880, rowHeight * order.length);
  context.strokeStyle = "#bd8843";
  context.lineWidth = 1.25;
  context.beginPath();
  context.moveTo(tableX, bodyTop);
  context.lineTo(tableX, tableBottom - 18);
  context.quadraticCurveTo(tableX, tableBottom, tableX + 18, tableBottom);
  context.lineTo(tableX + 862, tableBottom);
  context.quadraticCurveTo(tableX + 880, tableBottom, tableX + 880, tableBottom - 18);
  context.lineTo(tableX + 880, bodyTop);
  context.moveTo(190, bodyTop);
  context.lineTo(190, tableBottom);
  context.moveTo(553, bodyTop);
  context.lineTo(553, tableBottom);
  context.moveTo(710, bodyTop);
  context.lineTo(710, tableBottom);
  order.forEach((item, index) => {
    const rowTop = bodyTop + (index * rowHeight);
    if (index > 0) {
      context.moveTo(tableX, rowTop);
      context.lineTo(tableX + 880, rowTop);
    }
  });
  context.stroke();

  order.forEach((item, index) => {
    const rowTop = bodyTop + index * rowHeight;
    const centerY = rowTop + 48;
    context.fillStyle = "#11100d";
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.font = "bold 29px Arial, sans-serif";
    context.fillText(String(index + 1), 131, centerY);
    context.fillText(String(item.quantity), 631, centerY);
    context.textAlign = "right";
    context.font = "bold 27px Arial, sans-serif";
    context.fillText(formatCurrency(item.lineTotal), 930, centerY, 211);
    context.textAlign = "left";
    context.font = "bold 25px Arial, sans-serif";
    context.fillText(item.product.name, 217, rowTop + 34, 323);
    context.fillStyle = "#68583e";
    context.font = "19px Arial, sans-serif";
    context.fillText(`Ukuran ${item.sizeLabel}`, 217, rowTop + 66, 323);
  });

  const total = order.reduce((sum, item) => sum + item.lineTotal, 0);
  tileTemplatePatch(context, template, 100, 1003, 120, 48, 692, lowerContentY + 16, 239);
  context.fillStyle = "#15130e";
  context.textAlign = "right";
  context.textBaseline = "alphabetic";
  context.font = "bold 42px Georgia, 'Times New Roman', serif";
  context.fillText(formatCurrency(total), 908, lowerContentY + 57, 224);
  return canvas;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG invoice gagal dibuat.")), "image/png");
  });
}

function showInvoicePreview(blob, alt) {
  if (state.invoicePreviewUrl) URL.revokeObjectURL(state.invoicePreviewUrl);
  state.invoicePreviewUrl = URL.createObjectURL(blob);
  elements.invoicePreview.src = state.invoicePreviewUrl;
  elements.invoicePreview.alt = alt;
}

/** Prepares a draft invoice PNG preview from the current cart. */
async function createDraftInvoice() {
  const order = getCartEntries();
  if (!order.length) return;
  state.draftOrder = order.map(({ productId, sizeKey, quantity, product, sizeLabel, price, lineTotal }) => ({
    productId, sizeKey, quantity, product, sizeLabel, price, lineTotal
  }));
  state.finalInvoice = null;
  elements.confirmInvoice.disabled = false;
  elements.invoiceError.hidden = true;
  elements.invoiceDraftStage.hidden = false;
  elements.invoiceSuccess.hidden = true;
  try {
    const canvas = await createInvoiceCanvas(state.draftOrder);
    showInvoicePreview(await canvasToPngBlob(canvas), "Pratinjau Draft Invoice FD Culinary");
    elements.cartDialog.close();
    elements.invoiceDialog.showModal();
  } catch (error) {
    elements.invoiceError.textContent = error.message || "Draft invoice belum dapat dibuat. Coba lagi.";
    elements.invoiceError.hidden = false;
    elements.cartDialog.close();
    elements.invoiceDialog.showModal();
  }
}

/** Starts downloading a generated invoice PNG. */
async function downloadInvoicePng(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30000);
}

function generateInvoiceNumber() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return `FD-${day}${month}${year}-${hour}${minute}`;
}

/** Finalizes and downloads the invoice only after the customer confirms it. */
async function confirmAndDownloadInvoice() {
  if (!state.draftOrder?.length || state.finalInvoice) return;
  elements.confirmInvoice.disabled = true;
  elements.invoiceError.hidden = true;
  try {
    const invoiceNumber = generateInvoiceNumber();
    const canvas = await createInvoiceCanvas(state.draftOrder, invoiceNumber);
    const png = await canvasToPngBlob(canvas);
    await downloadInvoicePng(png, `${invoiceNumber}.png`);
    state.finalInvoice = { number: invoiceNumber, items: state.draftOrder };
    showInvoicePreview(png, `Invoice final ${invoiceNumber} FD Culinary`);
    state.cart.clear();
    renderCart();
    elements.invoiceNumberNotice.textContent = `Nomor invoice: ${invoiceNumber}. Lampirkan file PNG yang terunduh sebelum mengirim pesan.`;
    elements.invoiceDraftStage.hidden = true;
    elements.invoiceSuccess.hidden = false;
  } catch (error) {
    elements.invoiceError.textContent = error.message || "Invoice final belum dapat diunduh. Periksa pesanan lalu coba lagi.";
    elements.invoiceError.hidden = false;
    elements.confirmInvoice.disabled = false;
  }
}

function getWhatsAppUrl(message = siteConfig.whatsappMessage) {
  const recipient = siteConfig.whatsappNumber.replace(/\D/g, "");
  const whatsappRecipient = recipient.startsWith("0") ? `62${recipient.slice(1)}` : recipient;
  const baseUrl = recipient ? `https://wa.me/${whatsappRecipient}` : "https://wa.me/";
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp after the final invoice has been downloaded. */
function continueToWhatsApp() {
  if (!state.finalInvoice) return;
  window.open(getWhatsAppUrl(), "_blank", "noopener,noreferrer");
}

/** Returns products matching the selected category, drink family, and search query. */
function getVisibleProducts() {
  const query = state.searchQuery.toLocaleLowerCase("id-ID");
  return catalogItems.filter((product) => {
    const matchesCategory = product.category === state.activeCategory;
    const matchesFamily = product.family === state.activeProductFamily;
    const searchableText = `${product.name} ${product.family} ${product.description}`.toLocaleLowerCase("id-ID");
    return matchesCategory && matchesFamily && searchableText.includes(query);
  });
}

/** Creates semantic card markup for one catalog item. */
function createProductCard(product, index) {
  const isDrink = product.category === "drink";
  const option = getProductOption(product);
  const sizeSelector = isDrink ? createSizeSelector(product, option.sizeKey) : "";
  return `
    <article class="product-card reveal-card" data-product-card="${product.id}" style="--delay: ${index * 55}ms">
      <div class="product-image interactive-image${option.sizeKey === drinkSizes[1].key ? " is-liter" : ""}">
        <img src="${product.image}" alt="${product.name}, ${option.sizeLabel}" loading="lazy" />
        <span class="product-family">${product.family}</span>
      </div>
      <div class="product-content">
        <div class="product-title-row">
          <h3>${product.name}</h3>
          <span class="product-size-label">${option.sizeLabel}</span>
        </div>
        <p>${product.description}</p>
        <div class="product-footer">
          <strong>${formatCurrency(option.price)}</strong>
          <div class="product-actions">
            ${sizeSelector}
            ${isDrink ? `
              <button
                class="add-to-cart-button"
                type="button"
                data-add-to-cart="${product.id}"
                aria-label="Tambah ${product.name}, ukuran ${option.sizeLabel}, ke keranjang"
                title="Tambah ke keranjang"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </button>` : ""}
          </div>
        </div>
      </div>
    </article>`;
}

/** Renders catalog cards from the current drink-family filter and search state. */
function renderProducts() {
  const products = getVisibleProducts();
  const familyName = state.activeProductFamily === "Milk & Tea Based" ? "Milk & Tea" : "Coffee";
  elements.catalogResult.textContent = `${products.length} menu ${familyName} ditemukan`;
  elements.productGrid.innerHTML = products.length
    ? products.map(createProductCard).join("")
    : `<div class="empty-state"><strong>Menu belum ditemukan.</strong><p>Coba kata kunci lain atau pilih kategori berbeda.</p></div>`;
}

/** Switches the active drink family and refreshes only the catalog grid. */
function setActiveProductFamily(family) {
  state.activeProductFamily = family;
  elements.familyFilterButtons.forEach((button) => {
    const isActive = button.dataset.productFamily === family;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderProducts();
}

/** Handles Milk & Tea or Coffee filter selection. */
function handleProductFamilyClick(event) {
  setActiveProductFamily(event.currentTarget.dataset.productFamily);
}

/** Filters the active catalog as the visitor types. */
function handleSearchInput(event) {
  state.searchQuery = event.target.value.trim();
  renderProducts();
  if (state.searchQuery) document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Updates one drink card when its selected size changes. */
function handleProductGridClick(event) {
  const addButton = event.target.closest("[data-add-to-cart]");
  if (addButton) {
    addToCart(addButton.dataset.addToCart);
    showAddCartConfirmation(addButton.dataset.addToCart);
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
  card.querySelector(".product-size-label").textContent = option.sizeLabel;
  card.querySelector(".product-footer > strong").textContent = formatCurrency(option.price);
  card.querySelector("[data-add-to-cart]").setAttribute(
    "aria-label",
    `Tambah ${product.name}, ukuran ${option.sizeLabel}, ke keranjang`
  );
  card.querySelectorAll("[data-size-option]").forEach((button) => {
    const isSelected = button.dataset.sizeValue === selectedSize;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

/** Creates the markup for one customer review. */
function createReviewMarkup(review) {
  return `
    <div class="review-photo interactive-image"><img src="${review.image}" alt="${review.name} bersama produk FD Drinks" /></div>
    <div class="review-content">
      <div class="stars" aria-label="${review.rating} dari 5 bintang">${"★".repeat(review.rating)}</div>
      <blockquote>“${review.quote}”</blockquote>
      <div class="review-author"><strong>${review.name}</strong><span>${review.role}</span></div>
    </div>`;
}

/** Shows one review and updates its progress indicators. */
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

/** Returns reviews for the category currently shown in the catalog. */
function getVisibleReviews() {
  return reviews.filter((review) => review.category === state.activeCategory);
}

/** Refreshes the review heading, carousel, and controls for the selected category. */
function renderReviewsForActiveCategory() {
  const categoryName = state.activeCategory === "drink" ? "Minuman" : "Kue";
  elements.reviewHeading.textContent = `Review ${categoryName} dari pelanggan kami.`;
  elements.reviewVideoSection.classList.toggle("is-category-hidden", state.activeCategory !== "drink");
  renderReviewProgress();
  showReview(0);
  restartReviewAutoplay();
}

/** Builds the review progress controls. */
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

/** Advances to the next customer review. */
function showNextReview() {
  if (getVisibleReviews().length < 2) return;
  showReview(state.reviewIndex + 1);
  restartReviewAutoplay();
}

/** Returns to the previous customer review. */
function showPreviousReview() {
  if (getVisibleReviews().length < 2) return;
  showReview(state.reviewIndex - 1);
  restartReviewAutoplay();
}

/** Starts automatic review rotation. */
function startReviewAutoplay() {
  window.clearInterval(state.reviewTimer);
  if (getVisibleReviews().length < 2) return;
  state.reviewTimer = window.setInterval(() => showReview(state.reviewIndex + 1), 6200);
}

/** Restarts review autoplay after manual interaction. */
function restartReviewAutoplay() {
  window.clearInterval(state.reviewTimer);
  startReviewAutoplay();
}
  
/** Handles direct review progress selection. */
function handleReviewProgressClick(event) {
  const button = event.target.closest("[data-review-index]");
  if (!button) return;
  showReview(Number(button.dataset.reviewIndex));
  restartReviewAutoplay();
}

/** Fades content sections in and out as they cross the viewport. */
function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    },
    { rootMargin: "-8% 0px", threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((section) => observer.observe(section));
}

/** Toggles the compact navigation on small screens. */
function toggleMobileMenu() {
  const isOpen = elements.navPanel.classList.toggle("is-open");
  elements.mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
}

/** Closes the compact navigation after choosing a link. */
function closeMobileMenu(event) {
  if (!event.target.closest("a")) return;
  elements.navPanel.classList.remove("is-open");
  elements.mobileMenuButton.setAttribute("aria-expanded", "false");
}

/** Loads an optional local review video from configuration. */
function setupVideoSource() {
  if (!siteConfig.videoSource) return;
  elements.reviewVideo.src = siteConfig.videoSource;
  elements.reviewVideo.controls = true;
  elements.videoPlaceholder.hidden = true;
}

/** Connects all page controls to their interactions. */
function bindEvents() {
  elements.familyFilterButtons.forEach((button) => button.addEventListener("click", handleProductFamilyClick));
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.productGrid.addEventListener("click", handleProductGridClick);
  elements.openCartButtons.forEach((button) => button.addEventListener("click", openCartDialog));
  elements.cartItems.addEventListener("click", handleCartItemsClick);
  elements.cartClose.addEventListener("click", () => elements.cartDialog.close());
  elements.addCartClose.addEventListener("click", () => elements.addCartDialog.close());
  elements.continueAfterAdd.addEventListener("click", () => {
    elements.addCartDialog.close();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.addCartDialog.addEventListener("click", (event) => {
    if (event.target === elements.addCartDialog) elements.addCartDialog.close();
  });
  elements.continueShopping.addEventListener("click", () => {
    elements.cartDialog.close();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.createDraftInvoice.addEventListener("click", createDraftInvoice);
  elements.invoiceClose.addEventListener("click", () => elements.invoiceDialog.close());
  elements.backToCart.addEventListener("click", () => {
    elements.invoiceDialog.close();
    openCartDialog();
  });
  elements.confirmInvoice.addEventListener("click", confirmAndDownloadInvoice);
  elements.continueToWhatsapp.addEventListener("click", continueToWhatsApp);
  elements.reviewNext.addEventListener("click", showNextReview);
  elements.reviewPrevious.addEventListener("click", showPreviousReview);
  elements.reviewProgress.addEventListener("click", handleReviewProgressClick);
  elements.mobileMenuButton.addEventListener("click", toggleMobileMenu);
  elements.navPanel.addEventListener("click", closeMobileMenu);
}

/** Initializes all dynamic content and page behavior. */
function initializeApp() {
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
