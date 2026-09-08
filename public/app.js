const personalLista = [
    "Titular", "Israel", "Nohemi", "Joel", "Nelson", "Rafael", 
    "Itzel", "Ricardo", "Javier", "Christian", "Rosa Angeles", "Martin", "Emanuel", "Roberto"
];

let areasListaInicial = [
    "Dirección Gral de Administración",
    "Academia de Policía",
    "Recursos Humanos"
];

let folioNotaActual = null;
let tipoItemActual = null;
let notasTemporalesModal = [];
let filtroPrioridadActiva = null;
let globalVacacionesData = [];
let tipoItemEnEdicion = null;

let puntosFormularioLibre = [];

function formatearFechaVista(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
}

async function forzarEnvioTelegram() {
    if (!confirm("¿Deseas enviar el reporte actual de Agenda y Actividades a Telegram ahora mismo?")) return;
    try {
        const res = await fetch('/api/forzar-telegram', { method: 'POST' });
        const data = await res.json();
        if (data.exito) {
            alert("¡Reporte enviado a Telegram con éxito!");
        } else {
            alert("Error al enviar: " + (data.error || 'Desconocido'));
        }
    } catch (e) {
        alert("Error de conexión al intentar enviar el reporte.");
        console.error(e);
    }
}

function irAlHome() {
    filtroPrioridadActiva = null;
    cambiarModulo('moduloNuevoRegistro', document.querySelector('.nav-modulos button:first-child'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cambiarModulo(idModulo, btnElement) {
    document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.btn-modulo').forEach(b => b.classList.remove('activo'));
    document.getElementById(idModulo).classList.add('activo');
    if (btnElement) btnElement.classList.add('activo');

    if (idModulo === 'moduloAgenda' || idModulo === 'moduloPendientes') {
        cargarPendientes();
    } else if (idModulo === 'moduloAsistencias') {
        cargarMatrizAsistencias();
    } else if (idModulo === 'moduloVacaciones') {
        cargarResumenVacaciones();
    } else if (idModulo === 'moduloNotasLibres') {
        poblarSelectAreas();
        cargarNotasLibres();
    }
}

function cambiarSubmodulo(idSubmodulo, btnElement) {
    document.querySelectorAll('.submodulo-vista').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.btn-submodulo').forEach(b => b.classList.remove('activo'));
    document.getElementById(idSubmodulo).classList.add('activo');
    btnElement.classList.add('activo');
}

function clickKpiActividadesAlta() {
    filtroPrioridadActiva = 'Alta';
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    const inputFecha = document.getElementById('filtroFechaPendientes');
    if (inputFecha) inputFecha.value = '';
    cargarPendientes();
}

function clickKpiActividadesMedia() {
    filtroPrioridadActiva = 'Media';
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    const inputFecha = document.getElementById('filtroFechaPendientes');
    if (inputFecha) inputFecha.value = '';
    cargarPendientes();
}

function clickKpiActividadesBaja() {
    filtroPrioridadActiva = 'Baja';
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    const inputFecha = document.getElementById('filtroFechaPendientes');
    if (inputFecha) inputFecha.value = '';
    cargarPendientes();
}

function clickKpiReunionesActivas() {
    filtroPrioridadActiva = null;
    cambiarModulo('moduloAgenda', document.querySelectorAll('.btn-modulo')[1]);
    const inputFecha = document.getElementById('filtroFechaAgenda');
    if (inputFecha) inputFecha.value = '';
    cargarPendientes();
}

function actualizarReloj() {
    const relojEl = document.getElementById('relojWidget');
    if (!relojEl) return;
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    relojEl.innerText = `${horas}:${minutos}:${segundos}`;
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

const fechaHoy = new Date().toISOString().split('T')[0];
const mesHoy = fechaHoy.substring(0, 7);

if (document.getElementById('asistFechaCalendario')) document.getElementById('asistFechaCalendario').value = fechaHoy;
if (document.getElementById('filtroSemana')) document.getElementById('filtroSemana').value = fechaHoy;
if (document.getElementById('filtroMes')) document.getElementById('filtroMes').value = mesHoy;
if (document.getElementById('vacFecha')) document.getElementById('vacFecha').value = fechaHoy;
const inputLibreFecha = document.getElementById('libreFecha');
if (inputLibreFecha) inputLibreFecha.value = fechaHoy;

const selectPersonaRep = document.getElementById('filtroPersonaReporte');
if (selectPersonaRep) {
    selectPersonaRep.innerHTML = '<option value="TODOS">-- Todos --</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectPersonaRep.appendChild(opt);
    });
}

const selectPersonaMensual = document.getElementById('filtroPersonaMensual');
if (selectPersonaMensual) {
    selectPersonaMensual.innerHTML = '<option value="TODOS">-- Todos --</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectPersonaMensual.appendChild(opt);
    });
}

const selectVacPersonal = document.getElementById('vacPersonal');
if (selectVacPersonal) {
    selectVacPersonal.innerHTML = '<option value="">Seleccionar personal...</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectVacPersonal.appendChild(opt);
    });
}

const selectFiltroCalVac = document.getElementById('filtroCalendarioVacaciones');
if (selectFiltroCalVac) {
    selectFiltroCalVac.innerHTML = '<option value="">-- Seleccionar personal --</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectFiltroCalVac.appendChild(opt);
    });
}

const selectTurnado = document.getElementById('turnado');
if (selectTurnado) {
    selectTurnado.innerHTML = '<option value="">Seleccionar personal...</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectTurnado.appendChild(opt);
    });
}

const selectNotaResp = document.getElementById('inputNotaResponsable');
if (selectNotaResp) {
    selectNotaResp.innerHTML = '<option value="">Sin asignar</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectNotaResp.appendChild(opt);
    });
}

const selectLibreResp = document.getElementById('inputLibreNotaResponsable');
if (selectLibreResp) {
    selectLibreResp.innerHTML = '<option value="">Sin asignar</option>';
    personalLista.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.textContent = p;
        selectLibreResp.appendChild(opt);
    });
}

async function poblarSelectAreas() {
    try {
        const res = await fetch('/api/areas');
        const data = await res.json();
        if (data && data.length > 0) {
            areasListaInicial = data;
        }
    } catch (e) {
        console.error("Error al cargar áreas:", e);
    }

    const selectArea = document.getElementById('libreArea');
    if (selectArea) {
        const valorActual = selectArea.value;
        selectArea.innerHTML = '<option value="">Seleccionar área...</option>';
        areasListaInicial.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a; opt.textContent = a;
            selectArea.appendChild(opt);
        });
        if (valorActual) selectArea.value = valorActual;
    }

    const selectFiltroArea = document.getElementById('filtroAreaNotas');
    if (selectFiltroArea) {
        const filtroActual = selectFiltroArea.value;
        selectFiltroArea.innerHTML = '<option value="TODOS">-- Todas las Áreas --</option>';
        areasListaInicial.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a; opt.textContent = a;
            selectFiltroArea.appendChild(opt);
        });
        if (filtroActual) selectFiltroArea.value = filtroActual;
    }
}
poblarSelectAreas();

async function agregarNuevaAreaPrompt() {
    const nuevaArea = prompt("Escribe el nombre de la nueva Área o Departamento:");
    if (!nuevaArea || !nuevaArea.trim()) return;
    const areaTrim = nuevaArea.trim();
    if (areasListaInicial.includes(areaTrim)) {
        alert("Esa área ya existe en la lista.");
        return;
    }

    try {
        const res = await fetch('/api/areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: areaTrim })
        });
        const data = await res.json();
        if (data.areas) {
            areasListaInicial = data.areas;
        } else {
            areasListaInicial.push(areaTrim);
        }
        poblarSelectAreas();
        document.getElementById('libreArea').value = areaTrim;
        alert("Área agregada con éxito.");
    } catch (e) {
        console.error("Error guardando área:", e);
    }
}

