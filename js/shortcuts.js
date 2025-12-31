// ============================================
// UMO POS - ATAJOS DE TECLADO (ESTILO CAFI)
// Agregar DESPUÉS de todos los demás scripts
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // Esperar a que la app esté lista
    setTimeout(initShortcuts, 500);
    
    function initShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Solo si la app está visible
            const app = document.getElementById('app');
            if (!app || app.style.display === 'none') return;
            
            // Verificar si hay modal activo
            const modalActivo = document.querySelector('.modal-overlay.active');
            
            switch (e.key) {
                case 'F2':
                    e.preventDefault();
                    if (!modalActivo) {
                        const searchInput = document.getElementById('search-producto');
                        if (searchInput) {
                            searchInput.focus();
                            searchInput.select();
                        }
                    }
                    break;
                    
                case 'F4':
                    e.preventDefault();
                    if (!modalActivo) {
                        if (typeof limpiarCarrito === 'function') {
                            limpiarCarrito();
                        } else if (typeof Carrito !== 'undefined' && Carrito.limpiar) {
                            Carrito.limpiar();
                        }
                    }
                    break;
                    
                case 'F12':
                    e.preventDefault();
                    if (!modalActivo) {
                        if (typeof Carrito !== 'undefined' && Carrito.items && Carrito.items.length > 0) {
                            if (typeof abrirModalCobro === 'function') {
                                abrirModalCobro();
                            } else if (typeof Cobro !== 'undefined' && Cobro.abrirModal) {
                                Cobro.abrirModal();
                            }
                        }
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    // Cerrar modal activo
                    if (modalActivo) {
                        modalActivo.classList.remove('active');
                    }
                    break;
            }
            
            // Ctrl + N = Nueva venta
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (typeof Carrito !== 'undefined') {
                    Carrito.items = [];
                    Carrito.descuentoExtra = 0;
                    if (typeof Clientes !== 'undefined' && Clientes.limpiarSeleccion) {
                        Clientes.limpiarSeleccion();
                    }
                    Carrito.render();
                    Carrito.actualizarTotales();
                    
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Nueva venta', 'info');
                    }
                    
                    const searchInput = document.getElementById('search-producto');
                    if (searchInput) searchInput.focus();
                }
            }
        });
        
        console.log('⌨️ Atajos de teclado inicializados (F2, F4, F12, Esc, Ctrl+N)');
    }
    
    // ========================================
    // ACTUALIZAR PANEL RESUMEN
    // ========================================
    function actualizarPanelResumen() {
        if (typeof Carrito === 'undefined') return;
        
        const articulos = Carrito.items ? Carrito.items.reduce((sum, i) => sum + i.cantidad, 0) : 0;
        const subtotal = typeof Carrito.getSubtotal === 'function' ? Carrito.getSubtotal() : 0;
        const descuentos = typeof Carrito.getDescuentoTotal === 'function' ? Carrito.getDescuentoTotal() : 0;
        const total = typeof Carrito.getTotal === 'function' ? Carrito.getTotal() : 0;
        
        // Panel resumen
        const elArticulos = document.getElementById('resumen-articulos');
        const elSubtotal = document.getElementById('resumen-subtotal');
        const elDescuentos = document.getElementById('resumen-descuentos');
        const elTotal = document.getElementById('total-display');
        const elCliente = document.getElementById('resumen-cliente');
        
        if (elArticulos) elArticulos.textContent = articulos;
        if (elSubtotal) elSubtotal.textContent = '$' + Math.round(subtotal).toLocaleString();
        if (elDescuentos) elDescuentos.textContent = '-$' + Math.round(descuentos).toLocaleString();
        if (elTotal) elTotal.textContent = '$' + Math.round(total).toLocaleString();
        
        // Cliente
        if (elCliente) {
            if (typeof Clientes !== 'undefined' && Clientes.seleccionado) {
                elCliente.textContent = Clientes.seleccionado.nombre || 'Público General';
            } else if (Carrito.cliente) {
                elCliente.textContent = Carrito.cliente.nombre || 'Público General';
            } else {
                elCliente.textContent = 'Público General';
            }
        }
        
        // Vendedor y Sucursal
        if (typeof Auth !== 'undefined') {
            const elSucursal = document.getElementById('resumen-sucursal');
            const elVendedor = document.getElementById('resumen-vendedor');
            
            if (elSucursal && Auth.getSucursal) elSucursal.textContent = Auth.getSucursal();
            if (elVendedor && Auth.getNombre) elVendedor.textContent = Auth.getNombre();
        }
    }
    
    // Interceptar actualizarTotales del Carrito
    setTimeout(function() {
        if (typeof Carrito !== 'undefined' && Carrito.actualizarTotales) {
            const originalActualizarTotales = Carrito.actualizarTotales.bind(Carrito);
            Carrito.actualizarTotales = function() {
                originalActualizarTotales();
                actualizarPanelResumen();
            };
        }
        
        // Actualizar header con datos del usuario
        if (typeof Auth !== 'undefined') {
            const elUserName = document.getElementById('user-name');
            const elUserSucursal = document.getElementById('user-sucursal');
            const elUserAvatar = document.getElementById('user-avatar');
            
            if (elUserName && Auth.getNombre) elUserName.textContent = Auth.getNombre();
            if (elUserSucursal && Auth.getSucursal) elUserSucursal.textContent = Auth.getSucursal();
            if (elUserAvatar && Auth.getInitials) elUserAvatar.textContent = Auth.getInitials();
        }
        
        // Actualizar tasas
        if (typeof Turno !== 'undefined' && Turno.getTasa) {
            const elUSD = document.getElementById('header-tasa-usd');
            const elCAD = document.getElementById('header-tasa-cad');
            const elEUR = document.getElementById('header-tasa-eur');
            
            if (elUSD) elUSD.textContent = Turno.getTasa('USD').toFixed(2);
            if (elCAD) elCAD.textContent = Turno.getTasa('CAD').toFixed(2);
            if (elEUR) elEUR.textContent = Turno.getTasa('EUR').toFixed(2);
        }
        
        // Turno ID
        if (typeof Turno !== 'undefined' && Turno.getId) {
            const elTurnoId = document.getElementById('header-turno-id');
            if (elTurnoId) elTurnoId.textContent = Turno.getId() || '-';
        }
        
        // Primera actualización
        actualizarPanelResumen();
        
    }, 1000);
});
