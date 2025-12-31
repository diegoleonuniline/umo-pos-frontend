// ============================================
// UMO POS - APLICACIÓN PRINCIPAL
// ============================================

const App = {
    
    async init() {
        console.log('🚀 Iniciando UMO POS...');
        
        // Verificar sesión existente
        if (Auth.init()) {
            this.verificarTurno();
        } else {
            this.mostrarLogin();
        }
    },
    
    mostrarLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('turno-screen').style.display = 'none';
        document.getElementById('app').style.display = 'none';
        
        // Focus en campo de empleado
        setTimeout(() => {
            const input = document.getElementById('login-empleado');
            if (input) input.focus();
        }, 100);
    },
    
    mostrarLoading() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('turno-screen').style.display = 'none';
        document.getElementById('app').style.display = 'none';
    },
    
    async verificarTurno() {
        this.mostrarLoading();
        
        // Primero intentar cargar turno local
        if (Turno.init()) {
            // Verificar si sigue activo en el servidor
            const activo = await Turno.verificar();
            if (activo) {
                this.iniciarPOS();
                return;
            }
        }
        
        // No hay turno activo, mostrar pantalla de turno
        mostrarPantallaTurno();
    },
    
    async iniciarPOS() {
        this.mostrarLoading();
        
        try {
            // Cargar datos en paralelo
            await Promise.all([
                Productos.cargar(),
                Clientes.cargar(),
                Cobro.init()
            ]);
            
            // Mostrar app principal
            this.mostrarApp();
            
        } catch (error) {
            console.error('Error iniciando POS:', error);
            mostrarToast('Error al cargar datos', 'error');
            this.mostrarApp(); // Mostrar de todos modos
        }
    },
    
    mostrarApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('turno-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        
        // Actualizar header
        this.actualizarHeader();
        
        // Focus en búsqueda
        setTimeout(() => {
            const input = document.getElementById('search-producto');
            if (input) input.focus();
        }, 100);
        
        console.log('✅ UMO POS listo');
    },
    
    actualizarHeader() {
        // Usuario
        document.getElementById('user-name').textContent = Auth.getNombre();
        document.getElementById('user-sucursal').textContent = Auth.getSucursal();
        document.getElementById('user-avatar').textContent = Auth.getInitials();
        
        // Turno
        document.getElementById('header-turno-id').textContent = Turno.getId();
        
        // Tasas
        document.getElementById('header-tasa-usd').textContent = Turno.tasas.USD.toFixed(2);
        document.getElementById('header-tasa-cad').textContent = Turno.tasas.CAD.toFixed(2);
        document.getElementById('header-tasa-eur').textContent = Turno.tasas.EUR.toFixed(2);
    }
};

// ============================================
// GESTIÓN DE CLIENTES
// ============================================

const Clientes = {
    lista: [],
    seleccionado: null,
    
    async cargar() {
        try {
            const result = await API.obtenerClientes();
            if (result.success) {
                this.lista = result.clientes;
            }
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
    },
    
    buscar(termino) {
        const query = termino.toLowerCase().trim();
        if (!query || query.length < 2) return [];
        
        return this.lista.filter(c =>
            (c.nombre && c.nombre.toLowerCase().includes(query)) ||
            (c.codigo && c.codigo.toLowerCase().includes(query)) ||
            (c.correo && c.correo.toLowerCase().includes(query)) ||
            (c.telefono && c.telefono.includes(query))
        ).slice(0, 10);
    },
    
    seleccionar(cliente) {
        this.seleccionado = cliente;
        Carrito.cliente = cliente;
        
        document.getElementById('cliente-nombre').innerHTML = `
            <i class="fas fa-user-check" style="color: var(--success);"></i>
            ${cliente.nombre}
        `;
        
        cerrarModal('modal-clientes');
        mostrarToast(`Cliente: ${cliente.nombre}`, 'success');
    },
    
    limpiarSeleccion() {
        this.seleccionado = null;
        Carrito.cliente = null;
        document.getElementById('cliente-nombre').innerHTML = `
            <i class="fas fa-user"></i>
            Cliente General
        `;
    }
};

// ============================================
// MODAL DE CLIENTES
// ============================================

function abrirModalClientes() {
    const modal = document.getElementById('modal-clientes');
    const lista = document.getElementById('clientes-lista');
    const searchInput = document.getElementById('search-cliente');
    
    // Renderizar lista inicial
    renderizarListaClientes(Clientes.lista.slice(0, 20));
    
    // Limpiar búsqueda
    if (searchInput) {
        searchInput.value = '';
        
        // Listener de búsqueda
        searchInput.oninput = function() {
            const termino = this.value.trim();
            if (termino.length < 2) {
                renderizarListaClientes(Clientes.lista.slice(0, 20));
            } else {
                const resultados = Clientes.buscar(termino);
                renderizarListaClientes(resultados);
            }
        };
    }
    
    modal.classList.add('active');
    
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 100);
}

function renderizarListaClientes(clientes) {
    const lista = document.getElementById('clientes-lista');
    
    let html = `
        <div class="cliente-item" onclick="seleccionarCliente(null)">
            <i class="fas fa-user-slash"></i>
            <div>
                <strong>Cliente General</strong>
                <small>Sin datos de cliente</small>
            </div>
        </div>
    `;
    
    clientes.forEach(c => {
        html += `
            <div class="cliente-item" onclick="seleccionarCliente('${c.codigo}')">
                <i class="fas fa-user"></i>
                <div>
                    <strong>${c.nombre}</strong>
                    <small>${c.correo || ''} ${c.telefono ? '• ' + c.telefono : ''} ${c.grupo ? '• ' + c.grupo : ''}</small>
                </div>
            </div>
        `;
    });
    
    lista.innerHTML = html;
}

function seleccionarCliente(codigo) {
    if (!codigo) {
        Clientes.limpiarSeleccion();
        cerrarModal('modal-clientes');
        return;
    }
    
    const cliente = Clientes.lista.find(c => c.codigo === codigo);
    if (cliente) {
        Clientes.seleccionar(cliente);
    }
}

// ============================================
// UTILIDADES GLOBALES
// ============================================

function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = 'toast show ' + tipo;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Configurar logo
    const logos = document.querySelectorAll('.logo-img, .logo img');
    logos.forEach(img => {
        img.src = CONFIG.LOGO_URL;
        img.alt = 'UMO';
    });
    
    // Iniciar app
    App.init();
});

// Tecla Escape para cerrar modales
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Prevenir envío de formularios por Enter en inputs
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
        const form = e.target.closest('form');
        if (!form || form.id === 'login-form' || form.id === 'turno-form') return;
        e.preventDefault();
    }
});