function mostrarIncidenteCompleto(tituloFolio, texto) {
    document.getElementById('modalIncidenteTitulo').innerText = `Detalle - ${tituloFolio}`;
    document.getElementById('modalIncidenteTexto').innerText = texto || 'Sin descripción';
    document.getElementById('modalIncidente').style.display = 'flex';
}

function cerrarModalIncidente() {
    document.getElementById('modalIncidente').style.display = 'none';
}

function agregarPuntoFormularioLibre() {
    const texto = document.getElementById('inputLibreNotaTexto').value.trim();
    const responsable = document.getElementById('inputLibreNotaResponsable').value;
    const prioridad = document.getElementById('inputLibreNotaPrioridad').value;
    
    if (!texto) { 
        alert('Escribe el contenido del punto o nota.'); 
        return; 
    }

    puntosFormularioLibre.push({ 
        texto, 
        responsable: responsable || 'General', 
        prioridad, 
        completado: false 
    });

    document.getElementById('inputLibreNotaTexto').value = '';
    document.getElementById('inputLibreNotaResponsable').value = '';
    renderizarTablaPuntosFormularioLibre();
}

function handleLibreTextAreaKeyDown(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        agregarPuntoFormularioLibre();
    }
}

function eliminarPuntoFormularioLibre(index) {
    puntosFormularioLibre.splice(index, 1);
    renderizarTablaPuntosFormularioLibre();
}

