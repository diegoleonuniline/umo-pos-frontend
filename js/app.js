// ============================================
// UMO POS - APP.JS
// Inicialización y atajos de teclado
// ============================================

// Estado global de la aplicación
const State = {
    usuario: null,
    turno: null,
    productos: [],
    clientes: [],
    descuentos: [],
    metodosPago: [],
    tasas: {
        USD: 17.50,
        CAD: 13.00,
        EUR: 19.00
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 UMO POS iniciando...');
    
    // Verificar si hay sesión guardada
    const sesionGuardada = localStorage.getItem('umo_sesion');
    if (sesionGuardada) {
        try {
            const sesion = JSON.parse(sesionGuardada);
            State.usuario = sesion.usuario;
            State.turno = sesion.turno;
            State.tasas = sesion.tasas || State.tasas;
            
            if (State.turno) {
                await iniciarApp();
            } else {
                mostrarPantallaTurno();
            }
        } catch (e) {
            console.error('Error cargando sesión:', e);
            mostrarLogin();
        }
    } else {
        mostrarLogin();
    }
    
    // Inicializar atajos de teclado
    initKeyboardShortcuts();
    
    // Inicializar eventos del login
    initLoginEvents();
    
    // Inicializar eventos del turno
    initTurnoEvents();
});

// ============================================
// ATAJOS DE TECLADO (ESTILO CAFI)
// ============================================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Solo si la app está visible
        const appVisible = document.getElementById('app').style.display !== 'none';
        if (!appVisible) return;
        
        // No ejecutar si está en un input (excepto para ciertas teclas)
        const enInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        
        switch (e.key) {
            case 'F2':
                e.preventDefault();
                abrirModalBusqueda();
                break;
                
            case 'F4':
                e.preventDefault();
                if (!enInput) {
                    limpiarCarrito();
                }
                break;
                
            case 'F12':
                e.preventDefault();
                if (Carrito.items.length > 0) {
                    abrirModalCobro();
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                cerrarModalActivo();
                break;
                
            case 'Enter':
                // Si hay un modal de búsqueda abierto y hay producto seleccionado
                if (document.getElementById('modal-busqueda').classList.contains('active')) {
                    const filaSeleccionada = document.querySelector('#productos-modal-tbody tr.selected');
                    if (filaSeleccionada) {
                        filaSeleccionada.click();
                    }
                }
                break;
        }
        
        // Ctrl + N = Nueva venta
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            nuevaVenta();
        }
        
        // Ctrl + B = Buscar producto
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            abrirModalBusqueda();
        }
    });
    
    console.log('⌨️ Atajos de teclado inicializados');
}

// ============================================
// GESTIÓN DE PANTALLAS
// ============================================
function mostrarLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('turno-screen').style.display = 'none';
    document.getElementById('app').style.display = 'none';
}

function mostrarLoading() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('turno-screen').style.display = 'none';
    document.getElementById('app').style.display = 'none';
}

function mostrarPantallaTurno() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('turno-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    // Actualizar info del usuario en pantalla turno
    if (State.usuario) {
        document.getElementById('turno-usuario-nombre').textContent = State.usuario.nombre || 'Usuario';
        document.getElementById('turno-usuario-sucursal').textContent = State.usuario.sucursal || 'Sucursal';
    }
}

function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('turno-screen').style.display = 'none';
    document.getElementById('app').style.display = 'grid';
    
    // Focus al input de búsqueda
    setTimeout(() => {
        const searchInput = document.getElementById('search-producto');
        if (searchInput) searchInput.focus();
    }, 100);
}

// ============================================
// INICIAR APP (después de abrir turno)
// ============================================
async function iniciarApp() {
    mostrarLoading();
    
    try {
        // Cargar datos en paralelo
        await Promise.all([
            cargarProductos(),
            cargarClientes(),
            cargarMetodosPago(),
            cargarDescuentos()
        ]);
        
        // Actualizar UI
        actualizarHeaderUsuario();
        actualizarHeaderTasas();
        actualizarResumen();
        
        mostrarApp();
        
        // Inicializar búsqueda de productos
        initBusquedaProductos();
        
        toast('Sistema listo', 'success');
        
    } catch (error) {
        console.error('Error iniciando app:', error);
        toast('Error cargando datos', 'error');
        mostrarLogin();
    }
}

