// 1. Configuración de Productos (Aquí agregas tu inventario)
const products = [
    { id: 1, name: "Netflix 1 Pantalla (30 días)", price: 3.00, category: "streaming" },
    { id: 2, name: "Netflix Premium 4K (30 días)", price: 9.00, category: "streaming" },
    { id: 3, name: "Spotify Individual (3 meses)", price: 5.00, category: "streaming" },
    { id: 4, name: "Diamantes FreeFire (100 + Bono)", price: 1.50, category: "juegos" },
    { id: 5, name: "Pase Elite FreeFire", price: 4.00, category: "juegos" },
    { id: 6, name: "Diamantes Mobile Legends (50)", price: 1.20, category: "juegos" }
];

// Tu número de WhatsApp (IMPORTANTE: Pon tu número real con código de país)
const myPhoneNumber = "595900000000"; // Ejemplo Paraguay: 595...

let cart = [];

// 2. Renderizar Productos en la web
const productContainer = document.getElementById('product-container');

function renderProducts(category = 'all') {
    productContainer.innerHTML = '';
    
    const filtered = category === 'all' 
        ? products 
        : products.filter(p => p.category === category);

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
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
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    
    const cartItemsDiv = document.getElementById('cart-items');
    let total = 0;
    cartItemsDiv.innerHTML = '';

    cart.forEach((item, index) => {
        total += item.price;
        cartItemsDiv.innerHTML += `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)} <button onclick="removeFromCart(${index})" style="background:red; padding:2px 5px;">X</button></span>
            </div>
        `;
    });

    document.getElementById('cart-total').innerText = total.toFixed(2);
}

// 4. Abrir/Cerrar Modal
function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function filterProducts(cat) {
    renderProducts(cat);
}

// 5. Finalizar Compra (WhatsApp)
function checkout() {
    if (cart.length === 0) {
        alert("Tu carrito está vacío.");
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

    // Crear la URL de WhatsApp
    const url = `https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Abrir en nueva pestaña
    window.open(url, '_blank');
}

// Inicializar
renderProducts();
