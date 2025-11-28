// 1. Configuración
// ¡IMPORTANTE! Pega aquí el enlace que copiaste al dar "Publicar como CSV"
const googleSheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTKvUvaRzmtv38zYONfpRyV-XO4oEZMjhLOJeIebEewkHvmNt_w2eJyA4EZkwc8gVuKcQztKP5vZU6T/pub?gid=0&single=true&output=csv";

const myPhoneNumber = "595984835708"; 
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const productContainer = document.getElementById('product-container');

// 2. Cargar Productos desde Google Sheets
function loadProducts() {
    Papa.parse(googleSheetURL, {
        download: true,
        header: true,
        complete: function(results) {
            // PapaParse convierte el CSV en un Array de objetos
            products = results.data;
            // Filtra filas vacías por si acaso
            products = products.filter(p => p.nombre && p.nombre.length > 0);
            renderProducts();
        },
        error: function(err) {
            console.error("Error leyendo Google Sheets:", err);
            alert("Error al cargar productos");
        }
    });
}

// 3. Renderizar (Ahora con lógica de Ofertas y Descripción)
function renderProducts(category = 'all') {
    productContainer.innerHTML = '';
    
    // Normaliza la categoría (minúsculas y sin espacios) para evitar errores
    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.categoria.toLowerCase().trim() === category.toLowerCase().trim());

    filtered.forEach(product => {
        // Lógica de Precios
        let priceHTML = '';
        let finalPrice = parseFloat(product.precio_normal);
        
        // Verificamos si la columna 'en_oferta' dice SI
        if (product.en_oferta.toUpperCase() === 'SI') {
            finalPrice = parseFloat(product.precio_oferta);
            priceHTML = `
                <span class="old-price">$${parseFloat(product.precio_normal).toFixed(2)}</span>
                <span class="sale-price">$${finalPrice.toFixed(2)}</span>
            `;
        } else {
            priceHTML = `<span class="price">$${finalPrice.toFixed(2)}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        // Agregamos clase si está en oferta para darle estilo
        if (product.en_oferta.toUpperCase() === 'SI') card.classList.add('promo-card');

        card.innerHTML = `
            <div class="img-container">
                ${product.en_oferta.toUpperCase() === 'SI' ? '<span class="badge">OFERTA</span>' : ''}
                <img src="${product.imagen}" alt="${product.nombre}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
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

// 4. Lógica del Carrito (Adaptada para leer los precios dinámicos)
function addToCart(id) {
    // Buscamos por ID (ahora como string porque viene del CSV)
    const product = products.find(p => p.id === id);
    
    // Determinamos el precio real a cobrar
    let priceToCharge = parseFloat(product.precio_normal);
    if (product.en_oferta.toUpperCase() === 'SI') {
        priceToCharge = parseFloat(product.precio_oferta);
    }

    // Creamos un objeto item para el carrito
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
                    <span>$${item.price.toFixed(2)} <button onclick="removeFromCart(${index})" style="background:red; padding:2px 5px; color:white; border:none; cursor:pointer;">X</button></span>
                </div>
            `;
        });
        cartItemsDiv.innerHTML += `<button onclick="clearCart()" class="empty-cart-btn">Vaciar Carrito</button>`;
    }
    document.getElementById('cart-total').innerText = total.toFixed(2);
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
    let message = `Hola, quiero realizar el siguiente pedido:\n\n`;
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} ($${item.price.toFixed(2)})\n`;
        total += item.price;
    });
    message += `\n*Total a pagar: $${total.toFixed(2)} USD*`;
    message += `\nMétodo de pago: ${paymentMethod}`;
    const url = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// INICIALIZAR
updateCartUI();
loadProducts();
