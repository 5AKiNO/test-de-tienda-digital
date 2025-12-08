// CONFIGURACIÓN
const API_URL = "https://script.google.com/macros/s/AKfycbwYbJdCvQItlE_D5g1VKabHfPdHJQEfuMw6d4Eix_YdYeCIOFb-L9MapRDlQd3MfSe0mg/exec";
const CLOUDINARY_CLOUD_NAME = "darqsjys4";
const PHONE_NUMBER = "595984835708";
const CACHE_KEY = 'otano_v4_data';
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

// ESTADO
let state = {
    products: [],
    cart: JSON.parse(localStorage.getItem('cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('wishlist')) || [],
    category: 'all',
    subCategory: 'all',
    search: '',
    detailProduct: null,
    detailDuration: 1
};

// DOM Elements
const dom = {
    grid: document.getElementById('product-container'),
    catSelect: document.getElementById('category-select'),
    subCatSelect: document.getElementById('subcategory-select'),
    searchInput: document.getElementById('search-input'),
    cartCount: document.getElementById('cart-count'),
    favCount: document.getElementById('fav-count'),
    toast: document.getElementById('toast')
};

// --- INICIO ---
init();

function init() {
    updateCounters();
    loadCatalog();
    setupEventListeners();
}

function setupEventListeners() {
    dom.searchInput.addEventListener('input', (e) => {
        state.search = e.target.value.toLowerCase().trim();
        state.category = 'all'; // Reset filtros al buscar
        renderGrid();
    });

    dom.catSelect.addEventListener('change', (e) => {
        state.category = e.target.value;
        state.subCategory = 'all';
        dom.searchInput.value = '';
        state.search = '';
        populateSubcategories();
        renderGrid();
    });

    dom.subCatSelect.addEventListener('change', (e) => {
        state.subCategory = e.target.value;
        renderGrid();
    });
}

// --- CARGA DE DATOS ---
function loadCatalog() {
    renderSkeleton();
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { time, data } = JSON.parse(cached);
        if (Date.now() - time < CACHE_TIME) {
            state.products = data;
            finalizeLoad();
            return;
        }
    }

    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            state.products = data.filter(p => p.nombre && p.stock !== 0);
            localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: state.products }));
            finalizeLoad();
        })
        .catch(err => {
            console.error(err);
            dom.grid.innerHTML = '<p style="text-align:center; col-span:2;">Error de conexión. Intente recargar.</p>';
        });
}

function finalizeLoad() {
    populateCategories();
    renderGrid();
    initSwiper();
}

function renderSkeleton() {
    dom.grid.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
}

// --- RENDERIZADO OPTIMIZADO ---
function renderGrid() {
    let filtered = state.products;

    if (state.search) {
        filtered = filtered.filter(p => p.nombre.toLowerCase().includes(state.search));
        document.getElementById('offers-section').style.display = 'none';
    } else {
        if (state.category !== 'all') filtered = filtered.filter(p => p.categoria == state.category);
        if (state.subCategory !== 'all') filtered = filtered.filter(p => getBrand(p.nombre) == state.subCategory);
        
        // Mostrar ofertas solo si no se busca
        document.getElementById('offers-section').style.display = 'block';
    }

    if (filtered.length === 0) {
        dom.grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No hay resultados.</p>';
        return;
    }

    // Construcción de HTML en un solo paso (Mejor Performance)
    const htmlMap = filtered.map(product => createProductCard(product)).join('');
    dom.grid.innerHTML = htmlMap;
}

function createProductCard(p) {
    const isOffer = p.en_oferta === 'SI';
    const price = isOffer ? parseFloat(p.precio_oferta) : parseFloat(p.precio_normal);
    const imgUrl = resolveImg(p.imagen);
    const stockInfo = getStockStatus(p.stock);
    const isFav = state.wishlist.includes(p.id) ? 'fas' : 'far'; // Icono relleno o vacío
    
    // HTML Precios
    let priceHTML = `<span class="price">Gs. ${formatMoney(price)}</span>`;
    if (isOffer) {
        priceHTML = `<span class="old-price">Gs. ${formatMoney(p.precio_normal)}</span>` + priceHTML;
    }

    // Boton deshabilitado si no hay stock
    const btnAttr = stockInfo.available ? `onclick="quickAdd('${p.id}', event)"` : 'disabled style="opacity:0.5"';
    const btnText = stockInfo.available ? 'AGREGAR' : 'AGOTADO';

    return `
        <div class="product-card" onclick="openDetail('${p.id}')">
            <div class="img-container">
                <div class="badge-stock ${stockInfo.class}">${stockInfo.text}</div>
                <img src="${imgUrl}" class="product-img" loading="lazy" alt="${p.nombre}">
                ${isOffer ? '<span style="position:absolute;top:5px;right:5px;background:#ff3d00;color:white;font-size:0.6rem;padding:2px 5px;border-radius:4px;font-weight:bold;">OFERTA</span>' : ''}
            </div>
            <div class="card-info">
                <h3>${p.nombre}</h3>
                <div class="price-box">${priceHTML}</div>
                <button class="btn-add-mini" ${btnAttr}>${btnText}</button>
            </div>
        </div>
    `;
}

