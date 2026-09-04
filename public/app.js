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

let puntosFormularioLibre = [];

function formatearFechaVista(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
}

async function forzarEnvioDiscord() {
    if (!confirm("¿Deseas enviar el reporte actual de Agenda y Actividades a Telegram ahora mismo?")) return;
    try {
        const res = await fetch('/api/forzar-discord', { method: 'POST' });
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
    document.getElementById('filtroFechaPendientes').value = '';
    cargarPendientes();
}

function clickKpiActividadesMedia() {
    filtroPrioridadActiva = 'Media';
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    document.getElementById('filtroFechaPendientes').value = '';
    cargarPendientes();
}

function clickKpiActividadesBaja() {
    filtroPrioridadActiva = 'Baja';
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
    document.getElementById('filtroFechaPendientes').value = '';
    cargarPendientes();
}

function clickKpiReunionesActivas() {
    filtroPrioridadActiva = null;
    cambiarModulo('moduloAgenda', document.querySelectorAll('.btn-modulo')[1]);
    document.getElementById('filtroFechaAgenda').value = '';
    cargarPendientes();
}

function actualizarReloj() {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    document.getElementById('relojWidget').innerText = `${horas}:${minutos}:${segundos}`;
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

const fechaHoy = new Date().toISOString().split('T')[0];
const mesHoy = fechaHoy.substring(0, 7);

document.getElementById('asistFechaCalendario').value = fechaHoy;
document.getElementById('filtroSemana').value = fechaHoy;
document.getElementById('filtroMes').value = mesHoy;
document.getElementById('vacFecha').value = fechaHoy;
const inputLibreFecha = document.getElementById('libreFecha');
if (inputLibreFecha) inputLibreFecha.value = fechaHoy;

const selectPersonaRep = document.getElementById('filtroPersonaReporte');
selectPersonaRep.innerHTML = '<option value="TODOS">-- Todos --</option>';
personalLista.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    selectPersonaRep.appendChild(opt);
});

const selectPersonaMensual = document.getElementById('filtroPersonaMensual');
selectPersonaMensual.innerHTML = '<option value="TODOS">-- Todos --</option>';
personalLista.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    selectPersonaMensual.appendChild(opt);
});

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
    const selectArea = document.getElementById('libreArea');
    if (!selectArea) return;
    try {
        const res = await fetch('/api/areas');
        const data = await res.json();
        if (data && data.length > 0) {
            areasListaInicial = data;
        }
    } catch (e) {
        console.error("Error al cargar áreas:", e);
    }

    selectArea.innerHTML = '<option value="">Seleccionar área...</option>';
    areasListaInicial.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a;
        selectArea.appendChild(opt);
    });
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

async function guardarNotaLibreCompleta(e) {
    e.preventDefault();
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
            document.getElementById('editNotaLibreId').value = '';
            document.getElementById('btnNotaLibreSubmit').innerText = 'Guardar Nota de Reunión';
        } else {
            await fetch('/api/notas-libres', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        document.getElementById('formNotaLibre').reset();
        document.getElementById('libreFecha').value = fechaHoy;
        puntosFormularioLibre = [];
        renderizarTablaPuntosFormularioLibre();
        poblarSelectAreas();
        cargarNotasLibres();
        alert("Nota de reunión guardada con éxito.");
    } catch (err) {
        console.error("Error al guardar nota libre:", err);
    }
}

