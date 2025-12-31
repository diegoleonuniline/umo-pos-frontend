// ============================================
// UMO POS - GESTIÓN DE TURNOS
// ============================================

const Turno = {
    actual: null,
    tasas: {
        USD: CONFIG.DEFAULT_RATES.USD,
        CAD: CONFIG.DEFAULT_RATES.CAD,
        EUR: CONFIG.DEFAULT_RATES.EUR
    },
    
    init() {
        // Cargar turno guardado
        const turnoGuardado = localStorage.getItem('umo_turno');
        if (turnoGuardado) {
            try {
                this.actual = JSON.parse(turnoGuardado);
                this.tasas = {
                    USD: this.actual.tasaUSD || CONFIG.DEFAULT_RATES.USD,
                    CAD: this.actual.tasaCAD || CONFIG.DEFAULT_RATES.CAD,
                    EUR: this.actual.tasaEUR || CONFIG.DEFAULT_RATES.EUR
                };
                return true;
            } catch (e) {
                localStorage.removeItem('umo_turno');
            }
        }
        return false;
    },
    
    async verificar() {
        try {
            const usuario = Auth.getNombre();
            const sucursal = Auth.getSucursal();
            const result = await API.verificarTurnoActivo(usuario, sucursal);
            
            if (result.success && result.turnoActivo) {
                this.actual = result.turnoActivo;
                this.tasas = {
                    USD: parseFloat(result.turnoActivo['USD a MXN']) || CONFIG.DEFAULT_RATES.USD,
                    CAD: parseFloat(result.turnoActivo['CAD a MXN']) || CONFIG.DEFAULT_RATES.CAD,
                    EUR: parseFloat(result.turnoActivo['EUR a MXN']) || CONFIG.DEFAULT_RATES.EUR
                };
                localStorage.setItem('umo_turno', JSON.stringify(this.actual));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error verificando turno:', error);
            return false;
        }
    },
    
    async abrir(datos) {
        try {
            const result = await API.abrirTurno({
                usuario: Auth.getNombre(),
                sucursal: Auth.getSucursal(),
                efectivoInicial: datos.mxn,
                usdInicial: datos.usd,
                cadInicial: datos.cad,
                eurInicial: datos.eur,
                tasaUSD: datos.tasaUSD,
                tasaCAD: datos.tasaCAD,
                tasaEUR: datos.tasaEUR
            });
            
            if (result.success) {
                this.actual = {
                    ID: result.turnoId,
                    tasaUSD: datos.tasaUSD,
                    tasaCAD: datos.tasaCAD,
                    tasaEUR: datos.tasaEUR
                };
                this.tasas = {
                    USD: datos.tasaUSD,
                    CAD: datos.tasaCAD,
                    EUR: datos.tasaEUR
                };
                localStorage.setItem('umo_turno', JSON.stringify(this.actual));
            }
            
            return result;
        } catch (error) {
            console.error('Error abriendo turno:', error);
            throw error;
        }
    },
    
    async cerrar(datos) {
        try {
            const result = await API.cerrarTurno({
                turnoId: this.actual.ID,
                ...datos
            });
            
            if (result.success) {
                this.actual = null;
                localStorage.removeItem('umo_turno');
            }
            
            return result;
        } catch (error) {
            console.error('Error cerrando turno:', error);
            throw error;
        }
    },
    
    getTasa(moneda) {
        if (moneda === 'MXN') return 1;
        return this.tasas[moneda] || 1;
    },
    
    getId() {
        return this.actual?.ID || '-';
    },
    
    isActivo() {
        return this.actual !== null;
    }
};

// Mostrar pantalla de turno
function mostrarPantallaTurno() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('turno-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    // Actualizar info de usuario
    document.getElementById('turno-usuario-nombre').textContent = Auth.getNombre();
    document.getElementById('turno-usuario-sucursal').textContent = Auth.getSucursal();
    
    // Cargar tasas guardadas
    const tasasGuardadas = localStorage.getItem('umo_tasas');
    if (tasasGuardadas) {
        try {
            const tasas = JSON.parse(tasasGuardadas);
            document.getElementById('turno-tasa-usd').value = tasas.USD || CONFIG.DEFAULT_RATES.USD;
            document.getElementById('turno-tasa-cad').value = tasas.CAD || CONFIG.DEFAULT_RATES.CAD;
            document.getElementById('turno-tasa-eur').value = tasas.EUR || CONFIG.DEFAULT_RATES.EUR;
        } catch (e) {}
    }
}

// Event listener para formulario de turno
document.addEventListener('DOMContentLoaded', function() {
    const turnoForm = document.getElementById('turno-form');
    
    if (turnoForm) {
        turnoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('turno-btn');
            const errorDiv = document.getElementById('turno-error');
            
            const datos = {
                mxn: parseFloat(document.getElementById('turno-mxn').value) || 0,
                usd: parseFloat(document.getElementById('turno-usd').value) || 0,
                cad: parseFloat(document.getElementById('turno-cad').value) || 0,
                eur: parseFloat(document.getElementById('turno-eur').value) || 0,
                tasaUSD: parseFloat(document.getElementById('turno-tasa-usd').value) || CONFIG.DEFAULT_RATES.USD,
                tasaCAD: parseFloat(document.getElementById('turno-tasa-cad').value) || CONFIG.DEFAULT_RATES.CAD,
                tasaEUR: parseFloat(document.getElementById('turno-tasa-eur').value) || CONFIG.DEFAULT_RATES.EUR
            };
            
            // Guardar tasas
            localStorage.setItem('umo_tasas', JSON.stringify({
                USD: datos.tasaUSD,
                CAD: datos.tasaCAD,
                EUR: datos.tasaEUR
            }));
            
            btn.classList.add('loading');
            btn.disabled = true;
            errorDiv.textContent = '';
            
            try {
                const result = await Turno.abrir(datos);
                
                if (result.success) {
                    App.iniciarPOS();
                } else {
                    errorDiv.textContent = result.error || 'Error al abrir turno';
                }
            } catch (error) {
                errorDiv.textContent = 'Error de conexión';
                console.error('Turno error:', error);
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }
});

// Abrir modal cerrar turno
function abrirModalCerrarTurno() {
    const modal = document.getElementById('modal-cerrar-turno');
    const body = document.getElementById('modal-cerrar-turno-body');
    
    body.innerHTML = `
        <div class="payment-section">
            <h3>💵 Conteo de Efectivo MXN</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div class="field">
                    <label>Monedas $1</label>
                    <input type="number" id="cierre-m1" value="0" min="0">
                </div>
                <div class="field">
                    <label>Monedas $2</label>
                    <input type="number" id="cierre-m2" value="0" min="0">
                </div>
                <div class="field">
                    <label>Monedas $5</label>
                    <input type="number" id="cierre-m5" value="0" min="0">
                </div>
                <div class="field">
                    <label>Monedas $10</label>
                    <input type="number" id="cierre-m10" value="0" min="0">
                </div>
                <div class="field">
                    <label>Monedas $20</label>
                    <input type="number" id="cierre-m20" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $20</label>
                    <input type="number" id="cierre-b20" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $50</label>
                    <input type="number" id="cierre-b50" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $100</label>
                    <input type="number" id="cierre-b100" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $200</label>
                    <input type="number" id="cierre-b200" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $500</label>
                    <input type="number" id="cierre-b500" value="0" min="0">
                </div>
                <div class="field">
                    <label>Billetes $1000</label>
                    <input type="number" id="cierre-b1000" value="0" min="0">
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: var(--gray-100); border-radius: 6px;">
                <strong>Total MXN: $<span id="cierre-total-mxn">0.00</span></strong>
            </div>
        </div>
        
        <div class="payment-section">
            <h3>💱 Otras Monedas</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div class="field">
                    <label>USD (Dólares)</label>
                    <input type="number" id="cierre-usd" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>CAD (Canadienses)</label>
                    <input type="number" id="cierre-cad" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>EUR (Euros)</label>
                    <input type="number" id="cierre-eur" value="0" min="0" step="0.01">
                </div>
            </div>
        </div>
        
        <div class="payment-section">
            <h3>💳 Pagos Electrónicos</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div class="field">
                    <label>BBVA Nacional</label>
                    <input type="number" id="cierre-bbva-nal" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>BBVA Internacional</label>
                    <input type="number" id="cierre-bbva-int" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>Clip Nacional</label>
                    <input type="number" id="cierre-clip-nal" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>Clip Internacional</label>
                    <input type="number" id="cierre-clip-int" value="0" min="0" step="0.01">
                </div>
                <div class="field">
                    <label>Transferencia</label>
                    <input type="number" id="cierre-transferencia" value="0" min="0" step="0.01">
                </div>
            </div>
        </div>
        
        <div class="payment-section">
            <h3>📝 Observaciones</h3>
            <textarea class="form-textarea" id="cierre-observaciones" placeholder="Notas del cierre de turno..."></textarea>
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="btn btn-outline" onclick="cerrarModal('modal-cerrar-turno')" style="flex: 1;">
                Cancelar
            </button>
            <button class="btn btn-danger" onclick="confirmarCerrarTurno()" style="flex: 2;">
                <i class="fas fa-lock"></i> Cerrar Turno
            </button>
        </div>
    `;
    
    // Agregar listeners para calcular total
    const inputs = body.querySelectorAll('input[id^="cierre-m"], input[id^="cierre-b"]');
    inputs.forEach(input => {
        input.addEventListener('input', calcularTotalCierre);
    });
    
    modal.classList.add('active');
}

function calcularTotalCierre() {
    const valores = {
        m1: parseInt(document.getElementById('cierre-m1').value) || 0,
        m2: parseInt(document.getElementById('cierre-m2').value) || 0,
        m5: parseInt(document.getElementById('cierre-m5').value) || 0,
        m10: parseInt(document.getElementById('cierre-m10').value) || 0,
        m20: parseInt(document.getElementById('cierre-m20').value) || 0,
        b20: parseInt(document.getElementById('cierre-b20').value) || 0,
        b50: parseInt(document.getElementById('cierre-b50').value) || 0,
        b100: parseInt(document.getElementById('cierre-b100').value) || 0,
        b200: parseInt(document.getElementById('cierre-b200').value) || 0,
        b500: parseInt(document.getElementById('cierre-b500').value) || 0,
        b1000: parseInt(document.getElementById('cierre-b1000').value) || 0
    };
    
    const total = 
        valores.m1 * 1 +
        valores.m2 * 2 +
        valores.m5 * 5 +
        valores.m10 * 10 +
        valores.m20 * 20 +
        valores.b20 * 20 +
        valores.b50 * 50 +
        valores.b100 * 100 +
        valores.b200 * 200 +
        valores.b500 * 500 +
        valores.b1000 * 1000;
    
    document.getElementById('cierre-total-mxn').textContent = total.toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

async function confirmarCerrarTurno() {
    if (!confirm('¿Estás seguro de cerrar el turno? Esta acción no se puede deshacer.')) {
        return;
    }
    
    const datos = {
        monedas1: parseInt(document.getElementById('cierre-m1').value) || 0,
        monedas2: parseInt(document.getElementById('cierre-m2').value) || 0,
        monedas5: parseInt(document.getElementById('cierre-m5').value) || 0,
        monedas10: parseInt(document.getElementById('cierre-m10').value) || 0,
        monedas20: parseInt(document.getElementById('cierre-m20').value) || 0,
        billetes20: parseInt(document.getElementById('cierre-b20').value) || 0,
        billetes50: parseInt(document.getElementById('cierre-b50').value) || 0,
        billetes100: parseInt(document.getElementById('cierre-b100').value) || 0,
        billetes200: parseInt(document.getElementById('cierre-b200').value) || 0,
        billetes500: parseInt(document.getElementById('cierre-b500').value) || 0,
        billetes1000: parseInt(document.getElementById('cierre-b1000').value) || 0,
        conteoUSD: parseFloat(document.getElementById('cierre-usd').value) || 0,
        conteoCAD: parseFloat(document.getElementById('cierre-cad').value) || 0,
        conteoEUR: parseFloat(document.getElementById('cierre-eur').value) || 0,
        bbvaNacional: parseFloat(document.getElementById('cierre-bbva-nal').value) || 0,
        bbvaInternacional: parseFloat(document.getElementById('cierre-bbva-int').value) || 0,
        clipNacional: parseFloat(document.getElementById('cierre-clip-nal').value) || 0,
        clipInternacional: parseFloat(document.getElementById('cierre-clip-int').value) || 0,
        transferencia: parseFloat(document.getElementById('cierre-transferencia').value) || 0,
        observaciones: document.getElementById('cierre-observaciones').value.trim()
    };
    
    try {
        const result = await Turno.cerrar(datos);
        
        if (result.success) {
            cerrarModal('modal-cerrar-turno');
            mostrarToast('Turno cerrado exitosamente', 'success');
            setTimeout(() => {
                mostrarPantallaTurno();
            }, 1500);
        } else {
            alert('Error: ' + (result.error || 'No se pudo cerrar el turno'));
        }
    } catch (error) {
        alert('Error de conexión al cerrar turno');
        console.error(error);
    }
}