// ============================================
// CARGAR DATOS
// ============================================
async function cargarProductos() {
    try {
        const data = await API.obtenerProductos();
        State.productos = data || [];
        Productos.renderizar(State.productos);
        console.log(`✅ ${State.productos.length} productos cargados`);
    } catch (error) {
        console.error('Error cargando productos:', error);
        State.productos = [];
    }
}

async function cargarClientes() {
    try {
        const data = await API.obtenerClientes();
        State.clientes = data || [];
        console.log(`✅ ${State.clientes.length} clientes cargados`);
    } catch (error) {
        console.error('Error cargando clientes:', error);
        State.clientes = [];
    }
}

async function cargarMetodosPago() {
    try {
        const data = await API.obtenerMetodosPago();
        State.metodosPago = data || [];
        console.log(`✅ ${State.metodosPago.length} métodos de pago cargados`);
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
        State.metodosPago = [];
    }
}

async function cargarDescuentos() {
    try {
        const data = await API.obtenerDescuentos();
        State.descuentos = data || [];
        console.log(`✅ ${State.descuentos.length} descuentos cargados`);
    } catch (error) {
        console.error('Error cargando descuentos:', error);
        State.descuentos = [];
    }
}

// ============================================
// ACTUALIZAR UI
// ============================================
function actualizarHeaderUsuario() {
    if (!State.usuario) return;
    
    const nombre = State.usuario.nombre || 'Usuario';
    const sucursal = State.usuario.sucursal || 'Sucursal';
    const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    document.getElementById('user-name').textContent = nombre;
    document.getElementById('user-sucursal').textContent = sucursal;
    document.getElementById('user-avatar').textContent = iniciales;
    
    // Panel resumen
    document.getElementById('r-sucursal').textContent = sucursal;
    document.getElementById('r-vendedor').textContent = nombre;
    
    // Turno ID
    if (State.turno) {
        document.getElementById('header-turno-id').textContent = State.turno.id || '-';
    }
}

function actualizarHeaderTasas() {
    document.getElementById('header-tasa-usd').textContent = State.tasas.USD.toFixed(2);
    document.getElementById('header-tasa-cad').textContent = State.tasas.CAD.toFixed(2);
    document.getElementById('header-tasa-eur').textContent = State.tasas.EUR.toFixed(2);
}

function actualizarResumen() {
    const items = Carrito.items || [];
    const subtotal = Carrito.subtotal || 0;
    const descuentos = Carrito.totalDescuentos || 0;
    const total = Carrito.total || 0;
    
    document.getElementById('r-items').textContent = items.length;
    document.getElementById('r-subtotal').textContent = formatMoney(subtotal);
    document.getElementById('r-descuentos').textContent = '-' + formatMoney(descuentos);
    document.getElementById('total-display').textContent = formatMoney(total);
    document.getElementById('r-cliente').textContent = Clientes.seleccionado?.nombre || 'Público General';
    
    // Habilitar/deshabilitar botón cobrar
    const btnCobrar = document.getElementById('btn-cobrar');
    if (btnCobrar) {
        btnCobrar.disabled = items.length === 0;
    }
}

// ============================================
// EVENTOS LOGIN
// ============================================
function initLoginEvents() {
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarLogin();
        });
    }
}

