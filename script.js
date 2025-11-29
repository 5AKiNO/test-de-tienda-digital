// 1. Configuración
const jsonApiURL = "https://script.google.com/macros/s/AKfycbwYbJdCvQItlE_D5g1VKabHfPdHJQEfuMw6d4Eix_YdYeCIOFb-L9MapRDlQd3MfSe0mg/exec";

// Cloudinary
const CLOUDINARY_CLOUD_NAME = "darqsjys4";

const myPhoneNumber = "595984835708";
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const productContainer = document.getElementById('product-container');

// Variables de estado global para filtros
let currentCategory = 'all';
let currentSubCategory = 'all';

// Variable para la instancia de Swiper
let swiperInstance = null;

// --- HELPER: Función para formatear dinero (Paraguay) ---
function formatPrice(amount) {
    return Number(amount).toLocaleString('es-PY');
}

// --- HELPER: Resolver URL de Imagen o Placeholder ---
function resolveImageURL(imageValue) {
    // Si es null, undefined, o NO incluye '.jpg' (insensible a mayúsculas)
    if (!imageValue || !imageValue.toString().toLowerCase().includes('.jpg')) {
        // Retorna un placeholder oscuro
        return 'https://via.placeholder.com/300x200/333333/ffffff?text=HR+Store';
    }
    // Si es válido, construye la URL de Cloudinary
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${imageValue}`;
}

// 2. Cargar Productos (MODIFICADO PARA JSON)
function loadProducts() {
    // Mostrar mensaje de carga temporal
    productContainer.innerHTML = '<p style="text-align:center; padding: 20px; color:#888;">Cargando catálogo...</p>';

    fetch(jsonApiURL)
        .then(response => {
            if (!response.ok) throw new Error("Error en la red al obtener datos");
            return response.json();
        })
        .then(data => {
            products = data;
            
            // Filtro de seguridad: eliminamos productos sin nombre
            products = products.filter(p => p.nombre && p.nombre.toString().trim().length > 0);

            if (products.length === 0) {
                productContainer.innerHTML = '<p style="text-align:center;">No se encontraron productos disponibles.</p>';
                return;
            }

            // Inicializar vista
            renderCategories();
            renderProducts();
        })
        .catch(error => {
            console.error("Error cargando productos:", error);
            productContainer.innerHTML = '<p style="text-align:center; color:#e53935;">Hubo un error cargando el catálogo. Por favor recarga la página.</p>';
        });
}

// 3. Renderizar Categorías Principales (Nivel 1)
function renderCategories() {
    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;

    // Aseguramos que categoria exista antes de hacer trim()
    const uniqueCategories = [...new Set(products.map(p => p.categoria ? p.categoria.toString().trim() : 'Otros'))];

    let buttonsHTML = `<button class="${currentCategory === 'all' ? 'active' : ''}" onclick="setCategory('all')">Todos</button>`;

    uniqueCategories.forEach(cat => {
        if (cat) {
            const isActive = currentCategory === cat ? 'active' : '';
            const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
            buttonsHTML += `<button class="${isActive}" onclick="setCategory('${cat}')">${displayCat}</button>`;
        }
    });

    filtersContainer.innerHTML = buttonsHTML;
}

// 4. Lógica para establecer Categoría Principal
function setCategory(cat) {
    currentCategory = cat;
    currentSubCategory = 'all';
    renderCategories();
    renderSubCategories();
    renderProducts();
}

// 5. Renderizar Subcategorías (Marcas)
function renderSubCategories() {
    const subContainer = document.getElementById('subfilters-container');
    if (!subContainer) return;

    if (currentCategory === 'all') {
        subContainer.innerHTML = '';
        return;
    }

    const categoryProducts = products.filter(p => p.categoria.toString().trim() === currentCategory);
    const brands = new Set();
    
    categoryProducts.forEach(p => {
        const brandName = getBrandName(p.nombre);
        brands.add(brandName);
    });

    if (brands.size <= 1) {
        subContainer.innerHTML = '';
        return;
    }

    let subHTML = `<button class="sub-filter-btn ${currentSubCategory === 'all' ? 'active' : ''}" onclick="setSubCategory('all')">Todo en ${currentCategory}</button>`;

    brands.forEach(brand => {
        const isActive = currentSubCategory === brand ? 'active' : '';
        subHTML += `<button class="sub-filter-btn ${isActive}" onclick="setSubCategory('${brand}')">${brand}</button>`;
    });

    subContainer.innerHTML = subHTML;
}

// Helper: Extraer nombre de marca
function getBrandName(fullName) {
    if (!fullName) return "Generico";
    const lower = fullName.toString().toLowerCase();
    
    if (lower.startsWith("free fire")) return "Free Fire";
    if (lower.startsWith("prime video")) return "Prime Video";
    if (lower.startsWith("youtube premium")) return "YouTube";
    if (lower.startsWith("chatgpt")) return "ChatGPT";
    if (lower.startsWith("microsoft 365")) return "Microsoft";
    if (lower.startsWith("flujo tv")) return "Flujo TV";
    if (lower.startsWith("magis tv")) return "Magis TV";
    if (lower.startsWith("apple tv")) return "Apple TV";
    if (lower.startsWith("apple music")) return "Apple Music";
    
    return fullName.split(' ')[0];
}

// 6. Lógica para establecer Subcategoría
function setSubCategory(brand) {
    currentSubCategory = brand;
    renderSubCategories();
    renderProducts();
}

// 7. Renderizar Productos y Carrusel (Filtrado Final)
function renderProducts() {
    productContainer.innerHTML = '';

    // Filtro Nivel 1: Categoría
    let filtered = currentCategory === 'all'
        ? products
        : products.filter(p => p.categoria.toString().trim() === currentCategory);

    // Filtro Nivel 2: Marca (Subcategoría)
    if (currentSubCategory !== 'all') {
        filtered = filtered.filter(p => getBrandName(p.nombre) === currentSubCategory);
    }

    // Renderizar Carrusel de Ofertas
    renderCarousel(filtered);

    // Renderizar Grilla normal
    if (filtered.length === 0) {
        productContainer.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No se encontraron productos con estos filtros.</p>';
        return;
    }

    filtered.forEach(product => {
        let priceHTML = '';
        let finalPrice = parseFloat(product.precio_normal);
        let isOffer = product.en_oferta && product.en_oferta.toString().toUpperCase() === 'SI';

        if (isOffer) {
            finalPrice = parseFloat(product.precio_oferta);
            priceHTML = `
                <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
            `;
        } else {
            priceHTML = `<span class="price">Gs. ${formatPrice(finalPrice)}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        if (isOffer) card.classList.add('promo-card');

        // Resolver Imagen
        const imageURL = resolveImageURL(product.imagen);
        
        // Manejo seguro de descripción
        const desc = product.descripcion ? product.descripcion.toString().substring(0, 50) : '';

        card.innerHTML = `
            <div class="img-container">
                ${isOffer ? '<span class="badge">OFERTA</span>' : ''}
                <img src="${imageURL}" alt="${product.nombre}" class="product-img" loading="lazy">
            </div>

            <h3>${product.nombre}</h3>
            <p class="desc-short">${desc}...</p>

            <div class="price-container">
                ${priceHTML}
            </div>

            <button onclick="addToCart('${product.id}')">Agregar al Carrito</button>
        `;
        productContainer.appendChild(card);
    });
}

