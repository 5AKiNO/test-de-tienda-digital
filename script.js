// 1. Configuración
const jsonApiURL = "https://script.google.com/macros/s/AKfycbwYbJdCvQItlE_D5g1VKabHfPdHJQEfuMw6d4Eix_YdYeCIOFb-L9MapRDlQd3MfSe0mg/exec";
const CLOUDINARY_CLOUD_NAME = "darqsjys4";
const myPhoneNumber = "595984835708"; // Tu número aquí

// Estado Global
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || []; // IDs de favoritos
let currentCategory = 'all';
let currentSubCategory = 'all';
let globalSearchTerm = ''; // Para el buscador
let swiperInstance = null;

const productContainer = document.getElementById('product-container');
// Referencias a los Dropdowns
const categorySelect = document.getElementById('category-select');
const subCategorySelect = document.getElementById('subcategory-select');

// --- CACHÉ CONFIG ---
const CACHE_KEY = 'hr_store_data';
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

// --- HELPER: Seguridad (Sanitización) ---
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

// --- HELPER: Imagen o Placeholder ---
function resolveImageURL(imageValue) {
    if (!imageValue || !imageValue.toString().toLowerCase().includes('.jpg')) {
        return 'https://via.placeholder.com/300x200/333333/ffffff?text=HR+Store';
    }
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${imageValue}`;
}

// 2. Renderizar SKELETON (Carga visual)
function renderSkeleton() {
    productContainer.innerHTML = '';
    // Mostramos 8 esqueletos mientras carga
    for(let i=0; i<8; i++) {
        productContainer.innerHTML += `
            <div class="skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text" style="width: 60%"></div>
                <div class="skeleton-btn"></div>
            </div>
        `;
    }
}

// 3. Cargar Productos (Con Caché y Skeleton)
function loadProducts() {
    renderSkeleton(); // Mostrar animación

    // Chequear Caché
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
            console.log("Cargando desde caché...");
            products = data;
            initializeView();
            return;
        }
    }

    // Si no hay caché o expiró, Fetch
    fetch(jsonApiURL)
        .then(response => {
            if (!response.ok) throw new Error("Error en la red");
            return response.json();
        })
        .then(data => {
            products = data;
            // Filtro seguridad: eliminar vacíos
            products = products.filter(p => p.nombre && p.nombre.toString().trim().length > 0);

            // Guardar en Caché
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: products
            }));

            initializeView();
        })
        .catch(error => {
            console.error("Error:", error);
            productContainer.innerHTML = '<p style="text-align:center; color:#e53935;">Error cargando catálogo.</p>';
        });
}

function initializeView() {
    if (products.length === 0) {
        productContainer.innerHTML = '<p style="text-align:center;">No hay productos.</p>';
        return;
    }
    populateCategoryDropdown();
    renderProducts();
    updateWishlistCount();
}

// 4. Lógica del Buscador
document.getElementById('search-input').addEventListener('input', (e) => {
    globalSearchTerm = e.target.value.toLowerCase().trim();
    // Resetear filtros de categoría al buscar para buscar en TODO
    if (globalSearchTerm.length > 0) {
        currentCategory = 'all';
        currentSubCategory = 'all';
        categorySelect.value = 'all';
        subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
        subCategorySelect.disabled = true;
    }
    renderProducts();
});

// 5. Lógica de Dropdowns (Selects)

// Event Listeners para los Selects
categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    currentSubCategory = 'all'; // Reset subcategoría
    globalSearchTerm = ''; // Reset buscador
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

    // Resetear y añadir opción por defecto
    categorySelect.innerHTML = '<option value="all">Todas las Categorías</option>';

    uniqueCategories.forEach(cat => {
        if (cat) {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            categorySelect.appendChild(option);
        }
    });
}

function populateSubCategoryDropdown() {
    // Si la categoría es 'all', deshabilitar subcategorías
    if (currentCategory === 'all') {
        subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
        subCategorySelect.disabled = true;
        return;
    }

    const categoryProducts = products.filter(p => p.categoria.toString().trim() === currentCategory);
    const brands = new Set();
    categoryProducts.forEach(p => brands.add(getBrandName(p.nombre)));

    // Si solo hay una marca o ninguna, no tiene sentido filtrar
    if (brands.size <= 1) {
        subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';
        subCategorySelect.disabled = true;
        return;
    }

    subCategorySelect.disabled = false;
    subCategorySelect.innerHTML = '<option value="all">Todas las Marcas</option>';

    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        subCategorySelect.appendChild(option);
    });
}

function getBrandName(fullName) {
    if (!fullName) return "Generico";
    const lower = fullName.toString().toLowerCase();
    if (lower.startsWith("free fire")) return "Free Fire";
    if (lower.startsWith("prime video")) return "Prime Video";
    if (lower.startsWith("youtube premium")) return "YouTube";
    if (lower.startsWith("chatgpt")) return "ChatGPT";
    if (lower.startsWith("microsoft 365")) return "Microsoft";
    return fullName.split(' ')[0];
}

// 7. RENDERIZAR PRODUCTOS (Core)
function renderProducts() {
    productContainer.innerHTML = '';

    // Filtrado Principal
    let filtered = products;

    // 1. Buscador
    if (globalSearchTerm) {
        filtered = filtered.filter(p => p.nombre.toLowerCase().includes(globalSearchTerm));
    } else {
        // 2. Categoría y Sub
        if (currentCategory !== 'all') {
            filtered = filtered.filter(p => p.categoria.toString().trim() === currentCategory);
        }
        if (currentSubCategory !== 'all') {
            filtered = filtered.filter(p => getBrandName(p.nombre) === currentSubCategory);
        }
    }

    // Renderizar Carrusel (solo si no estamos buscando)
    if (!globalSearchTerm) {
        renderCarousel(filtered);
    } else {
        document.getElementById('offers-section').style.display = 'none';
    }

    if (filtered.length === 0) {
        productContainer.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No se encontraron resultados.</p>';
        return;
    }

    filtered.forEach(product => {
        // --- LÓGICA DE STOCK ---
        let hasStock = true;
        if (product.stock && (product.stock.toString().toUpperCase() === 'NO' || product.stock == 0)) {
            hasStock = false;
        }

        // --- LÓGICA DE PRECIO ---
        let finalPrice = parseFloat(product.precio_normal);
        let isOffer = product.en_oferta && product.en_oferta.toString().toUpperCase() === 'SI';
        let priceHTML = `<span class="price">Gs. ${formatPrice(finalPrice)}</span>`;

        if (isOffer) {
            finalPrice = parseFloat(product.precio_oferta);
            priceHTML = `
                <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
            `;
        }

        // --- FAVORITOS ---
        const isFav = wishlist.includes(product.id);
        const heartClass = isFav ? 'fas' : 'far';
        const activeClass = isFav ? 'active' : '';

        // --- CREAR TARJETA ---
        const card = document.createElement('div');
        card.className = `product-card ${hasStock ? '' : 'out-of-stock'} ${isOffer ? 'promo-card' : ''}`;

        const imageURL = resolveImageURL(product.imagen);
        const safeName = escapeHTML(product.nombre);
        const safeDesc = escapeHTML(product.descripcion ? product.descripcion.toString().substring(0, 50) : '');

        // Botón: Habilitado o Deshabilitado
        const btnHTML = hasStock
            ? `<button onclick="addToCart('${product.id}')">Agregar al Carrito</button>`
            : `<button disabled>Agotado</button>`;

        const stockBadge = !hasStock ? `<div class="badge-stock">AGOTADO</div>` : '';
        const offerBadge = (isOffer && hasStock) ? '<span class="badge">OFERTA</span>' : '';

        card.innerHTML = `
            ${stockBadge}
            <i class="${heartClass} fa-heart heart-btn ${activeClass}" onclick="toggleWishlist('${product.id}')"></i>

            <div class="img-container">
                ${offerBadge}
                <img src="${imageURL}" alt="${safeName}" class="product-img" loading="lazy">
            </div>

            <h3>${safeName}</h3>
            <p class="desc-short">${safeDesc}...</p>

            <div class="price-container">
                ${priceHTML}
            </div>

            ${btnHTML}
        `;
        productContainer.appendChild(card);
    });
}

// --- FAVORITOS (Wishlist) ---
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

    // Si estamos en la vista de favoritos, refrescar
    const favSection = document.getElementById('favorites-section');
    if (favSection.style.display !== 'none') {
        renderFavorites();
    } else {
        renderProducts(); // Refrescar iconos en la grilla principal
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
    const search = document.querySelector('.search-container');

    if (favSection.style.display === 'none') {
        // Mostrar Favoritos
        mainGrid.style.display = 'none';
        filters.style.display = 'none';
        offers.style.display = 'none';
        search.style.display = 'none';
        favSection.style.display = 'block';
        renderFavorites();
    } else {
        // Volver a Home
        mainGrid.style.display = 'grid';
        filters.style.display = 'flex';
        search.style.display = 'flex';
        favSection.style.display = 'none';
        renderProducts(); // Restaurar vista principal
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
        const imageURL = resolveImageURL(product.imagen);
        const safeName = escapeHTML(product.nombre);

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
             <i class="fas fa-heart heart-btn active" onclick="toggleWishlist('${product.id}')"></i>
             <div class="img-container">
                <img src="${imageURL}" class="product-img">
             </div>
             <h3>${safeName}</h3>
             <button onclick="addToCart('${product.id}')">Agregar</button>
        `;
        favGrid.appendChild(card);
    });
}

