const API_URL = 'http://127.0.0.1:8000/api';

const menuFilters = document.getElementById('menu-filters');
const menuGrid = document.getElementById('menu-grid');

let menuData = [];
let cart = [];
let currentSelectedProduct = null;

// Cart UI Elements
const cartBtn = document.getElementById('cart-floating-btn');
const cartBadge = document.getElementById('cart-badge');
const cartSidebar = document.getElementById('cart-sidebar');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const btnPay = document.getElementById('btn-pay');
const checkoutService = document.getElementById('checkout-service');
const checkoutPayment = document.getElementById('checkout-payment');

// Modal Elements
const addonModal = document.getElementById('addon-modal');
const btnCancelAddon = document.getElementById('btn-cancel-addon');
const btnConfirmAddon = document.getElementById('btn-confirm-addon');
const modalProductName = document.getElementById('modal-product-name');
const modalAddons = document.getElementById('modal-addons');
const modalNotes = document.getElementById('modal-notes');
const modalTastingNotes = document.getElementById('modal-tasting-notes');

// Login Elements
const loginModal = document.getElementById('login-modal');
const btnLoginModal = document.getElementById('btn-login-modal');
const btnCloseLogin = document.getElementById('btn-close-login');
const loginForm = document.getElementById('login-form');

// Search Element
const searchInput = document.getElementById('menu-search-input');

let currentActiveCategory = null;

async function initMenu() {
    try {
        const response = await fetch(`${API_URL}/menu`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        menuData = await response.json();
        
        if (menuData.length > 0) {
            renderFilters();
            renderMenuCategory(menuData[0]); // Mostrar primera categoría
        } else {
            menuFilters.innerHTML = '<span>Menú no disponible temporalmente.</span>';
        }
    } catch (error) {
        console.error('Error fetching menu:', error);
        menuFilters.innerHTML = '<span>Error al cargar la carta. Por favor intente más tarde.</span>';
    }
}

function renderFilters() {
    menuFilters.innerHTML = '';
    
    menuData.forEach((category, index) => {
        const btn = document.createElement('button');
        btn.textContent = category.name;
        if (index === 0) btn.classList.add('active');
        
        btn.onclick = () => {
            document.querySelectorAll('.menu-filters button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentActiveCategory = category;
            searchInput.value = ''; // limpiar búsqueda al cambiar categoría
            renderMenuCategory(category);
        };
        
        menuFilters.appendChild(btn);
    });
    
    // Configurar búsqueda
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term === '') {
            renderMenuCategory(currentActiveCategory || menuData[0]);
            return;
        }
        
        // Buscar en todo el catálogo
        let allFilteredProducts = [];
        menuData.forEach(cat => {
            const matches = cat.products.filter(p => 
                p.name.toLowerCase().includes(term) || 
                (p.description && p.description.toLowerCase().includes(term))
            );
            allFilteredProducts = [...allFilteredProducts, ...matches];
        });
        
        // Render fake category para resultados
        renderMenuCategory({ name: 'Resultados', products: allFilteredProducts }, true);
    });
}

function renderMenuCategory(category, isSearch = false) {
    if (!isSearch) currentActiveCategory = category;
    
    menuGrid.style.opacity = '0';
    
    setTimeout(() => {
        menuGrid.innerHTML = '';
        
        category.products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = `
                <div class="menu-item-info">
                    <h4>${product.name}</h4>
                    <p>${product.description || 'Nuestra mezcla especial de la casa.'}</p>
                </div>
                <div class="menu-item-price">
                    $${parseFloat(product.price).toFixed(2)}
                </div>
            `;
            // Abrir modal al hacer clic en el platillo
            item.onclick = () => openAddonModal(product);
            menuGrid.appendChild(item);
        });
        
        menuGrid.style.opacity = '1';
        menuGrid.style.transition = 'opacity 0.4s ease';
    }, 200);
}

/* ==========================================
   KIOSK LOGIC (Cart, Modal & Checkout)
   ========================================== */

function openAddonModal(product) {
    currentSelectedProduct = product;
    modalProductName.textContent = product.name;
    modalNotes.value = '';
    modalAddons.innerHTML = '';
    
    // Generar notas de cata ficticias pero elegantes basadas en el id (para consistencia)
    const acidity = (product.id % 5) + 1;
    const body = ((product.id * 2) % 5) + 1;
    const aroma = ((product.id * 3) % 5) + 1;
    
    modalTastingNotes.innerHTML = `
        <div class="tasting-note">
            <span class="tasting-label">Acidez</span>
            <span class="tasting-stars">${'★'.repeat(acidity)}${'☆'.repeat(5-acidity)}</span>
        </div>
        <div class="tasting-note">
            <span class="tasting-label">Cuerpo</span>
            <span class="tasting-stars">${'★'.repeat(body)}${'☆'.repeat(5-body)}</span>
        </div>
        <div class="tasting-note">
            <span class="tasting-label">Aroma</span>
            <span class="tasting-stars">${'★'.repeat(aroma)}${'☆'.repeat(5-aroma)}</span>
        </div>
    `;
    
    if (product.addons && product.addons.length > 0) {
        product.addons.forEach(addon => {
            const label = document.createElement('label');
            label.className = 'addon-label';
            label.innerHTML = `
                <input type="checkbox" value="${addon.id}" data-name="${addon.name}" data-price="${addon.price}">
                <span>${addon.name}</span>
                <span class="addon-price">+$${parseFloat(addon.price).toFixed(2)}</span>
            `;
            modalAddons.appendChild(label);
        });
    } else {
        modalAddons.innerHTML = '<p style="color: var(--color-beige); opacity: 0.5;">No hay complementos disponibles para este producto.</p>';
    }

    addonModal.classList.add('open');
}

