const API_URL = 'http://127.0.0.1:8000/api';

const menuFilters = document.getElementById('menu-filters');
const menuGrid = document.getElementById('menu-grid');

let menuData = [];
let cart = [];
let lastOrderCart = [];
let lastOrderTotal = "$0.00";
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
const btnPrintTicket = document.getElementById('btn-print-ticket');
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
            if (!product || !product.id) return; // Skip broken items

            const item = document.createElement('div');
            item.className = 'menu-card';
            
            // Faux Badges
            let badgeHtml = '';
            if (product.id % 5 === 0) badgeHtml = '<span class="menu-card-badge badge-premium">Premium</span>';
            else if (product.id % 3 === 0) badgeHtml = '<span class="menu-card-badge badge-nuevo">Nuevo</span>';

            const safeName = product.name || 'Producto No Disponible';
            const safeDesc = product.description || 'Nuestra mezcla especial de la casa, tostado oscuro.';
            const safePrice = parsePrice(product.price).toFixed(2);
            
            // Determinamos un ícono faux según el id
            const icons = ['☕', '🍵', '🍰', '🥃', '🥐'];
            const fallbackIcon = icons[product.id % icons.length];

            // Background image si existe
            let imgHtml = '';
            let style = 'cursor:pointer;';
            if (product.image_url) {
                style += ` background-image: url('${product.image_url}'); background-size: cover; background-position: center;`;
            } else {
                imgHtml = `<span class="menu-card-img-icon">${fallbackIcon}</span>`;
            }

            item.innerHTML = `
                <div class="menu-card-img" onclick="openAddonModal(${product.id})" style="${style}">
                    ${badgeHtml}
                    <button class="btn-favorite-card" onclick="toggleFavorite(this, event)">♡</button>
                    ${imgHtml}
                </div>
                <div class="menu-card-body">
                    <h4>${safeName}</h4>
                    <p>${safeDesc}</p>
                    <div class="menu-card-footer">
                        <div class="menu-card-price">$${safePrice}</div>
                        <button class="btn-add-card" onclick="openAddonModal(${product.id})">Personalizar</button>
                    </div>
                </div>
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
                <input type="checkbox" class="addon-checkbox" value="${addon.id}" data-name="${addon.name}" data-price="${parsePrice(addon.price)}">
                <span>${addon.name}</span>
                <span class="addon-price">+$${parsePrice(addon.price).toFixed(2)}</span>
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
    
    let basePrice = parsePrice(currentSelectedProduct.price);
    
    // Size Price
    const selectedSize = document.querySelector('input[name="size"]:checked');
    if (selectedSize) basePrice += parsePrice(selectedSize.dataset.price);
    
    // Milk Price
    const selectedMilk = document.querySelector('input[name="milk"]:checked');
    if (selectedMilk) basePrice += parsePrice(selectedMilk.dataset.price);
    
    // Addons
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
            addonsHtml += `<div class="cart-item-meta">${item.variant}</div>`;
        }

        if (item.addons && item.addons.length > 0) {
            const addonsText = item.addons.map(a => {
                itemAddonsTotal += parsePrice(a.price);
                return a.name;
            }).join(', ');
            addonsHtml += `<div class="cart-item-meta">+ ${addonsText}</div>`;
        }

        if (item.notes) {
            addonsHtml += `<div class="cart-item-meta" style="font-style:italic">Nota: ${item.notes}</div>`;
        }

        const unitPrice = baseItemPrice + itemAddonsTotal;
        const safeQty = parseInt(item.quantity) || 1;
        const subtotal = unitPrice * safeQty;
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
    
    // Update compact views
    if (compactTicketCount) compactTicketCount.textContent = cart.length;
    if (compactTicketTotal) compactTicketTotal.textContent = `$${total.toFixed(2)}`;

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
    const addressVal = checkoutAddress.value.trim();
    const serviceVal = checkoutService.value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9\-\+\s]{7,15}$/;

    if (!nameVal) return showToast('El Nombre es obligatorio');
    
    if (!phoneVal) return showToast('El Teléfono es obligatorio');
    if (!phoneRegex.test(phoneVal)) return showToast('Ingrese un Teléfono válido');
    
    if (!emailVal) return showToast('El Correo es obligatorio');
    if (!emailRegex.test(emailVal)) return showToast('Ingrese un Correo válido');
    
    if (serviceVal === 'delivery' && !addressVal) {
        return showToast('La Dirección es obligatoria para envíos a domicilio');
    }
    
    btnPay.disabled = true;
    btnPay.textContent = 'Procesando Pago...';

    let mappedService = 'dine_in';
    if (serviceVal === 'pickup') mappedService = 'takeout';
    if (serviceVal === 'delivery') mappedService = 'delivery';

    const payload = {
        items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            notes: item.notes || null,
            add_ons: item.addons.map(a => a.id)
        })),
        payment_method: checkoutPayment ? checkoutPayment.value : 'efectivo',
        customer_name: nameVal,
        order_type: mappedService
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
            // Usar el ticket_id real devuelto por Laravel
            const orderNum = 'TGR-' + result.ticket_id.toString().padStart(4, '0');
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
            
            lastOrderCart = [...cart];
            lastOrderTotal = cartTotalEl.textContent;
            
            cart = [];
            updateCartUI();
            
            if (payload.payment_method === 'cash' || payload.payment_method === 'efectivo') {
                btnPrintTicket.style.display = 'none';
            } else {
                btnPrintTicket.style.display = 'block';
            }
            
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
// Success Modal Logic
const closeSuccessModal = () => successModal.classList.remove('open');
btnCloseSuccess.onclick = closeSuccessModal;
btnSuccessClose.onclick = closeSuccessModal;

btnPrintTicket.onclick = () => {
    const orderNum = successOrderId.textContent;
    const win = window.open('', '_blank', 'width=400,height=600');
    
    const d = new Date();
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const checkoutPayment = document.getElementById('checkout-payment');
    const paymentMethodStr = (checkoutPayment && checkoutPayment.value !== 'cash' && checkoutPayment.value !== 'efectivo') ? 'Tarjeta' : 'Efectivo';
    const customerName = document.getElementById('checkout-name').value;
    const serviceVal = document.getElementById('checkout-service').value;
    const orderType = serviceVal === 'takeaway' ? 'Para llevar' : 'Comer aquí';
    
    let itemsHtml = '';
    let totalCalc = 0;
    lastOrderCart.forEach(item => {
        let basePrice = parsePrice(item.product.price);
        let addonsTotal = 0;
        let addonsListHtml = '';
        if (item.addons && item.addons.length > 0) {
            item.addons.forEach(a => {
                addonsTotal += parsePrice(a.price);
                addonsListHtml += `<div style="display:flex; justify-content:space-between; font-size:1rem; padding-left:15px; color:#555;"><span>+ ${a.name}</span></div>`;
            });
        }
        let unitPrice = basePrice + parsePrice(item.extraPrice) + addonsTotal;
        let itemSubtotal = unitPrice * item.quantity;
        totalCalc += itemSubtotal;
        
        itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:0;"><strong style="font-size:1.2rem;">${item.quantity} x ${item.product.name}</strong><strong style="font-size:1.2rem;">$${itemSubtotal.toFixed(2)}</strong></div>`;
        itemsHtml += addonsListHtml;
        if (item.notes) {
            itemsHtml += `<div style="font-size:1rem; padding-left:15px; font-style:italic;">Nota: ${item.notes}</div>`;
        }
        itemsHtml += `<div style="margin-bottom:10px;"></div>`;
    });
    
    const subtotal = totalCalc / 1.16;
    const iva = totalCalc - subtotal;
    
    win.document.write(`
        <html>
        <head>
            <title>Ticket ${orderNum}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
                h1 { text-align: center; font-size: 1.8rem; margin-bottom: 5px; text-transform: uppercase; }
                .text-center { text-align: center; }
                .details { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 15px; font-size: 1.1rem; }
                .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>TGR RECEIPT</h1>
            <p class="text-center" style="font-size:1.3rem; font-weight:bold; margin-top:0;">PEDIDO #${orderNum}</p>
            
            <div class="details">
                <p style="margin:2px 0;"><strong>Fecha:</strong> ${dateStr}</p>
                ${customerName ? `<p style="margin:2px 0;"><strong>Cliente:</strong> ${customerName}</p>` : ''}
                <p style="margin:2px 0;"><strong>Tipo:</strong> ${orderType}</p>
                <p style="margin:2px 0;"><strong>Pago:</strong> ${paymentMethodStr}</p>
            </div>
            
            ${itemsHtml}
            
            <div class="totals">
                <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>IVA (16%)</span><span>$${iva.toFixed(2)}</span></div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.4rem; margin-top:5px;"><span>TOTAL</span><span>$${totalCalc.toFixed(2)}</span></div>
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
    const resBtn = resForm ? resForm.querySelector('button[type="submit"]') : null;
    
    if (resForm) {
        resForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('res-name').value;
            const email = document.getElementById('res-email').value;
            const date = document.getElementById('res-date').value;
            const time = document.getElementById('res-time').value;
            const guests = document.getElementById('res-guests').value;
            
            if (!name || !email || !date || !time || !guests) {
                return showToast('Por favor, complete todos los campos de la reserva.');
            }
            
            if (resBtn) {
                resBtn.disabled = true;
                resBtn.textContent = 'Procesando...';
            }

            try {
                const response = await fetch(`${API_URL}/reservations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ name, email, date, time, guests })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`Estimado/a ${name},\nSu solicitud de reserva para el ${date} a las ${time} ha sido recibida y registrada en el Staff Portal.\nUn concierge se pondrá en contacto pronto para confirmar.`);
                    resForm.reset();
                    
                    // Resetear los selectores custom
                    const timeDisplay = document.getElementById('display-time');
                    if (timeDisplay) timeDisplay.textContent = 'Seleccione una hora';
                    const guestsDisplay = document.getElementById('display-guests');
                    if (guestsDisplay) guestsDisplay.textContent = 'Cantidad de Personas';
                } else {
                    showToast('Error: ' + (result.message || 'No se pudo crear la reserva.'));
                }
            } catch (error) {
                console.error('Error Reserva:', error);
                showToast('Ocurrió un error de conexión al solicitar la reserva.');
            } finally {
                if (resBtn) {
                    resBtn.disabled = false;
                    resBtn.textContent = 'Solicitar Reserva VIP';
                }
            }
        };
    }
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
    
    if (dropdownTime) {
        let timeHtml = '';
        let startHour = 7;
        for(let i = 0; i < 11; i++) {
            let hour = startHour + Math.floor(i/2);
            let mins = i % 2 === 0 ? '00' : '30';
            let ampm = hour >= 12 ? 'p. m.' : 'a. m.';
            let displayHour = hour > 12 ? hour - 12 : hour;
            displayHour = displayHour < 10 ? '0' + displayHour : displayHour;
            let timeString = `${displayHour}:${mins} ${ampm}`;
            
            timeHtml += `<div class="dropdown-option" data-value="${timeString}">${timeString}</div>`;
        }
        dropdownTime.innerHTML = timeHtml;
    }

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

    // 7. Form Validation Override
    const resForm = document.getElementById('reservation-form');
    if (resForm) {
        resForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nameEl = document.getElementById('res-name');
            const emailEl = document.getElementById('res-email');
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
            resetError(document.getElementById('toggle-date'), 'error-res-date');
            resetError(document.getElementById('toggle-time'), 'error-res-time');
            resetError(document.getElementById('toggle-guests'), 'error-res-guests');

            // Name
            if (!nameEl.value.trim()) showError(nameEl, 'error-res-name');
            
            // Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailEl.value.trim())) showError(emailEl, 'error-res-email');

            // Date
            if (!inputDate.value) showError(document.getElementById('toggle-date'), 'error-res-date');
            
            // Time
            if (!inputTime.value) showError(document.getElementById('toggle-time'), 'error-res-time');

            // Guests
            if (!inputGuests.value) showError(document.getElementById('toggle-guests'), 'error-res-guests');

            if (!hasError) {
                // Submit to Laravel Backend
                const btnSubmit = document.getElementById('btn-submit-reservation');
                btnSubmit.textContent = 'Procesando...';
                btnSubmit.disabled = true;
                
                const reservationData = {
                    name: nameEl.value.trim(),
                    email: emailEl.value.trim(),
                    date: inputDate.value,
                    time: inputTime.value,
                    guests: parseInt(inputGuests.value)
                };

                fetch('http://127.0.0.1:8000/api/reservations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(reservationData)
                })
                .then(response => {
                    if (!response.ok) throw new Error('Error en la petición');
                    return response.json();
                })
                .then(data => {
                    showToast('¡Su mesa ha sido reservada con éxito!');
                    resForm.reset();
                    // Reset dropdowns
                    displayDate.textContent = 'Seleccionar Fecha';
                    displayTime.textContent = 'Seleccionar Hora';
                    displayGuests.textContent = 'Cantidad de personas';
                    inputDate.value = '';
                    inputTime.value = '';
                    inputGuests.value = '';
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