async function procesarLogin() {
    const empleadoId = document.getElementById('login-empleado').value.trim();
    const pin = document.getElementById('login-pin').value.trim();
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    
    if (!empleadoId || !pin) {
        errorEl.textContent = 'Ingresa ID y PIN';
        return;
    }
    
    btn.classList.add('loading');
    btn.disabled = true;
    errorEl.textContent = '';
    
    try {
        const resultado = await Auth.login(empleadoId, pin);
        
        if (resultado.success) {
            State.usuario = resultado.usuario;
            guardarSesion();
            
            // Verificar si tiene turno abierto
            const turnoAbierto = await Turno.verificarTurnoAbierto();
            
            if (turnoAbierto) {
                State.turno = turnoAbierto;
                guardarSesion();
                await iniciarApp();
            } else {
                mostrarPantallaTurno();
            }
        } else {
            errorEl.textContent = resultado.mensaje || 'Credenciales incorrectas';
        }
    } catch (error) {
        console.error('Error login:', error);
        errorEl.textContent = 'Error de conexión';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ============================================
// EVENTOS TURNO
// ============================================
function initTurnoEvents() {
    const form = document.getElementById('turno-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarAbrirTurno();
        });
    }
}

async function procesarAbrirTurno() {
    const btn = document.getElementById('turno-btn');
    const errorEl = document.getElementById('turno-error');
    
    const efectivoInicial = {
        MXN: parseFloat(document.getElementById('turno-mxn').value) || 0,
        USD: parseFloat(document.getElementById('turno-usd').value) || 0,
        CAD: parseFloat(document.getElementById('turno-cad').value) || 0,
        EUR: parseFloat(document.getElementById('turno-eur').value) || 0
    };
    
    const tasas = {
        USD: parseFloat(document.getElementById('turno-tasa-usd').value) || 17.50,
        CAD: parseFloat(document.getElementById('turno-tasa-cad').value) || 13.00,
        EUR: parseFloat(document.getElementById('turno-tasa-eur').value) || 19.00
    };
    
    btn.classList.add('loading');
    btn.disabled = true;
    errorEl.textContent = '';
    
    try {
        const resultado = await Turno.abrir(efectivoInicial, tasas);
        
        if (resultado.success) {
            State.turno = resultado.turno;
            State.tasas = tasas;
            guardarSesion();
            await iniciarApp();
            toast('Turno abierto correctamente', 'success');
        } else {
            errorEl.textContent = resultado.mensaje || 'Error al abrir turno';
        }
    } catch (error) {
        console.error('Error abriendo turno:', error);
        errorEl.textContent = 'Error de conexión';
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ============================================
// BÚSQUEDA DE PRODUCTOS
// ============================================
function initBusquedaProductos() {
    const searchInput = document.getElementById('search-producto');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const codigo = searchInput.value.trim();
                if (codigo) {
                    buscarYAgregarProducto(codigo);
                    searchInput.value = '';
                }
            }
        });
    }
    
    // Búsqueda en modal
    const modalSearch = document.getElementById('modal-search-producto');
    if (modalSearch) {
        modalSearch.addEventListener('input', (e) => {
            filtrarProductosModal(e.target.value);
        });
    }
    
    // Filtro categoría
    const filtroCategoria = document.getElementById('filtro-categoria');
    if (filtroCategoria) {
        filtroCategoria.addEventListener('change', () => {
            filtrarProductosModal(modalSearch?.value || '');
        });
    }
}

function buscarYAgregarProducto(codigo) {
    const producto = State.productos.find(p => 
        p.sku?.toLowerCase() === codigo.toLowerCase() || 
        p.codigo?.toLowerCase() === codigo.toLowerCase()
    );
    
    if (producto) {
        Carrito.agregar(producto);
        toast(`${producto.nombre} agregado`, 'success');
    } else {
        toast('Producto no encontrado', 'error');
    }
}

function filtrarProductosModal(termino) {
    const categoria = document.getElementById('filtro-categoria')?.value || '';
    
    let filtrados = State.productos;
    
    if (termino) {
        const busqueda = termino.toLowerCase();
        filtrados = filtrados.filter(p => 
            p.nombre?.toLowerCase().includes(busqueda) ||
            p.sku?.toLowerCase().includes(busqueda) ||
            p.codigo?.toLowerCase().includes(busqueda)
        );
    }
    
    if (categoria) {
        filtrados = filtrados.filter(p => p.categoria === categoria);
    }
    
    renderProductosModal(filtrados);
}

