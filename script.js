// 1. Configuración Inicial
// Ahora 'products' empieza vacío, esperando recibir datos
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const myPhoneNumber = "595975724454"; 

// ELEMENTOS DEL DOM
const productContainer = document.getElementById('product-container');

// --- CARGAR PRODUCTOS (FETCH) ---
async function loadProducts() {
    try {
        // Pedimos el archivo JSON
        const response = await fetch('productos.json');
        
        // Convertimos la respuesta a datos usables
        const data = await response.json();
        
        // Guardamos los datos en nuestra variable global
        products = data;
        
        // Una vez que tenemos los datos, pintamos la web
        renderProducts();
    } catch (error) {
        console.error("Error cargando productos:", error);
        alert("Hubo un error cargando la tienda. Intenta recargar.");
    }
}

// 2. Renderizar Productos
function renderProducts(category = 'all') {
    productContainer.innerHTML = '';
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/150'">
            <h3>${product.name}</h3>
            <p class="price">$${product.price.toFixed(2)}</p>
            <button onclick="addToCart(${product.id})">Agregar al Carrito</button>
        `;
        productContainer.appendChild(card);
    });
}

// 3. Lógica del Carrito
function addToCart(id) {
    const product = products.find(p => p.id === id);
    cart.push(product);
    saveCart();      
    updateCartUI();  
    showToast(`Se agregó ${product.name}`);
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

// Notificación Visual
function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.className = "toast show";
        toast.innerText = message;
        setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
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
        showToast("Tu carrito está vacío 😢");
        return;
    }
    const paymentMethod = document.getElementById('payment-method').value;
    let message = `Hola, quiero realizar el siguiente pedido:\n\n`;
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.name} ($${item.price})\n`;
        total += item.price;
    });
    message += `\n*Total a pagar: $${total.toFixed(2)} USD*`;
    message += `\nMétodo de pago: ${paymentMethod}`;
    message += `\n\nQuedo a la espera de los datos para pagar.`;
    const url = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// --- INICIALIZACIÓN ---
// Primero cargamos el carrito guardado
updateCartUI();
// Luego iniciamos la carga de productos desde el JSON
loadProducts();
