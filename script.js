// 1. Configuración
const jsonApiURL = "https://script.google.com/macros/s/AKfycbwYbJdCvQItlE_D5g1VKabHfPdHJQEfuMw6d4Eix_YdYeCIOFb-L9MapRDlQd3MfSe0mg/exec";
const CLOUDINARY_CLOUD_NAME = "darqsjys4";
const myPhoneNumber = "595984835708"; 

// Estado Global
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let currentCategory = 'all';
let currentSubCategory = 'all';
let globalSearchTerm = '';
let swiperInstance = null;

// Estado Modal Detalle
let currentDetailProduct = null;
let currentDetailDuration = 1; // 1, 3, 12 meses

const productContainer = document.getElementById('product-container');
const categorySelect = document.getElementById('category-select');
const subCategorySelect = document.getElementById('subcategory-select');

// Cache
const CACHE_KEY = 'otano_brothers_data_v3';
const CACHE_TIME = 5 * 60 * 1000;

// --- HELPER: Seguridad ---
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- HELPER: Formatear dinero ---
function formatPrice(amount) {
    return Number(amount).toLocaleString('es-PY');
}

// --- HELPER: Imagen ---
function resolveImageURL(imageValue) {
    if (!imageValue || !imageValue.toString().toLowerCase().includes('.jpg')) {
        return 'https://via.placeholder.com/300x300/121212/ff9100?text=The+Otaño+Bros';
    }
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${imageValue}`;
}

// --- LOGICA DE ESTADOS (Verde, Amarillo, Gris) ---
function getProductStatus(stockValue) {
    let val = stockValue ? stockValue.toString().toUpperCase().trim() : 'NO';
    if (val == '0') val = 'NO';

    // Prioridad 1: Agotado
    if (val === 'NO') {
        return { text: 'AGOTADO', class: 'status-grey', interact: false, isAvailable: false };
    }
    // Prioridad 2: Sobre Pedido (Si en el CSV escribes 'PEDIDO' o 'DEMORA')
    if (val.includes('PEDIDO') || val.includes('DEMORA')) {
        return { text: 'SOBRE PEDIDO', class: 'status-yellow', interact: true, isAvailable: true };
    }
    // Prioridad 3: Entrega Inmediata (Default si stock > 0 o 'SI')
    return { text: 'ENTREGA INMEDIATA', class: 'status-green', interact: true, isAvailable: true };
}

// 2. Renderizar Skeleton
function renderSkeleton() {
    productContainer.innerHTML = '';
    for(let i=0; i<8; i++) {
        productContainer.innerHTML += `
            <div class="skeleton">
                <div style="height: 150px; width:100%"></div>
                <div style="height: 20px; width:80%"></div>
                <div style="height: 20px; width:60%"></div>
                <div style="height: 35px; width:100%; margin-top:auto"></div>
            </div>
        `;
    }
}

// 3. Cargar Productos
function loadProducts() {
    renderSkeleton();
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
            products = data;
            initializeView();
            return;
        }
    }

    fetch(jsonApiURL)
        .then(response => response.ok ? response.json() : Promise.reject("Error red"))
        .then(data => {
            products = data.filter(p => p.nombre && p.nombre.toString().trim().length > 0);
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: products }));
            initializeView();
        })
        .catch(err => {
            console.error(err);
            productContainer.innerHTML = '<p style="text-align:center; color:#ff3d00;">Error cargando catálogo.</p>';
        });
}

function initializeView() {
    if (products.length === 0) {
        productContainer.innerHTML = '<p style="text-align:center;">No hay productos disponibles.</p>';
        return;
    }
    populateCategoryDropdown();
    renderProducts();
    updateWishlistCount();
}

// 4. Buscador
document.getElementById('search-input').addEventListener('input', (e) => {
    globalSearchTerm = e.target.value.toLowerCase().trim();
    if (globalSearchTerm.length > 0) {
        currentCategory = 'all'; currentSubCategory = 'all';
        categorySelect.value = 'all';
        subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
        subCategorySelect.disabled = true;
    }
    renderProducts();
});

// 5. Dropdowns
categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    currentSubCategory = 'all';
    globalSearchTerm = '';
    document.getElementById('search-input').value = '';
    populateSubCategoryDropdown();
    renderProducts();
});

subCategorySelect.addEventListener('change', (e) => {
    currentSubCategory = e.target.value;
    renderProducts();
});

function populateCategoryDropdown() {
    const uniqueCategories = [...new Set(products.map(p => p.categoria ? p.categoria.toString().trim() : 'Otros'))];
    categorySelect.innerHTML = '<option value="all">Todas las Categorías</option>';
    uniqueCategories.forEach(cat => {
        if (cat) categorySelect.innerHTML += `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`;
    });
}

function populateSubCategoryDropdown() {
    if (currentCategory === 'all') {
        subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
        subCategorySelect.disabled = true;
        return;
    }
    const categoryProducts = products.filter(p => p.categoria.toString().trim() === currentCategory);
    const brands = new Set(categoryProducts.map(p => getBrandName(p.nombre)));
    
    subCategorySelect.disabled = brands.size <= 1;
    subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
    brands.forEach(brand => subCategorySelect.innerHTML += `<option value="${brand}">${brand}</option>`);
}

function getBrandName(fullName) {
    if (!fullName) return "Generico";
    const lower = fullName.toString().toLowerCase();
    if (lower.startsWith("free fire")) return "Free Fire";
    if (lower.startsWith("prime video")) return "Prime Video";
    if (lower.startsWith("youtube premium")) return "YouTube";
    return fullName.split(' ')[0];
}

// 7. RENDERIZAR PRODUCTOS
function renderProducts() {
    productContainer.innerHTML = '';
    let filtered = products;

    if (globalSearchTerm) {
        filtered = filtered.filter(p => p.nombre.toLowerCase().includes(globalSearchTerm));
    } else {
        if (currentCategory !== 'all') filtered = filtered.filter(p => p.categoria.toString().trim() === currentCategory);
        if (currentSubCategory !== 'all') filtered = filtered.filter(p => getBrandName(p.nombre) === currentSubCategory);
    }

    if (!globalSearchTerm) renderCarousel(filtered);
    else document.getElementById('offers-section').style.display = 'none';

    if (filtered.length === 0) {
        productContainer.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No se encontraron resultados.</p>';
        return;
    }

    filtered.forEach(product => {
        // Lógica de Precios y Estado
        let finalPrice = parseFloat(product.precio_normal);
        let isOffer = product.en_oferta && product.en_oferta.toString().toUpperCase() === 'SI';
        if (isOffer) finalPrice = parseFloat(product.precio_oferta);
        
        const status = getProductStatus(product.stock);
        
        // HTML Precios
        let priceHTML = `<span class="price">Gs. ${formatPrice(finalPrice)}</span>`;
        if (isOffer) {
            priceHTML = `
                <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
            `;
        }

        const isFav = wishlist.includes(product.id);
        const heartClass = isFav ? 'fas active' : 'far';
        
        // Badge de Oferta (Solo si está disponible)
        const offerBadge = (isOffer && status.isAvailable) ? '<span class="badge">OFERTA 🔥</span>' : '';

        // Badge de Estado (Verde/Amarillo/Gris) - Siempre visible
        const statusBadge = `<div class="badge-stock ${status.class}">${status.text}</div>`;

        // Botón
        const btnHTML = status.interact 
            ? `<button onclick="addToCartDirect('${product.id}')">Agregar</button>` 
            : `<button disabled>Agotado</button>`;

        const dimClass = !status.isAvailable ? 'dimmed-card' : '';

        const card = document.createElement('div');
        card.className = `product-card ${dimClass} ${isOffer ? 'promo-card' : ''}`;
        
        card.innerHTML = `
            ${statusBadge}
            <i class="${heartClass} fa-heart heart-btn" onclick="toggleWishlist('${product.id}')"></i>

            <div class="img-container" onclick="openDetailModal('${product.id}')">
                ${offerBadge}
                <img src="${resolveImageURL(product.imagen)}" alt="${escapeHTML(product.nombre)}" class="product-img" loading="lazy">
            </div>

            <h3 onclick="openDetailModal('${product.id}')">${escapeHTML(product.nombre)}</h3>
            <div class="price-container">
                ${priceHTML}
            </div>

            ${btnHTML}
        `;
        productContainer.appendChild(card);
    });
}

// --- VISTA DE DETALLE (MODAL) ---
function openDetailModal(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    currentDetailProduct = product;
    currentDetailDuration = 1; // Reset a 1 mes

    // Rellenar Info Básica
    document.getElementById('detail-img').src = resolveImageURL(product.imagen);
    document.getElementById('detail-title').innerText = product.nombre;
    document.getElementById('detail-category').innerText = product.categoria;

    // Estado Badge
    const status = getProductStatus(product.stock);
    const statusBadge = document.getElementById('detail-status-badge');
    statusBadge.className = `detail-status-pill ${status.class}`;
    statusBadge.innerText = status.text;

    // Botones Acción
    const addBtn = document.getElementById('detail-add-cart');
    const favBtn = document.getElementById('detail-fav');
    
    if (status.interact) {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Agregar al Carrito';
        addBtn.onclick = () => addToCartFromDetail();
    } else {
        addBtn.disabled = true;
        addBtn.innerHTML = 'Agotado';
        addBtn.onclick = null;
    }

    // Favorito estado
    if (wishlist.includes(product.id)) {
        favBtn.innerHTML = '<i class="fas fa-heart"></i>';
        favBtn.classList.add('active');
    } else {
        favBtn.innerHTML = '<i class="far fa-heart"></i>';
        favBtn.classList.remove('active');
    }
    favBtn.onclick = () => {
        toggleWishlist(product.id);
        openDetailModal(product.id); // Recargar para ver cambio icono
    };

    updateDetailPrice(); // Renderiza precios y botones
    
    document.getElementById('product-detail-modal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('product-detail-modal').style.display = 'none';
}

function selectDuration(months) {
    currentDetailDuration = months;
    updateDetailPrice();
}

function updateDetailPrice() {
    if (!currentDetailProduct) return;

    // Obtener precio base (considerando oferta)
    let basePrice = parseFloat(currentDetailProduct.precio_normal);
    if (currentDetailProduct.en_oferta && currentDetailProduct.en_oferta.toString().toUpperCase() === 'SI') {
        basePrice = parseFloat(currentDetailProduct.precio_oferta);
    }

    // Calcular precio por duración (Lógica Simple: Multiplicador)
    let finalPrice = basePrice * currentDetailDuration;
    
    // UI Botones
    document.querySelectorAll('.dur-btn').forEach(btn => btn.classList.remove('active'));
    if(currentDetailDuration === 1) document.getElementById('btn-1m').classList.add('active');
    if(currentDetailDuration === 3) document.getElementById('btn-3m').classList.add('active');
    if(currentDetailDuration === 12) document.getElementById('btn-12m').classList.add('active');

    document.getElementById('detail-price').innerText = `Gs. ${formatPrice(finalPrice)}`;
}

function addToCartFromDetail() {
    if (!currentDetailProduct) return;
    
    // Calcular precio
    let basePrice = parseFloat(currentDetailProduct.precio_normal);
    if (currentDetailProduct.en_oferta && currentDetailProduct.en_oferta.toString().toUpperCase() === 'SI') {
        basePrice = parseFloat(currentDetailProduct.precio_oferta);
    }
    const finalPrice = basePrice * currentDetailDuration;

    // Nombre modificado con duración
    let nameSuffix = " (1 Mes)";
    if (currentDetailDuration === 3) nameSuffix = " (3 Meses)";
    if (currentDetailDuration === 12) nameSuffix = " (1 Año)";

    const item = {
        id: currentDetailProduct.id,
        name: currentDetailProduct.nombre + nameSuffix,
        price: finalPrice
    };

    cart.push(item);
    saveCart();
    updateCartUI();
    animateCart();
    closeDetailModal();
    showToast(`Agregado: ${item.name}`);
}

// --- CARRITO ---
function addToCartDirect(id) {
    // Añadir rápido por defecto 1 mes
    const product = products.find(p => p.id.toString() === id.toString());
    if (!product) return;
    
    let price = parseFloat(product.precio_normal);
    if (product.en_oferta && product.en_oferta.toString().toUpperCase() === 'SI') {
        price = parseFloat(product.precio_oferta);
    }

    cart.push({ id: product.id, name: product.nombre + " (1 Mes)", price: price });
    saveCart();
    updateCartUI();
    animateCart();
    showToast(`Se agregó ${product.nombre}`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const cartItemsDiv = document.getElementById('cart-items');
    let total = 0;
    cartItemsDiv.innerHTML = '';

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p>El carrito está vacío.</p>';
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            cartItemsDiv.innerHTML += `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>Gs. ${formatPrice(item.price)}
                    <button onclick="removeFromCart(${index})" style="background:transparent; padding:0 5px; color:#ff3d00; border:none; cursor:pointer;">&times;</button>
                    </span>
                </div>
            `;
        });
        cartItemsDiv.innerHTML += `<button onclick="clearCart()" class="empty-cart-btn">Vaciar Carrito</button>`;
    }
    document.getElementById('cart-total').innerText = formatPrice(total);
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function animateCart() {
    const icon = document.getElementById('cart-icon-container');
    icon.classList.add('bounce');
    setTimeout(() => icon.classList.remove('bounce'), 500);
}

function checkout() {
    if (cart.length === 0) { showToast("Tu carrito está vacío"); return; }
    const paymentMethod = document.getElementById('payment-method').value;
    let message = `Hola The Otaño Brothers, quiero realizar el siguiente pedido:\n\n`;
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} (Gs. ${formatPrice(item.price)})\n`;
        total += item.price;
    });
    message += `\n*Total a pagar: Gs. ${formatPrice(total)}*`;
    message += `\nMétodo de pago: ${paymentMethod}`;
    window.open(`https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

// --- FAVORITOS ---
function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(itemId => itemId !== id);
        showToast("Eliminado de favoritos");
    } else {
        wishlist.push(id);
        showToast("Agregado a favoritos");
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    
    // Si estamos en la sección de favoritos, refrescar
    if (document.getElementById('favorites-section').style.display !== 'none') {
        renderFavorites();
    } else {
        renderProducts(); // Refrescar iconos en grid principal
    }
}

function updateWishlistCount() {
    document.getElementById('fav-count').innerText = wishlist.length;
}

function toggleShowFavorites() {
    const mainGrid = document.getElementById('product-container');
    const filters = document.querySelector('.filters-wrapper');
    const offers = document.getElementById('offers-section');
    const favSection = document.getElementById('favorites-section');

    if (favSection.style.display === 'none') {
        mainGrid.style.display = 'none';
        filters.style.display = 'none';
        offers.style.display = 'none';
        favSection.style.display = 'block';
        renderFavorites();
    } else {
        mainGrid.style.display = 'grid';
        filters.style.display = 'flex';
        favSection.style.display = 'none';
        renderProducts();
    }
}

function renderFavorites() {
    const favGrid = document.getElementById('favorites-grid');
    favGrid.innerHTML = '';
    const favProducts = products.filter(p => wishlist.includes(p.id));

    if (favProducts.length === 0) {
        favGrid.innerHTML = '<p>No tienes favoritos aún.</p>';
        return;
    }

    favProducts.forEach(product => {
        const status = getProductStatus(product.stock);
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
             <i class="fas fa-heart heart-btn active" onclick="toggleWishlist('${product.id}')"></i>
             <div class="img-container" onclick="openDetailModal('${product.id}')">
                <img src="${resolveImageURL(product.imagen)}" class="product-img">
             </div>
             <h3>${product.nombre}</h3>
             <button onclick="openDetailModal('${product.id}')">Ver Opciones</button>
        `;
        favGrid.appendChild(card);
    });
}