function renderizarTablaPuntosFormularioLibre() {
    const tbody = document.getElementById('tablaPuntosFormularioLibre');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (puntosFormularioLibre.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-muted); padding: 10px;">No hay puntos agregados todavía.</td></tr>`;
        return;
    }

    puntosFormularioLibre.forEach((pto, idx) => {
        let badgePri = pto.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (pto.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
        const tr = document.createElement('tr');
        if (pto.completado) tr.classList.add('completado');
        const textoHtml = pto.texto.replace(/\n/g, '<br>');

        tr.innerHTML = `
            <td class="text-center">${idx + 1}</td>
            <td style="white-space: pre-line;">${textoHtml}</td>
            <td><b>${pto.responsable}</b></td>
            <td class="text-center">${badgePri}</td>
            <td class="text-center"><button type="button" class="btn-eliminar-item" onclick="eliminarPuntoFormularioLibre(${idx})">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function guardarRegistroGeneral(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo').value;

    if (tipo === 'Nota') {
        const idEdit = document.getElementById('editNotaLibreId').value;
        const titulo = document.getElementById('libreTitulo').value;
        const fecha = document.getElementById('libreFecha').value;
        const area = document.getElementById('libreArea').value;

        if (!area) {
            alert("Selecciona o agrega un área.");
            return;
        }

        const payload = {
            titulo,
            fecha,
            area,
            notasLista: puntosFormularioLibre
        };

        try {
            if (idEdit) {
                await fetch(`/api/notas-libres/${idEdit}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                alert("Nota actualizada con éxito.");
            } else {
                await fetch('/api/notas-libres', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                alert("Nota de reunión guardada con éxito.");
            }

            cancelarEdicionFormulario();
            poblarSelectAreas();
            cargarNotasLibres();
            cambiarModulo('moduloNotasLibres', document.querySelectorAll('.btn-modulo')[2]);
        } catch (err) {
            console.error("Error al guardar nota libre:", err);
        }
    } else {
        const editFolio = document.getElementById('editFolio').value;
        const payload = {
            tipo,
            incidente: document.getElementById('incidente').value,
            turnado: document.getElementById('turnado').value,
            vencimiento: document.getElementById('vencimiento').value,
            horaReunion: document.getElementById('horaReunion').value,
            observaciones: document.getElementById('observaciones').value,
            prioridad: document.getElementById('prioridad').value
        };

        if (editFolio) {
            await fetch(`/api/pendientes/${editFolio}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } else {
            await fetch('/api/pendientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        }

        cancelarEdicionFormulario();
        cargarPendientes();
    }
}

async function cargarNotasLibres() {
    try {
        const res = await fetch('/api/notas-libres');
        let data = await res.json();
        
        const filtroArea = document.getElementById('filtroAreaNotas');
        if (filtroArea && filtroArea.value && filtroArea.value !== 'TODOS') {
            data = data.filter(item => item.area === filtroArea.value);
        }

        const tbody = document.getElementById('tablaNotasLibres');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay notas registradas para esta área.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const totalNotas = item.notasLista ? item.notasLista.length : 0;
            const puntosPendientesCount = item.notasLista ? item.notasLista.filter(nt => !nt.completado).length : 0;
            
            const badgePendientes = puntosPendientesCount > 0 
                ? `<span class="badge" style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${puntosPendientesCount} PEND.</span>` 
                : `<span class="badge" style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-weight: bold;">AL DÍA</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatearFechaVista(item.fecha)}</td>
                <td><b>${item.titulo}</b></td>
                <td><span class="badge badge-libre">${item.area || 'General'}</span></td>
                <td class="text-center"><b>${totalNotas}</b></td>
                <td class="text-center">${badgePendientes}</td>
                <td class="text-center">
                    <div class="acciones-container">
                        <button class="btn-accion btn-notas" onclick="abrirNotaEnNuevaVentana('${item._id}')" title="Ver Nota">Ver</button>
                        <button class="btn-accion btn-editar" onclick="cargarEdicionNotaLibre('${item._id}')">Editar</button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarNotaLibrePrincipal('${item._id}')">Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error al cargar notas libres:", e);
    }
}

function limpiarFiltroAreaNotas() {
    const filtroArea = document.getElementById('filtroAreaNotas');
    if (filtroArea) filtroArea.value = 'TODOS';
    cargarNotasLibres();
}

async function abrirNotaEnNuevaVentana(id) {
    try {
        const res = await fetch(`/api/notas-libres/${id}`);
        const item = await res.json();
        if (!item) return;

        let puntosHtml = '';
        if (item.notasLista && item.notasLista.length > 0) {
            item.notasLista.forEach((pto, idx) => {
                const badgePri = pto.prioridad === 'Alta' ? '🔴 ALTA' : (pto.prioridad === 'Baja' ? '🟢 BAJA' : '🟡 MEDIA');
                const estiloTachado = pto.completado ? 'text-decoration: line-through; color: #86868b;' : '';
                
                puntosHtml += `
                    <div id="punto-container-${idx}" style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eaeaea; display: flex; align-items: flex-start; gap: 12px;">
                        <input type="checkbox" style="width: 20px; height: 20px; margin-top: 3px; cursor: pointer;" 
                            ${pto.completado ? 'checked' : ''} 
                            onchange="togglePuntoNotaLibre('${item._id}', ${idx}, this.checked)">
                        <div style="flex-grow: 1;">
                            <div style="font-weight: bold; color: #0071e3; margin-bottom: 6px; font-size: 15px;">
                                ${idx + 1}. <span style="color: #1d1d1f;">${pto.responsable || 'General'}</span> <span style="font-size: 11px; font-weight: normal; color: #666;">(${badgePri})</span>
                            </div>
                            <div id="texto-pto-${idx}" style="padding-left: 5px; white-space: pre-line; color: #333; font-size: 14px; line-height: 1.5; ${estiloTachado}">
                                ${pto.texto}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            puntosHtml = '<p style="color: #86868b; font-style: italic;">No hay puntos registrados en esta nota.</p>';
        }

        const nuevaVentana = window.open('', '_blank', 'width=850,height=750,scrollbars=yes');
        nuevaVentana.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Nota: ${item.titulo}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        padding: 40px;
                        background: #f5f5f7;
                        color: #1d1d1f;
                        max-width: 800px;
                        margin: auto;
                    }
                    .documento-card {
                        background: #ffffff;
                        padding: 40px;
                        border-radius: 16px;
                        box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                        border: 1px solid #d2d2d7;
                    }
                    h1 { font-size: 24px; margin-top: 0; color: #1d1d1f; border-bottom: 2px solid #0071e3; padding-bottom: 12px; }
                    .meta-info { font-size: 13px; color: #6e6e73; margin-bottom: 25px; display: flex; gap: 25px; flex-wrap: wrap; }
                    .meta-info div { font-weight: 500; }
                    .meta-info span { font-weight: 600; color: #1d1d1f; }
                    .botones-accion-container {
                        margin-top: 25px;
                        display: flex;
                        gap: 12px;
                        align-items: center;
                        flex-wrap: wrap;
                    }
                    .btn-accion-ventana {
                        border: none;
                        padding: 12px 24px;
                        border-radius: 10px;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 14px;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .btn-imprimir { background: #0071e3; color: white; }
                    .btn-guardar { background: #34c759; color: white; }
                    .btn-cerrar { background: #8e8e93; color: white; }
                    .btn-accion-ventana:hover { opacity: 0.9; }
                    @media print {
                        body { background: white; padding: 0; }
                        .documento-card { border: none; box-shadow: none; padding: 0; }
                        .botones-accion-container { display: none; }
                        input[type="checkbox"] { display: none; }
                    }
                </style>
                <script>
                    async function togglePuntoNotaLibre(notaId, index, completado) {
                        try {
                            const res = await fetch(\`/api/notas-libres/\${notaId}/punto/\${index}\`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ completado })
                            });
                            if (res.ok) {
                                const textEl = document.getElementById('texto-pto-' + index);
                                if (completado) {
                                    textEl.style.textDecoration = 'line-through';
                                    textEl.style.color = '#86868b';
                                } else {
                                    textEl.style.textDecoration = 'none';
                                    textEl.style.color = '#333';
                                }
                            }
                        } catch (e) {
                            console.error("Error al actualizar estado del punto:", e);
                        }
                    }

                    function guardarCambiosVentana() {
                        if (window.opener && typeof window.opener.cargarNotasLibres === 'function') {
                            window.opener.cargarNotasLibres();
                        }
                        alert("Cambios guardados correctamente.");
                    }

                    function cerrarVentana() {
                        if (window.opener && typeof window.opener.cargarNotasLibres === 'function') {
                            window.opener.cargarNotasLibres();
                        }
                        window.close();
                    }
                </script>
            </head>
            <body>
                <div class="documento-card">
                    <h1>📝 ${item.titulo}</h1>
                    <div class="meta-info">
                        <div>Fecha: <span>${formatearFechaVista(item.fecha)}</span></div>
                        <div>Área / Depto: <span>${item.area || 'General'}</span></div>
                        <div>Total Puntos: <span>${item.notasLista ? item.notasLista.length : 0}</span></div>
                    </div>
                    <div style="margin-top: 20px;">
                        ${puntosHtml}
                    </div>
                    <div class="botones-accion-container">
                        <button class="btn-accion-ventana btn-imprimir" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
                        <button class="btn-accion-ventana btn-guardar" onclick="guardarCambiosVentana()">💾 Guardar</button>
                        <button class="btn-accion-ventana btn-cerrar" onclick="cerrarVentana()">❌ Cerrar</button>
                    </div>
                </div>
            </body>
            </html>
        `);
        nuevaVentana.document.close();
    } catch (e) {
        console.error("Error al abrir la nota en nueva ventana:", e);
    }
}

async function abrirModalNotas(folio) {
    folioNotaActual = folio;
    try {
        const res = await fetch('/api/pendientes');
        const data = await res.json();
        const p = data.find(item => item.folio === folio);
        if (!p) return;

        tipoItemActual = p.tipo;
        notasTemporalesModal = p.notasLista ? JSON.parse(JSON.stringify(p.notasLista)) : [];

        // Generamos dinámicamente las opciones de personal para el select de responsables dentro del modal
        let opcionesPersonalHtml = '<option value="">Sin asignar</option>';
        personalLista.forEach(pers => {
            opcionesPersonalHtml += `<option value="${pers}">${pers}</option>`;
        });

        const modalContainer = document.getElementById('modalNotas').querySelector('.modal-contenido') || document.getElementById('modalNotas').firstElementChild;
        if (modalContainer) {
            modalContainer.innerHTML = `
                <div style="background: #ffffff; padding: 30px; border-radius: 16px; max-width: 850px; margin: auto; max-height: 90vh; overflow-y: auto;">
                    <h2 style="font-size: 22px; margin-top: 0; color: #1d1d1f; border-bottom: 2px solid #0071e3; padding-bottom: 10px;">
                        📋 [${p.folio}] ${p.incidente}
                    </h2>
                    <div style="font-size: 13px; color: #6e6e73; margin-bottom: 20px; display: flex; gap: 20px; flex-wrap: wrap;">
                        <div>Tipo: <span>${p.tipo}</span></div>
                        <div>Turnado/Asignado: <span>${p.turnado || 'N/A'}</span></div>
                        <div>Total Puntos: <span id="modalTotalPuntosCount">${notasTemporalesModal.length}</span></div>
                    </div>

                    <!-- CAJA DE CAPTURA NUEVA PUNTO (Igual a la imagen 1) -->
                    <div style="background: #fbfbfd; border: 1px solid #d2d2d7; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <textarea id="inputModalNotaTexto" placeholder="Escribe los puntos tratados... (Ctrl + Enter para agregar)" style="width: 100%; height: 80px; padding: 12px; border: 1px solid #d2d2d7; border-radius: 8px; resize: vertical; font-family: inherit; font-size: 14px; margin-bottom: 12px;" onkeydown="handleModalTextAreaKeyDown(event)"></textarea>
                        <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                            <select id="inputModalNotaResponsable" style="flex: 2; padding: 10px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 14px; background: white;">
                                ${opcionesPersonalHtml}
                            </select>
                            <select id="inputModalNotaPrioridad" style="flex: 2; padding: 10px; border: 1px solid #d2d2d7; border-radius: 8px; font-size: 14px; background: white;">
                                <option value="Media">Prioridad Media</option>
                                <option value="Alta">Prioridad Alta</option>
                                <option value="Baja">Prioridad Baja</option>
                            </select>
                            <button type="button" onclick="agregarNotaModalDesdeUI()" style="background: #34c759; color: white; border: none; width: 45px; height: 40px; border-radius: 8px; font-size: 20px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                        </div>
                    </div>

                    <!-- LISTADO INTERACTIVO CON CHECKBOXES -->
                    <div id="contenedorListaNotasModal" style="margin-top: 15px;">
                        <!-- Se renderiza mediante JS -->
                    </div>

                    <!-- BOTONES DE ACCIÓN (Imprimir, Guardar, Cerrar) -->
                    <div style="margin-top: 25px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; border-top: 1px solid #eaeaea; padding-top: 20px;">
                        <button class="btn-accion-ventana" style="background: #0071e3; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer;" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
                        <button class="btn-accion-ventana" style="background: #34c759; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer;" onclick="guardarYActualizarModalNotas()">💾 Guardar</button>
                        <button class="btn-accion-ventana" style="background: #8e8e93; color: white; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; cursor: pointer;" onclick="cerrarModalSimple()">❌ Cerrar</button>
                    </div>
                </div>
            `;
        }

        renderizarListaNotasModalInteractiva();
        document.getElementById('modalNotas').style.display = 'flex';
    } catch (e) {
        console.error("Error al abrir notas:", e);
    }
}

function renderizarListaNotasModalInteractiva() {
    const contenedor = document.getElementById('contenedorListaNotasModal');
    const spanTotal = document.getElementById('modalTotalPuntosCount');
    if (!contenedor) return;

    if (spanTotal) spanTotal.innerText = notasTemporalesModal.length;

    if (!notasTemporalesModal || notasTemporalesModal.length === 0) {
        contenedor.innerHTML = `<p style="color: #86868b; font-style: italic; text-align: center; padding: 15px;">No hay puntos registrados.</p>`;
        return;
    }

    let html = '';
    notasTemporalesModal.forEach((pto, idx) => {
        const badgePri = pto.prioridad === 'Alta' ? '🔴 ALTA' : (pto.prioridad === 'Baja' ? '🟢 BAJA' : '🟡 MEDIA');
        const estiloTachado = pto.completado ? 'text-decoration: line-through; color: #86868b;' : '';
        
        html += `
            <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eaeaea; display: flex; align-items: flex-start; gap: 12px;">
                <input type="checkbox" style="width: 20px; height: 20px; margin-top: 3px; cursor: pointer;" 
                    ${pto.completado ? 'checked' : ''} 
                    onchange="toggleNotaRealizadaModal(${idx}, this.checked)">
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; color: #0071e3; margin-bottom: 6px; font-size: 15px; display: flex; justify-content: space-between; align-items: center;">
                        <span>${idx + 1}. <span style="color: #1d1d1f;">${pto.responsable || 'General'}</span> <span style="font-size: 11px; font-weight: normal; color: #666;">(${badgePri})</span></span>
                        <button type="button" onclick="eliminarNotaModalUI(${idx})" style="background: #ff3b30; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">Eliminar</button>
                    </div>
                    <div id="texto-modal-pto-${idx}" style="padding-left: 5px; white-space: pre-line; color: #333; font-size: 14px; line-height: 1.5; ${estiloTachado}">
                        ${pto.texto}
                    </div>
                </div>
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

function agregarNotaModalDesdeUI() {
    const texto = document.getElementById('inputModalNotaTexto').value.trim();
    const responsable = document.getElementById('inputModalNotaResponsable').value;
    const prioridad = document.getElementById('inputModalNotaPrioridad').value;
    
    if (!texto) { 
        alert('Escribe el contenido del punto o nota.'); 
        return; 
    }

    notasTemporalesModal.push({ 
        texto, 
        responsable: responsable || 'General', 
        prioridad, 
        completado: false 
    });

    document.getElementById('inputModalNotaTexto').value = '';
    document.getElementById('inputModalNotaResponsable').value = '';
    document.getElementById('inputModalNotaPrioridad').value = 'Media';
    renderizarListaNotasModalInteractiva();
}

function handleModalTextAreaKeyDown(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        agregarNotaModalDesdeUI();
    }
}

function toggleNotaRealizadaModal(indexNota, completado) {
    if (notasTemporalesModal[indexNota]) {
        notasTemporalesModal[indexNota].completado = completado;
        const textEl = document.getElementById('texto-modal-pto-' + indexNota);
        if (textEl) {
            if (completado) {
                textEl.style.textDecoration = 'line-through';
                textEl.style.color = '#86868b';
            } else {
                textEl.style.textDecoration = 'none';
                textEl.style.color = '#333';
            }
        }
    }
}

function eliminarNotaModalUI(indexNota) {
    notasTemporalesModal.splice(indexNota, 1);
    renderizarListaNotasModalInteractiva();
}

async function guardarYActualizarModalNotas() {
    if (folioNotaActual) {
        try {
            await fetch(`/api/pendientes/${folioNotaActual}/notas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notasLista: notasTemporalesModal })
            });
            alert("Cambios guardados correctamente.");
            cargarPendientes();
        } catch (e) {
            console.error("Error al guardar notas en el servidor:", e);
            alert("Error al intentar guardar los cambios.");
        }
    }
}

