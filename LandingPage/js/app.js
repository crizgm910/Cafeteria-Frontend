const API_URL = 'http://127.0.0.1:8000/api';

const menuFilters = document.getElementById('menu-filters');
const menuGrid = document.getElementById('menu-grid');

let menuData = [];

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
            // Remover active de todos
            document.querySelectorAll('.menu-filters button').forEach(b => b.classList.remove('active'));
            // Agregar al clickeado
            btn.classList.add('active');
            
            renderMenuCategory(category);
        };
        
        menuFilters.appendChild(btn);
    });
}

function renderMenuCategory(category) {
    // Animación suave de transición
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
            menuGrid.appendChild(item);
        });
        
        menuGrid.style.opacity = '1';
        menuGrid.style.transition = 'opacity 0.4s ease';
    }, 200);
}

// Inicializar el menú al cargar la página
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
                    top: targetElement.offsetTop - 80, // Ajuste por la barra de navegación fija
                    behavior: 'smooth'
                });
            }
        });
    });
});
