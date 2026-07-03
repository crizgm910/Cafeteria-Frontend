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
const modalVariants = document.getElementById('modal-variants');
const modalDynamicPrice = document.getElementById('modal-dynamic-price');

// Checkout Fields
const checkoutName = document.getElementById('checkout-name');
const checkoutPhone = document.getElementById('checkout-phone');
const checkoutEmail = document.getElementById('checkout-email');
const checkoutAddressGroup = document.getElementById('checkout-address-group');
const checkoutAddress = document.getElementById('checkout-address');

// Success Modal
const successModal = document.getElementById('success-modal');
const btnCloseSuccess = document.getElementById('btn-close-success');
const btnSuccessClose = document.getElementById('btn-success-close');
const successOrderId = document.getElementById('success-order-id');
const successOrderTotal = document.getElementById('success-order-total');

// Toasts
const toastContainer = document.getElementById('toast-container');

// Login Elements
const loginModal = document.getElementById('login-modal');
const btnLoginModal = document.getElementById('btn-login-modal');
const btnCloseLogin = document.getElementById('btn-close-login');
const loginForm = document.getElementById('login-form');

// Profile / Journal Elements
const profileModal = document.getElementById('profile-modal');
const btnCloseProfile = document.getElementById('btn-close-profile');
const tabJournal = document.getElementById('tab-journal');
const tabOrders = document.getElementById('tab-orders');
const journalView = document.getElementById('journal-view');
const ordersView = document.getElementById('orders-view');
const orderHistoryList = document.getElementById('order-history-list');
const btnLogout = document.getElementById('btn-logout');

let isLoggedIn = false;

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

    // Sort Event
    const sortSelect = document.getElementById('menu-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            if (currentActiveCategory) {
                renderMenuCategory(currentActiveCategory, false, e.target.value);
            }
        });
    }
}

function renderMenuCategory(category, isSearch = false, sortOrder = 'default') {
    if (!isSearch) currentActiveCategory = category;
    
    menuGrid.style.opacity = '0';
    
    // Sort array copy
    let productsToRender = [...category.products];
    if (sortOrder === 'asc') {
        productsToRender.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === 'desc') {
        productsToRender.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }
    
    setTimeout(() => {
        menuGrid.innerHTML = '';
        
        productsToRender.forEach(product => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            
            // Faux Badges
            let badgeHtml = '';
            if (product.id % 5 === 0) badgeHtml = '<span class="product-badge badge-premium">Premium</span>';
            else if (product.id % 3 === 0) badgeHtml = '<span class="product-badge badge-nuevo">Nuevo</span>';

            item.innerHTML = `
                <div class="menu-item-info" onclick="openAddonModal(${product.id})">
                    <h4>${product.name} ${badgeHtml}</h4>
                    <p>${product.description || 'Nuestra mezcla especial de la casa.'}</p>
                </div>
                <div class="menu-item-price">
                    $${parseFloat(product.price).toFixed(2)}
                </div>
                <button class="btn-favorite" onclick="toggleFavorite(this, event)">♡</button>
            `;
            menuGrid.appendChild(item);
        });
        
        menuGrid.style.opacity = '1';
        menuGrid.style.transition = 'opacity 0.4s ease';
    }, 200);
}