async function cerrarModalSimple() {
    if (folioNotaActual) {
        try {
            await fetch(`/api/pendientes/${folioNotaActual}/notas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notasLista: notasTemporalesModal })
            });
        } catch (e) {
            console.error("Error al guardar notas en el servidor:", e);
        }
    }

    document.getElementById('modalNotas').style.display = 'none';
    folioNotaActual = null;
    tipoItemActual = null;
    cargarPendientes();
}

async function cargarEdicionNotaLibre(id) {
    try {
        const res = await fetch(`/api/notas-libres/${id}`);
        const item = await res.json();
        if (!item) return;

        tipoItemEnEdicion = 'Nota';
        document.getElementById('editNotaLibreId').value = item._id;
        document.getElementById('tipo').value = 'Nota';
        toggleCamposTipo();

        document.getElementById('libreTitulo').value = item.titulo;
        document.getElementById('libreFecha').value = item.fecha;
        document.getElementById('libreArea').value = item.area || '';
        
        puntosFormularioLibre = item.notasLista ? JSON.parse(JSON.stringify(item.notasLista)) : [];
        renderizarTablaPuntosFormularioLibre();
        document.getElementById('btnSubmitText').innerText = 'Actualizar Nota de Reunión';
        document.getElementById('btnCancelarEdicion').classList.remove('oculto');
        
        cambiarModulo('moduloNuevoRegistro', document.querySelector('.nav-modulos button:first-child'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error("Error al cargar nota para edición:", e);
    }
}

async function eliminarNotaLibrePrincipal(id) {
    if (confirm("¿Estás seguro de eliminar este registro de notas y todos sus puntos?")) {
        await fetch(`/api/notas-libres/${id}`, { method: 'DELETE' });
        cargarNotasLibres();
    }
}

function toggleCamposTipo() {
    const tipo = document.getElementById('tipo').value;
    const grupoHora = document.getElementById('grupoHoraReunion');
    const inputHora = document.getElementById('horaReunion');
    const grupoTurnado = document.getElementById('grupoTurnado');
    const selectTurnadoElem = document.getElementById('turnado');
    
    const grupoPrioridad = document.getElementById('grupoPrioridad');
    const grupoVencimiento = document.getElementById('grupoVencimiento');
    const grupoIncidente = document.getElementById('grupoIncidente');
    const grupoObservaciones = document.getElementById('grupoObservaciones');

    const grupoTituloNota = document.getElementById('grupoTituloNota');
    const grupoFechaNota = document.getElementById('grupoFechaNota');
    const grupoAreaNota = document.getElementById('grupoAreaNota');
    const grupoPuntosNota = document.getElementById('grupoPuntosNota');
    
    if (tipo === 'Reunión') {
        grupoHora.classList.remove('oculto'); inputHora.required = true;
        grupoTurnado.classList.add('oculto'); selectTurnadoElem.required = false; selectTurnadoElem.value = '';
        grupoPrioridad.classList.remove('oculto'); document.getElementById('prioridad').required = true;
        grupoVencimiento.classList.remove('oculto'); document.getElementById('vencimiento').required = true;
        grupoIncidente.classList.remove('oculto'); document.getElementById('incidente').required = true;
        grupoObservaciones.classList.remove('oculto');

        grupoTituloNota.classList.add('oculto'); document.getElementById('libreTitulo').required = false;
        grupoFechaNota.classList.add('oculto'); document.getElementById('libreFecha').required = false;
        grupoAreaNota.classList.add('oculto'); document.getElementById('libreArea').required = false;
        grupoPuntosNota.classList.add('oculto');
    } else if (tipo === 'Nota') {
        grupoHora.classList.add('oculto'); inputHora.required = false; inputHora.value = '';
        grupoTurnado.classList.add('oculto'); selectTurnadoElem.required = false; selectTurnadoElem.value = '';
        grupoPrioridad.classList.add('oculto'); document.getElementById('prioridad').required = false;
        grupoVencimiento.classList.add('oculto'); document.getElementById('vencimiento').required = false;
        grupoIncidente.classList.add('oculto'); document.getElementById('incidente').required = false;
        grupoObservaciones.classList.add('oculto');

        grupoTituloNota.classList.remove('oculto'); document.getElementById('libreTitulo').required = true;
        grupoFechaNota.classList.remove('oculto'); document.getElementById('libreFecha').required = true;
        if (!document.getElementById('libreFecha').value) document.getElementById('libreFecha').value = fechaHoy;
        grupoAreaNota.classList.remove('oculto'); document.getElementById('libreArea').required = true;
        grupoPuntosNota.classList.remove('oculto');
    } else { // Actividad
        grupoHora.classList.add('oculto'); inputHora.required = false; inputHora.value = '';
        grupoTurnado.classList.remove('oculto'); selectTurnadoElem.required = true;
        grupoPrioridad.classList.remove('oculto'); document.getElementById('prioridad').required = true;
        grupoVencimiento.classList.remove('oculto'); document.getElementById('vencimiento').required = true;
        grupoIncidente.classList.remove('oculto'); document.getElementById('incidente').required = true;
        grupoObservaciones.classList.remove('oculto');

        grupoTituloNota.classList.add('oculto'); document.getElementById('libreTitulo').required = false;
        grupoFechaNota.classList.add('oculto'); document.getElementById('libreFecha').required = false;
        grupoAreaNota.classList.add('oculto'); document.getElementById('libreArea').required = false;
        grupoPuntosNota.classList.add('oculto');
    }
}

async function actualizarDashboardKPIs(dataPendientes) {
    try {
        const actAlta = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Alta').length;
        if (document.getElementById('kpiActividadesAlta')) document.getElementById('kpiActividadesAlta').innerText = actAlta;

        const actMedia = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Media').length;
        if (document.getElementById('kpiActividadesMedia')) document.getElementById('kpiActividadesMedia').innerText = actMedia;

        const actBaja = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Baja').length;
        if (document.getElementById('kpiActividadesBaja')) document.getElementById('kpiActividadesBaja').innerText = actBaja;

        const resAsist = await fetch('/api/asistencias');
        const dataAsist = await resAsist.json();
        const enVacacionesHoy = dataAsist.filter(a => a.fecha === fechaHoy && a.estatus === 'Vacaciones');
        
        const spanNombresQuick = document.getElementById('quickVacacionesNombres');
        if (spanNombresQuick) {
            spanNombresQuick.innerText = enVacacionesHoy.length > 0 ? enVacacionesHoy.map(v => v.personal).join(', ') : 'Ninguno';
        }

        const reunionesActivas = dataPendientes.filter(p => p.tipo === 'Reunión' && !p.finalizado).length;
        if (document.getElementById('kpiReunionesActivas')) document.getElementById('kpiReunionesActivas').innerText = reunionesActivas;
    } catch (e) {
        console.error("Error al actualizar KPIs:", e);
    }
}

async function cargarPendientes() {
    try {
        const res = await fetch('/api/pendientes');
        let data = await res.json();
        
        const pesoPrioridad = { 'Alta': 1, 'Media': 2, 'Baja': 3 };
        data.sort((a, b) => (pesoPrioridad[a.prioridad || 'Media'] - pesoPrioridad[b.prioridad || 'Media']));

        actualizarDashboardKPIs(data);
        
        const fechaAgenda = document.getElementById('filtroFechaAgenda')?.value;
        const fechaPendientes = document.getElementById('filtroFechaPendientes')?.value;
        
        let dataReuniones = data.filter(p => p.tipo === 'Reunión');
        let dataPendientes = data.filter(p => p.tipo !== 'Reunión');

        if (fechaAgenda) dataReuniones = dataReuniones.filter(p => p.vencimiento === fechaAgenda);
        if (fechaPendientes) dataPendientes = dataPendientes.filter(p => p.vencimiento === fechaPendientes);

        if (filtroPrioridadActiva) {
            dataPendientes = dataPendientes.filter(p => p.prioridad === filtroPrioridadActiva);
        }
        
        const tbodyReuniones = document.getElementById('tablaReuniones');
        const tbodyReunionesFinalizadas = document.getElementById('tablaReunionesFinalizadas');
        const tbodyPendientes = document.getElementById('tablaPendientes');
        const tbodyPendientesFinalizados = document.getElementById('tablaPendientesFinalizadas');
        
        if (!tbodyReuniones || !tbodyPendientes) return;

        tbodyReuniones.innerHTML = '';
        if (tbodyReunionesFinalizadas) tbodyReunionesFinalizadas.innerHTML = '';
        tbodyPendientes.innerHTML = '';
        if (tbodyPendientesFinalizados) tbodyPendientesFinalizados.innerHTML = '';
        
        const reunionesActivas = dataReuniones.filter(p => !p.finalizado);
        const reunionesFinalizadas = dataReuniones.filter(p => p.finalizado);

        if (reunionesActivas.length === 0) {
            tbodyReuniones.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay reuniones activas.</td></tr>`;
        } else {
            reunionesActivas.forEach(p => {
                const tr = document.createElement('tr');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                const totalNotas = p.notasLista ? p.notasLista.length : 0;
                let notasPendientesCount = p.notasLista ? p.notasLista.filter(nt => !nt.completado).length : 0;

                let asignadosSet = new Set();
                if (p.notasLista) {
                    p.notasLista.forEach(nt => {
                        if (nt.responsable && nt.responsable !== 'Sin asignar' && nt.responsable !== 'General') asignadosSet.add(nt.responsable);
                    });
                }
                const asignadosStr = asignadosSet.size > 0 ? Array.from(asignadosSet).join(', ') : '-';
                const badgePendientes = notasPendientesCount > 0 ? `<span class="badge" style="background: #fee2e2; color: #991b1b;">${notasPendientesCount} Pend.</span>` : `<span class="badge" style="background: #d1fae5; color: #065f46;">Al día</span>`;
                const incidenteTextoSeguro = (p.incidente || '').replace(/`/g, '\\`').replace(/'/g, "\\'");

                tr.innerHTML = `
                    <td><span class="badge badge-reu">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td><div style="cursor: pointer; color: var(--primary);" onclick="mostrarIncidenteCompleto('${p.folio}', \`${incidenteTextoSeguro}\`)" title="Haz clic para ver completo">${p.incidente}</div></td>
                    <td class="text-center">${formatearFechaVista(p.vencimiento)} - ${p.horaReunion || ''}h</td>
                    <td class="text-center"><b>${totalNotas}</b></td>
                    <td>${asignadosStr}</td>
                    <td class="text-center">${badgePendientes}</td>
                    <td>${p.observaciones || '-'}</td>
                    <td class="text-center"><input type="checkbox" onclick="toggleEstado('${p.folio}', this.checked)"></td>
                    <td class="text-center">
                        <div class="acciones-container">
                            <button class="btn-accion btn-notas" onclick="abrirModalNotas('${p.folio}')">Notas</button>
                            <button class="btn-accion btn-editar" onclick="prepararEdicion('${p.folio}')">Editar</button>
                            <button class="btn-accion btn-eliminar" onclick="eliminarPendiente('${p.folio}')">Eliminar</button>
                        </div>
                    </td>
                `;
                tbodyReuniones.appendChild(tr);
            });
        }

        if (reunionesFinalizadas.length > 0 && tbodyReunionesFinalizadas) {
            reunionesFinalizadas.forEach(p => {
                const tr = document.createElement('tr');
                tr.classList.add('completado');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                const incidenteTextoSeguro = (p.incidente || '').replace(/`/g, '\\`').replace(/'/g, "\\'");
                tr.innerHTML = `
                    <td><span class="badge badge-reu">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td><div style="cursor: pointer;" onclick="mostrarIncidenteCompleto('${p.folio}', \`${incidenteTextoSeguro}\`)" title="Haz clic para ver completo">${p.incidente}</div></td>
                    <td class="text-center">${formatearFechaVista(p.vencimiento)} - ${p.horaReunion || ''}h</td>
                    <td class="text-center"><b>${p.notasLista ? p.notasLista.length : 0}</b></td>
                    <td>-</td>
                    <td class="text-center">-</td>
                    <td>${p.observaciones || '-'}</td>
                    <td class="text-center"><input type="checkbox" checked onclick="toggleEstado('${p.folio}', this.checked)"></td>
                    <td class="text-center">
                        <div class="acciones-container">
                            <button class="btn-accion btn-notas" onclick="abrirModalNotas('${p.folio}')">Notas</button>
                            <button class="btn-accion btn-editar" onclick="prepararEdicion('${p.folio}')">Editar</button>
                            <button class="btn-accion btn-eliminar" onclick="eliminarPendiente('${p.folio}')">Eliminar</button>
                        </div>
                    </td>
                `;
                tbodyReunionesFinalizadas.appendChild(tr);
            });
        } else if (tbodyReunionesFinalizadas) {
            tbodyReunionesFinalizadas.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay reuniones finalizadas.</td></tr>`;
        }

        const actividadesActivas = dataPendientes.filter(p => !p.finalizado);
        const actividadesFinalizadas = dataPendientes.filter(p => p.finalizado);

        if (actividadesActivas.length === 0) {
            tbodyPendientes.innerHTML = `<tr><td colspan="12" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay actividades activas.</td></tr>`;
        } else {
            actividadesActivas.forEach(p => {
                const textoWs = encodeURIComponent(`Hola ${p.turnado}, actividad asignada (${p.folio}):\n\n"${p.incidente}"\nVencimiento: ${formatearFechaVista(p.vencimiento)}`);
                const tr = document.createElement('tr');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                
                const totalNotas = p.notasLista ? p.notasLista.length : 0;
                let notasPendientesCount = p.notasLista ? p.notasLista.filter(nt => !nt.completado).length : 0;
                let asignadosSet = new Set();
                if (p.notasLista) {
                    p.notasLista.forEach(nt => {
                        if (nt.responsable && nt.responsable !== 'Sin asignar' && nt.responsable !== 'General') asignadosSet.add(nt.responsable);
                    });
                }
                const asignadosStr = asignadosSet.size > 0 ? Array.from(asignadosSet).join(', ') : '-';
                const badgePendientes = notasPendientesCount > 0 ? `<span class="badge" style="background: #fee2e2; color: #991b1b;">${notasPendientesCount} Pend.</span>` : `<span class="badge" style="background: #d1fae5; color: #065f46;">Al día</span>`;

                const esDerivadaDeNota = p.observaciones && p.observaciones.includes('[Origen:');
                const botonEliminarHtml = esDerivadaDeNota 
                    ? `<button class="btn-accion btn-eliminar" style="opacity: 0.5; cursor: not-allowed;" title="Derivada de reunión" disabled>Eliminar</button>` 
                    : `<button class="btn-accion btn-eliminar" onclick="eliminarPendiente('${p.folio}')">Eliminar</button>`;

                const incidenteTextoSeguro = (p.incidente || '').replace(/`/g, '\\`').replace(/'/g, "\\'");

                tr.innerHTML = `
                    <td><span class="badge badge-pen">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td><div style="cursor: pointer; color: var(--primary);" onclick="mostrarIncidenteCompleto('${p.folio}', \`${incidenteTextoSeguro}\`)" title="Haz clic para ver completo">${p.incidente}</div></td>
                    <td class="text-center"><b>${p.turnado}</b></td>
                    <td>${formatearFechaVista(p.vencimiento)}</td>
                    <td class="text-center"><b>${totalNotas}</b></td>
                    <td>${asignadosStr}</td>
                    <td class="text-center">${badgePendientes}</td>
                    <td>${p.observaciones || '-'}</td>
                    <td class="text-center"><input type="checkbox" onclick="toggleEstado('${p.folio}', this.checked)"></td>
                    <td class="text-center">
                        <div class="acciones-container">
                            <a href="https://wa.me/?text=${textoWs}" target="_blank" class="btn-accion btn-whatsapp" title="WhatsApp">WA</a>
                            <button class="btn-accion btn-notas" onclick="abrirModalNotas('${p.folio}')">Notas</button>
                            <button class="btn-accion btn-editar" onclick="prepararEdicion('${p.folio}')">Editar</button>
                            ${botonEliminarHtml}
                        </div>
                    </td>
                `;
                tbodyPendientes.appendChild(tr);
            });
        }

        const tbodyPendientesFinElem = document.getElementById('tablaPendientesFinalizadas');
        if (actividadesFinalizadas.length > 0 && tbodyPendientesFinElem) {
            actividadesFinalizadas.forEach(p => {
                const tr = document.createElement('tr');
                tr.classList.add('completado');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                const incidenteTextoSeguro = (p.incidente || '').replace(/`/g, '\\`').replace(/'/g, "\\'");
                tr.innerHTML = `
                    <td><span class="badge badge-pen">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td><div style="cursor: pointer;" onclick="mostrarIncidenteCompleto('${p.folio}', \`${incidenteTextoSeguro}\`)" title="Haz clic para ver completo">${p.incidente}</div></td>
                    <td class="text-center"><b>${p.turnado}</b></td>
                    <td>${formatearFechaVista(p.vencimiento)}</td>
                    <td class="text-center"><b>${p.notasLista ? p.notasLista.length : 0}</b></td>
                    <td>-</td>
                    <td class="text-center">-</td>
                    <td>${p.observaciones || '-'}</td>
                    <td class="text-center"><input type="checkbox" checked onclick="toggleEstado('${p.folio}', this.checked)"></td>
                    <td class="text-center">
                        <div class="acciones-container">
                            <button class="btn-accion btn-notas" onclick="abrirModalNotas('${p.folio}')">Notas</button>
                            <button class="btn-accion btn-editar" onclick="prepararEdicion('${p.folio}')">Editar</button>
                            <button class="btn-accion btn-eliminar" onclick="eliminarPendiente('${p.folio}')">Eliminar</button>
                        </div>
                    </td>
                `;
                tbodyPendientesFinElem.appendChild(tr);
            });
        } else if (tbodyPendientesFinElem) {
            tbodyPendientesFinElem.innerHTML = `<tr><td colspan="12" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay actividades finalizadas.</td></tr>`;
        }
    } catch (e) {
        console.error("Error al cargar pendientes:", e);
    }
}

