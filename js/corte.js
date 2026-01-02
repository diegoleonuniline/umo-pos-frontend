// ============================================
// CORTE DE TURNO - corte.js
// ============================================

const Corte = {
    datos: null,
    turnoId: null,

    // Abrir modal de corte
    async abrir(turnoId) {
        this.turnoId = turnoId || window.turnoActual?.ID || localStorage.getItem('turnoId');
        
        if (!this.turnoId) {
            Swal.fire('Error', 'No hay turno activo', 'error');
            return;
        }

        Swal.fire({ title: 'Cargando corte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/turnos/${this.turnoId}/corte`);
            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            this.datos = data;
            Swal.close();
            this.renderModal();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    },

    // Render del modal
    renderModal() {
        const d = this.datos;
        
        const modalHTML = `
        <div id="modal-corte" class="modal-overlay active">
            <div class="modal modal-xl">
                <div class="modal-header">
                    <h3><i class="fas fa-cash-register"></i> Corte de Turno</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                    
                    <!-- INFO TURNO -->
                    <div class="corte-info-turno">
                        <span><strong>Turno:</strong> ${d.turno.id}</span>
                        <span><strong>Usuario:</strong> ${d.turno.usuario}</span>
                        <span><strong>Sucursal:</strong> ${d.turno.sucursal}</span>
                        <span><strong>Apertura:</strong> ${d.turno.horaApertura}</span>
                    </div>

                    <div class="corte-grid">
                        <!-- COLUMNA IZQUIERDA: RESUMEN -->
                        <div class="corte-resumen">
                            
                            <!-- VENTAS -->
                            <div class="corte-card">
                                <h4><i class="fas fa-shopping-cart"></i> Ventas del Turno</h4>
                                <div class="corte-row"><span>Ventas Brutas</span><span class="valor">$${d.ventas.brutas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Descuentos</span><span class="valor text-warning">-$${d.ventas.descuentos.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Cancelaciones (${d.ventas.numCanceladas})</span><span class="valor text-danger">-$${d.ventas.cancelaciones.toFixed(2)}</span></div>
                                <div class="corte-row total"><span>Ventas Netas</span><span class="valor">$${d.ventas.netas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Número de ventas</span><span class="valor">${d.ventas.numVentas}</span></div>
                                <div class="corte-row"><span>Ticket Promedio</span><span class="valor">$${d.ventas.ticketPromedio.toFixed(2)}</span></div>
                            </div>

                            <!-- FORMAS DE PAGO -->
                            <div class="corte-card">
                                <h4><i class="fas fa-credit-card"></i> Formas de Pago</h4>
                                <div class="corte-row"><span>Efectivo MXN</span><span class="valor">$${d.pagos.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo USD</span><span class="valor">$${d.pagos.efectivoUSD.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo CAD</span><span class="valor">$${d.pagos.efectivoCAD.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo EUR</span><span class="valor">€${d.pagos.efectivoEUR.toFixed(2)}</span></div>
                                <div class="corte-row"><span>BBVA Nacional</span><span class="valor">$${d.pagos.bbvaNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>BBVA Internacional</span><span class="valor">$${d.pagos.bbvaInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Nacional</span><span class="valor">$${d.pagos.clipNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Internacional</span><span class="valor">$${d.pagos.clipInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Transferencia</span><span class="valor">$${d.pagos.transferencia.toFixed(2)}</span></div>
                                <div class="corte-row total"><span>Total Pagado (MXN)</span><span class="valor">$${d.pagos.totalMXN.toFixed(2)}</span></div>
                            </div>

                            <!-- MOVIMIENTOS -->
                            <div class="corte-card">
                                <h4><i class="fas fa-exchange-alt"></i> Movimientos de Caja</h4>
                                <div class="corte-row"><span>Entradas/Depósitos</span><span class="valor text-success">+$${d.movimientos.entradas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Salidas/Retiros</span><span class="valor text-danger">-$${d.movimientos.salidas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Gastos</span><span class="valor text-danger">-$${d.movimientos.gastos.toFixed(2)}</span></div>
                                <div class="corte-row total"><span>Neto</span><span class="valor ${d.movimientos.neto >= 0 ? 'text-success' : 'text-danger'}">$${d.movimientos.neto.toFixed(2)}</span></div>
                            </div>

                            <!-- ESPERADO -->
                            <div class="corte-card esperado">
                                <h4><i class="fas fa-calculator"></i> Efectivo Esperado</h4>
                                <div class="corte-row"><span>Inicial</span><span>$${d.inicioCaja.efectivo.toFixed(2)}</span></div>
                                <div class="corte-row"><span>+ Pagos Efectivo</span><span>$${d.pagos.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>+ Entradas</span><span>$${d.movimientos.entradas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>- Salidas</span><span>$${d.movimientos.salidas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>- Gastos</span><span>$${d.movimientos.gastos.toFixed(2)}</span></div>
                                <div class="corte-row total big"><span>= ESPERADO MXN</span><span id="esperadoMXN">$${d.esperado.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>USD Esperado</span><span id="esperadoUSD">$${d.esperado.usd.toFixed(2)}</span></div>
                                <div class="corte-row"><span>CAD Esperado</span><span id="esperadoCAD">$${d.esperado.cad.toFixed(2)}</span></div>
                                <div class="corte-row"><span>EUR Esperado</span><span id="esperadoEUR">€${d.esperado.eur.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <!-- COLUMNA DERECHA: CONTEO -->
                        <div class="corte-conteo">
                            <div class="corte-card">
                                <h4><i class="fas fa-coins"></i> Conteo de Efectivo MXN</h4>
                                
                                <div class="conteo-section">
                                    <h5>Monedas</h5>
                                    <div class="conteo-grid">
                                        <div class="conteo-item">
                                            <label>$1</label>
                                            <input type="number" id="monedas1" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$2</label>
                                            <input type="number" id="monedas2" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$5</label>
                                            <input type="number" id="monedas5" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$10</label>
                                            <input type="number" id="monedas10" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$20</label>
                                            <input type="number" id="monedas20" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                    </div>
                                </div>

                                <div class="conteo-section">
                                    <h5>Billetes</h5>
                                    <div class="conteo-grid">
                                        <div class="conteo-item">
                                            <label>$20</label>
                                            <input type="number" id="billetes20" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$50</label>
                                            <input type="number" id="billetes50" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$100</label>
                                            <input type="number" id="billetes100" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$200</label>
                                            <input type="number" id="billetes200" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$500</label>
                                            <input type="number" id="billetes500" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                        <div class="conteo-item">
                                            <label>$1000</label>
                                            <input type="number" id="billetes1000" value="0" min="0" onchange="Corte.calcularTotal()">
                                        </div>
                                    </div>
                                </div>

                                <div class="conteo-total">
                                    <span>Total Contado MXN:</span>
                                    <span id="totalContadoMXN" class="big">$0.00</span>
                                </div>
                                <div class="conteo-diferencia" id="diferenciaMXN">
                                    <span>Diferencia:</span>
                                    <span id="difMXN">$0.00</span>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-globe"></i> Otras Monedas</h4>
                                <div class="conteo-grid-3">
                                    <div class="conteo-item">
                                        <label>USD 💵</label>
                                        <input type="number" id="conteoUSD" value="0" min="0" step="0.01" onchange="Corte.calcularTotal()">
                                        <small>Esperado: $${d.esperado.usd.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>CAD 🍁</label>
                                        <input type="number" id="conteoCAD" value="0" min="0" step="0.01" onchange="Corte.calcularTotal()">
                                        <small>Esperado: $${d.esperado.cad.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>EUR 🇪🇺</label>
                                        <input type="number" id="conteoEUR" value="0" min="0" step="0.01" onchange="Corte.calcularTotal()">
                                        <small>Esperado: €${d.esperado.eur.toFixed(2)}</small>
                                    </div>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-university"></i> Terminales / Bancos</h4>
                                <div class="conteo-grid-2">
                                    <div class="conteo-item">
                                        <label>BBVA Nacional</label>
                                        <input type="number" id="bbvaNacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.bbvaNacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>BBVA Internacional</label>
                                        <input type="number" id="bbvaInternacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.bbvaInternacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Nacional</label>
                                        <input type="number" id="clipNacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.clipNacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Internacional</label>
                                        <input type="number" id="clipInternacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.clipInternacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item full">
                                        <label>Transferencia</label>
                                        <input type="number" id="transferencia" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.transferencia.toFixed(2)}</small>
                                    </div>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-comment"></i> Observaciones</h4>
                                <textarea id="observaciones" rows="3" placeholder="Notas del corte..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Corte.cerrar()">Cancelar</button>
                    <button class="btn btn-primary" onclick="Corte.guardar()">
                        <i class="fas fa-save"></i> Cerrar Turno
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.calcularTotal();
    },

    // Calcular total contado
    calcularTotal() {
        const monedas1 = parseInt(document.getElementById('monedas1')?.value) || 0;
        const monedas2 = parseInt(document.getElementById('monedas2')?.value) || 0;
        const monedas5 = parseInt(document.getElementById('monedas5')?.value) || 0;
        const monedas10 = parseInt(document.getElementById('monedas10')?.value) || 0;
        const monedas20 = parseInt(document.getElementById('monedas20')?.value) || 0;
        const billetes20 = parseInt(document.getElementById('billetes20')?.value) || 0;
        const billetes50 = parseInt(document.getElementById('billetes50')?.value) || 0;
        const billetes100 = parseInt(document.getElementById('billetes100')?.value) || 0;
        const billetes200 = parseInt(document.getElementById('billetes200')?.value) || 0;
        const billetes500 = parseInt(document.getElementById('billetes500')?.value) || 0;
        const billetes1000 = parseInt(document.getElementById('billetes1000')?.value) || 0;

        const total = monedas1 * 1 + monedas2 * 2 + monedas5 * 5 + monedas10 * 10 + monedas20 * 20 +
                      billetes20 * 20 + billetes50 * 50 + billetes100 * 100 + billetes200 * 200 +
                      billetes500 * 500 + billetes1000 * 1000;

        document.getElementById('totalContadoMXN').textContent = '$' + total.toFixed(2);

        const esperado = this.datos.esperado.efectivoMXN;
        const diferencia = total - esperado;
        const difEl = document.getElementById('difMXN');
        const difContainer = document.getElementById('diferenciaMXN');

        difEl.textContent = (diferencia >= 0 ? '+' : '') + '$' + diferencia.toFixed(2);
        difContainer.className = 'conteo-diferencia ' + (diferencia === 0 ? 'ok' : diferencia > 0 ? 'sobrante' : 'faltante');
    },

    // Guardar corte
    async guardar() {
        const resultado = await Swal.fire({
            title: '¿Cerrar turno?',
            text: 'Esta acción no se puede deshacer',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar'
        });

        if (!resultado.isConfirmed) return;

        Swal.fire({ title: 'Guardando corte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const payload = {
                monedas1: document.getElementById('monedas1').value,
                monedas2: document.getElementById('monedas2').value,
                monedas5: document.getElementById('monedas5').value,
                monedas10: document.getElementById('monedas10').value,
                monedas20: document.getElementById('monedas20').value,
                billetes20: document.getElementById('billetes20').value,
                billetes50: document.getElementById('billetes50').value,
                billetes100: document.getElementById('billetes100').value,
                billetes200: document.getElementById('billetes200').value,
                billetes500: document.getElementById('billetes500').value,
                billetes1000: document.getElementById('billetes1000').value,
                conteoUSD: document.getElementById('conteoUSD').value,
                conteoCAD: document.getElementById('conteoCAD').value,
                conteoEUR: document.getElementById('conteoEUR').value,
                bbvaNacional: document.getElementById('bbvaNacional').value,
                bbvaInternacional: document.getElementById('bbvaInternacional').value,
                clipNacional: document.getElementById('clipNacional').value,
                clipInternacional: document.getElementById('clipInternacional').value,
                transferencia: document.getElementById('transferencia').value,
                observaciones: document.getElementById('observaciones').value,
                ventasBrutas: this.datos.ventas.brutas,
                descuentos: this.datos.ventas.descuentos,
                cancelaciones: this.datos.ventas.cancelaciones,
                ventasNetas: this.datos.ventas.netas,
                efectivoEsperado: this.datos.esperado.efectivoMXN,
                usdEsperado: this.datos.esperado.usd,
                cadEsperado: this.datos.esperado.cad,
                eurEsperado: this.datos.esperado.eur,
                numVentas: this.datos.ventas.numVentas,
                ticketPromedio: this.datos.ventas.ticketPromedio,
                entradas: this.datos.movimientos.entradas,
                salidas: this.datos.movimientos.salidas,
                gastos: this.datos.movimientos.gastos,
                pagosEfectivoMXN: this.datos.pagos.efectivoMXN,
                pagosBBVANacional: this.datos.pagos.bbvaNacional,
                pagosBBVAInternacional: this.datos.pagos.bbvaInternacional,
                pagosClipNacional: this.datos.pagos.clipNacional,
                pagosClipInternacional: this.datos.pagos.clipInternacional,
                pagosTransferencia: this.datos.pagos.transferencia
            };

            const response = await fetch(`${CONFIG.API_URL}/api/turnos/${this.turnoId}/cerrar-corte`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.error);

            await Swal.fire({
                title: '¡Turno cerrado!',
                html: `
                    <p>Total contado: <strong>$${data.resumen.totalContado.toFixed(2)}</strong></p>
                    <p>Esperado: <strong>$${data.resumen.esperado.toFixed(2)}</strong></p>
                    <p>Diferencia: <strong class="${data.resumen.diferencia >= 0 ? 'text-success' : 'text-danger'}">$${data.resumen.diferencia.toFixed(2)}</strong></p>
                `,
                icon: 'success'
            });

            this.cerrar();
            
            // Limpiar turno y redirigir a login
            localStorage.removeItem('turnoId');
            localStorage.removeItem('turnoActivo');
            window.location.href = 'index.html';

        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    },

    // Cerrar modal
    cerrar() {
        document.getElementById('modal-corte')?.remove();
    }
};

// Función global para abrir corte
function abrirCorte(turnoId) {
    Corte.abrir(turnoId);
}
