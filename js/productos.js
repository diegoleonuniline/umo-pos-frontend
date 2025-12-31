// ============================================
// UMO POS - GESTIÓN DE PRODUCTOS
// ============================================

const Productos = {
    lista: [],
    promociones: [],
    filtrados: [],
    
    async cargar() {
        try {
            const result = await API.obtenerProductos();
            
            if (result.success) {
                this.lista = result.productos;
                this.filtrados = [...this.lista];
                await this.cargarPromociones();
                this.render();
            }
        } catch (error) {
            console.error('Error cargando productos:', error);
            document.getElementById('productos-tbody').innerHTML = `
                <tr>
                    <td colspan="5" class="loading-cell" style="color: var(--danger);">
                        Error al cargar productos
                    </td>
                </tr>
            `;
        }
    },
    
    async cargarPromociones() {
        try {
            const result = await API.obtenerPromociones();
            if (result.success) {
                this.promociones = result.promociones;
                this.aplicarPromocionesAProductos();
            }
        } catch (error) {
            console.error('Error cargando promociones:', error);
        }
    },
    
    aplicarPromocionesAProductos() {
        const hoy = new Date();
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const diaSemana = diasSemana[hoy.getDay()];
        
        this.lista.forEach(producto => {
            const promo = this.obtenerPromocionProducto(producto, diaSemana, hoy);
            if (promo) {
                producto.promocion = promo;
                if (promo.forma === 'Descuento') {
                    producto.precioConDescuento = producto.precio * (1 - promo.porcentaje / 100);
                } else if (promo.forma === 'Precio' && promo.precio > 0) {
                    producto.precioConDescuento = promo.precio;
                }
            }
        });
    },
    
    obtenerPromocionProducto(producto, diaSemana, hoy) {
        if (!this.promociones || this.promociones.length === 0) return null;
        
        let promocionEncontrada = null;
        let prioridadEncontrada = 999;
        
        for (let promo of this.promociones) {
            // Verificar fechas
            if (promo.fechaInicio && promo.fechaFin) {
                const fechaInicio = new Date(promo.fechaInicio);
                const fechaFin = new Date(promo.fechaFin);
                if (hoy < fechaInicio || hoy > fechaFin) continue;
            }
            
            // Verificar día
            if (promo.diasPromocion && !promo.diasPromocion.includes(diaSemana)) continue;
            
            // Prioridad 1: Producto específico
            if (promo.basadaEn === 'Producto' && promo.productos && promo.productos.length > 0) {
                const codigo = String(producto.codigoBarras || producto.sku);
                if (promo.productos.includes(codigo) && prioridadEncontrada > 1) {
                    promocionEncontrada = promo;
                    prioridadEncontrada = 1;
                }
            }
            
            // Prioridad 2: Categoría
            if (promo.basadaEn === 'Categoria' && promo.categoria && prioridadEncontrada > 2) {
                if (producto.categoria && producto.categoria.toUpperCase() === promo.categoria.toUpperCase()) {
                    promocionEncontrada = promo;
                    prioridadEncontrada = 2;
                }
            }
            
            // Prioridad 3: General
            if (promo.basadaEn === 'General' && prioridadEncontrada > 3) {
                promocionEncontrada = promo;
                prioridadEncontrada = 3;
            }
        }
        
        return promocionEncontrada;
    },
    
    buscar(termino) {
        const query = termino.toLowerCase().trim();
        
        if (!query) {
            this.filtrados = [...this.lista];
        } else {
            this.filtrados = this.lista.filter(p => 
                (p.nombre && p.nombre.toLowerCase().includes(query)) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(query)) ||
                (p.categoria && p.categoria.toLowerCase().includes(query))
            );
        }
        
        this.render();
    },
    
    buscarPorCodigo(codigo) {
        return this.lista.find(p => 
            String(p.codigoBarras).trim() === String(codigo).trim() ||
            String(p.sku).trim() === String(codigo).trim()
        );
    },
    
    render() {
        const tbody = document.getElementById('productos-tbody');
        
        if (!this.filtrados || this.filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="loading-cell">
                        No hay productos disponibles
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filtrados.map((p, index) => {
            const tienePromo = p.promocion;
            let precioHTML = `$${p.precio.toLocaleString()}`;
            let promoHTML = '';
            
            if (tienePromo) {
                promoHTML = `<span class="product-promo-badge">🎉 ${p.promocion.etiqueta || 'PROMO'}</span>`;
                
                if (p.precioConDescuento !== undefined) {
                    precioHTML = `
                        <span class="product-price-original">$${p.precio.toLocaleString()}</span>
                        <span class="product-price-promo">$${Math.round(p.precioConDescuento).toLocaleString()}</span>
                    `;
                }
            }
            
            return `
                <tr data-codigo="${p.codigoBarras || ''}" data-index="${index}">
                    <td class="sku-code">${p.sku || p.codigoBarras || '-'}</td>
                    <td class="product-name">
                        ${p.nombre || 'Sin nombre'}
                        ${promoHTML}
                    </td>
                    <td class="product-price">${precioHTML}</td>
                    <td class="product-category">${p.categoria || '-'}</td>
                    <td>
                        <button class="add-btn" onclick="Carrito.agregarPorIndice(${index})">
                            Agregar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// Configurar búsqueda y lector de códigos
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-producto');
    
    if (searchInput) {
        // Búsqueda en tiempo real
        searchInput.addEventListener('input', function(e) {
            Productos.buscar(e.target.value);
        });
        
        // Enter para agregar producto
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const codigo = e.target.value.trim();
                if (codigo) {
                    const producto = Productos.buscarPorCodigo(codigo);
                    if (producto) {
                        Carrito.agregar(producto);
                        e.target.value = '';
                        Productos.buscar('');
                        mostrarToast(`✅ ${producto.nombre}`, 'success');
                    }
                }
            }
        });
    }
    
    // Lector de códigos de barras global
    let codigoBuffer = '';
    let timerBuffer;
    
    document.addEventListener('keypress', function(e) {
        // Ignorar si está en un input que no sea búsqueda
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
        if (e.target.tagName === 'INPUT' && e.target.id !== 'search-producto') return;
        
        if (e.key === 'Enter' && codigoBuffer.length > 0) {
            const producto = Productos.buscarPorCodigo(codigoBuffer);
            if (producto) {
                Carrito.agregar(producto);
                mostrarToast(`✅ ${producto.nombre}`, 'success');
            } else {
                mostrarToast(`❌ Producto no encontrado: ${codigoBuffer}`, 'error');
            }
            
            codigoBuffer = '';
            if (searchInput) {
                searchInput.value = '';
            }
            e.preventDefault();
            return;
        }
        
        codigoBuffer += e.key;
        
        clearTimeout(timerBuffer);
        timerBuffer = setTimeout(() => {
            codigoBuffer = '';
        }, 300);
    });
});
