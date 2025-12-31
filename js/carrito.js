// ============================================
// UMO POS - GESTIÓN DEL CARRITO
// ============================================

const Carrito = {
    items: [],
    cliente: null,
    descuentoAutomatico: { porcentaje: 0, descripcion: 'Sin descuento', id: null },
    descuentoExtra: 0,
    tipoDescuento: 'Ninguno',
    
    agregar(producto) {
        const codigo = producto.codigoBarras || producto.sku;
        const existente = this.items.find(item => item.codigo === codigo);
        
        if (existente) {
            existente.cantidad += 1;
            this.recalcularDescuentoItem(existente);
        } else {
            const item = {
                codigo: codigo,
                sku: producto.sku,
                nombre: producto.nombre,
                precio: parseFloat(producto.precio) || 0,
                cantidad: 1,
                descuento: 0,
                descuentoAutomatico: 0,
                promocion: producto.promocion || null
            };
            
            // Aplicar descuento inicial
            if (item.promocion) {
                const resultado = this.calcularDescuentoPromocion(1, item.precio, item.promocion);
                item.descuento = resultado.descuento;
            } else {
                item.descuentoAutomatico = this.descuentoAutomatico.porcentaje;
                item.descuento = this.descuentoAutomatico.porcentaje;
            }
            
            this.items.push(item);
        }
        
        this.render();
        this.actualizarTotales();
        
        // Scroll al final del carrito
        const container = document.getElementById('cart-items');
        if (container) {
            setTimeout(() => container.scrollTop = container.scrollHeight, 100);
        }
    },
    
    agregarPorIndice(index) {
        const producto = Productos.filtrados[index];
        if (producto) {
            this.agregar(producto);
            mostrarToast(`✅ ${producto.nombre}`, 'success');
        }
    },
    
    recalcularDescuentoItem(item) {
        if (item.promocion) {
            const resultado = this.calcularDescuentoPromocion(item.cantidad, item.precio, item.promocion);
            item.descuento = resultado.descuento;
            
            // Mensaje si se activa promoción cantidad
            if (item.promocion.forma === 'Cantidad x Cantidad' && 
                item.cantidad >= item.promocion.cantidadLlevar) {
                mostrarToast(`✅ Promoción aplicada: ${item.promocion.etiqueta}`, 'success');
            }
        }
    },
    
    calcularDescuentoPromocion(cantidad, precio, promocion) {
        if (!promocion) return { descuento: 0, precioFinal: precio * cantidad };
        
        let descuentoPorcentaje = 0;
        let precioFinal = precio * cantidad;
        
        switch(promocion.forma) {
            case 'Descuento':
                descuentoPorcentaje = promocion.porcentaje || 0;
                precioFinal = (precio * cantidad) * (1 - descuentoPorcentaje / 100);
                break;
                
            case 'Precio':
                if (promocion.precio > 0) {
                    const precioPromo = promocion.precio;
                    precioFinal = precioPromo * cantidad;
                    descuentoPorcentaje = ((precio - precioPromo) / precio) * 100;
                }
                break;
                
            case 'Cantidad x Cantidad':
                const cantidadLlevar = promocion.cantidadLlevar || 3;
                const cantidadPagar = promocion.cantidadPagada || 2;
                
                if (cantidad >= cantidadLlevar) {
                    const grupos = Math.floor(cantidad / cantidadLlevar);
                    const sobrantes = cantidad % cantidadLlevar;
                    const unidadesACobrar = (grupos * cantidadPagar) + sobrantes;
                    
                    precioFinal = unidadesACobrar * precio;
                    const descuentoTotal = (precio * cantidad) - precioFinal;
                    descuentoPorcentaje = (descuentoTotal / (precio * cantidad)) * 100;
                }
                break;
        }
        
        return {
            descuento: descuentoPorcentaje,
            precioFinal: precioFinal
        };
    },
    
    actualizarCantidad(codigo, cambio) {
        const item = this.items.find(i => i.codigo === codigo);
        if (item) {
            item.cantidad += cambio;
            if (item.cantidad <= 0) {
                this.eliminar(codigo);
            } else {
                this.recalcularDescuentoItem(item);
                this.render();
                this.actualizarTotales();
            }
        }
    },
    
    eliminar(codigo) {
        this.items = this.items.filter(i => i.codigo !== codigo);
        this.render();
        this.actualizarTotales();
    },
    
    limpiar() {
        if (this.items.length === 0) return;
        
        if (confirm('¿Limpiar el carrito?')) {
            this.items = [];
            this.cliente = null;
            this.descuentoExtra = 0;
            this.tipoDescuento = 'Ninguno';
            
            Clientes.limpiarSeleccion();
            this.render();
            this.actualizarTotales();
            
            const searchInput = document.getElementById('search-producto');
            if (searchInput) searchInput.focus();
        }
    },
    
    getSubtotal() {
        return this.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    },
    
    getDescuentoTotal() {
        return this.items.reduce((sum, item) => {
            return sum + (item.precio * item.cantidad * (item.descuento || 0) / 100);
        }, 0);
    },
    
    getTotal() {
        const subtotal = this.getSubtotal();
        const descuento = this.getDescuentoTotal();
        return Math.max(0, subtotal - descuento - this.descuentoExtra);
    },
    
    actualizarTotales() {
        const subtotal = this.getSubtotal();
        const descuento = this.getDescuentoTotal();
        const total = this.getTotal();
        
        document.getElementById('cart-subtotal').textContent = '$' + Math.round(subtotal).toLocaleString();
        document.getElementById('cart-descuento').textContent = '-$' + Math.round(descuento).toLocaleString();
        document.getElementById('cart-total').textContent = '$' + Math.round(total).toLocaleString();
        
        // Mostrar/ocultar resumen
        const summary = document.getElementById('cart-summary');
        if (summary) {
            summary.style.display = this.items.length > 0 ? 'block' : 'none';
        }
        
        // Habilitar/deshabilitar botón cobrar
        const btnCobrar = document.getElementById('btn-cobrar');
        if (btnCobrar) {
            btnCobrar.disabled = this.items.length === 0;
        }
    },
    
    aplicarDescuentoAutomatico(porcentaje, descripcion, id) {
        this.descuentoAutomatico = { porcentaje, descripcion, id };
        
        // Aplicar a items sin promoción
        this.items.forEach(item => {
            if (!item.promocion) {
                item.descuentoAutomatico = porcentaje;
                item.descuento = porcentaje;
            }
        });
        
        this.render();
        this.actualizarTotales();
    },
    
    limpiarDescuentos() {
        this.descuentoAutomatico = { porcentaje: 0, descripcion: 'Sin descuento', id: null };
        
        this.items.forEach(item => {
            if (!item.promocion) {
                item.descuentoAutomatico = 0;
                item.descuento = 0;
            }
        });
        
        this.render();
        this.actualizarTotales();
    },
    
    render() {
        const container = document.getElementById('cart-items');
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <div class="empty-cart-icon">🛒</div>
                    <p>Carrito vacío</p>
                    <small>Selecciona productos de la tabla</small>
                </div>
            `;
            return;
        }
        
        let html = `
            <table class="cart-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">PRODUCTO</th>
                        <th style="width: 15%; text-align: right;">PRECIO</th>
                        <th style="width: 15%; text-align: center;">CANT</th>
                        <th style="width: 18%; text-align: right;">TOTAL</th>
                        <th style="width: 2%;"></th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.items.forEach(item => {
            const tieneDescuento = item.descuento > 0;
            const descuentoMonto = item.precio * item.cantidad * (item.descuento / 100);
            const totalItem = (item.precio * item.cantidad) - descuentoMonto;
            
            let badgeHTML = '';
            if (tieneDescuento) {
                if (item.promocion) {
                    badgeHTML = `<span class="cart-discount-badge promo">PROMO -${Math.round(item.descuento)}%</span>`;
                } else if (item.descuentoAutomatico > 0) {
                    badgeHTML = `<span class="cart-discount-badge auto">AUTO -${Math.round(item.descuento)}%</span>`;
                } else {
                    badgeHTML = `<span class="cart-discount-badge">-${Math.round(item.descuento)}%</span>`;
                }
            }
            
            html += `
                <tr class="${tieneDescuento ? 'with-discount' : ''}">
                    <td>
                        <div class="cart-product-info">
                            <span class="cart-product-name" title="${item.nombre}">${item.nombre}</span>
                            <span class="cart-product-sku">${item.sku || item.codigo}</span>
                            ${badgeHTML}
                        </div>
                    </td>
                    <td class="cart-price">$${item.precio.toLocaleString()}</td>
                    <td>
                        <div class="cart-qty-control">
                            <button class="cart-qty-btn" onclick="Carrito.actualizarCantidad('${item.codigo}', -1)">−</button>
                            <span class="cart-qty-value">${item.cantidad}</span>
                            <button class="cart-qty-btn" onclick="Carrito.actualizarCantidad('${item.codigo}', 1)">+</button>
                        </div>
                    </td>
                    <td class="cart-total">$${Math.round(totalItem).toLocaleString()}</td>
                    <td>
                        <span class="cart-remove" onclick="Carrito.eliminar('${item.codigo}')">×</span>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
};

// Función global para limpiar carrito
function limpiarCarrito() {
    Carrito.limpiar();
}