function renderProductosModal(productos) {
    const tbody = document.getElementById('productos-modal-tbody');
    if (!tbody) return;
    
    if (productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-cell">
                    <i class="fas fa-search" style="font-size: 24px; opacity: 0.3;"></i>
                    <span style="display: block; margin-top: 10px;">No se encontraron productos</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = productos.map(p => `
        <tr onclick="seleccionarProductoModal('${p.id}')" data-id="${p.id}">
            <td class="col-code">${p.sku || p.codigo || '-'}</td>
            <td class="col-name">${p.nombre}</td>
            <td class="col-category">${p.categoria || '-'}</td>
            <td class="col-price">${formatMoney(p.precio)}</td>
        </tr>
    `).join('');
}

function seleccionarProductoModal(id) {
    const producto = State.productos.find(p => p.id === id);
    if (producto) {
        Carrito.agregar(producto);
        toast(`${producto.nombre} agregado`, 'success');
        cerrarModal('modal-busqueda');
    }
}

// ============================================
// MODALES
// ============================================
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        
        // Focus al input de búsqueda si existe
        const searchInput = modal.querySelector('input[type="text"]');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
    }
}

function cerrarModalActivo() {
    const modalesActivos = document.querySelectorAll('.modal-overlay.active');
    modalesActivos.forEach(modal => {
        modal.classList.remove('active');
    });
}

function abrirModalBusqueda() {
    abrirModal('modal-busqueda');
    renderProductosModal(State.productos);
    
    // Cargar categorías en el filtro
    const filtro = document.getElementById('filtro-categoria');
    if (filtro && filtro.options.length <= 1) {
        const categorias = [...new Set(State.productos.map(p => p.categoria).filter(c => c))];
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filtro.appendChild(option);
        });
    }
}

function abrirModalClientes() {
    abrirModal('modal-clientes');
    renderListaClientes();
}

function abrirModalCobro() {
    if (Carrito.items.length === 0) {
        toast('Agrega productos al carrito', 'error');
        return;
    }
    abrirModal('modal-cobro');
    Cobro.renderModal();
}

function abrirModalCerrarTurno() {
    abrirModal('modal-cerrar-turno');
    Turno.renderModalCerrar();
}

// ============================================
// CLIENTES
// ============================================
function renderListaClientes() {
    const lista = document.getElementById('clientes-lista');
    if (!lista) return;
    
    // Cliente general siempre primero
    let html = `
        <div class="cliente-item" onclick="seleccionarCliente(null)">
            <div class="cliente-icon"><i class="fas fa-user-slash"></i></div>
            <div class="cliente-data">
                <strong>Cliente General</strong>
                <small>Sin datos de cliente</small>
            </div>
        </div>
    `;
    
    // Filtrar por búsqueda
    const busqueda = document.getElementById('search-cliente')?.value.toLowerCase() || '';
    
    let clientesFiltrados = State.clientes;
    if (busqueda) {
        clientesFiltrados = State.clientes.filter(c => 
            c.nombre?.toLowerCase().includes(busqueda) ||
            c.codigo?.toLowerCase().includes(busqueda) ||
            c.correo?.toLowerCase().includes(busqueda)
        );
    }
    
    html += clientesFiltrados.map(c => `
        <div class="cliente-item" onclick="seleccionarCliente('${c.id}')">
            <div class="cliente-icon"><i class="fas fa-user"></i></div>
            <div class="cliente-data">
                <strong>${c.nombre}</strong>
                <small>${c.grupo || 'Sin grupo'} • ${c.correo || c.telefono || ''}</small>
            </div>
        </div>
    `).join('');
    
    lista.innerHTML = html;
}

function seleccionarCliente(id) {
    if (id) {
        const cliente = State.clientes.find(c => c.id === id);
        if (cliente) {
            Clientes.seleccionar(cliente);
        }
    } else {
        Clientes.limpiarSeleccion();
    }
    cerrarModal('modal-clientes');
}

