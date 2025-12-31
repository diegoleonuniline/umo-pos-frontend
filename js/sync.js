// ============================================
// SYNC - Sincronización de datos con servidor
// ============================================

const Sync = {
    syncing: false,
    lastSync: null,

    // Sincronizar todo
    async sincronizar() {
        if (this.syncing) {
            mostrarToast('Sincronización en progreso...', 'warning');
            return;
        }

        const btn = document.getElementById('btn-sync');
        const icon = btn?.querySelector('i');
        
        this.syncing = true;
        
        // UI feedback
        if (btn) btn.disabled = true;
        if (icon) icon.classList.add('fa-spin');
        
        mostrarToast('🔄 Sincronizando datos...', 'info');

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.lastSync = new Date();
                
                // Recargar datos en el frontend
                await this.recargarDatosLocales();
                
                const stats = this.formatearStats(data.cache);
                mostrarToast(`✅ Sincronizado en ${data.tiempo}ms\n${stats}`, 'success');
                
                // Actualizar indicador de última sync
                this.actualizarIndicador();
            } else {
                mostrarToast('❌ Error al sincronizar', 'error');
            }
        } catch (error) {
            console.error('Error sync:', error);
            mostrarToast('❌ Error de conexión', 'error');
        } finally {
            this.syncing = false;
            if (btn) btn.disabled = false;
            if (icon) icon.classList.remove('fa-spin');
        }
    },

    // Recargar datos locales después de sync
    async recargarDatosLocales() {
        try {
            // Recargar productos
            if (typeof Productos !== 'undefined' && Productos.cargar) {
                await Productos.cargar();
            }
            
            // Recargar clientes
            if (typeof Clientes !== 'undefined' && Clientes.cargar) {
                await Clientes.cargar();
            }
        } catch (error) {
            console.error('Error recargando datos locales:', error);
        }
    },

    // Formatear estadísticas del caché
    formatearStats(cache) {
        if (!cache) return '';
        
        const items = [];
        if (cache.productos) items.push(`${cache.productos.items} productos`);
        if (cache.clientes) items.push(`${cache.clientes.items} clientes`);
        if (cache.promociones) items.push(`${cache.promociones.items} promos`);
        
        return items.join(', ');
    },

    // Actualizar indicador visual
    actualizarIndicador() {
        const indicator = document.getElementById('sync-indicator');
        if (indicator && this.lastSync) {
            indicator.textContent = this.formatearTiempo(this.lastSync);
            indicator.title = `Última sincronización: ${this.lastSync.toLocaleString()}`;
        }
    },

    // Formatear tiempo relativo
    formatearTiempo(fecha) {
        const ahora = new Date();
        const diff = Math.floor((ahora - fecha) / 1000);
        
        if (diff < 60) return 'Ahora';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return fecha.toLocaleDateString();
    },

    // Verificar estado del caché
    async verificarEstado() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/sync/status`);
            const data = await response.json();
            
            if (data.success) {
                console.log('📊 Estado del caché:', data.cache);
                return data.cache;
            }
        } catch (error) {
            console.error('Error verificando estado:', error);
        }
        return null;
    }
};

// Exponer función global para el onclick
function sincronizarDatos() {
    Sync.sincronizar();
}
