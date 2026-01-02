// ============================================
// CORTE DE TURNO - corte.js
// Flujo: Conteo → Calcular → Resumen → Cerrar
// ============================================

const Corte = {
    datos: null,
    turnoId: null,
    paso: 1, // 1 = conteo, 2 = resumen

    // Obtener turno ID correctamente
    getTurnoId() {
        if (typeof Turno !== 'undefined' && Turno.actual && Turno.actual.ID) {
            return Turno.actual.ID;
        }
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
        this.paso = 1;
        
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
            
            // Si el turno ya está cerrado, mostrar modal de cerrado
            if (data.turno.estado === 'Cerrado') {
                this.renderModalCerrado();
            } else {
                // PASO 1: Mostrar formulario de conteo
                this.renderPasoConteo();
            }

        } catch (error) {
            console.error('❌ Error cargando corte:', error);
            mostrarToast('Error: ' + error.message, 'error');
            this.cerrar();
        }
    },

    // Mostrar loading
    mostrarLoading() {
        document.getElementById('modal-corte')?.remove();
        const modal = document.createElement('div');
        modal.id = 'modal-corte';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-cash-register"></i> Corte de Turno</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center;padding:60px;">
                    <div class="loader"></div>
                    <p style="margin-top:20px;color:#666;">Cargando datos del turno...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // ========================================
    // PASO 1: Formulario de conteo
    // ========================================
    renderPasoConteo() {
        const d = this.datos;
        const modal = document.getElementById('modal-corte');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3><i class="fas fa-calculator"></i> Corte de Turno - Conteo</h3>
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

                    <div style="text-align:center;margin-bottom:20px;padding:15px;background:#e3f2fd;border-radius:8px;">
                        <i class="fas fa-info-circle" style="color:#1976d2;font-size:20px;"></i>
                        <p style="margin:8px 0 0;color:#1565c0;font-weight:500;">Ingresa el conteo físico de tu caja</p>
                    </div>

                    <div class="corte-grid">
                        <!-- CONTEO EFECTIVO MXN -->
                        <div class="corte-card">
                            <h4><i class="fas fa-coins"></i> Conteo de Efectivo MXN</h4>
                            
                            <div class="conteo-section">
                                <h5>Monedas</h5>
                                <div class="conteo-grid">
                                    <div class="conteo-item"><label>$1</label><input type="number" id="monedas1" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$2</label><input type="number" id="monedas2" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$5</label><input type="number" id="monedas5" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$10</label><input type="number" id="monedas10" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$20</label><input type="number" id="monedas20" value="0" min="0"></div>
                                </div>
                            </div>

                            <div class="conteo-section">
                                <h5>Billetes</h5>
                                <div class="conteo-grid">
                                    <div class="conteo-item"><label>$20</label><input type="number" id="billetes20" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$50</label><input type="number" id="billetes50" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$100</label><input type="number" id="billetes100" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$200</label><input type="number" id="billetes200" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$500</label><input type="number" id="billetes500" value="0" min="0"></div>
                                    <div class="conteo-item"><label>$1000</label><input type="number" id="billetes1000" value="0" min="0"></div>
                                </div>
                            </div>
                        </div>

                        <!-- OTRAS MONEDAS Y TERMINALES -->
                        <div>
                            <div class="corte-card">
                                <h4><i class="fas fa-globe"></i> Otras Monedas</h4>
                                <div class="conteo-grid-3">
                                    <div class="conteo-item">
                                        <label>USD 💵</label>
                                        <input type="number" id="conteoUSD" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item">
                                        <label>CAD 🍁</label>
                                        <input type="number" id="conteoCAD" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item">
                                        <label>EUR 🇪🇺</label>
                                        <input type="number" id="conteoEUR" value="0" min="0" step="0.01">
                                    </div>
                                </div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-university"></i> Terminales / Bancos</h4>
                                <div class="conteo-grid-2">
                                    <div class="conteo-item">
                                        <label>BBVA Nacional</label>
                                        <input type="number" id="corteBbvaNacional" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item">
                                        <label>BBVA Internacional</label>
                                        <input type="number" id="corteBbvaInternacional" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Nacional</label>
                                        <input type="number" id="corteClipNacional" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item">
                                        <label>Clip Internacional</label>
                                        <input type="number" id="corteClipInternacional" value="0" min="0" step="0.01">
                                    </div>
                                    <div class="conteo-item full">
                                        <label>Transferencia</label>
                                        <input type="number" id="corteTransferencia" value="0" min="0" step="0.01">
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
                    <button class="btn btn-primary" onclick="Corte.calcular()">
                        <i class="fas fa-calculator"></i> Calcular
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================
    // PASO 2: Mostrar resumen con diferencias
    // ========================================
    calcular() {
        this.paso = 2;
        
        // Obtener valores del conteo
        const v = id => parseFloat(document.getElementById(id)?.value) || 0;
        
        // Calcular total MXN
        const totalMXN = v('monedas1') * 1 + v('monedas2') * 2 + v('monedas5') * 5 + 
                         v('monedas10') * 10 + v('monedas20') * 20 +
                         v('billetes20') * 20 + v('billetes50') * 50 + v('billetes100') * 100 + 
                         v('billetes200') * 200 + v('billetes500') * 500 + v('billetes1000') * 1000;

        // Guardar conteo para después
        this.conteo = {
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
            totalMXN: totalMXN,
            usd: v('conteoUSD'),
            cad: v('conteoCAD'),
            eur: v('conteoEUR'),
            bbvaNacional: v('corteBbvaNacional'),
            bbvaInternacional: v('corteBbvaInternacional'),
            clipNacional: v('corteClipNacional'),
            clipInternacional: v('corteClipInternacional'),
            transferencia: v('corteTransferencia'),
            observaciones: document.getElementById('corteObservaciones')?.value || ''
        };

        // Calcular diferencias
        const d = this.datos;
        const difMXN = totalMXN - d.esperado.efectivoMXN;
        const difUSD = this.conteo.usd - d.esperado.usd;
        const difCAD = this.conteo.cad - d.esperado.cad;
        const difEUR = this.conteo.eur - d.esperado.eur;
        const difBBVANac = this.conteo.bbvaNacional - d.pagos.bbvaNacional;
        const difBBVAInt = this.conteo.bbvaInternacional - d.pagos.bbvaInternacional;
        const difClipNac = this.conteo.clipNacional - d.pagos.clipNacional;
        const difClipInt = this.conteo.clipInternacional - d.pagos.clipInternacional;
        const difTransf = this.conteo.transferencia - d.pagos.transferencia;

        this.diferencias = { difMXN, difUSD, difCAD, difEUR, difBBVANac, difBBVAInt, difClipNac, difClipInt, difTransf };

        // Renderizar paso 2
        this.renderPasoResumen();
    },

    renderPasoResumen() {
        const d = this.datos;
        const c = this.conteo;
        const dif = this.diferencias;
        const modal = document.getElementById('modal-corte');
        if (!modal) return;

        // Determinar estado general
        const difTotal = Math.abs(dif.difMXN) + Math.abs(dif.difUSD) + Math.abs(dif.difCAD) + Math.abs(dif.difEUR);
        let estadoClass = 'ok';
        let estadoIcon = 'fa-check-circle';
        let estadoTexto = '✅ CUADRA PERFECTO';
        let estadoColor = '#4caf50';
        
        if (difTotal > 0.01) {
            if (dif.difMXN > 0) {
                estadoClass = 'sobrante';
                estadoIcon = 'fa-exclamation-triangle';
                estadoTexto = '⚠️ SOBRANTE';
                estadoColor = '#ff9800';
            } else {
                estadoClass = 'faltante';
                estadoIcon = 'fa-times-circle';
                estadoTexto = '❌ FALTANTE';
                estadoColor = '#f44336';
            }
        }

        const formatDif = (val) => {
            if (Math.abs(val) < 0.01) return '<span style="color:#4caf50">$0.00 ✓</span>';
            const sign = val > 0 ? '+' : '';
            const color = val > 0 ? '#ff9800' : '#f44336';
            return `<span style="color:${color};font-weight:600">${sign}$${val.toFixed(2)}</span>`;
        };

        modal.innerHTML = `
            <div class="modal modal-xl">
                <div class="modal-header" style="background: linear-gradient(135deg, ${estadoColor}, ${estadoColor}dd);">
                    <h3><i class="fas ${estadoIcon}"></i> Resumen del Corte</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
                    
                    <!-- ESTADO GENERAL -->
                    <div style="text-align:center;padding:20px;background:${estadoColor}15;border:2px solid ${estadoColor};border-radius:12px;margin-bottom:20px;">
                        <div style="font-size:48px;margin-bottom:10px;">${estadoTexto.split(' ')[0]}</div>
                        <div style="font-size:24px;font-weight:700;color:${estadoColor};">${estadoTexto.split(' ').slice(1).join(' ')}</div>
                        <div style="font-size:32px;font-weight:700;margin-top:10px;color:${estadoColor};">
                            ${dif.difMXN >= 0 ? '+' : ''}$${dif.difMXN.toFixed(2)} MXN
                        </div>
                    </div>

                    <div class="corte-grid">
                        <!-- COLUMNA IZQUIERDA: RESUMEN SISTEMA -->
                        <div class="corte-resumen">
                            <div class="corte-card">
                                <h4><i class="fas fa-shopping-cart"></i> Ventas del Turno</h4>
                                <div class="corte-row"><span>Ventas Brutas</span><span class="valor">$${d.ventas.brutas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Descuentos</span><span class="valor text-warning">-$${d.ventas.descuentos.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Cancelaciones (${d.ventas.numCanceladas})</span><span class="valor text-danger">-$${d.ventas.cancelaciones.toFixed(2)}</span></div>
                                <div class="corte-row total"><span>Ventas Netas</span><span class="valor">$${d.ventas.netas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Número de ventas</span><span class="valor">${d.ventas.numVentas}</span></div>
                                <div class="corte-row"><span>Ticket Promedio</span><span class="valor">$${d.ventas.ticketPromedio.toFixed(2)}</span></div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-credit-card"></i> Formas de Pago (Sistema)</h4>
                                <div class="corte-row"><span>Efectivo MXN</span><span class="valor">$${d.pagos.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo USD</span><span class="valor">$${d.pagos.efectivoUSD.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo CAD</span><span class="valor">$${d.pagos.efectivoCAD.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Efectivo EUR</span><span class="valor">€${d.pagos.efectivoEUR.toFixed(2)}</span></div>
                                <div class="corte-row"><span>BBVA Nacional</span><span class="valor">$${d.pagos.bbvaNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>BBVA Internacional</span><span class="valor">$${d.pagos.bbvaInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Nacional</span><span class="valor">$${d.pagos.clipNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Internacional</span><span class="valor">$${d.pagos.clipInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Transferencia</span><span class="valor">$${d.pagos.transferencia.toFixed(2)}</span></div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-exchange-alt"></i> Movimientos de Caja</h4>
                                <div class="corte-row"><span>Entradas/Depósitos</span><span class="valor text-success">+$${d.movimientos.entradas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Salidas/Retiros</span><span class="valor text-danger">-$${d.movimientos.salidas.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Gastos</span><span class="valor text-danger">-$${d.movimientos.gastos.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <!-- COLUMNA DERECHA: COMPARATIVA -->
                        <div class="corte-conteo">
                            <div class="corte-card esperado">
                                <h4><i class="fas fa-balance-scale"></i> Comparativa Efectivo MXN</h4>
                                <div class="corte-row"><span>Esperado (Sistema)</span><span class="valor">$${d.esperado.efectivoMXN.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Contado (Físico)</span><span class="valor">$${c.totalMXN.toFixed(2)}</span></div>
                                <div class="corte-row total"><span>Diferencia</span><span>${formatDif(dif.difMXN)}</span></div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-globe"></i> Otras Monedas</h4>
                                <div class="corte-row"><span>USD - Esperado: $${d.esperado.usd.toFixed(2)}</span><span>Contado: $${c.usd.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Diferencia USD</span><span>${formatDif(dif.difUSD)}</span></div>
                                <div class="corte-row"><span>CAD - Esperado: $${d.esperado.cad.toFixed(2)}</span><span>Contado: $${c.cad.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Diferencia CAD</span><span>${formatDif(dif.difCAD)}</span></div>
                                <div class="corte-row"><span>EUR - Esperado: €${d.esperado.eur.toFixed(2)}</span><span>Contado: €${c.eur.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Diferencia EUR</span><span>${formatDif(dif.difEUR)}</span></div>
                            </div>

                            <div class="corte-card">
                                <h4><i class="fas fa-university"></i> Terminales / Bancos</h4>
                                <div class="corte-row"><span>BBVA Nacional</span><span>Sistema: $${d.pagos.bbvaNacional.toFixed(2)} | Contado: $${c.bbvaNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>BBVA Internacional</span><span>Sistema: $${d.pagos.bbvaInternacional.toFixed(2)} | Contado: $${c.bbvaInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Nacional</span><span>Sistema: $${d.pagos.clipNacional.toFixed(2)} | Contado: $${c.clipNacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Clip Internacional</span><span>Sistema: $${d.pagos.clipInternacional.toFixed(2)} | Contado: $${c.clipInternacional.toFixed(2)}</span></div>
                                <div class="corte-row"><span>Transferencia</span><span>Sistema: $${d.pagos.transferencia.toFixed(2)} | Contado: $${c.transferencia.toFixed(2)}</span></div>
                            </div>

                            ${c.observaciones ? `
                            <div class="corte-card">
                                <h4><i class="fas fa-comment"></i> Observaciones</h4>
                                <p style="margin:0;color:#666;">${c.observaciones}</p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-warning" onclick="Corte.solicitarVolver()" style="background:#ff9800;color:white;">
                        <i class="fas fa-arrow-left"></i> Volver a Editar
                    </button>
                    <button class="btn btn-success" onclick="Corte.confirmarCerrar()">
                        <i class="fas fa-lock"></i> Cerrar Turno
                    </button>
                </div>
            </div>
        `;
    },

    // ========================================
    // Volver a editar (requiere claves)
    // ========================================
    solicitarVolver() {
        document.getElementById('recalcular-usuario').value = '';
        document.getElementById('recalcular-pin').value = '';
        // Cambiar título del modal
        const modalTitle = document.querySelector('#modal-recalcular h4');
        if (modalTitle) modalTitle.textContent = 'Volver a Editar';
        const modalDesc = document.querySelector('#modal-recalcular .recalcular-form p');
        if (modalDesc) modalDesc.textContent = 'Para volver a editar el conteo necesitas autorización.';
        
        this.accionRecalcular = 'volver'; // Marcar que es para volver
        document.getElementById('modal-recalcular').classList.add('active');
    },

    // ========================================
    // Confirmar cierre de turno
    // ========================================
    confirmarCerrar() {
        if (!confirm('¿Estás seguro de cerrar el turno?\n\nEsta acción no se puede deshacer.')) {
            return;
        }
        this.guardar();
    },

    // ========================================
    // Guardar corte y cerrar turno
    // ========================================
    async guardar() {
        mostrarToast('Cerrando turno...', 'info');

        try {
            const c = this.conteo;
            const d = this.datos;
            const dif = this.diferencias;
            
            const payload = {
                // Conteo físico
                monedas1: c.monedas1,
                monedas2: c.monedas2,
                monedas5: c.monedas5,
                monedas10: c.monedas10,
                monedas20: c.monedas20,
                billetes20: c.billetes20,
                billetes50: c.billetes50,
                billetes100: c.billetes100,
                billetes200: c.billetes200,
                billetes500: c.billetes500,
                billetes1000: c.billetes1000,
                totalContadoMXN: c.totalMXN,
                conteoUSD: c.usd,
                conteoCAD: c.cad,
                conteoEUR: c.eur,
                bbvaNacional: c.bbvaNacional,
                bbvaInternacional: c.bbvaInternacional,
                clipNacional: c.clipNacional,
                clipInternacional: c.clipInternacional,
                transferencia: c.transferencia,
                observaciones: c.observaciones,
                // Datos del sistema
                ventasBrutas: d.ventas.brutas,
                descuentos: d.ventas.descuentos,
                cancelaciones: d.ventas.cancelaciones,
                ventasNetas: d.ventas.netas,
                numVentas: d.ventas.numVentas,
                ticketPromedio: d.ventas.ticketPromedio,
                // Esperados
                efectivoEsperado: d.esperado.efectivoMXN,
                usdEsperado: d.esperado.usd,
                cadEsperado: d.esperado.cad,
                eurEsperado: d.esperado.eur,
                // Diferencias
                diferenciaMXN: dif.difMXN,
                diferenciaUSD: dif.difUSD,
                diferenciaCAD: dif.difCAD,
                diferenciaEUR: dif.difEUR,
                // Movimientos
                entradas: d.movimientos.entradas,
                salidas: d.movimientos.salidas,
                gastos: d.movimientos.gastos,
                // Pagos sistema
                pagosEfectivoMXN: d.pagos.efectivoMXN,
                pagosBBVANacional: d.pagos.bbvaNacional,
                pagosBBVAInternacional: d.pagos.bbvaInternacional,
                pagosClipNacional: d.pagos.clipNacional,
                pagosClipInternacional: d.pagos.clipInternacional,
                pagosTransferencia: d.pagos.transferencia
            };

            const response = await fetch(`${CONFIG.API_URL}/api/turnos/${this.turnoId}/cerrar-corte`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

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

    // ========================================
    // Modal para turno YA CERRADO
    // ========================================
    renderModalCerrado() {
        const d = this.datos;
        const modal = document.getElementById('modal-corte');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header" style="background: linear-gradient(135deg, #f44336, #c62828);">
                    <h3><i class="fas fa-lock"></i> Turno Cerrado</h3>
                    <button class="btn-close" onclick="Corte.cerrar()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="text-align:center;padding:40px;">
                    <div style="font-size:64px;margin-bottom:20px;">🔒</div>
                    <h2 style="margin:0 0 10px;color:#c62828;">Este turno ya fue cerrado</h2>
                    <p style="color:#666;margin-bottom:30px;">Para reabrir el turno y hacer un nuevo corte, necesitas autorización de un administrador.</p>
                    
                    <div style="background:#f5f5f5;padding:20px;border-radius:10px;max-width:400px;margin:0 auto;">
                        <p style="margin:0 0 15px;font-weight:600;color:#333;">Información del turno:</p>
                        <p style="margin:5px 0;color:#666;"><strong>ID:</strong> ${d.turno.id}</p>
                        <p style="margin:5px 0;color:#666;"><strong>Usuario:</strong> ${d.turno.usuario}</p>
                        <p style="margin:5px 0;color:#666;"><strong>Sucursal:</strong> ${d.turno.sucursal}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Corte.cerrar()">Cancelar</button>
                    <button class="btn btn-warning" onclick="Corte.solicitarReabrir()" style="background:#ff9800;color:white;">
                        <i class="fas fa-unlock"></i> Reabrir Turno
                    </button>
                </div>
            </div>
        `;
    },

    // Solicitar reabrir turno cerrado
    solicitarReabrir() {
        document.getElementById('recalcular-usuario').value = '';
        document.getElementById('recalcular-pin').value = '';
        this.accionRecalcular = 'reabrir';
        document.getElementById('modal-recalcular').classList.add('active');
    },

    // ========================================
    // Ejecutar autorización (volver o reabrir)
    // ========================================
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

            cerrarModal('modal-recalcular');
            mostrarToast(`Autorizado por ${data.autorizadoPor}`, 'success');
            
            if (this.accionRecalcular === 'volver') {
                // Volver al paso 1 con los datos que ya tenía
                this.renderPasoConteoConDatos();
            } else {
                // Reabrir turno cerrado
                setTimeout(() => this.abrir(), 500);
            }

        } catch (error) {
            console.error('❌ Error:', error);
            mostrarToast('Error: ' + error.message, 'error');
        }
    },

    // Volver al paso 1 pero con los datos que ya ingresó
    renderPasoConteoConDatos() {
        this.renderPasoConteo();
        
        // Restaurar valores
        setTimeout(() => {
            const c = this.conteo;
            if (c) {
                document.getElementById('monedas1').value = c.monedas1 || 0;
                document.getElementById('monedas2').value = c.monedas2 || 0;
                document.getElementById('monedas5').value = c.monedas5 || 0;
                document.getElementById('monedas10').value = c.monedas10 || 0;
                document.getElementById('monedas20').value = c.monedas20 || 0;
                document.getElementById('billetes20').value = c.billetes20 || 0;
                document.getElementById('billetes50').value = c.billetes50 || 0;
                document.getElementById('billetes100').value = c.billetes100 || 0;
                document.getElementById('billetes200').value = c.billetes200 || 0;
                document.getElementById('billetes500').value = c.billetes500 || 0;
                document.getElementById('billetes1000').value = c.billetes1000 || 0;
                document.getElementById('conteoUSD').value = c.usd || 0;
                document.getElementById('conteoCAD').value = c.cad || 0;
                document.getElementById('conteoEUR').value = c.eur || 0;
                document.getElementById('corteBbvaNacional').value = c.bbvaNacional || 0;
                document.getElementById('corteBbvaInternacional').value = c.bbvaInternacional || 0;
                document.getElementById('corteClipNacional').value = c.clipNacional || 0;
                document.getElementById('corteClipInternacional').value = c.clipInternacional || 0;
                document.getElementById('corteTransferencia').value = c.transferencia || 0;
                document.getElementById('corteObservaciones').value = c.observaciones || '';
            }
        }, 100);
    },

    // Cerrar modal
    cerrar() {
        document.getElementById('modal-corte')?.remove();
        cerrarModal('modal-recalcular');
    }
};

// Función global
function abrirCorte() {
    Corte.abrir();
}
