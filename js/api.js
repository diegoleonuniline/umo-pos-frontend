// ============================================
// UMO POS - API CLIENT
// ============================================

const API = {
    
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error en la petición');
            }
            
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },
    
    // ============================================
    // AUTENTICACIÓN
    // ============================================
    async login(empleadoId, pin) {
        return this.request('/api/login', {
            method: 'POST',
            body: JSON.stringify({ empleadoId, pin })
        });
    },
    
    // ============================================
    // TURNOS
    // ============================================
    async verificarTurnoActivo(usuario, sucursal) {
        return this.request(`/api/turnos/activo/${encodeURIComponent(usuario)}/${encodeURIComponent(sucursal)}`);
    },
    
    async abrirTurno(datos) {
        return this.request('/api/turnos/abrir', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },
    
    async cerrarTurno(datos) {
        return this.request('/api/turnos/cerrar', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },
    
    // ============================================
    // PRODUCTOS
    // ============================================
    async obtenerProductos() {
        return this.request('/api/productos');
    },
    
    // ============================================
    // CLIENTES
    // ============================================
    async obtenerClientes() {
        return this.request('/api/clientes');
    },
    
    async agregarCliente(datos) {
        return this.request('/api/clientes', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
    },
    
    // ============================================
    // MÉTODOS DE PAGO
    // ============================================
    async obtenerMetodosPago() {
        return this.request('/api/metodos-pago');
    },
    
    // ============================================
    // DESCUENTOS
    // ============================================
    async obtenerDescuentos() {
        return this.request('/api/descuentos');
    },
    
    // ============================================
    // PROMOCIONES
    // ============================================
    async obtenerPromociones() {
        return this.request('/api/promociones');
    },
    
    // ============================================
    // VENTAS
    // ============================================
    async registrarVenta(venta, detalles, pagos) {
        return this.request('/api/ventas', {
            method: 'POST',
            body: JSON.stringify({ venta, detalles, pagos })
        });
    }
};
