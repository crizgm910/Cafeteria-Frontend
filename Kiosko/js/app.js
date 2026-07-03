const API_URL = 'http://127.0.0.1:8000/api';

// Estado de la aplicación
let menuData = [];
let cart = [];
let currentProductSelection = null; // Producto actualmente en el modal

// Elementos del DOM
const categoryNav = document.getElementById('category-nav');
const productGrid = document.getElementById('product-grid');
const currentCategoryTitle = document.getElementById('current-category');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const btnPay = document.getElementById('btn-pay');

// Modal Elements
const modal = document.getElementById('addon-modal');
const modalProductName = document.getElementById('modal-product-name');
const modalAddons = document.getElementById('modal-addons');
const modalNotes = document.getElementById('modal-notes');
const btnCancelAddon = document.getElementById('btn-cancel-addon');
const btnConfirmAddon = document.getElementById('btn-confirm-addon');

// Inicializar Kiosko
async function initKiosko() {
    try {
        const response = await fetch(`${API_URL}/menu`);
        menuData = await response.json();
        renderCategories();
        
        if(menuData.length > 0) {
            renderProducts(menuData[0]); // Mostrar primera categoría por defecto
        }
    } catch (error) {
        console.error('Error cargando el menú:', error);
        currentCategoryTitle.textContent = 'Error de conexión con el Servidor';
    }
}

// Renderizar Menú de Categorías
function renderCategories() {
    categoryNav.innerHTML = '';
    menuData.forEach((category, index) => {
        const btn = document.createElement('button');
        btn.className = `cat-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = category.name;
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(category);
        };
        categoryNav.appendChild(btn);
    });
}

// Renderizar Cartas de Productos
function renderProducts(category) {
    currentCategoryTitle.textContent = category.name;
    productGrid.innerHTML = '';
    
    category.products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-corner top-left">
                <span>⭐</span>
            </div>
            <div class="card-art">
                <img src="img/coffee.png" alt="Art">
            </div>
            <div class="card-title">${product.name}</div>
            <div class="card-price">$${parseFloat(product.price).toFixed(2)}</div>
        `;
        card.onclick = () => openProductModal(product);
        productGrid.appendChild(card);
    });
}

// Abrir Modal de Producto
function openProductModal(product) {
    currentProductSelection = product;
    modalProductName.textContent = product.name;
    modalNotes.value = '';
    modalAddons.innerHTML = '';
    
    if (product.add_ons && product.add_ons.length > 0) {
        product.add_ons.forEach(addon => {
            const label = document.createElement('label');
            label.className = 'addon-item';
            label.innerHTML = `
                <input type="checkbox" value="${addon.id}" data-price="${addon.price_adjustment}" data-name="${addon.name}">
                <span>${addon.name}</span>
                <span class="addon-price">+$${parseFloat(addon.price_adjustment).toFixed(2)}</span>
            `;
            modalAddons.appendChild(label);
        });
    } else {
        modalAddons.innerHTML = '<span style="color:#8c8c9e">Sin modificadores disponibles</span>';
    }
    
    modal.classList.remove('hidden');
}

// Cerrar Modal
btnCancelAddon.onclick = () => {
    modal.classList.add('hidden');
    currentProductSelection = null;
};

// Confirmar Añadir al Carrito
btnConfirmAddon.onclick = () => {
    const selectedAddons = [];
    const checkboxes = modalAddons.querySelectorAll('input[type="checkbox"]:checked');
    
    checkboxes.forEach(cb => {
        selectedAddons.push({
            id: parseInt(cb.value),
            name: cb.dataset.name,
            price: parseFloat(cb.dataset.price)
        });
    });
    
    const notes = modalNotes.value.trim();
    
    addToCart(currentProductSelection, selectedAddons, notes);
    modal.classList.add('hidden');
};

// Añadir al Carrito
function addToCart(product, addons, notes) {
    // Calcular subtotal de este item (base + addons)
    let unitPrice = parseFloat(product.price);
    let addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    let totalItemPrice = unitPrice + addonsTotal;
    
    cart.push({
        product_id: product.id,
        name: product.name,
        quantity: 1, // Kiosko por simplicidad asume 1 y si quiere 2, agrega 2 veces.
        unit_price: unitPrice,
        addons: addons,
        notes: notes,
        subtotal: totalItemPrice
    });
    
    renderCart();
}

// Renderizar Carrito
function renderCart() {
    cartItemsContainer.innerHTML = '';
    let grandTotal = 0;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart">No hay cartas en tu mano</div>';
        btnPay.disabled = true;
        cartTotalElement.textContent = '$0.00';
        return;
    }
    
    cart.forEach((item, index) => {
        grandTotal += item.subtotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        let addonsHtml = item.addons.map(a => `+ ${a.name}`).join('<br>');
        let notesHtml = item.notes ? `<i>"${item.notes}"</i>` : '';
        
        cartItem.innerHTML = `
            <div class="cart-item-header">
                <span>${item.name}</span>
                <span>$${item.subtotal.toFixed(2)}</span>
            </div>
            <div class="cart-item-meta">
                ${addonsHtml}
                ${addonsHtml && notesHtml ? '<br>' : ''}
                ${notesHtml}
            </div>
            <button onclick="removeFromCart(${index})" style="background:transparent; border:none; color:var(--accent-red); cursor:pointer; font-size:16px; margin-top:10px;">Descartar</button>
        `;
        
        cartItemsContainer.appendChild(cartItem);
    });
    
    cartTotalElement.textContent = `$${grandTotal.toFixed(2)}`;
    btnPay.disabled = false;
}

// Quitar del Carrito
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
};

// Realizar Checkout
btnPay.onclick = async () => {
    btnPay.disabled = true;
    btnPay.textContent = 'PROCESANDO...';
    
    // Armar el payload para Laravel
    const payload = {
        payment_method: 'cash',
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            notes: item.notes,
            add_ons: item.addons.map(a => a.id)
        }))
    };
    
    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`¡MANO GANADORA! Ticket #${data.ticket_id} creado con éxito.\nTotal cobrado: $${data.total}`);
            cart = [];
            renderCart();
        } else {
            alert(`ERROR EN LA JUGADA: ${data.error || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error Checkout:', error);
        alert('Error de red al procesar el pago.');
    } finally {
        btnPay.textContent = 'JUGAR MANO (PAGAR)';
        if(cart.length > 0) btnPay.disabled = false;
    }
};

// Arrancar App
initKiosko();
