// ============================================
// UMO POS - APP.JS
// Compatible con productos.js, carrito.js, cobro.js existentes
// + Atajos de teclado estilo CAFI
// ============================================

const App = {
    usuario: null,
    turno: null,
    tasas: { USD: 17.50, CAD: 13.00, EUR: 19.00 },
    
    async iniciarPOS() {
        console.log('🚀 Iniciando UMO POS...');
        
        try {
            // Cargar datos en paralelo
            await Promise.all([
                Productos.cargar(),
                Clientes.cargar(),
                this.cargarMetodosPago()
            ]);
            
            this.actualizarUI();
            this.initKeyboardShortcuts();
            
            console.log('✅ UMO POS listo');
            mostrarToast('Sistema listo', 'success');
            
        } catch (error) {
            console.error('Error iniciando POS:', error);
            mostrarToast('Error cargando datos', 'error');
        }
    },
    
    async cargarMetodosPago() {
        try {
            const result = await API.obtenerMetodosPago();
            if (result.success) {
                window.metodosPagoDisponibles = result.metodos;
            }
        } catch (error) {
            console.error('Error cargando métodos de pago:', error);
        }
    },
    
    actualizarUI() {
        // Usuario
        if (this.usuario) {
            const nombre = this.usuario.nombre || 'Usuario';
            const sucursal = this.usuario.sucursal || 'Sucursal';
            const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            document.getElementById('user-name').textContent = nombre;
            document.getElementById('user-sucursal').textContent = sucursal;
            document.getElementById('user-avatar').textContent = iniciales;
            
            document.getElementById('resumen-sucursal').textContent = sucursal;
            document.getElementById('resumen-vendedor').textContent = nombre;
        }
        
        // Turno
        if (this.turno) {
            document.getElementById('header-turno-id').textContent = this.turno.id || '-';
        }
        
        // Tasas
        document.getElementById('header-tasa-usd').textContent = this.tasas.USD.toFixed(2);
        document.getElementById('header-tasa-cad').textContent = this.tasas.CAD.toFixed(2);
        document.getElementById('header-tasa-eur').textContent = this.tasas.EUR.toFixed(2);
    },
    
    // ========================================
    // ATAJOS DE TECLADO (ESTILO CAFI)
    // ========================================
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Solo si la app está visible
            const appVisible = document.getElementById('app').style.display !== 'none';
            if (!appVisible) return;
            
            // Verificar si hay modal activo
            const modalActivo = document.querySelector('.modal-overlay.active');
            
            switch (e.key) {
                case 'F2':
                    e.preventDefault();
                    if (!modalActivo) {
                        focusBusqueda();
                    }
                    break;
                    
                case 'F4':
                    e.preventDefault();
                    if (!modalActivo) {
                        limpiarCarrito();
                    }
                    break;
                    
                case 'F12':
                    e.preventDefault();
                    if (!modalActivo && Carrito.items.length > 0) {
                        abrirModalCobro();
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    cerrarModalActivo();
                    break;
            }
            
            // Ctrl + N = Nueva venta
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                nuevaVenta();
            }
        });
        
        console.log('⌨️ Atajos de teclado inicializados (F2, F4, F12, Esc, Ctrl+N)');
    }
};

// ============================================
// FUNCIONES GLOBALES REQUERIDAS
// ============================================

// Toast notifications
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = mensaje;
    toast.className = 'toast show ' + tipo;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modales
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        const input = modal.querySelector('input[type="text"]');
        if (input) setTimeout(() => input.focus(), 100);
    }
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function cerrarModalActivo() {
    const modales = document.querySelectorAll('.modal-overlay.active');
    modales.forEach(m => m.classList.remove('active'));
}

function abrirModalClientes() {
    abrirModal('modal-clientes');
    Clientes.renderLista();
}

function abrirModalCobro() {
    if (Carrito.items.length === 0) {
        mostrarToast('Agrega productos al carrito', 'error');
        return;
    }
    abrirModal('modal-cobro');
    if (typeof Cobro !== 'undefined' && Cobro.render) {
        Cobro.render();
    }
}

function abrirModalCerrarTurno() {
    abrirModal('modal-cerrar-turno');
    if (typeof Turno !== 'undefined' && Turno.renderModalCerrar) {
        Turno.renderModalCerrar();
    }
}

// Acciones de venta
function nuevaVenta() {
    Carrito.items = [];
    Carrito.cliente = null;
    Carrito.descuentoExtra = 0;
    Carrito.descuentoAutomatico = { porcentaje: 0, descripcion: 'Sin descuento', id: null };
    
    Clientes.limpiarSeleccion();
    Carrito.render();
    Carrito.actualizarTotales();
    actualizarResumenPanel();
    
    mostrarToast('Nueva venta iniciada', 'info');
    
    const searchInput = document.getElementById('search-producto');
    if (searchInput) searchInput.focus();
}

function focusBusqueda() {
    const searchInput = document.getElementById('search-producto');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('umo_sesion');
        location.reload();
    }
}

// Modal éxito
function cerrarModalExito() {
    cerrarModal('modal-exito');
    nuevaVenta();
}

function imprimirTicket() {
    window.print();
}

