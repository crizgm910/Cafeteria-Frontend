const API_URL = String(window.TGR_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');
if (!API_URL) throw new Error('Falta configurar apiBaseUrl en js/config.js');

const menuFilters = document.getElementById('menu-filters');
const menuGrid = document.getElementById('menu-grid');

let menuData = [];
let cart = [];
let lastOrderCart = [];
let lastOrderTotal = "$0.00";
let lastOrderSubtotal = 0;
let lastOrderTax = 0;
let currentSelectedProduct = null;
let checkoutAttemptKey = null;
let lastOrderCustomer = '';
let lastOrderService = 'dine_in';
let lastTrackingCredentials = null;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function safeImageUrl(value) {
    if (!value) return null;

    try {
        const url = new URL(value, window.location.href);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
        return null;
    }
}

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

// Success Modal
const successModal = document.getElementById('success-modal');
const btnCloseSuccess = document.getElementById('btn-close-success');
const btnSuccessClose = document.getElementById('btn-success-close');
const btnPrintTicket = document.getElementById('btn-print-ticket');
const successOrderId = document.getElementById('success-order-id');
const successOrderTotal = document.getElementById('success-order-total');
const successOrderStatus = document.getElementById('success-order-status');
const btnTrackOrder = document.getElementById('btn-track-order');

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

// Acordeon y Vistas compactas
const btnToggleTicket = document.getElementById('btn-toggle-ticket');
const btnExpandTicket = document.getElementById('btn-expand-ticket');
const cartTicketCompact = document.getElementById('cart-ticket-compact');
const cartTicketFull = document.getElementById('cart-ticket-full');
const compactTicketCount = document.getElementById('compact-ticket-count');
const compactTicketTotal = document.getElementById('compact-ticket-total');

const btnToggleForm = document.getElementById('btn-toggle-form');
const btnExpandForm = document.getElementById('btn-expand-form');
const checkoutFormCompact = document.getElementById('checkout-form-compact');
const checkoutFormFull = document.getElementById('checkout-form-full');
const compactFormText = document.getElementById('compact-form-text');

// Togglers lógicos
function toggleTicketView(forceCompact = null) {
    const isCompact = forceCompact !== null ? forceCompact : cartTicketFull.style.display !== 'none';
    if (isCompact) {
        cartTicketFull.style.display = 'none';
        cartTicketCompact.style.display = 'flex';
        btnToggleTicket.textContent = 'Ver';
    } else {
        cartTicketFull.style.display = 'block';
        cartTicketCompact.style.display = 'none';
        btnToggleTicket.textContent = 'Ocultar';
    }
}

function toggleFormView(forceCompact = null) {
    const isCompact = forceCompact !== null ? forceCompact : checkoutFormFull.style.display !== 'none';
    if (isCompact) {
        // Build summary string
        const nameVal = checkoutName.value.trim() || 'Sin Nombre';
        const phoneVal = checkoutPhone.value.trim() || 'Sin Teléfono';
        compactFormText.textContent = `${nameVal} · ${phoneVal}`;
        
        checkoutFormFull.style.display = 'none';
        checkoutFormCompact.style.display = 'flex';
        btnToggleForm.textContent = 'Ver';
    } else {
        checkoutFormFull.style.display = 'flex';
        checkoutFormCompact.style.display = 'none';
        btnToggleForm.textContent = 'Ocultar';
    }
}

if (btnToggleTicket) {
    btnToggleTicket.onclick = () => toggleTicketView();
    btnExpandTicket.onclick = () => toggleTicketView(false);
    btnToggleForm.onclick = () => toggleFormView();
    btnExpandForm.onclick = () => toggleFormView(false);
}

// UTILITY FUNCTIONS
function parsePrice(val) {
    if (val === null || val === undefined || isNaN(parseFloat(val))) {
        return 0;
    }
    return parseFloat(val);
}

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
    
    // Sort array copy safely
    let productsToRender = [...(category?.products || [])];
    if (sortOrder === 'asc') {
        productsToRender.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortOrder === 'desc') {
        productsToRender.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    
    setTimeout(() => {
        menuGrid.innerHTML = '';
        
        if (productsToRender.length === 0) {
            menuGrid.innerHTML = '<div style="text-align:center; color:var(--color-beige); grid-column: 1/-1;">No se encontraron productos.</div>';
            menuGrid.style.opacity = '1';
            return;
        }

        productsToRender.forEach(product => {
            const productId = Number(product?.id);
            if (!Number.isInteger(productId) || productId <= 0) return;

            const item = document.createElement('div');
            item.className = 'menu-card';
            
            const badgeHtml = '';

            const safeName = escapeHtml(product.name || 'Producto No Disponible');
            const safeDesc = escapeHtml(product.description || 'Nuestra mezcla especial de la casa, tostado oscuro.');
            const safePrice = parsePrice(product.price).toFixed(2);
            
            // Determinamos un ícono faux según el id
            const icons = ['☕', '🍵', '🍰', '🥃', '🥐'];
            const fallbackIcon = icons[product.id % icons.length];

            // Background image si existe
            let imgHtml = '';
            let style = 'cursor:pointer;';
            const imageUrl = safeImageUrl(product.image_url);
            if (imageUrl) {
                style += ' background-size: cover; background-position: center;';
            } else {
                imgHtml = `<span class="menu-card-img-icon">${fallbackIcon}</span>`;
            }

            item.innerHTML = `
                <div class="menu-card-img" data-action="open-product" data-product-id="${productId}" role="button" tabindex="0" style="${style}">
                    ${badgeHtml}
                    ${imgHtml}
                </div>
                <div class="menu-card-body">
                    <h4>${safeName}</h4>
                    <p>${safeDesc}</p>
                    <div class="menu-card-footer">
                        <div class="menu-card-price">$${safePrice}</div>
                        <button class="btn-add-card" data-action="open-product" data-product-id="${productId}">Personalizar</button>
                    </div>
                </div>
            `;
            if (imageUrl) {
                item.querySelector('.menu-card-img').style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`;
            }
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

function openAddonModal(productId) {
    let product = null;
    for (const category of menuData) {
        const p = category.products.find(p => p.id === productId);
        if (p) {
            product = p;
            break;
        }
    }
    if (!product) return;

    currentSelectedProduct = product;
    modalProductName.textContent = product.name;
    modalNotes.value = '';
    modalAddons.innerHTML = '';
    
    // Las notas de cata y variantes simuladas permanecen ocultas hasta contar
    // con un modelo autoritativo de Laravel.
    modalTastingNotes.replaceChildren();
    modalTastingNotes.style.display = 'none';
    modalVariants.style.display = 'none';
    
    if (product.add_ons && product.add_ons.length > 0) {
        product.add_ons.forEach(addon => {
            const addonId = Number(addon.id);
            if (!Number.isInteger(addonId) || addonId <= 0) return;
            const addonName = escapeHtml(addon.name || 'Complemento');
            const addonPrice = parsePrice(addon.effective_price ?? addon.price_adjustment);
            const label = document.createElement('label');
            label.className = 'addon-label';
            label.innerHTML = `
                <input type="checkbox" class="addon-checkbox" value="${addonId}" data-name="${addonName}" data-price="${addonPrice}" ${addon.selected_by_default ? 'checked' : ''}>
                <span>${addonName}</span>
                <span class="addon-price">+$${addonPrice.toFixed(2)}</span>
            `;
            modalAddons.appendChild(label);
        });
    } else {
        modalAddons.innerHTML = '<p style="color: var(--color-beige); opacity: 0.5;">No hay complementos disponibles para este producto.</p>';
    }

    calculateDynamicPrice();
    
    // Attach listeners for dynamic price
    document.querySelectorAll('.addon-checkbox, input[name="size"], input[name="milk"]').forEach(input => {
        input.addEventListener('change', calculateDynamicPrice);
    });

    addonModal.classList.add('open');
}

function calculateDynamicPrice() {
    if (!currentSelectedProduct) return;
    
    let basePrice = parsePrice(currentSelectedProduct.price);
    
    // Solo los complementos devueltos por Laravel modifican el precio.
    const selectedAddons = document.querySelectorAll('.addon-checkbox:checked');
    selectedAddons.forEach(cb => {
        basePrice += parsePrice(cb.dataset.price);
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

    // Conservar la referencia antes de cerrar el modal: closeAddonModal()
    // limpia currentSelectedProduct para evitar reutilizar una selección vieja.
    const addedProduct = currentSelectedProduct;
    const selectedAddons = [];
    const checkboxes = modalAddons.querySelectorAll('input[type="checkbox"]:checked');
    
    checkboxes.forEach(cb => {
        selectedAddons.push({
            id: cb.value,
            name: cb.dataset.name,
            price: parseFloat(cb.dataset.price)
        });
    });

    let variantName = "";
    let extraPrice = 0;

    const notes = modalNotes.value.trim();

    // Check if similar item exists in cart to increase quantity
    const existingIndex = cart.findIndex(item => 
        item.product.id === addedProduct.id &&
        JSON.stringify(item.addons) === JSON.stringify(selectedAddons) &&
        item.variant === variantName
    );

    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            product: addedProduct,
            addons: selectedAddons,
            notes: notes,
            variant: variantName,
            extraPrice: extraPrice,
            quantity: 1
        });
    }

    closeAddonModal();
    checkoutAttemptKey = null;
    updateCartUI();
    showToast(`${addedProduct.name} agregado a la cuenta`);
};

function updateCartUI() {
    cartBadge.textContent = cart.length;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Aún no ha seleccionado nada.</div>';
        cartTotalEl.textContent = '$0.00';
        if (compactTicketCount) compactTicketCount.textContent = '0';
        if (compactTicketTotal) compactTicketTotal.textContent = '$0.00';
        btnPay.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        let baseItemPrice = parsePrice(item.product.price) + parsePrice(item.extraPrice);
        let itemAddonsTotal = 0;
        let addonsHtml = '';
        
        if (item.variant) {
            addonsHtml += `<div class="cart-item-meta">${escapeHtml(item.variant)}</div>`;
        }

        if (item.addons && item.addons.length > 0) {
            const addonsText = item.addons.map(a => {
                itemAddonsTotal += parsePrice(a.price);
                return escapeHtml(a.name);
            }).join(', ');
            addonsHtml += `<div class="cart-item-meta">+ ${addonsText}</div>`;
        }

        if (item.notes) {
            addonsHtml += `<div class="cart-item-meta" style="font-style:italic">Nota: ${escapeHtml(item.notes)}</div>`;
        }

        const unitPrice = baseItemPrice + itemAddonsTotal;
        const safeQty = parseInt(item.quantity) || 1;
        const subtotal = unitPrice * safeQty;
        total += subtotal;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-header">
                <h4>${escapeHtml(item.product.name)}</h4>
                <span class="price">$${subtotal.toFixed(2)}</span>
            </div>
            ${addonsHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                <div class="cart-item-qty">
                    <button class="btn-qty" data-action="cart-quantity" data-index="${index}" data-delta="-1">-</button>
                    <span class="qty-display">${safeQty}</span>
                    <button class="btn-qty" data-action="cart-quantity" data-index="${index}" data-delta="1">+</button>
                </div>
                <button class="btn-remove" data-action="cart-remove" data-index="${index}">Eliminar</button>
            </div>
        `;
        cartItemsContainer.appendChild(el);
    });

    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    
    // Update compact views
    if (compactTicketCount) compactTicketCount.textContent = cart.length;
    if (compactTicketTotal) compactTicketTotal.textContent = `$${total.toFixed(2)}`;

    btnPay.disabled = false;
}

window.changeCartQty = function(index, delta) {
    checkoutAttemptKey = null;
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        removeFromCart(index);
    } else {
        updateCartUI();
    }
};

window.removeFromCart = function(index) {
    checkoutAttemptKey = null;
    cart.splice(index, 1);
    updateCartUI();
    showToast('Producto eliminado');
};

cartBtn.onclick = () => {
    cartSidebar.classList.add('open');
    // Si hay items, asegurarse de que el ticket empiece expandido
    if (cart.length > 0) toggleTicketView(false); 
};
closeCartBtn.onclick = () => cartSidebar.classList.remove('open');



btnPay.onclick = async () => {
    if (cart.length === 0) return;
    
    // Validaciones E-commerce con Regex
    const nameVal = checkoutName.value.trim();
    const phoneVal = checkoutPhone.value.trim();
    const emailVal = checkoutEmail.value.trim();
    const serviceVal = checkoutService.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9\-\+\s]{7,15}$/;

    if (!nameVal) return showToast('El Nombre es obligatorio');
    
    if (!phoneVal) return showToast('El Teléfono es obligatorio');
    if (!phoneRegex.test(phoneVal)) return showToast('Ingrese un Teléfono válido');
    
    if (emailVal && !emailRegex.test(emailVal)) return showToast('Ingrese un Correo válido');
    
    btnPay.disabled = true;
    btnPay.textContent = 'Registrando Pedido...';

    let mappedService = 'dine_in';
    if (serviceVal === 'pickup') mappedService = 'takeout';

    const payload = {
        items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            notes: item.notes || null,
            add_ons: item.addons.map(a => a.id)
        })),
        payment_method: 'pay_at_pickup',
        customer_name: nameVal,
        customer_phone: phoneVal,
        customer_email: emailVal || null,
        order_type: mappedService
    };

    checkoutAttemptKey ??= window.crypto?.randomUUID?.()
        || `tgr-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
        const response = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Idempotency-Key': checkoutAttemptKey,
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            checkoutAttemptKey = null;
            // Usar el ticket_id real devuelto por Laravel
            const orderNum = result.ticket_number;
            successOrderId.textContent = orderNum;
            successOrderTotal.textContent = `$${parsePrice(result.total).toFixed(2)}`;
            successOrderStatus.textContent = 'Pendiente';
            lastTrackingCredentials = {
                ticketNumber: result.ticket_number,
                token: result.tracking_token,
            };
            sessionStorage.setItem('tgr_last_tracking', JSON.stringify(lastTrackingCredentials));
            
            lastOrderCart = [...cart];
            lastOrderSubtotal = parsePrice(result.subtotal);
            lastOrderTax = parsePrice(result.tax);
            lastOrderTotal = `$${parsePrice(result.total).toFixed(2)}`;
            lastOrderCustomer = nameVal;
            lastOrderService = mappedService;
            
            cart = [];
            updateCartUI();
            
            btnPrintTicket.style.display = 'block';
            showToast(result.payment_message || 'Pedido registrado. Paga en caja al recogerlo.');
            
            // Show Success Modal
            successModal.classList.add('open');
            cartSidebar.classList.remove('open');
            
            cart = [];
            updateCartUI();
            
            // Limpiar form
            checkoutName.value = '';
            checkoutPhone.value = '';
            checkoutEmail.value = '';
            // Reset accordions
            toggleFormView(false);
            toggleTicketView(false);
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

const statusLabels = {
    pending: 'Pendiente',
    paid: 'Pagado y confirmado',
    confirmed: 'Confirmado',
    preparing: 'En preparación',
    ready: 'Listo para recoger',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
};

document.addEventListener('click', event => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    if (actionTarget.dataset.action === 'open-product') {
        openAddonModal(Number(actionTarget.dataset.productId));
    }
    if (actionTarget.dataset.action === 'cart-quantity') {
        changeCartQty(Number(actionTarget.dataset.index), Number(actionTarget.dataset.delta));
    }
    if (actionTarget.dataset.action === 'cart-remove') {
        removeFromCart(Number(actionTarget.dataset.index));
    }
});

document.addEventListener('keydown', event => {
    const target = event.target.closest('[data-action="open-product"][role="button"]');
    if (!target || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openAddonModal(Number(target.dataset.productId));
});

btnTrackOrder.onclick = async () => {
    if (!lastTrackingCredentials) {
        try {
            lastTrackingCredentials = JSON.parse(sessionStorage.getItem('tgr_last_tracking'));
        } catch {
            lastTrackingCredentials = null;
        }
    }

    if (!lastTrackingCredentials?.ticketNumber || !lastTrackingCredentials?.token) {
        return showToast('No hay un pedido reciente para consultar.');
    }

    btnTrackOrder.disabled = true;
    btnTrackOrder.textContent = 'Consultando...';

    try {
        const { ticketNumber, token } = lastTrackingCredentials;
        const response = await fetch(
            `${API_URL}/orders/${encodeURIComponent(ticketNumber)}/status?token=${encodeURIComponent(token)}`,
            { headers: { Accept: 'application/json' } }
        );
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'No fue posible consultar el pedido.');

        successOrderStatus.textContent = statusLabels[result.status] || result.status;
        showToast(`Estado actualizado: ${successOrderStatus.textContent}.`);
    } catch (error) {
        showToast(error.message || 'No fue posible consultar el pedido.');
    } finally {
        btnTrackOrder.disabled = false;
        btnTrackOrder.textContent = 'Consultar estado';
    }
};

btnPrintTicket.onclick = () => {
    const orderNum = successOrderId.textContent;
    const win = window.open('', '_blank', 'width=400,height=600');
    
    const d = new Date();
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const paymentMethodStr = 'Pendiente al recoger';
    const customerName = lastOrderCustomer;
    const orderType = lastOrderService === 'takeout' ? 'Para llevar' : 'Comer aquí';
    
    let itemsHtml = '';
    let totalCalc = 0;
    lastOrderCart.forEach(item => {
        let basePrice = parsePrice(item.product.price);
        let addonsTotal = 0;
        let addonsListHtml = '';
        if (item.addons && item.addons.length > 0) {
            item.addons.forEach(a => {
                addonsTotal += parsePrice(a.price);
                addonsListHtml += `<div style="display:flex; justify-content:space-between; font-size:1rem; padding-left:15px; color:#555;"><span>+ ${escapeHtml(a.name)}</span></div>`;
            });
        }
        let unitPrice = basePrice + parsePrice(item.extraPrice) + addonsTotal;
        let itemSubtotal = unitPrice * item.quantity;
        totalCalc += itemSubtotal;
        
        itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:0;"><strong style="font-size:1.2rem;">${Number(item.quantity) || 1} x ${escapeHtml(item.product.name)}</strong><strong style="font-size:1.2rem;">$${itemSubtotal.toFixed(2)}</strong></div>`;
        itemsHtml += addonsListHtml;
        if (item.notes) {
            itemsHtml += `<div style="font-size:1rem; padding-left:15px; font-style:italic;">Nota: ${escapeHtml(item.notes)}</div>`;
        }
        itemsHtml += `<div style="margin-bottom:10px;"></div>`;
    });
    
    const subtotal = lastOrderSubtotal;
    const iva = lastOrderTax;
    
    win.document.write(`
        <html>
        <head>
            <title>Ticket ${escapeHtml(orderNum)}</title>
            <style>
                @page { size: 80mm auto; margin: 4mm; }
                body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
                h1 { text-align: center; font-size: 1.8rem; margin-bottom: 5px; text-transform: uppercase; }
                .text-center { text-align: center; }
                .details { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.1rem; }
                .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>TGR RECEIPT</h1>
            <p class="text-center" style="margin:0;">COMPROBANTE NO FISCAL</p>
            <p class="text-center" style="font-size:1.3rem; font-weight:bold; margin-top:0;">PEDIDO #${escapeHtml(orderNum)}</p>
            
            <div class="details">
                <p style="margin:2px 0;"><strong>Fecha:</strong> ${escapeHtml(dateStr)}</p>
                ${customerName ? `<p style="margin:2px 0;"><strong>Cliente:</strong> ${escapeHtml(customerName)}</p>` : ''}
                <p style="margin:2px 0;"><strong>Tipo:</strong> ${orderType}</p>
                <p style="margin:2px 0;"><strong>Pago:</strong> ${paymentMethodStr}</p>
            </div>
            
            ${itemsHtml}
            
            <div class="totals">
                <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>Impuestos</span><span>$${iva.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.4rem; margin-top:5px;"><span>TOTAL</span><span>${lastOrderTotal}</span></div>
            </div>
            
            <p class="text-center" style="margin-top:20px; font-size:1.1rem;">¡Gracias por su preferencia!</p>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    win.document.close();
};

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
    orderHistoryList.textContent = 'El historial de clientes no está habilitado en esta versión.';
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {

// Accesibilidad común de modales: foco inicial, Escape y ciclo de Tab.
let modalReturnFocus = null;
const visibleModal = () => [...document.querySelectorAll('.modal-overlay')]
    .find(modal => !modal.hidden && (modal.classList.contains('active') || modal.classList.contains('open')));
document.querySelectorAll('.modal-overlay').forEach(modal => {
    new MutationObserver(() => {
        const opened = !modal.hidden && (modal.classList.contains('active') || modal.classList.contains('open'));
        modal.setAttribute('aria-hidden', opened ? 'false' : 'true');
        if (opened) {
            if (!modal.contains(document.activeElement)) modalReturnFocus = document.activeElement;
            setTimeout(() => modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus(), 0);
        }
    }).observe(modal, { attributes: true, attributeFilter: ['class', 'hidden'] });
});
document.addEventListener('keydown', event => {
    const modal = visibleModal();
    if (!modal) return;
    if (event.key === 'Escape') {
        event.preventDefault();
        const closer = modal.querySelector('.close-modal, .close-btn, [id^="btn-cancel"]');
        if (closer) closer.click();
        else {
            modal.classList.remove('active', 'open');
            modal.setAttribute('aria-hidden', 'true');
        }
        modalReturnFocus?.focus?.();
        return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});
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
    
});

/* ==========================================
   RESERVATION FORM - CUSTOM PICKERS LOGIC
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Time Options
    const dropdownTime = document.getElementById('dropdown-time');
    const displayTime = document.getElementById('display-time');
    const inputTime = document.getElementById('res-time');
    const wrapperTime = document.getElementById('wrapper-time');
    
    if (dropdownTime) dropdownTime.innerHTML = '<div class="dropdown-empty">Elige fecha, personas y área</div>';

    // 2. Setup Guests Options
    const displayGuests = document.getElementById('display-guests');
    const inputGuests = document.getElementById('res-guests');
    const wrapperGuests = document.getElementById('wrapper-guests');
    
    // 3. Dropdown Toggles Genérico
    const allWrappers = document.querySelectorAll('.custom-select-wrapper');

    allWrappers.forEach(wrapper => {
        const toggle = wrapper.querySelector('.custom-dropdown-toggle');
        if (!toggle) return;
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            allWrappers.forEach(w => { if(w !== wrapper) w.classList.remove('open') });
            wrapper.classList.toggle('open');
            toggle.classList.remove('active');
        });
    });

    // 4. Click outside to close genérico
    document.addEventListener('click', (e) => {
        allWrappers.forEach(wrapper => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
            }
        });
    });

    // 5. Select Logic Genérico
    document.querySelectorAll('.custom-dropdown-options').forEach(optionsContainer => {
        optionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-option')) {
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;
                const wrapper = e.target.closest('.custom-select-wrapper');
                const toggle = wrapper.querySelector('.custom-dropdown-toggle span:first-child');
                const hiddenInput = wrapper.querySelector('input[type="hidden"]');
                
                // Update display and hidden input
                if (toggle) toggle.textContent = text;
                if (hiddenInput) {
                    hiddenInput.value = value;
                    hiddenInput.dispatchEvent(new Event('change'));
                }
                
                // Remove error styling if exists
                const toggleContainer = wrapper.querySelector('.custom-dropdown-toggle');
                if (toggleContainer) toggleContainer.style.borderColor = 'rgba(255,253,208,0.2)';
                
                const errorSpan = wrapper.querySelector('.form-error');
                if (errorSpan) errorSpan.style.display = 'none';
                
                // Remove selected class from siblings
                Array.from(optionsContainer.children).forEach(c => c.classList.remove('selected'));
                e.target.classList.add('selected');
                
                wrapper.classList.remove('open');

                // Lógica Especial: Checkout Service -> Delivery Address
                if (hiddenInput && hiddenInput.id === 'checkout-service') {
                    const checkoutAddressGroup = document.getElementById('checkout-address-group');
                    if (checkoutAddressGroup) {
                        checkoutAddressGroup.style.display = value === 'delivery' ? 'block' : 'none';
                    }
                }
            }
        });
    });

    // 6. Custom Calendar Logic
    const calMonthYear = document.getElementById('cal-month-year');
    const calGrid = document.getElementById('cal-grid');
    const btnPrev = document.getElementById('cal-prev');
    const btnNext = document.getElementById('cal-next');
    const displayDate = document.getElementById('display-date');
    const inputDate = document.getElementById('res-date');
    const wrapperDate = document.getElementById('wrapper-date');

    let currentDate = new Date();
    let selectedDate = null;
    let reservationAttemptKey = null;
    const today = new Date();
    today.setHours(0,0,0,0);

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    function renderCalendar() {
        if (!calGrid) return;
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        calMonthYear.textContent = `${monthNames[month]} ${year}`;
        calGrid.innerHTML = '';

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for(let i = 0; i < firstDayOfMonth; i++) {
            calGrid.innerHTML += `<div class="cal-day empty"></div>`;
        }

        // Days
        for(let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            const isPast = dateObj < today;
            let classes = 'cal-day';
            
            if (isPast) classes += ' disabled';
            if (selectedDate && dateObj.getTime() === selectedDate.getTime()) {
                classes += ' selected';
            }

            const dayDiv = document.createElement('div');
            dayDiv.className = classes;
            dayDiv.textContent = i;
            
            if (!isPast) {
                dayDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedDate = dateObj;
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const y = dateObj.getFullYear();
                    
                    // Backend expects YYYY-MM-DD
                    const isoDate = `${y}-${m}-${d}`;
                    const displayDateString = `${d}/${m}/${y}`;
                    
                    displayDate.textContent = displayDateString;
                    inputDate.value = isoDate;
                    inputDate.dispatchEvent(new Event('change'));
                    document.getElementById('error-res-date').style.display = 'none';
                    document.getElementById('toggle-date').style.borderColor = 'rgba(255,253,208,0.2)';
                    
                    wrapperDate.classList.remove('open');
                    renderCalendar(); // Re-render to show selected
                });
            }
            
            calGrid.appendChild(dayDiv);
        }
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        btnNext.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
        
        // Prevent closing modal when clicking inside calendar
        document.getElementById('dropdown-date').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        renderCalendar();
    }

    const inputArea = document.getElementById('res-area');
    const displayArea = document.getElementById('display-area');
    const dropdownArea = document.getElementById('dropdown-area');
    const availabilityStatus = document.getElementById('reservation-availability-status');
    let availableAreas = [];
    let availabilityController = null;

    const resetTimes = () => {
        inputTime.value = '';
        displayTime.textContent = 'Seleccionar Hora';
        dropdownTime.innerHTML = '<div class="dropdown-empty">Elige un área disponible</div>';
    };
    const renderTimesForArea = () => {
        resetTimes();
        const area = availableAreas.find(item => String(item.id) === String(inputArea.value));
        if (!area) return;
        dropdownTime.innerHTML = area.available_slots.map(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const label = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            return `<div class="dropdown-option" data-value="${escapeHtml(time)}">${escapeHtml(label)}</div>`;
        }).join('') || '<div class="dropdown-empty">Sin horarios disponibles</div>';
    };
    const loadAvailability = async () => {
        inputArea.value = ''; displayArea.textContent = 'Área preferida'; resetTimes();
        if (!inputDate.value || !inputGuests.value) {
            dropdownArea.innerHTML = '<div class="dropdown-empty">Elige fecha y personas</div>';
            availabilityStatus.textContent = '';
            return;
        }
        availabilityController?.abort(); availabilityController = new AbortController();
        availabilityStatus.textContent = 'Consultando disponibilidad real…';
        try {
            const response = await fetch(`${API_URL}/reservation-availability?date=${encodeURIComponent(inputDate.value)}&guests=${encodeURIComponent(inputGuests.value)}`, { headers: { Accept: 'application/json' }, signal: availabilityController.signal });
            if (!response.ok) throw new Error('No se pudo consultar la disponibilidad.');
            const data = await response.json(); availableAreas = Array.isArray(data.areas) ? data.areas : [];
            dropdownArea.innerHTML = availableAreas.map(area => `<div class="dropdown-option" data-value="${Number(area.id)}">${escapeHtml(area.name)}</div>`).join('') || '<div class="dropdown-empty">No hay áreas disponibles para esa fecha y capacidad</div>';
            availabilityStatus.textContent = availableAreas.length ? `${availableAreas.length} área(s) con horarios disponibles.` : 'No encontramos capacidad; prueba otra fecha o cantidad.';
            if (availableAreas.length === 1) { inputArea.value = String(availableAreas[0].id); displayArea.textContent = availableAreas[0].name; renderTimesForArea(); }
        } catch (error) { if (error.name !== 'AbortError') availabilityStatus.textContent = error.message; }
    };
    inputDate.addEventListener('change', loadAvailability);
    inputGuests.addEventListener('change', loadAvailability);
    inputArea.addEventListener('change', renderTimesForArea);

    // 7. Form Validation Override
    const resForm = document.getElementById('reservation-form');
    if (resForm) {
        resForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nameEl = document.getElementById('res-name');
            const emailEl = document.getElementById('res-email');
            const phoneEl = document.getElementById('res-phone');
            let hasError = false;

            const resetError = (el, errorId) => {
                document.getElementById(errorId).style.display = 'none';
                el.style.borderColor = 'rgba(255,253,208,0.2)';
            };
            const showError = (el, errorId) => {
                document.getElementById(errorId).style.display = 'block';
                el.style.borderColor = '#ffb44d';
                hasError = true;
            };

            // Reset
            resetError(nameEl, 'error-res-name');
            resetError(emailEl, 'error-res-email');
            resetError(phoneEl, 'error-res-phone');
            resetError(document.getElementById('toggle-date'), 'error-res-date');
            resetError(document.getElementById('toggle-time'), 'error-res-time');
            resetError(document.getElementById('toggle-guests'), 'error-res-guests');
            resetError(document.getElementById('toggle-area'), 'error-res-area');

            // Name
            if (!nameEl.value.trim()) showError(nameEl, 'error-res-name');
            
            // Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailEl.value.trim())) showError(emailEl, 'error-res-email');
            if (!/^[0-9+()\-\s]{7,30}$/.test(phoneEl.value.trim())) showError(phoneEl, 'error-res-phone');

            // Date
            if (!inputDate.value) showError(document.getElementById('toggle-date'), 'error-res-date');
            
            // Time
            if (!inputTime.value) showError(document.getElementById('toggle-time'), 'error-res-time');

            // Guests
            if (!inputGuests.value) showError(document.getElementById('toggle-guests'), 'error-res-guests');
            if (!inputArea.value) showError(document.getElementById('toggle-area'), 'error-res-area');

            if (!hasError) {
                // Submit to Laravel Backend
                const btnSubmit = document.getElementById('btn-submit-reservation');
                btnSubmit.textContent = 'Procesando...';
                btnSubmit.disabled = true;
                
                const reservationData = {
                    service_area_id: parseInt(inputArea.value),
                    name: nameEl.value.trim(),
                    email: emailEl.value.trim(),
                    phone: phoneEl.value.trim(),
                    date: inputDate.value,
                    time: inputTime.value,
                    guests: parseInt(inputGuests.value)
                };

                reservationAttemptKey ??= window.crypto?.randomUUID?.()
                    || `reservation-${Date.now()}-${Math.random().toString(16).slice(2)}`;

                fetch(`${API_URL}/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Idempotency-Key': reservationAttemptKey,
                    },
                    body: JSON.stringify(reservationData)
                })
                .then(response => {
                    if (!response.ok) throw new Error('Error en la petición');
                    return response.json();
                })
                .then(data => {
                    reservationAttemptKey = null;
                    showToast('Solicitud recibida. El personal confirmará su reservación.');
                    resForm.reset();
                    // Reset dropdowns
                    displayDate.textContent = 'Seleccionar Fecha';
                    displayTime.textContent = 'Seleccionar Hora';
                    displayGuests.textContent = 'Cantidad de personas';
                    displayArea.textContent = 'Área preferida';
                    inputDate.value = '';
                    inputTime.value = '';
                    inputGuests.value = '';
                    inputArea.value = '';
                    dropdownArea.innerHTML = '<div class="dropdown-empty">Elige fecha y personas</div>';
                    resetTimes();
                    selectedDate = null;
                    renderCalendar();
                })
                .catch(error => {
                    console.error('Error Reserva:', error);
                    showToast('Ocurrió un error al procesar su reserva.');
                })
                .finally(() => {
                    btnSubmit.textContent = 'Solicitar Reserva';
                    btnSubmit.disabled = false;
                });
            }
        });
    }
});