async function cargarNotasLibres() {
    try {
        const res = await fetch('/api/notas-libres');
        const data = await res.json();
        const tbody = document.getElementById('tablaNotasLibres');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay notas registradas.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const totalNotas = item.notasLista ? item.notasLista.length : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatearFechaVista(item.fecha)}</td>
                <td><b>${item.titulo}</b></td>
                <td><span class="badge badge-libre">${item.area || 'General'}</span></td>
                <td class="text-center"><b>${totalNotas}</b></td>
                <td class="text-center">
                    <div class="acciones-container">
                        <button class="btn-accion btn-notas" onclick="cargarEdicionNotaLibre('${item._id}')" title="Ver o Editar Nota">Ver Nota</button>
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

async function cargarEdicionNotaLibre(id) {
    try {
        const res = await fetch(`/api/notas-libres/${id}`);
        const item = await res.json();
        if (!item) return;

        document.getElementById('editNotaLibreId').value = item._id;
        document.getElementById('libreTitulo').value = item.titulo;
        document.getElementById('libreFecha').value = item.fecha;
        document.getElementById('libreArea').value = item.area || '';
        
        puntosFormularioLibre = item.notasLista ? JSON.parse(JSON.stringify(item.notasLista)) : [];
        renderizarTablaPuntosFormularioLibre();
        document.getElementById('btnNotaLibreSubmit').innerText = 'Actualizar Nota de Reunión';
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
    
    if (tipo === 'Reunión') {
        grupoHora.classList.remove('oculto');
        inputHora.required = true;
        grupoTurnado.classList.add('oculto');
        selectTurnadoElem.required = false;
        selectTurnadoElem.value = '';
    } else {
        grupoHora.classList.add('oculto');
        inputHora.required = false;
        inputHora.value = '';
        grupoTurnado.classList.remove('oculto');
        selectTurnadoElem.required = true;
    }
}

async function actualizarDashboardKPIs(dataPendientes) {
    try {
        const actAlta = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Alta').length;
        document.getElementById('kpiActividadesAlta').innerText = actAlta;

        const actMedia = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Media').length;
        document.getElementById('kpiActividadesMedia').innerText = actMedia;

        const actBaja = dataPendientes.filter(p => p.tipo !== 'Reunión' && !p.finalizado && p.prioridad === 'Baja').length;
        document.getElementById('kpiActividadesBaja').innerText = actBaja;

        const resAsist = await fetch('/api/asistencias');
        const dataAsist = await resAsist.json();
        const enVacacionesHoy = dataAsist.filter(a => a.fecha === fechaHoy && a.estatus === 'Vacaciones');
        
        const spanNombresQuick = document.getElementById('quickVacacionesNombres');
        if (spanNombresQuick) {
            spanNombresQuick.innerText = enVacacionesHoy.length > 0 ? enVacacionesHoy.map(v => v.personal).join(', ') : 'Ninguno';
        }

        const reunionesActivas = dataPendientes.filter(p => p.tipo === 'Reunión' && !p.finalizado).length;
        document.getElementById('kpiReunionesActivas').innerText = reunionesActivas;
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
        
        const fechaAgenda = document.getElementById('filtroFechaAgenda').value;
        const fechaPendientes = document.getElementById('filtroFechaPendientes').value;
        
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
        const tbodyPendientesFinalizados = document.getElementById('tablaPendientesFinalizados');
        
        tbodyReuniones.innerHTML = '';
        tbodyReunionesFinalizadas.innerHTML = '';
        tbodyPendientes.innerHTML = '';
        tbodyPendientesFinalizados.innerHTML = '';
        
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

                tr.innerHTML = `
                    <td><span class="badge badge-reu">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td>${p.incidente}</td>
                    <td class="text-center">${formatearFechaVista(p.vencimiento)} - ${p.horaReunion}h</td>
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

        if (reunionesFinalizadas.length === 0) {
            tbodyReunionesFinalizadas.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay reuniones finalizadas.</td></tr>`;
        } else {
            reunionesFinalizadas.forEach(p => {
                const tr = document.createElement('tr');
                tr.classList.add('completado');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                tr.innerHTML = `
                    <td><span class="badge badge-reu">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td>${p.incidente}</td>
                    <td class="text-center">${formatearFechaVista(p.vencimiento)} - ${p.horaReunion}h</td>
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

                tr.innerHTML = `
                    <td><span class="badge badge-pen">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td>${p.incidente}</td>
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

        if (actividadesFinalizadas.length === 0) {
            tbodyPendientesFinalizados.innerHTML = `<tr><td colspan="12" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay actividades finalizadas.</td></tr>`;
        } else {
            actividadesFinalizadas.forEach(p => {
                const tr = document.createElement('tr');
                tr.classList.add('completado');
                let badgePri = p.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (p.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
                tr.innerHTML = `
                    <td><span class="badge badge-pen">${p.folio}</span></td>
                    <td class="text-center">${badgePri}</td>
                    <td>${formatearFechaVista(p.fecha)}</td>
                    <td>${p.incidente}</td>
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
                tbodyPendientesFinalizados.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error al cargar pendientes:", e);
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

        document.getElementById('modalNotasFolio').innerText = p.folio;
        document.getElementById('modalNotasDesc').innerText = `[${p.tipo}] ${p.incidente}`;
        document.getElementById('inputNotaTexto').value = '';
        document.getElementById('inputNotaResponsable').value = '';
        document.getElementById('inputNotaPrioridad').value = 'Media';

        notasTemporalesModal = p.notasLista ? JSON.parse(JSON.stringify(p.notasLista)) : [];
        renderizarTablaNotasModal();
        document.getElementById('modalNotas').style.display = 'flex';
    } catch (e) {
        console.error("Error al abrir notas:", e);
    }
}

function cerrarModalSimple() {
    document.getElementById('modalNotas').style.display = 'none';
    folioNotaActual = null;
    tipoItemActual = null;
    cargarPendientes();
}

function agregarNotaModal() {
    const texto = document.getElementById('inputNotaTexto').value.trim();
    const responsable = document.getElementById('inputNotaResponsable').value;
    const prioridad = document.getElementById('inputNotaPrioridad').value;
    if (!texto) { alert('Escribe el contenido de la nota.'); return; }

    notasTemporalesModal.push({ texto, responsable: responsable || 'General', prioridad, completado: false });
    document.getElementById('inputNotaTexto').value = '';
    document.getElementById('inputNotaResponsable').value = '';
    renderizarTablaNotasModal();
}

function handleTextAreaKeyDown(event) {
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        agregarNotaModal();
    }
}

function toggleNotaRealizadaModal(indexNota, completado) {
    if (notasTemporalesModal[indexNota]) {
        notasTemporalesModal[indexNota].completado = completado;
        renderizarTablaNotasModal();
    }
}

function eliminarNotaModal(indexNota) {
    notasTemporalesModal.splice(indexNota, 1);
    renderizarTablaNotasModal();
}

function renderizarTablaNotasModal() {
    const tbody = document.getElementById('tablaNotasModal');
    tbody.innerHTML = '';
    if (!notasTemporalesModal || notasTemporalesModal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay notas registradas.</td></tr>`;
        return;
    }

    notasTemporalesModal.forEach((nota, idx) => {
        let badgePri = nota.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (nota.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
        const tr = document.createElement('tr');
        if (nota.completado) tr.classList.add('completado');
        const textoHtml = nota.texto.replace(/\n/g, '<br>');

        tr.innerHTML = `
            <td class="text-center"><input type="checkbox" style="width: 18px; height: 18px;" ${nota.completado ? 'checked' : ''} onclick="toggleNotaRealizadaModal(${idx}, this.checked)"></td>
            <td style="white-space: pre-line;">${textoHtml}</td>
            <td><b>${nota.responsable}</b></td>
            <td class="text-center">${badgePri}</td>
            <td class="text-center"><button class="btn-eliminar-item" onclick="eliminarNotaModal(${idx})">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
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
            document.getElementById(`th${['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'][i]}`).innerText = `${nombresDias[i]} (${formatearFechaVista(diasSemana[i]).substring(0, 5)})`;
        }

        const res = await fetch('/api/asistencias');
        const data = await res.json();
        const tbody = document.getElementById('tablaReporteSemanal');
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
    const personaSel = document.getElementById('filtroCalendarioVacaciones').value;
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
    document.body.innerHTML = document.getElementById(seccionId).innerHTML;
    window.print();
    document.body.innerHTML = contenidoOriginal;
    window.location.reload();
}

function limpiarFiltroAgenda() { document.getElementById('filtroFechaAgenda').value = ''; cargarPendientes(); }
function limpiarFiltroPendientes() { filtroPrioridadActiva = null; document.getElementById('filtroFechaPendientes').value = ''; cargarPendientes(); }
function limpiarFiltroSemana() { document.getElementById('filtroSemana').value = fechaHoy; document.getElementById('filtroPersonaReporte').value = 'TODOS'; cargarReporteSemanal(); }
function limpiarFiltroMensual() { document.getElementById('filtroMes').value = mesHoy; document.getElementById('filtroPersonaMensual').value = 'TODOS'; cargarReporteMensual(); }

document.getElementById('formPendiente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editFolio = document.getElementById('editFolio').value;
    const payload = {
        tipo: document.getElementById('tipo').value,
        incidente: document.getElementById('incidente').value,
        turnado: document.getElementById('turnado').value,
        vencimiento: document.getElementById('vencimiento').value,
        horaReunion: document.getElementById('horaReunion').value,
        observaciones: document.getElementById('observaciones').value,
        prioridad: document.getElementById('prioridad').value
    };

    if (editFolio) {
        await fetch(`/api/pendientes/${editFolio}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        document.getElementById('editFolio').value = '';
        document.getElementById('btnSubmitText').innerText = 'Guardar Registro';
    } else {
        await fetch('/api/pendientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    document.getElementById('formPendiente').reset();
    toggleCamposTipo();
    cargarPendientes();
});

async function prepararEdicion(folio) {
    try {
        const res = await fetch('/api/pendientes');
        const data = await res.json();
        const p = data.find(item => item.folio === folio);
        if (!p) return;

        document.getElementById('editFolio').value = p.folio;
        document.getElementById('tipo').value = p.tipo;
        toggleCamposTipo();
        document.getElementById('horaReunion').value = p.horaReunion || '';
        document.getElementById('prioridad').value = p.prioridad || 'Media';
        document.getElementById('incidente').value = p.incidente || '';
        document.getElementById('turnado').value = p.turnado || '';
        document.getElementById('vencimiento').value = p.vencimiento || '';
        document.getElementById('observaciones').value = p.observaciones || '';
        document.getElementById('btnSubmitText').innerText = `Actualizar (${p.folio})`;
        cambiarModulo('moduloNuevoRegistro', document.querySelector('.nav-modulos button:first-child'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { console.error("Error edición:", e); }
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

function cerrarAlerta() { document.getElementById('modalAlerta').style.display = 'none'; }
function mostrarModal(t, h) {
    document.getElementById('tituloModal').innerText = t;
    document.getElementById('contenidoModal').innerHTML = h;
    document.getElementById('modalAlerta').style.display = 'flex';
}

window.onload = () => {
    cargarPendientes();
};