// --- DETALLE PRODUCTO ---
function openDetail(id) {
    const product = state.products.find(p => p.id == id);
    if (!product) return;

    state.detailProduct = product;
    state.detailDuration = 1; // Reset

    // UI
    document.getElementById('detail-img').src = resolveImg(product.imagen);
    document.getElementById('detail-title').textContent = product.nombre;
    document.getElementById('detail-category').textContent = product.categoria || 'General';
    
    // Stock Badge
    const stock = getStockStatus(product.stock);
    const badge = document.getElementById('detail-status-badge');
    badge.className = `detail-status-pill ${stock.class}`;
    badge.textContent = stock.text;

    // Boton estado
    const addBtn = document.getElementById('detail-add-cart');
    if(stock.available) {
        addBtn.disabled = false;
        addBtn.textContent = 'Agregar al Carrito';
        addBtn.onclick = () => addFromDetail();
    } else {
        addBtn.disabled = true;
        addBtn.textContent = 'Sin Stock';
    }

    // Favoritos
    const favBtn = document.getElementById('detail-fav');
    const isFav = state.wishlist.includes(product.id);
    favBtn.className = `btn-fav-lg ${isFav ? 'active' : ''}`;
    favBtn.innerHTML = isFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    favBtn.onclick = () => { toggleFav(product.id); openDetail(id); };

    updateDetailPrice();
    document.getElementById('product-detail-modal').style.display = 'flex'; // Mobile Flex Center
}

function closeDetailModal() {
    document.getElementById('product-detail-modal').style.display = 'none';
}

function selectDuration(months) {
    state.detailDuration = months;
    document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
    
    if(months === 1) document.getElementById('btn-1m').classList.add('active');
    if(months === 3) document.getElementById('btn-3m').classList.add('active');
    if(months === 12) document.getElementById('btn-12m').classList.add('active');
    
    updateDetailPrice();
}

function updateDetailPrice() {
    if(!state.detailProduct) return;
    const p = state.detailProduct;
    const base = p.en_oferta === 'SI' ? p.precio_oferta : p.precio_normal;
    const total = base * state.detailDuration;
    document.getElementById('detail-price').textContent = `Gs. ${formatMoney(total)}`;
}

// --- CARRITO LOGICA ---
function quickAdd(id, event) {
    if(event) event.stopPropagation(); // Evita abrir el modal detalle
    const p = state.products.find(x => x.id == id);
    if(!p) return;
    
    const price = p.en_oferta === 'SI' ? p.precio_oferta : p.precio_normal;
    addToCart(p.id, `${p.nombre} (1 Mes)`, price);
}

function addFromDetail() {
    const p = state.detailProduct;
    const base = p.en_oferta === 'SI' ? p.precio_oferta : p.precio_normal;
    const total = base * state.detailDuration;
    
    let suffix = " (1 Mes)";
    if(state.detailDuration === 3) suffix = " (3 Meses)";
    if(state.detailDuration === 12) suffix = " (1 Año)";

    addToCart(p.id, p.nombre + suffix, total);
    closeDetailModal();
}

function addToCart(id, name, price) {
    state.cart.push({ id, name, price: parseFloat(price) });
    saveCart();
    showToast(`Agregado: ${name}`);
    animateCartIcon();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    const isOpen = modal.style.display === 'flex';
    modal.style.display = isOpen ? 'none' : 'flex';
    if(!isOpen) renderCartItems();
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let total = 0;

    if(state.cart.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;margin-top:20px;">Tu carrito está vacío.</p>';
    } else {
        state.cart.forEach((item, idx) => {
            total += item.price;
            container.innerHTML += `
                <div class="cart-item">
                    <div>
                        <div style="font-weight:bold;color:#eee;">${item.name}</div>
                        <div style="color:var(--c-lime);font-size:0.9rem;">Gs. ${formatMoney(item.price)}</div>
                    </div>
                    <i class="fas fa-trash-alt" style="color:#ff3d00;cursor:pointer;" onclick="removeCartItem(${idx})"></i>
                </div>
            `;
        });
    }
    document.getElementById('cart-total').textContent = `${formatMoney(total)} Gs.`;
}

function removeCartItem(idx) {
    state.cart.splice(idx, 1);
    saveCart();
    renderCartItems();
}

function checkout() {
    if(state.cart.length === 0) return showToast('Carrito vacío');
    
    const method = document.getElementById('payment-method').value;
    let text = `*¡Hola The Otaño Brothers!* 👋\nQuiero realizar el siguiente pedido:\n\n`;
    let total = 0;
    
    state.cart.forEach(item => {
        text += `▪️ ${item.name} - Gs. ${formatMoney(item.price)}\n`;
        total += item.price;
    });
    
    text += `\n💰 *TOTAL: Gs. ${formatMoney(total)}*`;
    text += `\n💳 Método: ${method}`;
    
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
}

