// 1. Configuración de Productos
const products = [
    { id: 1, name: "Netflix 1 Pantalla", price: 3.00, category: "streaming", image: "img/netflix.jpg" },
    { id: 2, name: "Netflix Premium 4K", price: 9.00, category: "streaming", image: "img/netflix.jpg" },
    { id: 3, name: "Spotify Individual", price: 5.00, category: "streaming", image: "img/spotify.jpg" },
    { id: 4, name: "Diamantes FreeFire", price: 1.50, category: "juegos", image: "img/freefire.jpg" },
    { id: 5, name: "Pase Elite FreeFire", price: 4.00, category: "juegos", image: "img/freefire.jpg" },
    { id: 6, name: "Mobile Legends", price: 1.20, category: "juegos", image: "img/mobile-legends.jpg" }
];

const myPhoneNumber = "595975724454"; 

// --- MEJORA 1: Cargar carrito desde LocalStorage ---
// Si hay algo guardado, lo usa. Si no, empieza vacío.
let cart = JSON.parse(localStorage.getItem('cart')) || [];

const productContainer = document.getElementById('product-container');

function renderProducts(category = 'all') {
    productContainer.innerHTML = '';
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        // Usamos una imagen genérica si falla la carga (onerror)
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
    
    saveCart();      // Guardamos cambios
    updateCartUI();  // Actualizamos visualmente
    showToast(`Se agregó ${product.name}`); // --- MEJORA 2: Notificación ---
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

// Función nueva para borrar todo
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
}

// --- MEJORA 1: Función para guardar en memoria ---
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
        // Botón para vaciar todo
        cartItemsDiv.innerHTML += `<button onclick="clearCart()" class="empty-cart-btn">Vaciar Carrito</button>`;
    }

    document.getElementById('cart-total').innerText = total.toFixed(2);
}

// --- MEJORA 2: Función de Notificación Visual ---
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.className = "toast show";
    toast.innerText = message;
    
    // Ocultar después de 3 segundos
    setTimeout(function(){ 
        toast.className = toast.className.replace("show", ""); 
    }, 3000);
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
    
    // Vaciar carrito al comprar
    clearCart(); 
}

// Inicializar
renderProducts();
updateCartUI(); // Para cargar el carrito si ya había algo guardado