function toggleFavorite(btn, event) {
    event.stopPropagation();
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        btn.textContent = '♡';
        showToast('Producto eliminado de favoritos');
    } else {
        btn.classList.add('active');
        btn.textContent = '♥';
        showToast('Producto guardado en favoritos');
    }
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
                <input type="checkbox" class="addon-checkbox" value="${addon.id}" data-name="${addon.name}" data-price="${addon.price}">
                <span>${addon.name}</span>
                <span class="addon-price">+$${parseFloat(addon.price).toFixed(2)}</span>
            `;
            modalAddons.appendChild(label);
        });
    } else {
        modalAddons.innerHTML = '<p style="color: var(--color-beige); opacity: 0.5;">No hay complementos disponibles para este producto.</p>';
    }

    // Reset variants
    document.querySelector('input[name="size"][value="regular"]').checked = true;
    document.querySelector('input[name="milk"][value="entera"]').checked = true;
    modalVariants.style.display = 'block'; // Mostrar variantes siempre para simular

    calculateDynamicPrice();
    
    // Attach listeners for dynamic price
    document.querySelectorAll('.addon-checkbox, input[name="size"], input[name="milk"]').forEach(input => {
        input.addEventListener('change', calculateDynamicPrice);
    });

    addonModal.classList.add('open');
}

function calculateDynamicPrice() {
    if (!currentSelectedProduct) return;
    
    let basePrice = parseFloat(currentSelectedProduct.price);
    
    // Size Price
    const selectedSize = document.querySelector('input[name="size"]:checked');
    if (selectedSize) basePrice += parseFloat(selectedSize.dataset.price);
    
    // Milk Price
    const selectedMilk = document.querySelector('input[name="milk"]:checked');
    if (selectedMilk) basePrice += parseFloat(selectedMilk.dataset.price);
    
    // Addons
    const selectedAddons = document.querySelectorAll('.addon-checkbox:checked');
    selectedAddons.forEach(cb => {
        basePrice += parseFloat(cb.dataset.price);
    });
    
    modalDynamicPrice.textContent = `$${basePrice.toFixed(2)}`;
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

    const selectedSize = document.querySelector('input[name="size"]:checked');
    const selectedMilk = document.querySelector('input[name="milk"]:checked');
    
    let variantName = "";
    let extraPrice = 0;
    
    if (selectedSize && selectedSize.value !== "regular") {
        variantName += `[Tamaño: Grande] `;
        extraPrice += parseFloat(selectedSize.dataset.price);
    }
    
    if (selectedMilk && selectedMilk.value !== "entera") {
        variantName += `[Leche: ${selectedMilk.nextSibling.textContent.trim().split(' ')[0]}] `;
        extraPrice += parseFloat(selectedMilk.dataset.price);
    }

    const notes = modalNotes.value.trim();

    // Check if similar item exists in cart to increase quantity
    const existingIndex = cart.findIndex(item => 
        item.product.id === currentSelectedProduct.id && 
        JSON.stringify(item.addons) === JSON.stringify(selectedAddons) &&
        item.variant === variantName
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            product: currentSelectedProduct,
            addons: selectedAddons,
            notes: notes,
            variant: variantName,
            extraPrice: extraPrice,
            quantity: 1
        });
    }

    closeAddonModal();
    updateCartUI();
    showToast(`${currentSelectedProduct.name} agregado a la cuenta`);
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
        let baseItemPrice = parseFloat(item.product.price) + (item.extraPrice || 0);
        let itemAddonsTotal = 0;
        let addonsHtml = '';
        
        if (item.variant) {
            addonsHtml += `<div class="cart-item-meta">${item.variant}</div>`;
        }

        if (item.addons.length > 0) {
            const addonsText = item.addons.map(a => {
                itemAddonsTotal += a.price;
                return a.name;
            }).join(', ');
            addonsHtml += `<div class="cart-item-meta">+ ${addonsText}</div>`;
        }

        if (item.notes) {
            addonsHtml += `<div class="cart-item-meta" style="font-style:italic">Nota: ${item.notes}</div>`;
        }

        const unitPrice = baseItemPrice + itemAddonsTotal;
        const subtotal = unitPrice * item.quantity;
        total += subtotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-header">
                <h4>${item.product.name}</h4>
                <span class="price">$${subtotal.toFixed(2)}</span>
            </div>
            ${addonsHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                <div class="cart-item-qty">
                    <button class="btn-qty" onclick="changeCartQty(${index}, -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="btn-qty" onclick="changeCartQty(${index}, 1)">+</button>
                </div>
                <button class="btn-remove" onclick="removeFromCart(${index})">Eliminar</button>
            </div>
        `;
        cartItemsContainer.appendChild(el);
    });

    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    btnPay.disabled = false;
}

window.changeCartQty = function(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
    } else {
        updateCartUI();
    }
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
    showToast('Producto eliminado');
};

cartBtn.onclick = () => cartSidebar.classList.add('open');
closeCartBtn.onclick = () => cartSidebar.classList.remove('open');

// Toggle Address Field based on service
checkoutService.addEventListener('change', (e) => {
    if (e.target.value === 'delivery') {
        checkoutAddressGroup.style.display = 'block';
    } else {
        checkoutAddressGroup.style.display = 'none';
    }
});