// --- CARRUSEL SWIPER ---
function renderCarousel(productList) {
    const offersSection = document.getElementById('offers-section');
    const swiperWrapper = document.getElementById('swiper-wrapper');

    // Filtramos ofertas que tengan stock
    const offers = productList.filter(p =>
        p.en_oferta &&
        p.en_oferta.toString().toUpperCase() === 'SI' &&
        (!p.stock || (p.stock.toString().toUpperCase() !== 'NO' && p.stock != 0))
    );

    if (swiperInstance !== null) {
        swiperInstance.destroy(true, true);
        swiperInstance = null;
    }

    if (offers.length === 0) {
        offersSection.style.display = 'none';
        return;
    }

    offersSection.style.display = 'block';
    swiperWrapper.innerHTML = '';

    offers.forEach(product => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        let finalPrice = parseFloat(product.precio_oferta);
        const imageURL = resolveImageURL(product.imagen);
        const safeName = escapeHTML(product.nombre);

        slide.innerHTML = `
            <div class="product-card promo-card">
                <div class="img-container">
                    <span class="badge">🔥 OFERTA</span>
                    <img src="${imageURL}" alt="${safeName}" class="product-img" loading="lazy">
                </div>
                <h3>${safeName}</h3>
                <div class="price-container">
                     <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                     <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
                </div>
                <button onclick="addToCart('${product.id}')">Agregar</button>
            </div>
        `;
        swiperWrapper.appendChild(slide);
    });

    swiperInstance = new Swiper(".mySwiper", {
        slidesPerView: 1,
        spaceBetween: 20,
        grabCursor: true,
        loop: offers.length > 3,
        autoplay: { delay: 2500, disableOnInteraction: false },
        pagination: { el: ".swiper-pagination", clickable: true },
        breakpoints: {
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
        },
    });
}

