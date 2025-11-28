// 1. Configuración
const googleSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKvUvaRzmtv38zYONfpRyV-XO4oEZMjhLOJeIebEewkHvmNt_w2eJyA4EZkwc8gVuKcQztKP5vZU6T/pub?gid=0&single=true&output=csv";

// Cloudinary
const CLOUDINARY_CLOUD_NAME = "darqsjys4";

const myPhoneNumber = "595984835708";
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const productContainer = document.getElementById('product-container');

// --- HELPER: Función para formatear dinero (Paraguay) ---
// Convierte 50000 -> "50.000"
function formatPrice(amount) {
    return Number(amount).toLocaleString('es-PY');
}

// 2. Cargar Productos y Generar Categorías
function loadProducts() {
    Papa.parse(googleSheetURL, {
        download: true,
        header: true,
        complete: function(results) {
            products = results.data;
            products = products.filter(p => p.nombre && p.nombre.length > 0);

            renderCategories(); 
            renderProducts();   
        },
        error: function(err) {
            console.error("Error:", err);
        }
    });
}

// 3. Renderizar Categorías
function renderCategories() {
    const filtersContainer = document.getElementById('filters-container');
    const uniqueCategories = [...new Set(products.map(p => p.categoria.trim()))];

    let buttonsHTML = '<button onclick="filterProducts(\'all\')">Todos</button>';

    uniqueCategories.forEach(cat => {
        if (cat) {
            const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
            buttonsHTML += `<button onclick="filterProducts('${cat}')">${displayCat}</button>`;
        }
    });

    filtersContainer.innerHTML = buttonsHTML;
}

// 4. Renderizar Productos
function renderProducts(category = 'all') {
    productContainer.innerHTML = '';

    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.categoria.toLowerCase().trim() === category.toLowerCase().trim());

    filtered.forEach(product => {
        let priceHTML = '';
        let finalPrice = parseFloat(product.precio_normal);

        // Lógica de Oferta
        if (product.en_oferta.toUpperCase() === 'SI') {
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
        if (product.en_oferta.toUpperCase() === 'SI') card.classList.add('promo-card');

        // URL de Imagen Cloudinary
        const imageURL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/q_auto,f_auto/${product.imagen}`;

        card.innerHTML = `
            <div class="img-container">
                ${product.en_oferta.toUpperCase() === 'SI' ? '<span class="badge">OFERTA</span>' : ''}
                <img src="${imageURL}" alt="${product.nombre}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
            </div>

            <h3>${product.nombre}</h3>
            <p class="desc-short">${product.descripcion.substring(0, 50)}...</p>
            
            <div class="price-container">
                ${priceHTML}
            </div>

            <button onclick="addToCart('${product.id}')">Agregar al Carrito</button>
        `;
        productContainer.appendChild(card);
    });
}

// 5. Lógica del Carrito
function addToCart(id) {
    const product = products.find(p => p.id === id);
    
    let priceToCharge = parseFloat(product.precio_normal);
    if (product.en_oferta.toUpperCase() === 'SI') {
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
    // Mostramos el total formateado
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

function filterProducts(cat) {
    renderProducts(cat);
}

function checkout() {
    if (cart.length === 0) {
        showToast("Tu carrito está vacío");
        return;
    }
    const paymentMethod = document.getElementById('payment-method').value;
    
    // Construcción del mensaje para WhatsApp
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
