// ============================================
// CORTE DE TURNO - corte.js (CORREGIDO)
// Sin SweetAlert, usa modales nativos
// ============================================

const Corte = {
    datos: null,
    turnoId: null,

    // Obtener turno ID correctamente
    getTurnoId() {
        // 1. Desde Turno.actual
        if (typeof Turno !== 'undefined' && Turno.actual && Turno.actual.ID) {
            return Turno.actual.ID;
        }
        
        // 2. Buscar en localStorage con key correcta
        if (typeof Auth !== 'undefined') {
            const odooId = Auth.getOdooId ? Auth.getOdooId() : (Auth.getId ? Auth.getId() : null);
            if (odooId) {
                const key = 'umo_turno_' + odooId;
                const turnoData = localStorage.getItem(key);
                if (turnoData) {
                    try {
                        const turno = JSON.parse(turnoData);
                        return turno.ID || turno.id;
                    } catch (e) {}
                }
            }
        }
        
        // 3. Fallback: buscar cualquier turno
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('umo_turno_')) {
                try {
                    const turno = JSON.parse(localStorage.getItem(key));
                    if (turno && (turno.ID || turno.id)) {
                        return turno.ID || turno.id;
                    }
                } catch (e) {}
            }
        }
        
        return null;
    },

    // Abrir modal de corte
    async abrir() {
        this.turnoId = this.getTurnoId();
        
        if (!this.turnoId) {
            mostrarToast('No hay turno activo', 'error');
            return;
        }

        console.log('📊 Abriendo corte para turno:', this.turnoId);
        this.mostrarLoading();

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/turnos/${this.turnoId}/corte`);
            const data = await response.json();

            console.log('📦 Datos corte:', data);

            if (!data.success) {
                throw new Error(data.error || 'Error al cargar corte');
            }

            this.datos = data;
            
            // Si el turno ya está cerrado, mostrar modal de solo lectura con opción de recalcular
            if (data.turno.estado === 'Cerrado') {
                this.renderModalCerrado();
            } else {
                this.renderModal();
            }

        } catch (error) {
            console.error('❌ Error cargando corte:', error);
            mostrarToast('Error: ' + error.message, 'error');
            this.cerrar();
        }
    },

    // Modal para turno YA CERRADO - abre modal de autorización encima
    renderModalCerrado() {
        const d = this.datos;
        const modal = document.getElementById('modal-corte');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal modal-xl">
                <div class="modal-header" style="background: linear-gradient(135deg, #f44336, #c62828);">
                    <h3><i class="fas fa-lock"></i> Turno Cerrado</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                    
                    <div style="background:#fff3cd;border:1px solid #ffc107;padding:15px;border-radius:8px;margin-bottom:20px;text-align:center;">
                        <i class="fas fa-exclamation-triangle" style="color:#ff9800;font-size:24px;"></i>
                        <p style="margin:10px 0 0;font-weight:600;color:#856404;">Este turno ya fue cerrado. Para reabrirlo necesitas autorización de Admin/Gerente.</p>
                    </div>

                    <!-- INFO TURNO -->
                    <div class="corte-info-turno">
                        <span><strong>Turno:</strong> ${d.turno.id}</span>
                        <span><strong>Usuario:</strong> ${d.turno.usuario}</span>
                        <span><strong>Sucursal:</strong> ${d.turno.sucursal}</span>
                        <span><strong>Estado:</strong> <span style="color:#f44336;font-weight:bold;">CERRADO</span></span>
                    </div>

                    <div class="corte-grid">
                        <div class="corte-resumen">
                            <div class="corte-card">
                                <h4><i class="fas fa-shopping-cart"></i> Resumen de Ventas</h4>
                                <div class="corte-row"><span>Ventas Netas</span><span class="valor">$${d.ventas.netas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Número de ventas</span><span class="valor">${d.ventas.numVentas}</span></div>
                                <div class="corte-row"><span>Cancelaciones</span><span class="valor text-danger">${d.ventas.numCanceladas}</span></div>
                            </div>
                            
                            <div class="corte-card esperado">
                                <h4><i class="fas fa-calculator"></i> Efectivo Esperado</h4>
                                <div class="corte-row total big"><span>MXN</span><span>$${d.esperado.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>USD</span><span>$${d.esperado.usd.toFixed(2)}</span></div>
                                <div class="corte-row"><span>CAD</span><span>$${d.esperado.cad.toFixed(2)}</span></div>
                                <div class="corte-row"><span>EUR</span><span>€${d.esperado.eur.toFixed(2)}</span></div>
                            </div>
                        </div>
                        
                        <div class="corte-conteo">
                            <div class="corte-card" style="background:#ffebee;border-color:#f44336;">
                                <h4 style="color:#c62828;"><i class="fas fa-info-circle"></i> Turno Cerrado</h4>
                                <p style="font-size:13px;color:#666;margin-bottom:15px;">Para reabrir este turno y hacer un nuevo corte, necesitas autorización de un administrador.</p>
                                <p style="font-size:12px;color:#999;">Haz clic en "Reabrir Turno" para solicitar autorización.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Corte.cerrar()">Cancelar</button>
                    <button class="btn btn-warning" onclick="Corte.solicitarRecalcular()" style="background:#ff9800;color:white;">
                        <i class="fas fa-unlock"></i> Reabrir Turno
                    </button>
                </div>
            </div>
        `;
    },
    
    // Abrir modal de autorización ENCIMA del modal de corte
    solicitarRecalcular() {
        document.getElementById('recalcular-usuario').value = '';
        document.getElementById('recalcular-pin').value = '';
        document.getElementById('modal-recalcular').classList.add('active');
    },

    // Mostrar loading
    mostrarLoading() {
        document.getElementById('modal-corte')?.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-corte';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal modal-xl">
                <div class="modal-header">
                    <h3><i class="fas fa-cash-register"></i> Corte de Turno</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center;padding:60px;">
                    <div class="loader"></div>
                    <p style="margin-top:20px;color:#666;">Calculando corte...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Render del modal completo
    renderModal() {
        const d = this.datos;
        const modal = document.getElementById('modal-corte');
        if (!modal) return;
        
        modal.innerHTML = `
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
                        <span><strong>Apertura:</strong> ${d.turno.horaApertura || '-'}</span>
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
                                        <div class="conteo-item"><label>$1</label><input type="number" id="monedas1" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$2</label><input type="number" id="monedas2" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$5</label><input type="number" id="monedas5" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$10</label><input type="number" id="monedas10" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$20</label><input type="number" id="monedas20" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                    </div>
                                </div>

                                <div class="conteo-section">
                                    <h5>Billetes</h5>
                                    <div class="conteo-grid">
                                        <div class="conteo-item"><label>$20</label><input type="number" id="billetes20" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$50</label><input type="number" id="billetes50" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$100</label><input type="number" id="billetes100" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$200</label><input type="number" id="billetes200" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$500</label><input type="number" id="billetes500" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                        <div class="conteo-item"><label>$1000</label><input type="number" id="billetes1000" value="0" min="0" oninput="Corte.calcularTotal()"></div>
                                    </div>
                                </div>

                                <div class="conteo-total">
                                    <span>Total Contado MXN:</span>
                                    <span id="totalContadoMXN" class="big">$0.00</span>
                                </div>
                                <div class="conteo-diferencia ok" id="diferenciaMXN">
                                    <span>Diferencia:</span>
                                    <span id="difMXN">$0.00</span>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-globe"></i> Otras Monedas</h4>
                                <div class="conteo-grid-3">
                                    <div class="conteo-item">
                                        <label>USD 💵</label>
                                        <input type="number" id="conteoUSD" value="0" min="0" step="0.01" oninput="Corte.calcularTotal()">
                                        <small>Esperado: $${d.esperado.usd.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>CAD 🍁</label>
                                        <input type="number" id="conteoCAD" value="0" min="0" step="0.01" oninput="Corte.calcularTotal()">
                                        <small>Esperado: $${d.esperado.cad.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>EUR 🇪🇺</label>
                                        <input type="number" id="conteoEUR" value="0" min="0" step="0.01" oninput="Corte.calcularTotal()">
                                        <small>Esperado: €${d.esperado.eur.toFixed(2)}</small>
                                    </div>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-university"></i> Terminales / Bancos</h4>
                                <div class="conteo-grid-2">
                                    <div class="conteo-item">
                                        <label>BBVA Nacional</label>
                                        <input type="number" id="corteBbvaNacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.bbvaNacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>BBVA Internacional</label>
                                        <input type="number" id="corteBbvaInternacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.bbvaInternacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Nacional</label>
                                        <input type="number" id="corteClipNacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.clipNacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Internacional</label>
                                        <input type="number" id="corteClipInternacional" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.clipInternacional.toFixed(2)}</small>
                                    </div>
                                    <div class="conteo-item full">
                                        <label>Transferencia</label>
                                        <input type="number" id="corteTransferencia" value="0" min="0" step="0.01">
                                        <small>Sistema: $${d.pagos.transferencia.toFixed(2)}</small>
                                    </div>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-comment"></i> Observaciones</h4>
                                <textarea id="corteObservaciones" rows="3" placeholder="Notas del corte..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Corte.cerrar()">Cancelar</button>
                    <button class="btn btn-success" onclick="Corte.guardar()">
                        <i class="fas fa-lock"></i> Cerrar Turno
                    </button>
                </div>
            </div>
        `;

        this.calcularTotal();
    },

    // Calcular total contado
    calcularTotal() {
        const v = id => parseInt(document.getElementById(id)?.value) || 0;
        
        const total = v('monedas1') * 1 + v('monedas2') * 2 + v('monedas5') * 5 + 
                      v('monedas10') * 10 + v('monedas20') * 20 +
                      v('billetes20') * 20 + v('billetes50') * 50 + v('billetes100') * 100 + 
                      v('billetes200') * 200 + v('billetes500') * 500 + v('billetes1000') * 1000;

        const totalEl = document.getElementById('totalContadoMXN');
        if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

        if (this.datos) {
            const esperado = this.datos.esperado.efectivoMXN;
            const diferencia = total - esperado;
            const difEl = document.getElementById('difMXN');
            const difContainer = document.getElementById('diferenciaMXN');

            if (difEl) difEl.textContent = (diferencia >= 0 ? '+' : '') + '$' + diferencia.toFixed(2);
            if (difContainer) {
                difContainer.className = 'conteo-diferencia ' + 
                    (Math.abs(diferencia) < 0.01 ? 'ok' : diferencia > 0 ? 'sobrante' : 'faltante');
            }
        }
    },

    // Guardar corte
    async guardar() {
        if (!confirm('¿Estás seguro de cerrar el turno?\n\nEsta acción no se puede deshacer.')) {
            return;
        }

        mostrarToast('Guardando corte...', 'info');

        try {
            const v = id => document.getElementById(id)?.value || 0;
            
            const payload = {
                monedas1: v('monedas1'),
                monedas2: v('monedas2'),
                monedas5: v('monedas5'),
                monedas10: v('monedas10'),
                monedas20: v('monedas20'),
                billetes20: v('billetes20'),
                billetes50: v('billetes50'),
                billetes100: v('billetes100'),
                billetes200: v('billetes200'),
                billetes500: v('billetes500'),
                billetes1000: v('billetes1000'),
                conteoUSD: v('conteoUSD'),
                conteoCAD: v('conteoCAD'),
                conteoEUR: v('conteoEUR'),
                bbvaNacional: v('corteBbvaNacional'),
                bbvaInternacional: v('corteBbvaInternacional'),
                clipNacional: v('corteClipNacional'),
                clipInternacional: v('corteClipInternacional'),
                transferencia: v('corteTransferencia'),
                observaciones: document.getElementById('corteObservaciones')?.value || '',
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

            // Mostrar resumen con diferencia
            const dif = data.resumen.diferencia;
            let estadoDif = '✅ CUADRA PERFECTO';
            if (dif > 0) estadoDif = '⚠️ SOBRANTE';
            if (dif < 0) estadoDif = '❌ FALTANTE';
            
            alert(`
🔒 TURNO CERRADO EXITOSAMENTE

📊 RESUMEN DEL CORTE:
━━━━━━━━━━━━━━━━━━━━━
💰 Total Contado: $${data.resumen.totalContado.toFixed(2)}
📋 Esperado: $${data.resumen.esperado.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━
${estadoDif}
Diferencia: $${dif.toFixed(2)}
${data.resumen.difUSD !== 0 ? `\nUSD: ${data.resumen.difUSD >= 0 ? '+' : ''}$${data.resumen.difUSD.toFixed(2)}` : ''}
${data.resumen.difCAD !== 0 ? `CAD: ${data.resumen.difCAD >= 0 ? '+' : ''}$${data.resumen.difCAD.toFixed(2)}` : ''}
${data.resumen.difEUR !== 0 ? `EUR: ${data.resumen.difEUR >= 0 ? '+' : ''}€${data.resumen.difEUR.toFixed(2)}` : ''}
            `.trim());
            
            mostrarToast('Turno cerrado exitosamente', 'success');
            this.cerrar();
            
            // Limpiar turno local
            if (typeof Turno !== 'undefined') {
                Turno.limpiar();
            }
            
            // Redirigir a pantalla de turno
            setTimeout(() => {
                if (typeof mostrarPantallaTurno === 'function') {
                    mostrarPantallaTurno();
                } else {
                    location.reload();
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error guardando corte:', error);
            mostrarToast('Error: ' + error.message, 'error');
        }
    },

    // Ejecutar recalcular (reabrir turno cerrado)
    async ejecutarRecalcular() {
        const usuarioId = document.getElementById('recalcular-usuario')?.value?.trim();
        const pin = document.getElementById('recalcular-pin')?.value?.trim();

        if (!usuarioId || !pin) {
            mostrarToast('Ingresa ID y PIN', 'error');
            return;
        }

        mostrarToast('Verificando autorización...', 'info');

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/turnos/${this.turnoId}/recalcular`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuarioId, pin })
            });

            const data = await response.json();

            if (!data.success) {
                mostrarToast(data.error || 'No autorizado', 'error');
                return;
            }

            // Cerrar modal de autorización
            cerrarModal('modal-recalcular');
            
            mostrarToast(`Turno reabierto por ${data.autorizadoPor}`, 'success');
            
            // Recargar el corte (ahora mostrará el modal normal porque está abierto)
            setTimeout(() => this.abrir(), 500);

        } catch (error) {
            console.error('❌ Error recalcular:', error);
            mostrarToast('Error: ' + error.message, 'error');
        }
    },

    // Cerrar modal
    cerrar() {
        document.getElementById('modal-corte')?.remove();
        cerrarModal('modal-recalcular'); // También cerrar si está abierto
    }
};

// Función global
function abrirCorte() {
    Corte.abrir();
}