// Actualizar panel resumen
function actualizarResumenPanel() {
    const articulos = Carrito.items.reduce((sum, i) => sum + i.cantidad, 0);
    const subtotal = Carrito.getSubtotal();
    const descuentos = Carrito.getDescuentoTotal();
    const total = Carrito.getTotal();
    
    document.getElementById('resumen-articulos').textContent = articulos;
    document.getElementById('resumen-subtotal').textContent = '$' + Math.round(subtotal).toLocaleString();
    document.getElementById('resumen-descuentos').textContent = '-$' + Math.round(descuentos).toLocaleString();
    document.getElementById('total-display').textContent = '$' + Math.round(total).toLocaleString();
    document.getElementById('resumen-cliente').textContent = Carrito.cliente?.nombre || 'Público General';
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando UMO POS...');
    
    // Verificar sesión guardada
    const sesionGuardada = localStorage.getItem('umo_sesion');
    
    if (sesionGuardada) {
        try {
            const sesion = JSON.parse(sesionGuardada);
            App.usuario = sesion.usuario;
            App.turno = sesion.turno;
            App.tasas = sesion.tasas || App.tasas;
            
            if (App.turno) {
                // Mostrar app
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app').style.display = 'grid';
                await App.iniciarPOS();
            } else {
                // Mostrar pantalla turno
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('turno-screen').style.display = 'flex';
                
                if (App.usuario) {
                    document.getElementById('turno-usuario-nombre').textContent = App.usuario.nombre;
                    document.getElementById('turno-usuario-sucursal').textContent = App.usuario.sucursal;
                }
            }
        } catch (e) {
            console.error('Error cargando sesión:', e);
        }
    }
    
    // Eventos login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
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
                const result = await Auth.login(empleadoId, pin);
                
                if (result.success) {
                    App.usuario = result.usuario;
                    guardarSesion();
                    
                    // Verificar turno abierto
                    const turnoAbierto = await Turno.verificarTurnoAbierto();
                    
                    if (turnoAbierto) {
                        App.turno = turnoAbierto;
                        guardarSesion();
                        
                        document.getElementById('login-screen').style.display = 'none';
                        document.getElementById('app').style.display = 'grid';
                        await App.iniciarPOS();
                    } else {
                        document.getElementById('login-screen').style.display = 'none';
                        document.getElementById('turno-screen').style.display = 'flex';
                        document.getElementById('turno-usuario-nombre').textContent = App.usuario.nombre;
                        document.getElementById('turno-usuario-sucursal').textContent = App.usuario.sucursal;
                    }
                } else {
                    errorEl.textContent = result.mensaje || 'Credenciales incorrectas';
                }
            } catch (error) {
                console.error('Error login:', error);
                errorEl.textContent = 'Error de conexión';
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }
    
    // Eventos turno
    const turnoForm = document.getElementById('turno-form');
    if (turnoForm) {
        turnoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById('turno-btn');
            const errorEl = document.getElementById('turno-error');
            
            const efectivoInicial = {
                MXN: parseFloat(document.getElementById('turno-mxn').value) || 0,
                USD: parseFloat(document.getElementById('turno-usd').value) || 0,
                CAD: parseFloat(document.getElementById('turno-cad').value) || 0,
                EUR: parseFloat(document.getElementById('turno-eur').value) || 0
            };
            
            App.tasas = {
                USD: parseFloat(document.getElementById('turno-tasa-usd').value) || 17.50,
                CAD: parseFloat(document.getElementById('turno-tasa-cad').value) || 13.00,
                EUR: parseFloat(document.getElementById('turno-tasa-eur').value) || 19.00
            };
            
            btn.classList.add('loading');
            btn.disabled = true;
            errorEl.textContent = '';
            
            try {
                const result = await Turno.abrir(efectivoInicial, App.tasas);
                
                if (result.success) {
                    App.turno = result.turno;
                    guardarSesion();
                    
                    document.getElementById('turno-screen').style.display = 'none';
                    document.getElementById('app').style.display = 'grid';
                    await App.iniciarPOS();
                    
                    mostrarToast('Turno abierto correctamente', 'success');
                } else {
                    errorEl.textContent = result.mensaje || 'Error al abrir turno';
                }
            } catch (error) {
                console.error('Error abriendo turno:', error);
                errorEl.textContent = 'Error de conexión';
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }
    
    // Búsqueda de cliente
    const searchCliente = document.getElementById('search-cliente');
    if (searchCliente) {
        searchCliente.addEventListener('input', () => Clientes.renderLista());
    }
    
    console.log('✅ UMO POS listo');
});

// Guardar sesión
function guardarSesion() {
    const sesion = {
        usuario: App.usuario,
        turno: App.turno,
        tasas: App.tasas
    };
    localStorage.setItem('umo_sesion', JSON.stringify(sesion));
}

// Override de actualizarTotales del Carrito para actualizar panel resumen
const originalActualizarTotales = Carrito.actualizarTotales.bind(Carrito);
Carrito.actualizarTotales = function() {
    originalActualizarTotales();
    actualizarResumenPanel();
};

// Exportar globales
window.mostrarToast = mostrarToast;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.cerrarModalActivo = cerrarModalActivo;
window.abrirModalClientes = abrirModalClientes;
window.abrirModalCobro = abrirModalCobro;
window.abrirModalCerrarTurno = abrirModalCerrarTurno;
window.nuevaVenta = nuevaVenta;
window.focusBusqueda = focusBusqueda;
window.cerrarSesion = cerrarSesion;
window.cerrarModalExito = cerrarModalExito;
window.imprimirTicket = imprimirTicket;
window.limpiarCarrito = function() { Carrito.limpiar(); };