btnPay.onclick = async () => {
    if (cart.length === 0) return;
    
    // Validaciones E-commerce
    if (!checkoutName.value.trim()) return showToast('Ingrese su Nombre y Apellido');
    if (!checkoutPhone.value.trim()) return showToast('Ingrese su Teléfono');
    if (!checkoutEmail.value.trim()) return showToast('Ingrese su Correo');
    if (checkoutService.value === 'delivery' && !checkoutAddress.value.trim()) {
        return showToast('Ingrese su Dirección de Envío');
    }
    
    btnPay.disabled = true;
    btnPay.textContent = 'Procesando Pago...';

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
            // Generar número de orden ficticio
            const orderNum = 'TGR-' + Math.floor(Math.random() * 90000 + 10000);
            successOrderId.textContent = orderNum;
            successOrderTotal.textContent = cartTotalEl.textContent;
            
            // Guardar en LocalStorage (Historial de Pedidos)
            saveOrderToHistory({
                id: orderNum,
                date: new Date().toLocaleDateString(),
                total: cartTotalEl.textContent,
                status: 'Preparando',
                items: cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ')
            });
            
            // Show Success Modal
            successModal.classList.add('open');
            cartSidebar.classList.remove('open');
            
            cart = [];
            updateCartUI();
            
            // Limpiar form
            checkoutName.value = '';
            checkoutPhone.value = '';
            checkoutEmail.value = '';
            checkoutAddress.value = '';
        } else {
            showToast('Error: ' + (result.message || 'Inventario insuficiente.'));
        }
    } catch (error) {
        console.error('Error Checkout:', error);
        showToast('Ocurrió un error al conectar con el servidor.');
    } finally {
        btnPay.textContent = 'Finalizar Pedido';
        if (cart.length > 0) btnPay.disabled = false;
    }
};

// Success Modal Logic
const closeSuccessModal = () => successModal.classList.remove('open');
btnCloseSuccess.onclick = closeSuccessModal;
btnSuccessClose.onclick = closeSuccessModal;

// Toast Function
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Profile Tabs Logic
tabJournal.onclick = () => {
    tabJournal.classList.add('active');
    tabOrders.classList.remove('active');
    journalView.style.display = 'block';
    ordersView.style.display = 'none';
};

tabOrders.onclick = () => {
    tabOrders.classList.add('active');
    tabJournal.classList.remove('active');
    ordersView.style.display = 'block';
    journalView.style.display = 'none';
    renderOrderHistory();
};

function saveOrderToHistory(order) {
    let history = JSON.parse(localStorage.getItem('tgr_orders') || '[]');
    history.unshift(order);
    localStorage.setItem('tgr_orders', JSON.stringify(history));
}

function renderOrderHistory() {
    let history = JSON.parse(localStorage.getItem('tgr_orders') || '[]');
    if (history.length === 0) {
        orderHistoryList.innerHTML = '<p style="color:var(--color-beige); opacity:0.5;">No hay pedidos recientes.</p>';
        return;
    }
    
    orderHistoryList.innerHTML = '';
    history.forEach(order => {
        orderHistoryList.innerHTML += `
            <div class="journal-item">
                <div class="journal-header">
                    <h4>${order.id}</h4>
                    <span>${order.date}</span>
                </div>
                <div class="order-items">${order.items}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="order-status">${order.status}</span>
                    <span style="color:var(--color-gold); font-family:var(--font-heading); font-size:1.2rem;">${order.total}</span>
                </div>
                <button class="login-text-btn w-100" style="margin-top:15px; width:100%;" onclick="showToast('Agregando a la cuenta...')">Pedir de nuevo</button>
            </div>
        `;
    });
}

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
    btnLoginModal.onclick = () => {
        if (isLoggedIn) {
            profileModal.classList.add('open');
        } else {
            loginModal.classList.add('open');
        }
    };
    
    btnCloseLogin.onclick = () => loginModal.classList.remove('open');
    btnCloseProfile.onclick = () => profileModal.classList.remove('open');
    
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        alert('¡Bienvenido al Gentlemen\'s Club! Su sesión ha sido iniciada.');
        loginModal.classList.remove('open');
        
        isLoggedIn = true;
        btnLoginModal.innerHTML = 'MI DIARIO (✓)'; 
        btnLoginModal.style.background = 'var(--color-gold)';
        btnLoginModal.style.color = 'var(--color-coffee-dark)';
    };
    
    btnLogout.onclick = () => {
        isLoggedIn = false;
        profileModal.classList.remove('open');
        btnLoginModal.innerHTML = 'MEMBRESÍA'; 
        btnLoginModal.style.background = 'transparent';
        btnLoginModal.style.color = 'var(--color-gold)';
        alert('Sesión cerrada exitosamente.');
    };
    
    // Interactive Stars Logic
    document.querySelectorAll('.stars-interactive').forEach(starContainer => {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach(star => {
            star.onclick = function() {
                const val = parseInt(this.getAttribute('data-val'));
                stars.forEach(s => {
                    if (parseInt(s.getAttribute('data-val')) <= val) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
                // Aquí se podría guardar el rating en el backend
            };
        });
    });
    
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
