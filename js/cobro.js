// ============================================
// UMO POS - PROCESO DE COBRO
// ============================================

const Cobro = {
    pagos: [],
    metodoSeleccionado: 'Efectivo',
    monedaSeleccionada: 'MXN',
    metodosPago: [],
    descuentos: [],
    descuentoAutoAplicado: null,
    
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
        this.metodoSeleccionado = this.metodosPago[0] || 'Efectivo';
        this.monedaSeleccionada = 'MXN';
        this.descuentoAutoAplicado = null;
        
        this.renderModal();
        document.getElementById('modal-cobro').classList.add('active');
        
        // Calcular descuento automático al abrir
        this.calcularDescuentoAutomatico();
    },
    
    cerrarModal() {
        document.getElementById('modal-cobro').classList.remove('active');
    },
    
    // ============================================
    // DESCUENTO AUTOMÁTICO
    // ============================================
    async calcularDescuentoAutomatico() {
        const cliente = Clientes.seleccionado;
        const grupoCliente = cliente ? cliente.grupo : '';
        const metodoPago = this.metodoSeleccionado;
        
        console.log('Calculando descuento:', { grupoCliente, metodoPago });
        
        try {
            const result = await API.calcularDescuento(grupoCliente, metodoPago);
            
            console.log('Resultado descuento:', result);
            
            if (result.success && result.porcentaje > 0) {
                this.descuentoAutoAplicado = {
                    porcentaje: result.porcentaje,
                    descripcion: result.descripcion,
                    id: result.id
                };
                
                // Aplicar al carrito
                Carrito.aplicarDescuentoAutomatico(result.porcentaje, result.descripcion, result.id);
                Carrito.tipoDescuento = result.descripcion;
                
                // Actualizar UI
                this.actualizarInfoDescuento(result.porcentaje, result.descripcion);
                
                // Seleccionar en el dropdown si existe
                const select = document.getElementById('discount-select');
                if (select && result.id) {
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === result.id) {
                            select.selectedIndex = i;
                            break;
                        }
                    }
                }
            } else {
                this.descuentoAutoAplicado = null;
                this.actualizarInfoDescuento(0, 'Sin descuento automático');
            }
            
            this.actualizarTotalesModal();
            
        } catch (error) {
            console.error('Error calculando descuento:', error);
        }
    },
    
    renderModal() {
        const body = document.getElementById('modal-cobro-body');
        
        const subtotal = Carrito.getSubtotal();
        const descuento = Carrito.getDescuentoTotal();
        const total = Carrito.getTotal();
        const cliente = Clientes.seleccionado;
        
        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 400px; gap: 20px;">
                <!-- Columna izquierda -->
                <div>
                    <!-- Info Cliente -->
                    <div class="payment-section" style="background: ${cliente ? '#e8f5e9' : '#fff3e0'}; border: 1px solid ${cliente ? '#a5d6a7' : '#ffcc80'};">
                        <h3>👤 Cliente</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${cliente ? cliente.nombre : 'Cliente General'}</strong>
                                ${cliente && cliente.grupo ? `<br><span style="color: #666; font-size: 12px;">Grupo: ${cliente.grupo}</span>` : ''}
                            </div>
                            <button class="btn btn-outline" onclick="Cobro.cambiarCliente()" style="padding: 6px 12px; font-size: 12px;">
                                Cambiar
                            </button>
                        </div>
                    </div>
                
                    <!-- Descuentos -->
                    <div class="payment-section">
                        <h3>💰 Sistema de Descuentos</h3>
                        
                        <div id="active-discount-info" class="active-discount-info">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span id="active-discount-text">Calculando descuento...</span>
                                <span id="active-discount-value" style="font-weight: bold; color: #2e7d32;">0%</span>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px; align-items: end;">
                            <div>
                                <label style="font-size: 13px; color: #666; display: block; margin-bottom: 8px; font-weight: 600;">
                                    Tipo de Descuento
                                </label>
                                <select id="discount-select" class="discount-select" onchange="Cobro.cambiarDescuento()">
                                    <option value="">Sin descuento</option>
                                    <option value="manual">✏️ Manual (ingresar %)</option>
                                    ${this.descuentos.map(d => `
                                        <option value="${d.id}" data-porcentaje="${d.porcentaje}">${d.etiqueta || d.nombre} (${d.porcentaje}%)</option>
                                    `).join('')}
                                </select>
                                <input type="number" id="manual-discount-input" 
                                       placeholder="Ingrese % de descuento" 
                                       min="0" max="100" 
                                       class="manual-discount-input"
                                       style="display: none;" 
                                       onchange="Cobro.aplicarDescuentoManual()">
                            </div>
                            
                            <div>
                                <label style="font-size: 11px; color: #ff9800; display: block; margin-bottom: 4px; font-weight: 600; text-align: center;">
                                    💸 Extra (MXN)
                                </label>
                                <div style="display: flex; align-items: center; background: #fff8e1; border: 1px solid #ffb74d; border-radius: 6px; padding: 8px;">
                                    <span style="font-size: 12px; color: #f57c00; margin-right: 4px;">$</span>
                                    <input type="number" 
                                           id="extra-discount-input" 
                                           placeholder="0.00" 
                                           step="0.01"
                                           value="${Carrito.descuentoExtra || ''}"
                                           oninput="Cobro.aplicarDescuentoExtra()"
                                           style="border: none; background: transparent; flex: 1; font-size: 13px; text-align: center; outline: none; width: 70px;">
                                </div>
                            </div>
                        </div>
                        
                        <div class="discount-note" style="margin-top: 10px;">
                            ℹ️ El descuento se calcula automáticamente según el grupo del cliente y método de pago.
                        </div>
                    </div>
                    
                    <!-- Métodos de pago -->
                    <div class="payment-section">
                        <h3>💳 Métodos de Pago</h3>
                        
                        <div class="payment-method-buttons" id="payment-methods">
                            ${this.metodosPago.map((m, i) => `
                                <button class="method-btn ${i === 0 ? 'active' : ''}" 
                                        data-method="${m}" 
                                        onclick="Cobro.seleccionarMetodo(this)">
                                    ${this.getIconoMetodo(m)} ${m}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="currency-buttons" style="margin-top: 15px;">
                            <button class="currency-btn active" data-currency="MXN" onclick="Cobro.seleccionarMoneda(this)">MXN</button>
                            <button class="currency-btn" data-currency="USD" onclick="Cobro.seleccionarMoneda(this)">USD</button>
                            <button class="currency-btn" data-currency="CAD" onclick="Cobro.seleccionarMoneda(this)">CAD</button>
                            <button class="currency-btn" data-currency="EUR" onclick="Cobro.seleccionarMoneda(this)">EUR</button>
                        </div>
                        
                        <div style="margin-top: 15px;">
                            <input type="number" id="payment-amount" class="payment-amount-input" 
                                   placeholder="Monto recibido" step="0.01" oninput="Cobro.actualizarInfoMonto()">
                            <div class="amount-info" id="amount-info" style="display: none;">
                                <span>Se aplicará:</span>
                                <span id="applied-amount">$0.00</span>
                            </div>
                            <button class="btn-add-payment" onclick="Cobro.agregarPago()">
                                ➕ Agregar Pago
                            </button>
                        </div>
                    </div>
                    
                    <!-- Pagos registrados -->
                    <div class="payments-registered-section">
                        <div class="payments-registered-title">
                            📋 Pagos Registrados
                            <span class="payment-count-badge" id="payment-count">0</span>
                        </div>
                        <div id="payments-list">
                            <div class="no-payments-message">
                                No hay pagos registrados aún<br>
                                <small>Agregue un método de pago para continuar</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Columna derecha -->
                <div>
                    <!-- Totales -->
                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span id="modal-subtotal">$${Math.round(subtotal).toLocaleString()}</span>
                        </div>
                        <div class="total-row">
                            <span>Descuento:</span>
                            <span id="modal-discount" style="color: #27ae60;">-$${Math.round(descuento).toLocaleString()}</span>
                        </div>
                        <div class="total-row" id="modal-extra-row" style="display: ${Carrito.descuentoExtra !== 0 ? 'flex' : 'none'};">
                            <span>Desc. Extra:</span>
                            <span id="modal-extra" style="color: #ff9800;">-$${Math.round(Carrito.descuentoExtra).toLocaleString()}</span>
                        </div>
                        <div class="total-row final">
                            <span>TOTAL A PAGAR:</span>
                            <span id="modal-total">$${Math.round(total).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- Estado del pago -->
                    <div class="totals-section" style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); margin-top: 15px;">
                        <div class="total-row">
                            <span>Total Recibido:</span>
                            <span id="total-received">$0.00</span>
                        </div>
                        <div class="total-row">
                            <span>Pendiente:</span>
                            <span id="pending-amount" style="color: #ff6b6b;">$${Math.round(total).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <!-- Cambio -->
                    <div class="change-section-giant" id="change-section" style="display: none;">
                        <div class="change-giant-content">
                            <div class="change-giant-title">💰 CAMBIO A ENTREGAR</div>
                            <div class="change-giant-amount" id="change-amount">$0.00 MXN</div>
                            <div class="change-giant-subtitle">
                                El cambio siempre se entrega en pesos mexicanos
                            </div>
                        </div>
                    </div>
                    
                    <!-- Observaciones -->
                    <div class="payment-section" style="margin-top: 15px;">
                        <h3>📝 Observaciones</h3>
                        <textarea class="form-textarea" id="sale-observations" placeholder="Notas de la venta (opcional)"></textarea>
                    </div>
                    
                    <!-- Botones -->
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-cancel" onclick="Cobro.cerrarModal()" style="flex: 1;">
                            ✕ CANCELAR
                        </button>
                        <button class="btn btn-confirm" id="btn-confirmar" onclick="Cobro.procesarVenta()" disabled style="flex: 2;">
                            ✓ CONFIRMAR VENTA
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    getIconoMetodo(metodo) {
        const iconos = {
            'Efectivo': '💵',
            'Tarjeta': '💳',
            'Transferencia': '📱',
            'Cheque': '📄',
            'Crédito': '📋'
        };
        return iconos[metodo] || '💰';
    },
    
    cambiarCliente() {
        this.cerrarModal();
        abrirModalClientes();
    },
    
    seleccionarMetodo(btn) {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.metodoSeleccionado = btn.dataset.method;
        
        // Recalcular descuento automático con nuevo método
        this.calcularDescuentoAutomatico();
        
        // Auto-llenar monto si no es efectivo
        if (this.metodoSeleccionado !== 'Efectivo') {
            this.autoLlenarMonto();
        }
    },
    
    seleccionarMoneda(btn) {
        document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.monedaSeleccionada = btn.dataset.currency;
        this.actualizarInfoMonto();
        
        if (this.metodoSeleccionado !== 'Efectivo') {
            this.autoLlenarMonto();
        }
    },
    
    autoLlenarMonto() {
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        const pendiente = Math.max(0, total - totalRecibido);
        
        if (pendiente > 0) {
            const tasa = Turno.getTasa(this.monedaSeleccionada);
            const montoEnMoneda = pendiente / tasa;
            document.getElementById('payment-amount').value = montoEnMoneda.toFixed(2);
            this.actualizarInfoMonto();
        }
    },
    
    actualizarInfoMonto() {
        const monto = parseFloat(document.getElementById('payment-amount').value) || 0;
        const tasa = Turno.getTasa(this.monedaSeleccionada);
        const montoMXN = monto * tasa;
        
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        const pendiente = Math.max(0, total - totalRecibido);
        
        const infoDiv = document.getElementById('amount-info');
        if (monto > 0 && montoMXN > pendiente && pendiente > 0) {
            infoDiv.style.display = 'flex';
            document.getElementById('applied-amount').textContent = `$${montoMXN.toFixed(2)} MXN`;
        } else {
            infoDiv.style.display = 'none';
        }
    },
    
    agregarPago() {
        const monto = parseFloat(document.getElementById('payment-amount').value);
        
        if (!monto || monto <= 0) {
            mostrarToast('Ingresa un monto válido', 'error');
            return;
        }
        
        const tasa = Turno.getTasa(this.monedaSeleccionada);
        const montoMXN = monto * tasa;
        
        this.pagos.push({
            metodo: this.metodoSeleccionado,
            moneda: this.monedaSeleccionada,
            monto: monto,
            tasa: tasa,
            montoMXN: montoMXN
        });
        
        this.renderPagos();
        this.actualizarTotalesPago();
        document.getElementById('payment-amount').value = '';
        
        if (this.metodoSeleccionado !== 'Efectivo') {
            this.autoLlenarMonto();
        }
    },
    
    eliminarPago(index) {
        this.pagos.splice(index, 1);
        this.renderPagos();
        this.actualizarTotalesPago();
    },
    
    renderPagos() {
        const container = document.getElementById('payments-list');
        const badge = document.getElementById('payment-count');
        
        badge.textContent = this.pagos.length;
        
        if (this.pagos.length === 0) {
            container.innerHTML = `
                <div class="no-payments-message">
                    No hay pagos registrados aún<br>
                    <small>Agregue un método de pago para continuar</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.pagos.map((p, i) => `
            <div class="payment-item">
                <div class="payment-details">
                    <div class="payment-main">${p.metodo} - ${p.moneda}</div>
                    ${p.moneda !== 'MXN' ? `<div class="payment-rate">Tasa: ${p.tasa.toFixed(2)}</div>` : ''}
                </div>
                <div class="payment-amount-display">
                    <div>${p.moneda} ${p.monto.toFixed(2)}</div>
                    ${p.moneda !== 'MXN' ? `<div class="payment-amount-mxn">($${p.montoMXN.toFixed(2)} MXN)</div>` : ''}
                </div>
                <div class="btn-remove-payment" onclick="Cobro.eliminarPago(${i})">×</div>
            </div>
        `).join('');
    },
    
    actualizarTotalesPago() {
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        const pendiente = Math.max(0, total - totalRecibido);
        const cambio = Math.max(0, totalRecibido - total);
        
        document.getElementById('total-received').textContent = `$${totalRecibido.toFixed(2)} MXN`;
        document.getElementById('pending-amount').textContent = `$${pendiente.toFixed(2)} MXN`;
        
        const changeSection = document.getElementById('change-section');
        if (cambio > 0) {
            changeSection.style.display = 'block';
            document.getElementById('change-amount').textContent = `$${cambio.toFixed(2)} MXN`;
        } else {
            changeSection.style.display = 'none';
        }
        
        // Habilitar/deshabilitar botón confirmar
        const btnConfirmar = document.getElementById('btn-confirmar');
        btnConfirmar.disabled = total > 0.01 && pendiente > 0.01;
    },
    
    cambiarDescuento() {
        const select = document.getElementById('discount-select');
        const manualInput = document.getElementById('manual-discount-input');
        const valor = select.value;
        
        if (valor === '') {
            manualInput.style.display = 'none';
            Carrito.limpiarDescuentos();
            this.actualizarInfoDescuento(0, 'Sin descuento');
        } else if (valor === 'manual') {
            manualInput.style.display = 'block';
            manualInput.focus();
        } else {
            manualInput.style.display = 'none';
            const option = select.options[select.selectedIndex];
            const porcentaje = parseFloat(option.dataset.porcentaje) || 0;
            const nombre = option.textContent;
            Carrito.aplicarDescuentoAutomatico(porcentaje, nombre, valor);
            Carrito.tipoDescuento = nombre;
            this.actualizarInfoDescuento(porcentaje, nombre);
        }
        
        this.actualizarTotalesModal();
    },
    
    aplicarDescuentoManual() {
        const input = document.getElementById('manual-discount-input');
        const porcentaje = parseFloat(input.value) || 0;
        
        if (porcentaje < 0 || porcentaje > 100) {
            mostrarToast('El descuento debe estar entre 0% y 100%', 'error');
            return;
        }
        
        Carrito.aplicarDescuentoAutomatico(porcentaje, `Manual ${porcentaje}%`, null);
        Carrito.tipoDescuento = `Manual ${porcentaje}%`;
        this.actualizarInfoDescuento(porcentaje, `Descuento manual: ${porcentaje}%`);
        this.actualizarTotalesModal();
    },
    
    aplicarDescuentoExtra() {
        const input = document.getElementById('extra-discount-input');
        const valor = parseFloat(input.value) || 0;
        Carrito.descuentoExtra = valor;
        
        this.actualizarTotalesModal();
    },
    
    actualizarInfoDescuento(porcentaje, descripcion) {
        const textEl = document.getElementById('active-discount-text');
        const valueEl = document.getElementById('active-discount-value');
        
        if (textEl && valueEl) {
            textEl.textContent = porcentaje > 0 ? `✅ ${descripcion}` : 'Sin descuento automático';
            valueEl.textContent = `${porcentaje}%`;
            valueEl.style.color = porcentaje > 0 ? '#2e7d32' : '#999';
        }
    },
    
    actualizarTotalesModal() {
        const subtotal = Carrito.getSubtotal();
        const descuento = Carrito.getDescuentoTotal();
        const total = Carrito.getTotal();
        
        document.getElementById('modal-subtotal').textContent = `$${Math.round(subtotal).toLocaleString()}`;
        document.getElementById('modal-discount').textContent = `-$${Math.round(descuento).toLocaleString()}`;
        document.getElementById('modal-total').textContent = `$${Math.round(total).toLocaleString()}`;
        
        const extraRow = document.getElementById('modal-extra-row');
        if (Carrito.descuentoExtra !== 0) {
            extraRow.style.display = 'flex';
            document.getElementById('modal-extra').textContent = Carrito.descuentoExtra > 0 
                ? `-$${Math.round(Carrito.descuentoExtra).toLocaleString()}`
                : `+$${Math.round(Math.abs(Carrito.descuentoExtra)).toLocaleString()}`;
        } else {
            extraRow.style.display = 'none';
        }
        
        this.actualizarTotalesPago();
    },
    
    async procesarVenta() {
        const total = Carrito.getTotal();
        const totalRecibido = this.pagos.reduce((sum, p) => sum + p.montoMXN, 0);
        
        // Validar
        if (total > 0 && this.pagos.length === 0) {
            mostrarToast('Agrega al menos un pago', 'error');
            return;
        }
        
        if (total > 0 && totalRecibido < total - 0.01) {
            mostrarToast('El pago es insuficiente', 'error');
            return;
        }
        
        const btnConfirmar = document.getElementById('btn-confirmar');
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<div class="spinner" style="display: inline-block;"></div> Procesando...';
        
        try {
            const idVenta = 'V' + Date.now();
            const observaciones = document.getElementById('sale-observations').value.trim();
            const cliente = Clientes.seleccionado;
            
            // Datos de la venta
            const ventaData = {
                IdVenta: idVenta,
                Sucursal: Auth.getSucursal(),
                Vendedor: Auth.getNombre(),
                Cliente: cliente ? cliente.codigo : 'GENERAL',
                TipoDescuento: Carrito.tipoDescuento,
                Observaciones: observaciones,
                DescuentoExtra: Carrito.descuentoExtra,
                GrupoCliente: cliente ? cliente.grupo : '',
                TurnoId: Turno.getId()
            };
            
            // Detalles
            const detalles = Carrito.items.map((item, index) => {
                const subtotal = item.precio * item.cantidad;
                const descuentoMonto = subtotal * (item.descuento / 100);
                return {
                    ID: `DET${Date.now()}-${index}`,
                    Ventas: idVenta,
                    Producto: item.codigo,
                    Cantidad: item.cantidad,
                    Precio: item.precio,
                    SubTotal: subtotal,
                    Descuento: descuentoMonto,
                    Total: subtotal - descuentoMonto
                };
            });
            
            // Pagos
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
                    Metodo: p.metodo,
                    TasaCambio: p.tasa,
                    SucursaldeRegistro: Auth.getSucursal(),
                    'Grupo Cliente': cliente ? cliente.grupo : '',
                    'Descuento Aplicado General': Carrito.descuentoExtra,
                    Cliente: cliente ? cliente.codigo : 'GENERAL',
                    Vendedor: Auth.getNombre(),
                    Estado: 'Cerrado'
                };
            });
            
            const result = await API.registrarVenta(ventaData, detalles, pagosData);
            
            if (result.success) {
                const cambio = Math.max(0, totalRecibido - total);
                
                this.cerrarModal();
                this.mostrarExito(idVenta, cambio);
                
                // Limpiar
                Carrito.items = [];
                Carrito.descuentoExtra = 0;
                Carrito.tipoDescuento = 'Ninguno';
                this.pagos = [];
                
                Clientes.limpiarSeleccion();
                Carrito.render();
                Carrito.actualizarTotales();
                
            } else {
                mostrarToast('Error: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('Error procesando venta:', error);
            mostrarToast('Error de conexión', 'error');
        } finally {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = '✓ CONFIRMAR VENTA';
        }
    },
    
    mostrarExito(ventaId, cambio) {
        document.getElementById('exito-ticket').textContent = ventaId;
        document.getElementById('exito-total').textContent = `$${Math.round(Carrito.getTotal()).toLocaleString()}`;
        document.getElementById('exito-cambio').textContent = cambio > 0 ? `$${cambio.toFixed(2)}` : 'Sin cambio';
        
        document.getElementById('modal-exito').classList.add('active');
    }
};

// Funciones globales
function abrirModalCobro() {
    Cobro.abrirModal();
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('active');
}

function cerrarModalExito() {
    document.getElementById('modal-exito').classList.remove('active');
    document.getElementById('search-producto').focus();
}

function imprimirTicket() {
    window.print();
}
