// ============================================
// UMO POS - PROCESO DE COBRO
// ============================================

const Cobro = {
    pagos: [],
    metodoSeleccionado: 'efectivo',
    monedaSeleccionada: 'MXN',
    metodosPago: [],
    descuentos: [],
    descuentoAplicado: null,
    
    async init() {
        await this.cargarMetodosPago();
        await this.cargarDescuentos();
    },
    
    async cargarMetodosPago() {
        try {
            const result = await API.obtenerMetodosPago();
            if (result.success) {
                this.metodosPago = result.metodos;
            }
        } catch (error) {
            console.error('Error cargando métodos de pago:', error);
            this.metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia'];
        }
    },
    
    async cargarDescuentos() {
        try {
            const result = await API.obtenerDescuentos();
            if (result.success) {
                this.descuentos = result.descuentos;
            }
        } catch (error) {
            console.error('Error cargando descuentos:', error);
        }
    },
    
    abrirModal() {
        if (Carrito.items.length === 0) {
            mostrarToast('El carrito está vacío', 'error');
            return;
        }
        
        this.pagos = [];
        this.metodoSeleccionado = 'efectivo';
        this.monedaSeleccionada = 'MXN';
        
        this.actualizarClienteUI();
        this.actualizarTotalesUI();
        this.actualizarPagosUI();
        this.resetearSelecciones();
        this.calcularDescuentoAutomatico();
        
        document.getElementById('modal-cobro').classList.add('active');
    },
    
    cerrarModal() {
        document.getElementById('modal-cobro').classList.remove('active');
    },
    
    actualizarClienteUI() {
        const cliente = Clientes.seleccionado;
        const nombreEl = document.getElementById('cobro-cliente-nombre');
        const grupoEl = document.getElementById('cobro-cliente-grupo');
        
        if (nombreEl) nombreEl.textContent = cliente ? cliente.nombre : 'Cliente General';
        if (grupoEl) grupoEl.textContent = cliente && cliente.grupo ? cliente.grupo : 'Sin grupo';
    },
    
    actualizarTotalesUI() {
        const subtotal = Carrito.getSubtotal();
        const descuento = Carrito.getDescuentoTotal();
        const total = Carrito.getTotal();
        
        const subtotalEl = document.getElementById('cobro-subtotal');
        const descuentoEl = document.getElementById('cobro-descuento');
        const totalEl = document.getElementById('cobro-total');
        const pendienteEl = document.getElementById('cobro-pendiente');
        
        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (descuentoEl) descuentoEl.textContent = `-$${descuento.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
        if (pendienteEl) pendienteEl.textContent = `$${total.toFixed(2)} MXN`;
    },
    
    actualizarPagosUI() {
        const lista = document.getElementById('cobro-pagos-lista');
        const count = document.getElementById('cobro-pagos-count');
        const recibidoEl = document.getElementById('cobro-recibido');
        const pendienteEl = document.getElementById('cobro-pendiente');
        const cambioSection = document.getElementById('cobro-cambio-section');
        const cambioEl = document.getElementById('cobro-cambio');
        const btnConfirmar = document.getElementById('btn-confirmar-venta');
        
        if (count) count.textContent = this.pagos.length;
        
        if (!lista) return;
        
        if (this.pagos.length === 0) {
            lista.innerHTML = `
                <div style="text-align: center; color: var(--gray-400); padding: 20px; font-size: 12px; border: 1px dashed var(--gray-200); border-radius: var(--radius);">
                    No hay pagos registrados aún<br>
                    <small>Agregue un método de pago para continuar</small>
                </div>
            `;
            if (recibidoEl) recibidoEl.textContent = '$0.00 MXN';
            if (btnConfirmar) btnConfirmar.disabled = true;
            if (cambioSection) cambioSection.style.display = 'none';
            return;
        }
        
        // Renderizar pagos
        lista.innerHTML = this.pagos.map((p, i) => `
            <div class="cobro-pago-item">
                <div>
                    <div class="metodo">${p.metodoNombre}</div>
                    <div style="font-size: 10px; color: var(--gray-500);">${p.moneda}${p.moneda !== 'MXN' ? ' (Tasa: ' + p.tasa.toFixed(2) + ')' : ''}</div>
                </div>
                <div class="monto">$${p.monto.toFixed(2)}</div>
                <span class="eliminar" onclick="Cobro.eliminarPago(${i})"><i class="fas fa-times"></i></span>
            </div>
        `).join('');
        
        // Calcular totales
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        const pendiente = Math.max(0, total - totalRecibido);
        const cambio = Math.max(0, totalRecibido - total);
        
        if (recibidoEl) recibidoEl.textContent = `$${totalRecibido.toFixed(2)} MXN`;
        if (pendienteEl) pendienteEl.textContent = `$${pendiente.toFixed(2)} MXN`;
        
        // Mostrar cambio si aplica
        if (cambioSection && cambioEl) {
            if (cambio > 0) {
                cambioSection.style.display = 'block';
                cambioEl.textContent = `$${cambio.toFixed(2)} MXN`;
            } else {
                cambioSection.style.display = 'none';
            }
        }
        
        // Habilitar/deshabilitar botón
        if (btnConfirmar) {
            btnConfirmar.disabled = pendiente > 0.01;
        }
    },
    
    resetearSelecciones() {
        // Resetear método de pago
        document.querySelectorAll('.cobro-metodo-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.metodo === 'efectivo');
        });
        
        // Resetear moneda
        document.querySelectorAll('.cobro-moneda-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.moneda === 'MXN');
        });
        
        // Limpiar monto
        const montoInput = document.getElementById('cobro-monto');
        if (montoInput) montoInput.value = '';
        
        // Limpiar observaciones
        const notasInput = document.getElementById('cobro-notas');
        if (notasInput) notasInput.value = '';
    },
    
    async calcularDescuentoAutomatico() {
        const cliente = Clientes.seleccionado;
        const grupoCliente = cliente ? cliente.grupo : '';
        
        try {
            const result = await API.calcularDescuento(grupoCliente, this.metodoSeleccionado);
            
            const activoEl = document.getElementById('cobro-descuento-activo');
            const nombreEl = document.getElementById('cobro-descuento-nombre');
            const porcentajeEl = document.getElementById('cobro-descuento-porcentaje');
            
            if (result.success && result.porcentaje > 0) {
                if (activoEl) activoEl.style.display = 'flex';
                if (nombreEl) nombreEl.textContent = result.descripcion;
                if (porcentajeEl) porcentajeEl.textContent = `${result.porcentaje}%`;
                
                // Aplicar al carrito Y guardar tipo de descuento
                Carrito.aplicarDescuentoAutomatico(result.porcentaje, result.descripcion, result.id);
                Carrito.tipoDescuento = result.descripcion;
                
                // Guardar en Cobro también para referencia
                this.descuentoAplicado = {
                    porcentaje: result.porcentaje,
                    descripcion: result.descripcion,
                    id: result.id
                };
            } else {
                if (activoEl) activoEl.style.display = 'none';
                Carrito.tipoDescuento = 'Ninguno';
                this.descuentoAplicado = null;
            }
            
            this.actualizarTotalesUI();
            
        } catch (error) {
            console.error('Error calculando descuento:', error);
        }
    },
    
    seleccionarMetodo(metodo) {
        this.metodoSeleccionado = metodo;
        document.querySelectorAll('.cobro-metodo-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.metodo === metodo);
        });
        
        // Recalcular descuento con nuevo método
        this.calcularDescuentoAutomatico();
    },
    
    seleccionarMoneda(moneda) {
        this.monedaSeleccionada = moneda;
        document.querySelectorAll('.cobro-moneda-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.moneda === moneda);
        });
    },
    
    agregarPago() {
        const montoInput = document.getElementById('cobro-monto');
        const monto = parseFloat(montoInput?.value) || 0;
        
        if (monto <= 0) {
            mostrarToast('Ingrese un monto válido', 'error');
            return;
        }
        
        const metodosNombres = {
            'efectivo': 'Efectivo',
            'transferencia': 'Transferencia',
            'bbva_nacional': 'BBVA Nacional',
            'bbva_internacional': 'BBVA Internacional',
            'clip_nacional': 'Clip Nacional',
            'clip_internacional': 'Clip Internacional'
        };
        
        const tasa = Turno.getTasa(this.monedaSeleccionada);
        const montoMXN = monto * tasa;
        
        this.pagos.push({
            metodo: this.metodoSeleccionado,
            metodoNombre: metodosNombres[this.metodoSeleccionado] || this.metodoSeleccionado,
            moneda: this.monedaSeleccionada,
            monto: monto,
            tasa: tasa,
            montoMXN: montoMXN
        });
        
        this.actualizarPagosUI();
        if (montoInput) montoInput.value = '';
        
        mostrarToast('Pago agregado', 'success');
    },
    
    eliminarPago(index) {
        this.pagos.splice(index, 1);
        this.actualizarPagosUI();
    },
    
    aplicarDescuentoExtra() {
        const input = document.getElementById('cobro-descuento-extra');
        const valor = parseFloat(input?.value) || 0;
        Carrito.descuentoExtra = valor;
        this.actualizarTotalesUI();
        this.actualizarPagosUI();
    },
    
    async procesarVenta() {
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        
        if (total > 0 && this.pagos.length === 0) {
            mostrarToast('Agrega al menos un pago', 'error');
            return;
        }
        
        if (total > 0 && totalRecibido < total - 0.01) {
            mostrarToast('El pago es insuficiente', 'error');
            return;
        }
        
        const btnConfirmar = document.getElementById('btn-confirmar-venta');
        if (btnConfirmar) {
            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        
        try {
            const idVenta = 'V' + Date.now();
            const observaciones = document.getElementById('cobro-notas')?.value?.trim() || '';
            const cliente = Clientes.seleccionado;
            
            const ventaData = {
                IdVenta: idVenta,
                Sucursal: Auth.getSucursal(),
                Vendedor: Auth.getNombre(),
                Cliente: cliente ? cliente.codigo : 'GENERAL',
                TipoDescuento: this.descuentoAplicado ? this.descuentoAplicado.id : '',
                PorcentajeDescuento: this.descuentoAplicado ? this.descuentoAplicado.porcentaje : 0,
                Observaciones: observaciones,
                DescuentoExtra: Carrito.descuentoExtra || 0,
                GrupoCliente: cliente ? cliente.grupo : '',
                TurnoId: Turno.getId()
            };
            
            const detalles = Carrito.items.map((item, index) => {
                const subtotal = item.precio * item.cantidad;
                const descuentoMonto = subtotal * ((item.descuento || 0) / 100);
                return {
                    ID: `DET${Date.now()}-${index}`,
                    Ventas: idVenta,
                    Producto: item.codigo || item.sku,
                    Cantidad: item.cantidad,
                    Precio: item.precio,
                    SubTotal: subtotal,
                    Descuento: descuentoMonto,
                    Total: subtotal - descuentoMonto
                };
            });
            
            let montoRestante = total;
            const pagosData = this.pagos.map((p, index) => {
                const montoAplicado = Math.min(p.montoMXN, montoRestante);
                const montoOriginal = montoAplicado / p.tasa;
                montoRestante -= montoAplicado;
                
                return {
                    Id: `PAG${Date.now()}-${index}`,
                    Ventas: idVenta,
                    Monto: montoOriginal,
                    Moneda: p.moneda,
                    Metodo: p.metodoNombre,
                    'Tasa de Cambio': p.tasa,
                    SucursaldeRegistro: Auth.getSucursal(),
                    'Grupo Cliente': cliente ? cliente.grupo : '',
                    'Descuento Aplicado General': this.descuentoAplicado ? this.descuentoAplicado.id : '',
                    'Porcentaje Descuento': this.descuentoAplicado ? this.descuentoAplicado.porcentaje : 0,
                    Cliente: cliente ? cliente.codigo : 'GENERAL',
                    Vendedor: Auth.getNombre(),
                    Estado: 'Cerrado'
                };
            });
            
            const result = await API.registrarVenta(ventaData, detalles, pagosData);
            
            if (result.success) {
                const cambio = Math.max(0, totalRecibido - total);
                
                this.cerrarModal();
                this.mostrarExito(idVenta, total, cambio);
                
                // Limpiar todo
                Carrito.items = [];
                Carrito.descuentoExtra = 0;
                Carrito.tipoDescuento = 'Ninguno';
                this.pagos = [];
                this.descuentoAplicado = null;
                
                Clientes.limpiarSeleccion();
                Carrito.render();
                Carrito.actualizarTotales();
                
            } else {
                mostrarToast('Error: ' + (result.error || 'No se pudo registrar'), 'error');
            }
            
        } catch (error) {
            console.error('Error procesando venta:', error);
            mostrarToast('Error de conexión', 'error');
        } finally {
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = '<i class="fas fa-check"></i> CONFIRMAR VENTA';
            }
        }
    },
    
    mostrarExito(ventaId, total, cambio) {
        const ticketEl = document.getElementById('exito-ticket');
        const totalEl = document.getElementById('exito-total');
        const cambioEl = document.getElementById('exito-cambio');
        
        if (ticketEl) ticketEl.textContent = ventaId;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
        if (cambioEl) cambioEl.textContent = cambio > 0 ? `$${cambio.toFixed(2)}` : 'Sin cambio';
        
        document.getElementById('modal-exito').classList.add('active');
    }
};

// ============================================
// FUNCIONES GLOBALES PARA HTML
// ============================================

function abrirModalCobro() {
    Cobro.abrirModal();
}

function seleccionarMetodoPago(metodo) {
    Cobro.seleccionarMetodo(metodo);
}

function seleccionarMoneda(moneda) {
    Cobro.seleccionarMoneda(moneda);
}

function agregarPago() {
    Cobro.agregarPago();
}

function confirmarVenta() {
    Cobro.procesarVenta();
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function cerrarModalExito() {
    document.getElementById('modal-exito').classList.remove('active');
    const searchInput = document.getElementById('search-producto');
    if (searchInput) searchInput.focus();
}

function imprimirTicket() {
    window.print();
}

// Listener para descuento extra
document.addEventListener('DOMContentLoaded', function() {
    const extraInput = document.getElementById('cobro-descuento-extra');
    if (extraInput) {
        extraInput.addEventListener('input', function() {
            Cobro.aplicarDescuentoExtra();
        });
    }
});
