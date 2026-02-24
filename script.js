// ====== STATE ======
let PRODUCTS = {};
let cart = {};
let discountPercent = 0;
let discountNominal = 0;

const STORAGE_KEY = 'bytex_gift_store';

// ====== DOM ======
const productsGrid = document.getElementById('productsGrid');
const cartItemsListEl = document.getElementById('cartItemsList');
const cartEmptyEl = document.getElementById('cartEmpty');
const cartSummaryEl = document.getElementById('cartSummary');
const subtotalDisplayEl = document.getElementById('subtotalDisplay');
const discountDisplayEl = document.getElementById('discountDisplay');
const discountDisplayRowEl = document.getElementById('discountDisplayRow');
const totalDisplayEl = document.getElementById('totalDisplay');
const discountPercentInput = document.getElementById('discountPercent');
const discountNominalInput = document.getElementById('discountNominal');
const bonDisplayEl = document.getElementById('bonDisplay');
const toastEl = document.getElementById('toast');

// ====== LOAD PRODUCTS ======
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    const data = await res.json();

    productsGrid.innerHTML = '';
    PRODUCTS = {};

    data.forEach((product) => {
      PRODUCTS[product.id] = {
        name: product.name,
        price: product.price,
      };

      const card = document.createElement('div');
      card.className = 'product-card';
      card.dataset.product = product.id;

      card.innerHTML = `
        <div class="product-info">
          <span class="product-name">${product.name}</span>
          <span class="product-price">${formatRupiah(product.price)}</span>
        </div>
        <button class="btn btn-add" type="button">+ Tambah</button>
      `;

      card.querySelector('.btn-add').addEventListener('click', () => {
        addToCart(product.id);

        card.classList.add('add-animation');
        setTimeout(() => card.classList.remove('add-animation'), 400);
      });

      productsGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Gagal load products.json', err);
  }
}

// ====== STORAGE ======
function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const data = JSON.parse(saved);
  cart = data.cart || {};
  discountPercent = data.discountPercent || 0;
  discountNominal = data.discountNominal || 0;

  discountPercentInput.value = discountPercent || '';
  discountNominalInput.value = discountNominal || '';

  updateUI();
}

function saveToStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ cart, discountPercent, discountNominal })
  );
}

// ====== UTILS ======
function formatRupiah(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function getSubtotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    return sum + (PRODUCTS[id]?.price || 0) * qty;
  }, 0);
}

function getDiscount(subtotal) {
  let discount = 0;

  if (discountPercent > 0) {
    discount = (subtotal * discountPercent) / 100;
  } else if (discountNominal > 0) {
    discount = discountNominal;
  }

  return Math.min(discount, subtotal);
}

// ====== CART ======
function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  updateUI();
  saveToStorage();
}

function removeFromCart(id) {
  delete cart[id];
  updateUI();
  saveToStorage();
}

function renderCart() {
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    cartEmptyEl.style.display = 'block';
    cartItemsListEl.style.display = 'none';
    cartSummaryEl.style.display = 'none';
    return;
  }

  cartEmptyEl.style.display = 'none';
  cartItemsListEl.style.display = 'block';
  cartSummaryEl.style.display = 'block';

  cartItemsListEl.innerHTML = entries.map(([id, qty]) => {
    const p = PRODUCTS[id];
    const total = p.price * qty;

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <span class="cart-item-name">${p.name}</span>
          <span class="cart-item-detail">${qty} x ${formatRupiah(p.price)}</span>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <span class="cart-item-price">${formatRupiah(total)}</span>
          <button class="btn btn-remove" data-remove="${id}">Hapus</button>
        </div>
      </div>
    `;
  }).join('');

  cartItemsListEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
  });
}

function updateUI() {
  renderCart();

  const subtotal = getSubtotal();
  const discount = getDiscount(subtotal);
  const total = subtotal - discount;

  subtotalDisplayEl.textContent = formatRupiah(subtotal);

  if (discount > 0) {
    discountDisplayRowEl.style.display = 'flex';
    discountDisplayEl.textContent = `-${formatRupiah(discount)}`;
  } else {
    discountDisplayRowEl.style.display = 'none';
  }

  totalDisplayEl.textContent = formatRupiah(total);
}

// ====== BON ======
function createBon() {
  const subtotal = getSubtotal();
  const discount = getDiscount(subtotal);
  const total = subtotal - discount;

  if (Object.keys(cart).length === 0) {
    showToast('Keranjang masih kosong');
    return;
  }

  const invoice = 'BYTEX-' + Date.now().toString(36).toUpperCase();
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID');
  const timeStr = now.toLocaleTimeString('id-ID');

  const separator = '— — — — — — — — — — — — — — — — — — — — — — — —';

  let lines = [];

  lines.push('# ByteX Studio');
  lines.push('');
  lines.push(`<:ID:1475697936858874078> ID: **${invoice}**`);
  lines.push(`<:Time:1475697969734094909> ${dateStr} • ${timeStr}`);
  // lines.push('');
  // lines.push(separator);
  lines.push('');

  Object.entries(cart).forEach(([id, qty]) => {
    const p = PRODUCTS[id];
    const itemTotal = formatRupiah(p.price * qty);

    lines.push(`• **${p.name}** × ${qty}`);
    lines.push(`  ↳ ${itemTotal}`);
    lines.push('');
  });

  // lines.push(separator);
  lines.push(`-# Subtotal: ${formatRupiah(subtotal)}`);

  if (discount > 0) {
    lines.push(`-# Diskon: -${formatRupiah(discount)}`);
  }

  lines.push(`**TOTAL: ${formatRupiah(total)}**`);
  // lines.push(separator);
  // lines.push('');
  lines.push('Bayar di https://tako.id/ByteX');
  // lines.push('');
  // lines.push(separator);

  bonDisplayEl.textContent = lines.join('\n');
}

function copyBon() {
  const content = bonDisplayEl.textContent;
  if (!content || content.includes('Klik')) return showToast('Buat bon dulu');

  navigator.clipboard.writeText(content);
  showToast('Bon berhasil disalin');
}

function downloadBon() {
  const content = bonDisplayEl.textContent;
  if (!content || content.includes('Klik')) return showToast('Buat bon dulu');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `bon-${Date.now()}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

function resetCart() {
  cart = {};
  discountPercent = 0;
  discountNominal = 0;
  discountPercentInput.value = '';
  discountNominalInput.value = '';
  bonDisplayEl.innerHTML = '<p class="bon-placeholder">Klik "Buat Bon" untuk generate struk</p>';
  updateUI();
  saveToStorage();
}

// ====== DISCOUNT ======
function applyDiscount() {
  const pct = parseFloat(discountPercentInput.value) || 0;
  const nom = parseFloat(discountNominalInput.value) || 0;

  if (pct > 0) {
    discountPercent = Math.min(100, pct);
    discountNominal = 0;
    discountNominalInput.value = '';
  } else if (nom > 0) {
    discountNominal = nom;
    discountPercent = 0;
    discountPercentInput.value = '';
  } else {
    discountPercent = 0;
    discountNominal = 0;
  }

  updateUI();
  saveToStorage();
}

// ====== TOAST ======
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// ====== EVENTS ======
document.querySelector('.btn-discount').addEventListener('click', applyDiscount);
document.querySelector('.btn-bon').addEventListener('click', createBon);
document.querySelector('.btn-copy-bon').addEventListener('click', copyBon);
document.querySelector('.btn-download').addEventListener('click', downloadBon);
document.querySelector('.btn-reset').addEventListener('click', resetCart);

// ====== INIT ======
async function init() {
  await loadProducts();
  loadFromStorage();
}
init();