// --- UTILIDADES ---
function toggleFav(id) {
    const idx = state.wishlist.indexOf(id);
    if (idx > -1) {
        state.wishlist.splice(idx, 1);
        showToast('Eliminado de Favoritos');
    } else {
        state.wishlist.push(id);
        showToast('Agregado a Favoritos');
    }
    localStorage.setItem('wishlist', JSON.stringify(state.wishlist));
    updateCounters();
    
    // Si estamos viendo favoritos, recargar
    if (document.getElementById('favorites-section').style.display !== 'none') {
        renderFavorites();
    } else {
        renderGrid(); // Actualizar corazones en grid normal
    }
}

function toggleShowFavorites() {
    const favSection = document.getElementById('favorites-section');
    const mainGrid = document.getElementById('product-container');
    const offers = document.getElementById('offers-section');
    const filters = document.querySelector('.filters-wrapper');

    if (favSection.style.display === 'none') {
        favSection.style.display = 'block';
        favSection.classList.remove('hidden-section');
        mainGrid.style.display = 'none';
        offers.style.display = 'none';
        filters.style.display = 'none';
        renderFavorites();
    } else {
        favSection.style.display = 'none';
        mainGrid.style.display = 'grid';
        offers.style.display = 'block';
        filters.style.display = 'flex';
    }
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    const favs = state.products.filter(p => state.wishlist.includes(p.id));
    
    if(favs.length === 0) {
        grid.innerHTML = '<p>No tienes favoritos.</p>';
        return;
    }
    grid.innerHTML = favs.map(p => createProductCard(p)).join('');
}

// MODIFICADO: Lógica para ocultar si es 0
function updateCounters() {
    // Carrito
    dom.cartCount.textContent = state.cart.length;
    dom.cartCount.style.display = state.cart.length > 0 ? 'block' : 'none';

    // Favoritos
    dom.favCount.textContent = state.wishlist.length;
    dom.favCount.style.display = state.wishlist.length > 0 ? 'block' : 'none';
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
    updateCounters();
}

function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

function animateCartIcon() {
    const icon = document.getElementById('cart-icon-main');
    icon.style.transform = 'scale(1.4)';
    setTimeout(() => icon.style.transform = 'scale(1)', 200);
}

// Helpers Lógica
function formatMoney(amount) { return Number(amount).toLocaleString('es-PY'); }
function resolveImg(img) { 
    if(!img || img.length < 5) return 'https://via.placeholder.com/300?text=No+Image';
    return img.includes('http') ? img : `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${img}`; 
}
function getBrand(name) { return name ? name.split(' ')[0] : 'Generico'; }
function getStockStatus(stock) {
    const s = String(stock).toUpperCase();
    if(s === '0' || s === 'NO') return { text: 'AGOTADO', class: 'status-grey', available: false };
    if(s.includes('PEDIDO')) return { text: 'SOBRE PEDIDO', class: 'status-yellow', available: true };
    return { text: 'DISPONIBLE', class: 'status-green', available: true };
}

// Helper Swiper
function populateCategories() {
    const cats = [...new Set(state.products.map(p => p.categoria))];
    dom.catSelect.innerHTML = '<option value="all">Todas</option>';
    cats.forEach(c => {
        if(c) dom.catSelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
}
function populateSubcategories() {
    if(state.category === 'all') {
        dom.subCatSelect.disabled = true;
        return;
    }
    const brands = [...new Set(state.products.filter(p => p.categoria == state.category).map(p => getBrand(p.nombre)))];
    dom.subCatSelect.innerHTML = '<option value="all">Todas</option>';
    brands.forEach(b => dom.subCatSelect.innerHTML += `<option value="${b}">${b}</option>`);
    dom.subCatSelect.disabled = false;
}

function initSwiper() {
    const wrapper = document.getElementById('swiper-wrapper');
    const offers = state.products.filter(p => p.en_oferta === 'SI');
    
    if(offers.length === 0) return;

    wrapper.innerHTML = offers.map(p => `
        <div class="swiper-slide">
           ${createProductCard(p)} 
        </div>
    `).join('');

    new Swiper(".mySwiper", {
        slidesPerView: 1.4, // Muestra parte del siguiente para invitar a deslizar
        spaceBetween: 15,
        breakpoints: {
            640: { slidesPerView: 2.5 },
            1024: { slidesPerView: 4 }
        }
    });
}

// --- FUNCIONES ZOOM PERFIL (NUEVO) ---
function openProfileZoom() {
    document.getElementById('profile-zoom-modal').style.display = 'flex';
}

function closeProfileZoom() {
    document.getElementById('profile-zoom-modal').style.display = 'none';
}
