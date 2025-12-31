// ============================================
// VENTAS TURNO - Gestión de ventas del turno actual
// ============================================

const VentasTurno = {
    ventas: [],
    ventaSeleccionada: null,
    itemACancelar: null,

    // ============================================
    // ABRIR MODAL
    // ============================================
    async abrir() {
        document.getElementById('modal-ventas-turno').classList.add('active');
        await this.cargar();
    },

    // ============================================
    // CARGAR VENTAS DEL TURNO
    // ============================================
    async cargar() {
        const turnoId = Turno.actual?.id;
        if (!turnoId) {
            this.mostrarVacio();
            return;
        }

        const lista = document.getElementById('ventas-turno-lista');
        lista.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loader"></div><p>Cargando ventas...</p></div>';

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/ventas/turno/${turnoId}`);
            const data = await response.json();

            if (data.success && data.ventas) {
                this.ventas = data.ventas;
                this.renderLista();
                this.actualizarStats();
                this.actualizarBadge();
            } else {
                this.mostrarVacio();
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
            lista.innerHTML = '<div class="ventas-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar ventas</p></div>';
        }
    },

    // ============================================
    // RENDER LISTA DE VENTAS
    // ============================================
    renderLista() {
        const lista = document.getElementById('ventas-turno-lista');

        if (!this.ventas || this.ventas.length === 0) {
            this.mostrarVacio();
            return;
        }

        lista.innerHTML = this.ventas.map(v => {
            const esCancelada = (v.estado || '').toLowerCase() === 'cancelada';
            return `
                <div class="venta-card ${esCancelada ? 'cancelada' : ''}" onclick="VentasTurno.verDetalle('${v.idVenta}')">
                    <div class="venta-card-left">
                        <div class="venta-icon">
                            <i class="fas ${esCancelada ? 'fa-ban' : 'fa-receipt'}"></i>
                        </div>
                        <div class="venta-info">
                            <h4>${v.idVenta}</h4>
                            <p>${v.hora || 'Sin hora'}</p>
                            <span class="cliente-tag"><i class="fas fa-user"></i> ${v.cliente || 'Público General'}</span>
                        </div>
                    </div>
                    <div class="venta-card-right">
                        <div class="venta-total">$${this.formatMoney(v.total)}</div>
                        <span class="venta-estado ${esCancelada ? 'cancelada' : 'completada'}">
                            ${esCancelada ? 'Cancelada' : 'Completada'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================
    // MOSTRAR VACÍO
    // ============================================
    mostrarVacio() {
        document.getElementById('ventas-turno-lista').innerHTML = `
            <div class="ventas-empty">
                <i class="fas fa-receipt"></i>
                <p>No hay ventas en este turno</p>
            </div>
        `;
        this.actualizarStats();
    },

    // ============================================
    // ACTUALIZAR ESTADÍSTICAS
    // ============================================
    actualizarStats() {
        const completadas = this.ventas.filter(v => (v.estado || '').toLowerCase() !== 'cancelada');
        const canceladas = this.ventas.filter(v => (v.estado || '').toLowerCase() === 'cancelada');
        const total = completadas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);

        document.getElementById('ventas-stat-cantidad').textContent = completadas.length;
        document.getElementById('ventas-stat-total').textContent = '$' + this.formatMoney(total);
        document.getElementById('ventas-stat-canceladas').textContent = canceladas.length;
    },

    // ============================================
    // ACTUALIZAR BADGE EN HEADER
    // ============================================
    actualizarBadge() {
        const badge = document.getElementById('ventas-turno-count');
        const completadas = this.ventas.filter(v => (v.estado || '').toLowerCase() !== 'cancelada');
        badge.textContent = completadas.length;
    },

    // ============================================
    // VER DETALLE DE VENTA
    // ============================================
    async verDetalle(idVenta) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/ventas/${idVenta}/detalle`);
            const data = await response.json();

            if (data.success) {
                this.ventaSeleccionada = {
                    ...data.venta,
                    items: data.items,
                    pagos: data.pagos
                };
                this.renderDetalle();
                document.getElementById('modal-detalle-venta').classList.add('active');
            } else {
                mostrarToast('Error al cargar detalle', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarToast('Error de conexión', 'error');
        }
    },

    // ============================================
    // RENDER DETALLE
    // ============================================
    renderDetalle() {
        const v = this.ventaSeleccionada;
        const esCancelada = (v.estado || '').toLowerCase() === 'cancelada';

        // Header
        document.getElementById('detalle-venta-id').textContent = `Venta #${v.idVenta}`;
        document.getElementById('detalle-venta-fecha').textContent = `${v.fecha || ''} - ${v.hora || ''}`;
        document.getElementById('detalle-venta-cliente').textContent = v.cliente || 'Público General';
        document.getElementById('detalle-venta-vendedor').textContent = v.vendedor || '-';
        document.getElementById('detalle-venta-sucursal').textContent = v.sucursal || '-';

        const estadoEl = document.getElementById('detalle-venta-estado');
        estadoEl.textContent = esCancelada ? 'Cancelada' : 'Completada';
        estadoEl.className = `venta-estado ${esCancelada ? 'cancelada' : 'completada'}`;

        // Items
        const itemsLista = document.getElementById('detalle-items-lista');
        if (v.items && v.items.length > 0) {
            itemsLista.innerHTML = v.items.map(item => {
                const itemCancelado = (item.estado || '').toLowerCase() === 'cancelado';
                return `
                    <div class="detalle-item ${itemCancelado ? 'cancelado' : ''}">
                        <div class="detalle-item-info">
                            <div class="nombre">${item.producto}</div>
                            <div class="cantidad">${item.cantidad} x $${this.formatMoney(item.precio)}</div>
                        </div>
                        <div class="detalle-item-precio">
                            <div class="precio">$${this.formatMoney(item.total)}</div>
                            ${item.descuento > 0 ? `<div class="descuento">-$${this.formatMoney(item.descuento)}</div>` : ''}
                        </div>
                        ${!esCancelada && !itemCancelado ? `
                            <div class="detalle-item-actions">
                                <button class="btn-cancelar-item" onclick="VentasTurno.confirmarCancelarItem('${item.id}', '${item.producto}')">
                                    <i class="fas fa-times"></i> Cancelar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else {
            itemsLista.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Sin productos</p>';
        }

        // Pagos
        const pagosLista = document.getElementById('detalle-pagos-lista');
        if (v.pagos && v.pagos.length > 0) {
            pagosLista.innerHTML = v.pagos.map(pago => `
                <div class="detalle-pago">
                    <div class="metodo">
                        <i class="fas ${this.getIconoMetodo(pago.metodo)}"></i>
                        <span>${pago.metodo} (${pago.moneda})</span>
                        ${pago.tasa !== 1 ? `<small style="color:var(--gray-400);">@ ${pago.tasa}</small>` : ''}
                    </div>
                    <div class="monto">$${this.formatMoney(pago.monto * pago.tasa)} MXN</div>
                </div>
            `).join('');
        } else {
            pagosLista.innerHTML = '<p style="text-align:center;color:var(--gray-400);">Sin pagos registrados</p>';
        }

        // Totales
        const itemsActivos = (v.items || []).filter(i => (i.estado || '').toLowerCase() !== 'cancelado');
        const subtotal = itemsActivos.reduce((sum, i) => sum + (parseFloat(i.subtotal) || 0), 0);
        const descuento = itemsActivos.reduce((sum, i) => sum + (parseFloat(i.descuento) || 0), 0);
        const total = itemsActivos.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

        document.getElementById('detalle-subtotal').textContent = '$' + this.formatMoney(subtotal);
        document.getElementById('detalle-descuento').textContent = '-$' + this.formatMoney(descuento);
        document.getElementById('detalle-total').textContent = '$' + this.formatMoney(total);

        // Botón cancelar venta
        const btnCancelar = document.getElementById('btn-cancelar-venta-detalle');
        if (esCancelada) {
            btnCancelar.style.display = 'none';
        } else {
            btnCancelar.style.display = '';
        }
    },

    // ============================================
    // CERRAR DETALLE
    // ============================================
    cerrarDetalle() {
        document.getElementById('modal-detalle-venta').classList.remove('active');
        this.ventaSeleccionada = null;
    },

    // ============================================
    // CONFIRMAR CANCELAR VENTA
    // ============================================
    confirmarCancelar() {
        if (!this.ventaSeleccionada) return;

        document.getElementById('confirmar-titulo').textContent = '¿Cancelar esta venta?';
        document.getElementById('confirmar-mensaje').textContent = `Venta ${this.ventaSeleccionada.idVenta} - $${this.formatMoney(this.ventaSeleccionada.items.reduce((s, i) => s + i.total, 0))}`;
        document.getElementById('confirmar-motivo').value = '';
        this.itemACancelar = null;

        document.getElementById('modal-confirmar-cancelacion').classList.add('active');
    },

    // ============================================
    // CONFIRMAR CANCELAR ITEM
    // ============================================
    confirmarCancelarItem(itemId, producto) {
        document.getElementById('confirmar-titulo').textContent = '¿Cancelar este producto?';
        document.getElementById('confirmar-mensaje').textContent = producto;
        document.getElementById('confirmar-motivo').value = '';
        this.itemACancelar = itemId;

        document.getElementById('modal-confirmar-cancelacion').classList.add('active');
    },

    // ============================================
    // EJECUTAR CANCELACIÓN
    // ============================================
    async ejecutarCancelacion() {
        const motivo = document.getElementById('confirmar-motivo').value.trim();
        if (!motivo) {
            mostrarToast('Ingresa el motivo de cancelación', 'warning');
            return;
        }

        const btn = document.getElementById('btn-confirmar-cancelacion');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner"></div> Procesando...';

        try {
            const usuario = Auth.usuario?.nombreCompleto || 'Sistema';
            let url, body;

            if (this.itemACancelar) {
                // Cancelar item
                url = `${CONFIG.API_URL}/api/ventas/${this.ventaSeleccionada.idVenta}/cancelar-item`;
                body = { itemId: this.itemACancelar, motivo, usuario };
            } else {
                // Cancelar venta completa
                url = `${CONFIG.API_URL}/api/ventas/${this.ventaSeleccionada.idVenta}/cancelar`;
                body = { motivo, usuario };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                mostrarToast(data.mensaje || 'Cancelación exitosa', 'success');
                cerrarModal('modal-confirmar-cancelacion');

                if (this.itemACancelar) {
                    // Recargar detalle
                    await this.verDetalle(this.ventaSeleccionada.idVenta);
                } else {
                    // Cerrar detalle y recargar lista
                    this.cerrarDetalle();
                }
                await this.cargar();
            } else {
                mostrarToast(data.error || 'Error al cancelar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            mostrarToast('Error de conexión', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-ban"></i> Sí, cancelar';
        }
    },

    // ============================================
    // REIMPRIMIR TICKET
    // ============================================
    reimprimir() {
        if (!this.ventaSeleccionada) return;

        // Aquí puedes llamar a tu función de impresión existente
        // o crear una nueva ventana con el ticket
        const v = this.ventaSeleccionada;
        const itemsActivos = (v.items || []).filter(i => (i.estado || '').toLowerCase() !== 'cancelado');

        const contenido = `
            <html>
            <head>
                <title>Ticket ${v.idVenta}</title>
                <style>
                    body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                    hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
                    .total { font-size: 16px; font-weight: bold; }
                    table { width: 100%; }
                    td { padding: 2px 0; }
                </style>
            </head>
            <body>
                <div class="center">
                    <h2 style="margin:0;">UMO</h2>
                    <p>Punto de Venta</p>
                </div>
                <hr>
                <p><strong>Ticket:</strong> ${v.idVenta}</p>
                <p><strong>Fecha:</strong> ${v.fecha} ${v.hora}</p>
                <p><strong>Cliente:</strong> ${v.cliente || 'Público General'}</p>
                <p><strong>Vendedor:</strong> ${v.vendedor}</p>
                <hr>
                <table>
                    ${itemsActivos.map(i => `
                        <tr>
                            <td>${i.cantidad}x ${i.producto}</td>
                            <td class="right">$${this.formatMoney(i.total)}</td>
                        </tr>
                    `).join('')}
                </table>
                <hr>
                <table>
                    <tr>
                        <td>Subtotal:</td>
                        <td class="right">$${this.formatMoney(itemsActivos.reduce((s, i) => s + i.subtotal, 0))}</td>
                    </tr>
                    <tr>
                        <td>Descuento:</td>
                        <td class="right">-$${this.formatMoney(itemsActivos.reduce((s, i) => s + i.descuento, 0))}</td>
                    </tr>
                    <tr class="total">
                        <td>TOTAL:</td>
                        <td class="right">$${this.formatMoney(itemsActivos.reduce((s, i) => s + i.total, 0))}</td>
                    </tr>
                </table>
                <hr>
                <div class="center">
                    <p>¡Gracias por su compra!</p>
                </div>
            </body>
            </html>
        `;

        const ventana = window.open('', '_blank', 'width=320,height=600');
        ventana.document.write(contenido);
        ventana.document.close();
        ventana.print();
    },

    // ============================================
    // UTILIDADES
    // ============================================
    formatMoney(num) {
        return (parseFloat(num) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    getIconoMetodo(metodo) {
        const iconos = {
            'efectivo': 'fa-money-bill-wave',
            'transferencia': 'fa-exchange-alt',
            'bbva_nacional': 'fa-university',
            'bbva_internacional': 'fa-globe',
            'clip_nacional': 'fa-credit-card',
            'clip_internacional': 'fa-credit-card'
        };
        return iconos[(metodo || '').toLowerCase()] || 'fa-credit-card';
    }
};

// ============================================
// INICIALIZAR AL CARGAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Actualizar badge cuando se complete una venta
    const originalConfirmarVenta = window.confirmarVenta;
    if (typeof originalConfirmarVenta === 'function') {
        window.confirmarVenta = async function() {
            await originalConfirmarVenta.apply(this, arguments);
            // Recargar ventas después de confirmar
            setTimeout(() => VentasTurno.cargar(), 1000);
        };
    }
});