// --- SWIPER CARRUSEL ---
function renderCarousel(productList) {
    const offersSection = document.getElementById('offers-section');
    const swiperWrapper = document.getElementById('swiper-wrapper');
    
    // Filtrar ofertas que SI tienen stock o son SOBRE PEDIDO
    const offers = productList.filter(p => 
        p.en_oferta && p.en_oferta.toString().toUpperCase() === 'SI' && 
        getProductStatus(p.stock).isAvailable
    );

    if (swiperInstance) { swiperInstance.destroy(true, true); swiperInstance = null; }
    if (offers.length === 0) { offersSection.style.display = 'none'; return; }

    offersSection.style.display = 'block';
    swiperWrapper.innerHTML = '';

    offers.forEach(product => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        let finalPrice = parseFloat(product.precio_oferta);
        slide.innerHTML = `
            <div class="product-card promo-card">
                <div class="img-container" onclick="openDetailModal('${product.id}')">
                    <span class="badge">🔥 OFERTA</span>
                    <img src="${resolveImageURL(product.imagen)}" class="product-img" loading="lazy">
                </div>
                <h3>${escapeHTML(product.nombre)}</h3>
                <div class="price-container">
                     <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                     <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
                </div>
                <button onclick="addToCartDirect('${product.id}')">Agregar</button>
            </div>
        `;
        swiperWrapper.appendChild(slide);
    });

    swiperInstance = new Swiper(".mySwiper", {
        slidesPerView: 1.5, spaceBetween: 15, grabCursor: true,
        loop: offers.length > 3, autoplay: { delay: 3000, disableOnInteraction: false },
        pagination: { el: ".swiper-pagination", clickable: true },
        breakpoints: { 640: { slidesPerView: 2.5 }, 768: { slidesPerView: 3.5 }, 1024: { slidesPerView: 4.5 } },
    });
}

// Helpers UI
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = message;
    setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
}

function setupWhatsappFloat() {
    const floatBtn = document.getElementById('whatsapp-sticky');
    floatBtn.href = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent("Hola, necesito ayuda.")}`;
}

// INIT
updateCartUI();
updateWishlistCount();
setupWhatsappFloat();
loadProducts();