// --- CARRITO & MICRO-INTERACCIONES ---
function addToCart(id) {
    const product = products.find(p => p.id.toString() === id.toString());
    if (!product) return;

    let priceToCharge = parseFloat(product.precio_normal);
    if (product.en_oferta && product.en_oferta.toString().toUpperCase() === 'SI') {
        priceToCharge = parseFloat(product.precio_oferta);
    }

    const item = {
        id: product.id,
        name: product.nombre,
        price: priceToCharge
    };

    cart.push(item);
    saveCart();
    updateCartUI();
    animateCart(); // Micro-interacción
    showToast(`Se agregó ${product.nombre}`);
}

function animateCart() {
    const icon = document.getElementById('cart-icon-container');
    icon.classList.add('bounce');
    setTimeout(() => icon.classList.remove('bounce'), 500);
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

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

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
                    <button onclick="removeFromCart(${index})" style="background:red; padding:2px 5px; color:white; border:none; cursor:pointer;">X</button>
                    </span>
                </div>
            `;
        });
        cartItemsDiv.innerHTML += `<button onclick="clearCart()" class="empty-cart-btn">Vaciar Carrito</button>`;
    }
    document.getElementById('cart-total').innerText = formatPrice(total);
}

// UI Helpers
function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.className = "toast show";
        toast.innerText = message;
        setTimeout(() => toast.className = toast.className.replace("show", ""), 3000);
    }
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function checkout() {
    if (cart.length === 0) {
        showToast("Tu carrito está vacío");
        return;
    }
    const paymentMethod = document.getElementById('payment-method').value;

    let message = `Hola HR Store, quiero realizar el siguiente pedido:\n\n`;
    let total = 0;

    cart.forEach(item => {
        message += `- ${item.name} (Gs. ${formatPrice(item.price)})\n`;
        total += item.price;
    });

    message += `\n*Total a pagar: Gs. ${formatPrice(total)}*`;
    message += `\nMétodo de pago: ${paymentMethod}`;

    const url = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// --- FUNCIÓN NUEVA: CONFIGURAR BOTÓN FLOTANTE ---
function setupWhatsappFloat() {
    const floatBtn = document.getElementById('whatsapp-sticky');
    if (floatBtn) {
        const message = "Hola HR Store, necesito ayuda con un producto o servicio.";
        floatBtn.href = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;
    }
}

// INICIALIZAR
updateCartUI();
updateWishlistCount();
setupWhatsappFloat(); // Inicializar botón flotante
loadProducts();
