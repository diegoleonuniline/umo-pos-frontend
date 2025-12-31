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
                const nombreEl = document.getElementById('cliente-nombre');
                if (nombreEl) nombreEl.textContent = cliente.nombre;
                
                const infoEl = document.getElementById('cliente-info');
                const grupoEl = document.getElementById('cliente-grupo');
                
                if (cliente.grupo && infoEl && grupoEl) {
                    infoEl.style.display = 'block';
                    grupoEl.textContent = cliente.grupo;
                } else if (infoEl) {
                    infoEl.style.display = 'none';
                }
                
                const resumenEl = document.getElementById('resumen-cliente');
                if (resumenEl) resumenEl.textContent = cliente.nombre;
                
                mostrarToast(`Cliente: ${cliente.nombre}`, 'success');
            }
        } else {
            this.limpiarSeleccion();
        }
        
        cerrarModal('modal-clientes');
    },
    
    limpiarSeleccion() {
        this.seleccionado = null;
        if (typeof Carrito !== 'undefined') {
            Carrito.cliente = null;
        }
        
        const nombreEl = document.getElementById('cliente-nombre');
        if (nombreEl) nombreEl.textContent = 'Público General';
        
        const infoEl = document.getElementById('cliente-info');
        if (infoEl) infoEl.style.display = 'none';
        
        const resumenEl = document.getElementById('resumen-cliente');
        if (resumenEl) resumenEl.textContent = 'Público General';
        
        // Limpiar descuentos automáticos
        if (typeof Carrito !== 'undefined' && Carrito.limpiarDescuentos) {
            Carrito.limpiarDescuentos();
        }
    },
    
    async crearNuevo() {
        const codigo = document.getElementById('nuevo-cliente-codigo')?.value.trim();
        const nombre = document.getElementById('nuevo-cliente-nombre')?.value.trim();
        const correo = document.getElementById('nuevo-cliente-correo')?.value.trim();
        const telefono = document.getElementById('nuevo-cliente-telefono')?.value.trim();
        
        if (!codigo || !nombre) {
            mostrarToast('Código y nombre son requeridos', 'error');
            return;
        }
        
        try {
            const result = await API.crearCliente({ codigo, nombre, correo, telefono });
            
            if (result.success) {
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

// Función global para abrir modal clientes
function abrirModalClientes() {
    const modal = document.getElementById('modal-clientes');
    if (modal) {
        modal.classList.add('active');
        Clientes.renderLista();
        
        const searchInput = document.getElementById('search-cliente');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 100);
        }
    }
}

// Búsqueda en tiempo real
document.addEventListener('DOMContentLoaded', function() {
    const searchCliente = document.getElementById('search-cliente');
    if (searchCliente) {
        searchCliente.addEventListener('input', () => Clientes.renderLista());
    }
});