async function cargarMatrizAsistencias() {
    try {
        const fechaSeleccionada = document.getElementById('asistFechaCalendario').value;
        const res = await fetch('/api/asistencias');
        const data = await res.json();
        const registrosDia = {};
        data.filter(a => a.fecha === fechaSeleccionada).forEach(a => {
            registrosDia[a.personal.trim().toLowerCase()] = a.estatus;
        });

        const tbody = document.getElementById('tablaMatrizAsistencias');
        if (!tbody) return;
        tbody.innerHTML = '';

        personalLista.forEach(persona => {
            const estatusActual = registrosDia[persona.trim().toLowerCase()] || 'Asistencia';
            let claseSelect = estatusActual === 'Retardo' ? 'estatus-retardo' : (estatusActual === 'Falta' ? 'estatus-falta' : (estatusActual === 'Vacaciones' ? 'estatus-vacaciones' : 'estatus-asistencia'));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                <td class="text-center">
                    <select class="asistencia-select ${claseSelect}" data-persona="${persona}" onchange="actualizarColorSelect(this)">
                        <option value="Asistencia" ${estatusActual === 'Asistencia' ? 'selected' : ''}>Asistencia</option>
                        <option value="Retardo" ${estatusActual === 'Retardo' ? 'selected' : ''}>Retardo</option>
                        <option value="Falta" ${estatusActual === 'Falta' ? 'selected' : ''}>Falta</option>
                        <option value="Vacaciones" ${estatusActual === 'Vacaciones' ? 'selected' : ''}>Vacaciones</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error asistencias:", e);
    }
}

function actualizarColorSelect(selectElement) {
    const estatus = selectElement.value;
    selectElement.className = 'asistencia-select';
    if (estatus === 'Asistencia') selectElement.classList.add('estatus-asistencia');
    if (estatus === 'Retardo') selectElement.classList.add('estatus-retardo');
    if (estatus === 'Falta') selectElement.classList.add('estatus-falta');
    if (estatus === 'Vacaciones') selectElement.classList.add('estatus-vacaciones');
}

async function guardarCambiosAsistencias() {
    const fecha = document.getElementById('asistFechaCalendario').value;
    const selects = document.querySelectorAll('.asistencia-select');
    let promesas = [];
    selects.forEach(sel => {
        promesas.push(fetch('/api/asistencias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personal: sel.getAttribute('data-persona'), fecha, estatus: sel.value })
        }));
    });
    await Promise.all(promesas);
    cargarReporteSemanal();
    cargarReporteMensual();
    cargarPendientes();
    alert("Asistencias guardadas exitosamente.");
}

function obtenerDiasSemana(fechaStr) {
    const curr = new Date(fechaStr + 'T00:00:00');
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    let dias = [];
    for (let i = 0; i < 5; i++) {
        let d = new Date(curr);
        d.setDate(first + i);
        dias.push(d.toISOString().split('T')[0]);
    }
    return dias;
}

async function cargarReporteSemanal() {
    try {
        const fechaRef = document.getElementById('filtroSemana').value || fechaHoy;
        const personaSel = document.getElementById('filtroPersonaReporte').value;
        const diasSemana = obtenerDiasSemana(fechaRef);
        const nombresDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

        for (let i = 0; i < 5; i++) {
            const thElem = document.getElementById(`th${['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'][i]}`);
            if (thElem) thElem.innerText = `${nombresDias[i]} (${formatearFechaVista(diasSemana[i]).substring(0, 5)})`;
        }

        const res = await fetch('/api/asistencias');
        const data = await res.json();
        const tbody = document.getElementById('tablaReporteSemanal');
        if (!tbody) return;
        tbody.innerHTML = '';

        let listaMostrar = personaSel !== 'TODOS' ? [personaSel] : personalLista;

        listaMostrar.forEach(persona => {
            const pLower = persona.trim().toLowerCase();
            let totalRetardos = 0, totalFaltas = 0, celdasHtml = '';

            diasSemana.forEach(fechaDia => {
                const reg = data.find(a => a.fecha === fechaDia && a.personal.trim().toLowerCase() === pLower);
                let estatus = reg ? reg.estatus : 'Asistencia';
                if (estatus === 'Retardo') { totalRetardos++; celdasHtml += `<td class="dia-celda"><span class="tag-retardo">Ret</span></td>`; }
                else if (estatus === 'Falta') { totalFaltas++; celdasHtml += `<td class="dia-celda"><span class="tag-falta">Fal</span></td>`; }
                else if (estatus === 'Vacaciones') { celdasHtml += `<td class="dia-celda"><span class="tag-vacaciones">Vac</span></td>`; }
                else { celdasHtml += `<td class="dia-celda"><span class="tag-ok">OK</span></td>`; }
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                ${celdasHtml}
                <td class="text-center ${totalRetardos > 0 ? 'alerta-retardo' : ''}">${totalRetardos}</td>
                <td class="text-center ${totalFaltas > 0 ? 'alerta-falta' : ''}">${totalFaltas}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error semanal:", e); }
}

async function cargarReporteMensual() {
    try {
        const mesSel = document.getElementById('filtroMes').value || mesHoy;
        const personaSel = document.getElementById('filtroPersonaMensual').value;
        const res = await fetch('/api/asistencias');
        const data = await res.json();
        const registrosMes = data.filter(a => a.fecha.startsWith(mesSel));

        const conteo = {};
        personalLista.forEach(p => conteo[p.trim().toLowerCase()] = { retardos: 0, faltas: 0 });
        registrosMes.forEach(a => {
            const n = a.personal.trim().toLowerCase();
            if (conteo[n]) {
                if (a.estatus === 'Retardo') conteo[n].retardos++;
                if (a.estatus === 'Falta') conteo[n].faltas++;
            }
        });

        const tbody = document.getElementById('tablaReporteMensual');
        if (!tbody) return;
        tbody.innerHTML = '';
        let listaMostrar = personaSel !== 'TODOS' ? [personaSel] : personalLista;

        listaMostrar.forEach(persona => {
            const stats = conteo[persona.trim().toLowerCase()] || { retardos: 0, faltas: 0 };
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                <td class="text-center ${stats.retardos > 0 ? 'alerta-retardo' : ''}">${stats.retardos}</td>
                <td class="text-center ${stats.faltas > 0 ? 'alerta-falta' : ''}">${stats.faltas}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error mensual:", e); }
}

async function guardarVacaciones(e) {
    e.preventDefault();
    const payload = {
        personal: document.getElementById('vacPersonal').value,
        periodoAnual: parseInt(document.getElementById('vacAnio').value),
        tipoPeriodo: parseInt(document.getElementById('vacPeriodo').value),
        diasSolicitados: parseInt(document.getElementById('vacDiasCount').value),
        fechaInicio: document.getElementById('vacFecha').value
    };

    try {
        const res = await fetch('/api/vacaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            alert("⚠️ " + data.error);
        } else {
            alert("¡Vacaciones registradas con éxito!");
            document.getElementById('formVacaciones').reset();
            document.getElementById('vacFecha').value = fechaHoy;
            document.getElementById('vacAnio').value = "2026";
            cargarResumenVacaciones();
            cargarMatrizAsistencias();
            cargarReporteSemanal();
            cargarReporteMensual();
            renderizarCalendarioVacaciones();
            cargarPendientes();
        }
    } catch (err) {
        console.error("Error al registrar vacaciones:", err);
    }
}

async function cargarResumenVacaciones() {
    try {
        const res = await fetch('/api/vacaciones');
        const data = await res.json();
        globalVacacionesData = data;
        const tbody = document.getElementById('tablaResumenVacaciones');
        if (!tbody) return;
        tbody.innerHTML = '';

        const anioActual = 2026;
        let resumen = {};
        personalLista.forEach(p => {
            resumen[p] = { p1: 0, p2: 0, ids: { p1: null, p2: null } };
        });

        data.filter(v => v.periodoAnual === anioActual).forEach(v => {
            if (resumen[v.personal]) {
                if (v.tipoPeriodo === 1) {
                    resumen[v.personal].p1 = v.diasTomados;
                    resumen[v.personal].ids.p1 = v._id;
                }
                if (v.tipoPeriodo === 2) {
                    resumen[v.personal].p2 = v.diasTomados;
                    resumen[v.personal].ids.p2 = v._id;
                }
            }
        });

        Object.keys(resumen).forEach(persona => {
            const item = resumen[persona];
            const badgeP1 = item.p1 >= 10 ? `<span class="badge" style="background:#fee2e2; color:#991b1b;">10 / 10 (Completado)</span>` : `${item.p1} / 10 días`;
            const badgeP2 = item.p2 >= 10 ? `<span class="badge" style="background:#fee2e2; color:#991b1b;">10 / 10 (Completado)</span>` : `${item.p2} / 10 días`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                <td>${anioActual}</td>
                <td class="text-center">${badgeP1}</td>
                <td class="text-center">${badgeP2}</td>
                <td class="text-center">
                    ${item.ids.p1 ? `<button class="btn-eliminar-item" onclick="eliminarRegistroVacacion('${item.ids.p1}')">Borrar P1</button>` : ''}
                    ${item.ids.p2 ? `<button class="btn-eliminar-item" onclick="eliminarRegistroVacacion('${item.ids.p2}')" style="background:#d97706; margin-left:4px;">Borrar P2</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
        renderizarCalendarioVacaciones();
        cargarPendientes();
    } catch (e) {
        console.error("Error al cargar resumen de vacaciones:", e);
    }
}

async function renderizarCalendarioVacaciones() {
    const personaSel = document.getElementById('filtroCalendarioVacaciones')?.value;
    const tbody = document.getElementById('tablaCalendarioVacaciones');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!personaSel) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--text-muted); padding: 15px;">Selecciona un empleado para ver su calendario de vacaciones.</td></tr>`;
        return;
    }

    const registrosPersona = globalVacacionesData.filter(v => v.personal === personaSel && v.periodoAnual === 2026);
    if (registrosPersona.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay registros de vacaciones para ${personaSel} en este año.</td></tr>`;
        return;
    }

    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    registrosPersona.forEach(reg => {
        if (reg.fechasSolicitadas && reg.fechasSolicitadas.length > 0) {
            reg.fechasSolicitadas.forEach(sol => {
                let fechasSpan = '';
                if (sol.fechas && sol.fechas.length > 0) {
                    fechasSpan = sol.fechas.map(f => {
                        const fechaObj = new Date(f + 'T00:00:00');
                        const nombreDia = nombresDias[fechaObj.getDay()];
                        return `<span class="badge" style="background:#e0f2fe; color:#0369a1; margin:2px; font-weight:600;">${nombreDia} ${formatearFechaVista(f)}</span>`;
                    }).join(' ');
                } else {
                    fechasSpan = formatearFechaVista(sol.inicio) || '-';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-center"><b>Periodo ${reg.tipoPeriodo}</b></td>
                    <td>${formatearFechaVista(sol.inicio) || 'N/A'}</td>
                    <td class="text-center"><b>${sol.dias} días</b></td>
                    <td>${fechasSpan}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    });
}

async function eliminarRegistroVacacion(id) {
    if (confirm("¿Estás seguro de restablecer este registro de periodo?")) {
        await fetch(`/api/vacaciones/${id}`, { method: 'DELETE' });
        cargarResumenVacaciones();
        cargarMatrizAsistencias();
        cargarReporteSemanal();
        cargarReporteMensual();
    }
}

function exportarPDF(seccionId) {
    const contenidoOriginal = document.body.innerHTML;
    const seccionEl = document.getElementById(seccionId);
    if (!seccionEl) return;
    document.body.innerHTML = seccionEl.innerHTML;
    window.print();
    document.body.innerHTML = contenidoOriginal;
    window.location.reload();
}

function limpiarFiltroAgenda() { 
    const inputAgenda = document.getElementById('filtroFechaAgenda');
    if (inputAgenda) inputAgenda.value = ''; 
    cargarPendientes(); 
}
function limpiarFiltroPendientes() { 
    filtroPrioridadActiva = null; 
    const inputPend = document.getElementById('filtroFechaPendientes');
    if (inputPend) inputPend.value = ''; 
    cargarPendientes(); 
}
function limpiarFiltroSemana() { 
    if (document.getElementById('filtroSemana')) document.getElementById('filtroSemana').value = fechaHoy; 
    if (document.getElementById('filtroPersonaReporte')) document.getElementById('filtroPersonaReporte').value = 'TODOS'; 
    cargarReporteSemanal(); 
}
function limpiarFiltroMensual() { 
    if (document.getElementById('filtroMes')) document.getElementById('filtroMes').value = mesHoy; 
    if (document.getElementById('filtroPersonaMensual')) document.getElementById('filtroPersonaMensual').value = 'TODOS'; 
    cargarReporteMensual(); 
}

async function prepararEdicion(folio) {
    try {
        const res = await fetch('/api/pendientes');
        const data = await res.json();
        const p = data.find(item => item.folio === folio);
        if (!p) return;

        tipoItemEnEdicion = p.tipo;
        document.getElementById('editFolio').value = p.folio;
        document.getElementById('editNotaLibreId').value = '';
        document.getElementById('tipo').value = p.tipo;
        toggleCamposTipo();
        document.getElementById('horaReunion').value = p.horaReunion || '';
        document.getElementById('prioridad').value = p.prioridad || 'Media';
        document.getElementById('incidente').value = p.incidente || '';
        document.getElementById('turnado').value = p.turnado || '';
        document.getElementById('vencimiento').value = p.vencimiento || '';
        document.getElementById('observaciones').value = p.observaciones || '';
        document.getElementById('btnSubmitText').innerText = `Actualizar (${p.folio})`;
        document.getElementById('btnCancelarEdicion').classList.remove('oculto');
        
        cambiarModulo('moduloNuevoRegistro', document.querySelector('.nav-modulos button:first-child'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { console.error("Error edición:", e); }
}

function cancelarEdicionFormulario() {
    const tipoTemp = tipoItemEnEdicion;
    document.getElementById('formPendiente').reset();
    document.getElementById('editFolio').value = '';
    document.getElementById('editNotaLibreId').value = '';
    document.getElementById('btnSubmitText').innerText = 'Guardar Registro';
    document.getElementById('btnCancelarEdicion').classList.add('oculto');
    puntosFormularioLibre = [];
    renderizarTablaPuntosFormularioLibre();
    tipoItemEnEdicion = null;
    toggleCamposTipo();

    if (tipoTemp === 'Reunión') {
        cambiarModulo('moduloAgenda', document.querySelectorAll('.btn-modulo')[1]);
    } else if (tipoTemp === 'Nota') {
        cambiarModulo('moduloNotasLibres', document.querySelectorAll('.btn-modulo')[2]);
    } else {
        cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarPendiente(folio) {
    if (confirm(`¿Eliminar registro ${folio}?`)) {
        await fetch(`/api/pendientes/${folio}`, { method: 'DELETE' });
        cargarPendientes();
    }
}

async function toggleEstado(folio, finalizado) {
    try {
        const resReg = await fetch(`/api/pendientes/${folio}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ finalizado })
        });
        const regAct = await resReg.json();

        if (regAct.tipo !== 'Reunión' && regAct.observaciones && regAct.observaciones.includes('[Origen:')) {
            const match = regAct.observaciones.match(/\[Origen:\s*(.+?)-nota-(\d+)\]/);
            if (match && match.length >= 3) {
                const padreFolio = match[1].trim();
                const idxNota = parseInt(match[2]);
                const resPadre = await fetch('/api/pendientes');
                const todas = await resPadre.json();
                const padre = todas.find(item => item.folio === padreFolio);
                if (padre && padre.notasLista && padre.notasLista[idxNota]) {
                    padre.notasLista[idxNota].completado = finalizado;
                    await fetch(`/api/pendientes/${padreFolio}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(padre) });
                }
            }
        }
        cargarPendientes();
    } catch (e) { cargarPendientes(); }
}

window.onload = () => {
    cargarPendientes();
    poblarSelectAreas();
};