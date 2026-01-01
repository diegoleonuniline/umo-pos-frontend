// ============================================
// MOVIMIENTOS DE CAJA
// ============================================
const MovimientosCaja = {
    tipo: 'Deposito',
    categorias: [],
    conceptos: [],
    bancos: [],

    async abrir() {
        await this.cargarCatalogos();
        this.tipo = 'Deposito';
        this.actualizarUI();
        this.limpiarFormulario();
        document.getElementById('modal-movimientos-caja').classList.add('active');
    },

    async cargarCatalogos() {
        try {
            const [catRes, concRes, bancosRes] = await Promise.all([
                fetch(`${CONFIG.API_URL}/api/categorias`),
                fetch(`${CONFIG.API_URL}/api/conceptos`),
                fetch(`${CONFIG.API_URL}/api/bancos`)
            ]);

            const catData = await catRes.json();
            const concData = await concRes.json();
            const bancosData = await bancosRes.json();

            this.categorias = catData.success ? catData.categorias : [];
            this.conceptos = concData.success ? concData.conceptos : [];
            this.bancos = bancosData.success ? bancosData.bancos : [];

            this.llenarSelects();
        } catch (error) {
            console.error('Error cargando catálogos:', error);
            mostrarToast('Error cargando datos', 'error');
        }
    },

    llenarSelects() {
        // Categorías
        const selCat = document.getElementById('mov-categoria');
        selCat.innerHTML = '<option value="">Seleccionar...</option>';
        this.categorias.forEach(c => {
            selCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

        // Conceptos (todos inicialmente)
        const selConc = document.getElementById('mov-concepto');
        selConc.innerHTML = '<option value="">Seleccionar...</option>';
        this.conceptos.forEach(c => {
            selConc.innerHTML += `<option value="${c.id}" data-categoria="${c.categoria}">${c.nombre}</option>`;
        });

        // Bancos (origen y destino)
        const selOrigen = document.getElementById('mov-origen');
        const selDestino = document.getElementById('mov-destino');
        
        selOrigen.innerHTML = '<option value="">Seleccionar...</option>';
        selDestino.innerHTML = '<option value="">Seleccionar...</option>';
        
        this.bancos.forEach(b => {
            selOrigen.innerHTML += `<option value="${b.id}">${b.nombre}</option>`;
            selDestino.innerHTML += `<option value="${b.id}">${b.nombre}</option>`;
        });
    },

    filtrarConceptos() {
        const categoriaId = document.getElementById('mov-categoria').value;
        const selConc = document.getElementById('mov-concepto');
        
        selConc.innerHTML = '<option value="">Seleccionar...</option>';
        
        const conceptosFiltrados = categoriaId 
            ? this.conceptos.filter(c => c.categoria.toLowerCase() === categoriaId.toLowerCase())
            : this.conceptos;
        
        conceptosFiltrados.forEach(c => {
            selConc.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    },

    setTipo(tipo) {
        this.tipo = tipo;
        this.actualizarUI();
    },

    actualizarUI() {
        // Tabs
        document.querySelectorAll('.mov-tipo-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (this.tipo === 'Deposito') {
            document.querySelector('.mov-tipo-btn.deposito').classList.add('active');
        } else {
            document.querySelector('.mov-tipo-btn.retiro').classList.add('active');
        }

        // Botón guardar
        const btnGuardar = document.getElementById('mov-btn-guardar');
        btnGuardar.classList.remove('deposito', 'retiro');
        btnGuardar.classList.add(this.tipo.toLowerCase());
        
        if (this.tipo === 'Deposito') {
            btnGuardar.innerHTML = '<i class="fas fa-arrow-down"></i> Registrar Ingreso';
        } else {
            btnGuardar.innerHTML = '<i class="fas fa-arrow-up"></i> Registrar Egreso';
        }
    },

    limpiarFormulario() {
        document.getElementById('mov-monto').value = '';
        document.getElementById('mov-origen').value = '';
        document.getElementById('mov-destino').value = '';
        document.getElementById('mov-categoria').value = '';
        document.getElementById('mov-concepto').value = '';
        document.getElementById('mov-notas').value = '';
    },

    async guardar() {
        const monto = parseFloat(document.getElementById('mov-monto').value) || 0;
        const origen = document.getElementById('mov-origen').value;
        const destino = document.getElementById('mov-destino').value;
        const categoria = document.getElementById('mov-categoria').value;
        const concepto = document.getElementById('mov-concepto').value;
        const notas = document.getElementById('mov-notas').value;

        // Validaciones
        if (monto <= 0) {
            mostrarToast('Ingresa un monto válido', 'error');
            return;
        }
        if (!origen) {
            mostrarToast('Selecciona el origen', 'error');
            return;
        }
        if (!categoria) {
            mostrarToast('Selecciona una categoría', 'error');
            return;
        }
        if (!concepto) {
            mostrarToast('Selecciona un concepto', 'error');
            return;
        }

        const btn = document.getElementById('mov-btn-guardar');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            
            const response = await fetch(`${CONFIG.API_URL}/api/movimientos-caja`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: this.tipo,
                    monto,
                    origen,
                    destino,
                    categoria,
                    concepto,
                    notas,
                    sucursal: usuario.sucursal || '',
                    usuario: usuario.id || ''
                })
            });

            const data = await response.json();

            if (data.success) {
                mostrarToast(`${this.tipo === 'Deposito' ? 'Ingreso' : 'Egreso'} registrado correctamente`, 'success');
                cerrarModal('modal-movimientos-caja');
            } else {
                throw new Error(data.error || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error guardando movimiento:', error);
            mostrarToast(error.message || 'Error al guardar', 'error');
        } finally {
            this.actualizarUI();
            btn.disabled = false;
        }
    }
};
