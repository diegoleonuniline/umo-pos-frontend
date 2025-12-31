// ============================================
// UMO POS - AUTENTICACIÓN
// ============================================
const Auth = {
    usuario: null,
    
    init() {
        // Verificar sesión guardada
        const sesion = localStorage.getItem('umo_sesion');
        if (sesion) {
            try {
                this.usuario = JSON.parse(sesion);
                return true;
            } catch (e) {
                localStorage.removeItem('umo_sesion');
            }
        }
        return false;
    },
    
    async login(empleadoId, pin) {
        const result = await API.login(empleadoId, pin);
        
        if (result.success) {
            this.usuario = result.usuario;
            localStorage.setItem('umo_sesion', JSON.stringify(this.usuario));
        }
        
        return result;
    },
    
    logout() {
        // Limpiar turno del usuario actual antes de cerrar sesión
        if (this.usuario) {
            const odooId = this.getOdooId() || this.getId();
            if (odooId) {
                localStorage.removeItem('umo_turno_' + odooId);
            }
        }
        
        this.usuario = null;
        localStorage.removeItem('umo_sesion');
        window.location.reload();
    },
    
    isAuthenticated() {
        return this.usuario !== null;
    },
    
    getUsuario() {
        return this.usuario;
    },
    
    getId() {
        return this.usuario?.id || this.usuario?.empleadoId || null;
    },
    
    getOdooId() {
        return this.usuario?.odooId || this.usuario?.odoo_id || this.usuario?.id || null;
    },
    
    getNombre() {
        return this.usuario?.nombre || 'Usuario';
    },
    
    getSucursal() {
        return this.usuario?.sucursal || 'Principal';
    },
    
    getInitials() {
        const nombre = this.getNombre();
        const partes = nombre.split(' ');
        if (partes.length >= 2) {
            return (partes[0][0] + partes[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    }
};

// Event Listeners para login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const empleadoId = document.getElementById('login-empleado').value.trim();
            const pin = document.getElementById('login-pin').value.trim();
            const errorDiv = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');
            
            if (!empleadoId || !pin) {
                errorDiv.textContent = 'Ingresa tu ID y PIN';
                return;
            }
            
            btn.classList.add('loading');
            btn.disabled = true;
            errorDiv.textContent = '';
            
            try {
                const result = await Auth.login(empleadoId, pin);
                
                if (result.success) {
                    App.verificarTurno();
                } else {
                    errorDiv.textContent = result.error || 'Credenciales incorrectas';
                }
            } catch (error) {
                errorDiv.textContent = 'Error de conexión';
                console.error('Login error:', error);
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }
});

function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        Auth.logout();
    }
}
