// ============================================
// UMO POS - GESTIÓN DE CLIENTES
// ============================================

const Clientes = {
    lista: [],
    seleccionado: null,
    
    async cargar() {
        try {
            const result = await API.obtenerClientes();
            if (result.success) {
                this.lista = result.clientes || [];
                console.log(`✅ ${this.lista.length} clientes cargados`);
            }
        } catch (error) {
            console.error('Error cargando clientes:', error);
            this.lista = [];
        }
    },
    
    renderLista() {
        const container = document.getElementById('clientes-lista');
        if (!container) return;
        
        const busqueda = document.getElementById('search-cliente')?.value.toLowerCase() || '';
        
        let filtrados = this.lista;
        if (busqueda) {
            filtrados = this.lista.filter(c => 
                (c.nombre && c.nombre.toLowerCase().includes(busqueda)) ||
                (c.codigo && c.codigo.toLowerCase().includes(busqueda)) ||
                (c.correo && c.correo.toLowerCase().includes(busqueda)) ||
                (c.telefono && c.telefono.includes(busqueda))
            );
        }
        
        let html = `
            <div class="cliente-item" onclick="Clientes.seleccionar(null)">
                <div class="cliente-icon"><i class="fas fa-user-slash"></i></div>
                <div class="cliente-data">
                    <strong>Público General</strong>
                    <small>Sin datos de cliente</small>
                </div>
            </div>
        `;
        
        html += filtrados.map(c => `
            <div class="cliente-item" onclick="Clientes.seleccionar('${c.id}')">
                <div class="cliente-icon"><i class="fas fa-user"></i></div>
                <div class="cliente-data">
                    <strong>${c.nombre || 'Sin nombre'}</strong>
                    <small>${c.grupo || 'Sin grupo'} • ${c.correo || c.telefono || c.codigo || ''}</small>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    },
    
    seleccionar(id) {
        if (id) {
            const cliente = this.lista.find(c => c.id === id);
            if (cliente) {
                this.seleccionado = cliente;
                Carrito.cliente = cliente;
                
                // Actualizar UI
                document.getElementById('cliente-nombre').textContent = cliente.nombre;
                
                const infoEl = document.getElementById('cliente-info');
                const grupoEl = document.getElementById('cliente-grupo');
                
                if (cliente.grupo) {
                    infoEl.style.display = 'block';
                    grupoEl.textContent = cliente.grupo;
                } else {
                    infoEl.style.display = 'none';
                }
                
                document.getElementById('resumen-cliente').textContent = cliente.nombre;
                
                // Calcular descuento automático si hay grupo
                this.calcularDescuentoAutomatico();
                
                mostrarToast(`Cliente: ${cliente.nombre}`, 'success');
            }
        } else {
            this.limpiarSeleccion();
        }
        
        cerrarModal('modal-clientes');
    },
    
    limpiarSeleccion() {
        this.seleccionado = null;
        Carrito.cliente = null;
        
        document.getElementById('cliente-nombre').textContent = 'Público General';
        document.getElementById('cliente-info').style.display = 'none';
        document.getElementById('resumen-cliente').textContent = 'Público General';
        
        // Limpiar descuentos automáticos
        Carrito.limpiarDescuentos();
    },
    
    async calcularDescuentoAutomatico() {
        if (!this.seleccionado || !this.seleccionado.grupo) {
            Carrito.limpiarDescuentos();
            return;
        }
        
        try {
            const result = await API.calcularDescuento(this.seleccionado.grupo, null);
            
            if (result.success && result.descuento) {
                Carrito.aplicarDescuentoAutomatico(
                    result.descuento.porcentaje,
                    result.descuento.descripcion || `Descuento ${result.descuento.porcentaje}%`,
                    result.descuento.id
                );
                
                mostrarToast(`Descuento ${result.descuento.porcentaje}% aplicado`, 'success');
            }
        } catch (error) {
            console.error('Error calculando descuento:', error);
        }
    },
    
    async crearNuevo() {
        const codigo = document.getElementById('nuevo-cliente-codigo').value.trim();
        const nombre = document.getElementById('nuevo-cliente-nombre').value.trim();
        const correo = document.getElementById('nuevo-cliente-correo').value.trim();
        const telefono = document.getElementById('nuevo-cliente-telefono').value.trim();
        
        if (!codigo || !nombre) {
            mostrarToast('Código y nombre son requeridos', 'error');
            return;
        }
        
        try {
            const result = await API.crearCliente({ codigo, nombre, correo, telefono });
            
            if (result.success) {
                // Recargar clientes y seleccionar el nuevo
                await this.cargar();
                
                const nuevoCliente = this.lista.find(c => c.codigo === codigo);
                if (nuevoCliente) {
                    this.seleccionar(nuevoCliente.id);
                }
                
                // Limpiar formulario
                document.getElementById('nuevo-cliente-codigo').value = '';
                document.getElementById('nuevo-cliente-nombre').value = '';
                document.getElementById('nuevo-cliente-correo').value = '';
                document.getElementById('nuevo-cliente-telefono').value = '';
                
                mostrarToast('Cliente creado', 'success');
            } else {
                mostrarToast(result.mensaje || 'Error creando cliente', 'error');
            }
        } catch (error) {
            console.error('Error creando cliente:', error);
            mostrarToast('Error de conexión', 'error');
        }
    }
};

// Exportar
window.Clientes = Clientes;