function closeAddonModal() {
    addonModal.classList.remove('open');
    currentSelectedProduct = null;
}

btnCancelAddon.onclick = closeAddonModal;

btnConfirmAddon.onclick = () => {
    if (!currentSelectedProduct) return;

    const selectedAddons = [];
    const checkboxes = modalAddons.querySelectorAll('input[type="checkbox"]:checked');
    
    checkboxes.forEach(cb => {
        selectedAddons.push({
            id: cb.value,
            name: cb.dataset.name,
            price: parseFloat(cb.dataset.price)
        });
    });

    const notes = modalNotes.value.trim();

    cart.push({
        product: currentSelectedProduct,
        addons: selectedAddons,
        notes: notes
    });

    closeAddonModal();
    updateCartUI();
    
    // Auto-abrir el carrito para dar feedback visual
    cartSidebar.classList.add('open');
};

function updateCartUI() {
    cartBadge.textContent = cart.length;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Aún no ha seleccionado nada.</div>';
        cartTotalEl.textContent = '$0.00';
        btnPay.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        let itemTotal = parseFloat(item.product.price);
        let addonsHtml = '';
        
        if (item.addons.length > 0) {
            const addonsText = item.addons.map(a => {
                itemTotal += a.price;
                return a.name;
            }).join(', ');
            addonsHtml = `<div class="cart-item-meta">+ ${addonsText}</div>`;
        }

        if (item.notes) {
            addonsHtml += `<div class="cart-item-meta" style="font-style:italic">Nota: ${item.notes}</div>`;
        }

        total += itemTotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-header">
                <h4>${item.product.name}</h4>
                <span class="price">$${itemTotal.toFixed(2)}</span>
            </div>
            ${addonsHtml}
            <button class="btn-remove" onclick="removeFromCart(${index})">Eliminar</button>
        `;
        cartItemsContainer.appendChild(el);
    });

    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    btnPay.disabled = false;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

cartBtn.onclick = () => cartSidebar.classList.add('open');
closeCartBtn.onclick = () => cartSidebar.classList.remove('open');

btnPay.onclick = async () => {
    if (cart.length === 0) return;
    
    btnPay.disabled = true;
    btnPay.textContent = 'Procesando...';

    const payload = {
        items: cart.map(item => ({
            product_id: item.product.id,
            quantity: 1,
            notes: item.notes || null,
            addons: item.addons.map(a => a.id)
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

        const result = await response.json();

        if (response.ok) {
            alert(`¡Pedido exclusivo registrado con éxito!\nMétodo: ${checkoutService.options[checkoutService.selectedIndex].text}\nPago: ${checkoutPayment.options[checkoutPayment.selectedIndex].text}\nSu orden está siendo preparada.`);
            cart = [];
            updateCartUI();
            cartSidebar.classList.remove('open');
        } else {
            alert('Error en la orden: ' + (result.message || 'Fondos/Inventario insuficiente.'));
        }
    } catch (error) {
        console.error('Error Checkout:', error);
        alert('Ocurrió un error al procesar el pago.');
    } finally {
        btnPay.textContent = 'Finalizar Pedido';
        if (cart.length > 0) btnPay.disabled = false;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    
    // Smooth scroll para los enlaces de la navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Login Modal Handlers
    btnLoginModal.onclick = () => loginModal.classList.add('open');
    btnCloseLogin.onclick = () => loginModal.classList.remove('open');
    
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        alert('¡Bienvenido al Gentlemen\'s Club! Su sesión ha sido iniciada.');
        loginModal.classList.remove('open');
        btnLoginModal.innerHTML = '👑'; // Cambiar ícono para simular sesión iniciada
    };
    
    // Reservation Form Handler
    const resForm = document.getElementById('reservation-form');
    if (resForm) {
        resForm.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('res-name').value;
            const date = document.getElementById('res-date').value;
            const time = document.getElementById('res-time').value;
            alert(`Estimado/a ${name},\nSu solicitud de reserva para el ${date} a las ${time} ha sido recibida.\nUn concierge se pondrá en contacto pronto para confirmar.`);
            resForm.reset();
        };
    }
});