async function guardarNuevoCliente() {
    const codigo = document.getElementById('nuevo-cliente-codigo').value.trim();
    const nombre = document.getElementById('nuevo-cliente-nombre').value.trim();
    const correo = document.getElementById('nuevo-cliente-correo').value.trim();
    const telefono = document.getElementById('nuevo-cliente-telefono').value.trim();
    
    if (!codigo || !nombre) {
        toast('Código y nombre son requeridos', 'error');
        return;
    }
    
    try {
        const resultado = await API.crearCliente({ codigo, nombre, correo, telefono });
        
        if (resultado.success) {
            await cargarClientes();
            seleccionarCliente(resultado.cliente.id);
            toast('Cliente creado', 'success');
            
            // Limpiar formulario
            document.getElementById('nuevo-cliente-codigo').value = '';
            document.getElementById('nuevo-cliente-nombre').value = '';
            document.getElementById('nuevo-cliente-correo').value = '';
            document.getElementById('nuevo-cliente-telefono').value = '';
        } else {
            toast(resultado.mensaje || 'Error creando cliente', 'error');
        }
    } catch (error) {
        console.error('Error creando cliente:', error);
        toast('Error de conexión', 'error');
    }
}

// ============================================
// ACCIONES DE VENTA
// ============================================
function nuevaVenta() {
    Carrito.limpiar();
    Clientes.limpiarSeleccion();
    actualizarResumen();
    toast('Nueva venta iniciada', 'info');
    
    const searchInput = document.getElementById('search-producto');
    if (searchInput) searchInput.focus();
}

function limpiarCarrito() {
    if (Carrito.items.length === 0) return;
    
    if (confirm('¿Limpiar el carrito?')) {
        Carrito.limpiar();
        actualizarResumen();
        toast('Carrito limpiado', 'info');
    }
}

function sincronizarDatos() {
    toast('Sincronizando...', 'info');
    
    Promise.all([
        cargarProductos(),
        cargarClientes(),
        cargarMetodosPago(),
        cargarDescuentos()
    ]).then(() => {
        toast('Datos actualizados', 'success');
    }).catch(() => {
        toast('Error sincronizando', 'error');
    });
}

// ============================================
// MODAL ÉXITO
// ============================================
function cerrarModalExito() {
    cerrarModal('modal-exito');
    nuevaVenta();
}

function imprimirTicket() {
    window.print();
}

// ============================================
// SESIÓN
// ============================================
function guardarSesion() {
    const sesion = {
        usuario: State.usuario,
        turno: State.turno,
        tasas: State.tasas
    };
    localStorage.setItem('umo_sesion', JSON.stringify(sesion));
}

function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('umo_sesion');
        State.usuario = null;
        State.turno = null;
        Carrito.limpiar();
        Clientes.limpiarSeleccion();
        mostrarLogin();
        toast('Sesión cerrada', 'info');
    }
}

// ============================================
// UTILIDADES
// ============================================
function formatMoney(amount) {
    const num = parseFloat(amount) || 0;
    return '$' + num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toast(mensaje, tipo = 'info') {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    
    toastEl.textContent = mensaje;
    toastEl.className = 'toast show ' + tipo;
    
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// Búsqueda de cliente en tiempo real
document.addEventListener('DOMContentLoaded', () => {
    const searchCliente = document.getElementById('search-cliente');
    if (searchCliente) {
        searchCliente.addEventListener('input', renderListaClientes);
    }
});

// Exportar funciones globales
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.abrirModalBusqueda = abrirModalBusqueda;
window.abrirModalClientes = abrirModalClientes;
window.abrirModalCobro = abrirModalCobro;
window.abrirModalCerrarTurno = abrirModalCerrarTurno;
window.seleccionarCliente = seleccionarCliente;
window.seleccionarProductoModal = seleccionarProductoModal;
window.guardarNuevoCliente = guardarNuevoCliente;
window.nuevaVenta = nuevaVenta;
window.limpiarCarrito = limpiarCarrito;
window.sincronizarDatos = sincronizarDatos;
window.cerrarSesion = cerrarSesion;
window.cerrarModalExito = cerrarModalExito;
window.imprimirTicket = imprimirTicket;
window.formatMoney = formatMoney;
window.toast = toast;
window.actualizarResumen = actualizarResumen;