// --- RENDERIZAR CARRUSEL SWIPER ---
function renderCarousel(productList) {
    const offersSection = document.getElementById('offers-section');
    const swiperWrapper = document.getElementById('swiper-wrapper');

    // Filtrar solo ofertas
    const offers = productList.filter(p => p.en_oferta && p.en_oferta.toString().toUpperCase() === 'SI');

    // Destruir instancia previa si existe
    if (swiperInstance !== null) {
        swiperInstance.destroy(true, true);
        swiperInstance = null;
    }

    // Ocultar si no hay ofertas
    if (offers.length === 0) {
        offersSection.style.display = 'none';
        return;
    }

    // Mostrar sección
    offersSection.style.display = 'block';
    swiperWrapper.innerHTML = '';

    // Generar Slides
    offers.forEach(product => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';

        let finalPrice = parseFloat(product.precio_oferta);
        const imageURL = resolveImageURL(product.imagen);

        slide.innerHTML = `
            <div class="product-card promo-card">
                <div class="img-container">
                    <span class="badge">🔥 OFERTA</span>
                    <img src="${imageURL}" alt="${product.nombre}" class="product-img" loading="lazy">
                </div>
                <h3>${product.nombre}</h3>
                <div class="price-container">
                     <span class="old-price">Gs. ${formatPrice(product.precio_normal)}</span>
                     <span class="sale-price">Gs. ${formatPrice(finalPrice)}</span>
                </div>
                <button onclick="addToCart('${product.id}')">Agregar</button>
            </div>
        `;
        swiperWrapper.appendChild(slide);
    });

    // Inicializar Swiper
    swiperInstance = new Swiper(".mySwiper", {
        slidesPerView: 1,
        spaceBetween: 20,
        grabCursor: true,
        loop: offers.length > 3,
        autoplay: {
            delay: 2500,
            disableOnInteraction: false,
        },
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        breakpoints: {
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
        },
    });
}

// 8. Lógica del Carrito
function addToCart(id) {
    // Convertimos IDs a string para comparar seguramente
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

// INICIALIZAR
updateCartUI();
loadProducts();
