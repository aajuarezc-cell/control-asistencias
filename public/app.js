// ==========================================
// ESTADO GLOBAL Y VARIABLES
// ==========================================
let areasListaInicial = [
    'Dirección Gral de Administración',
    'Academia de Policía',
    'Recursos Humanos',
    'Repuve'
];
let puntosFormularioLibre = [];
let indicePuntoEnEdicion = null;

// ==========================================
// INICIALIZACIÓN Y RELOJ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setInterval(actualizarReloj, 1000);
    actualizarReloj();
    cargarAreasYSelects();
    cargarPendientes();
    cargarNotasLibres();
    cargarMatrizAsistencias();
    cargarListaPersonalVacaciones();
    cargarResumenVacaciones();

    // Establecer fecha por defecto en los inputs de fecha
    const hoy = new Date().toISOString().split('T')[0];
    const libreFecha = document.getElementById('libreFecha');
    if (libreFecha) libreFecha.value = hoy;
    const asistFecha = document.getElementById('asistFechaCalendario');
    if (asistFecha) asistFecha.value = hoy;
    const vacFecha = document.getElementById('vacFecha');
    if (vacFecha) vacFecha.value = hoy;
});

function actualizarReloj() {
    const reloj = document.getElementById('relojWidget');
    if (reloj) {
        const ahora = new Date();
        reloj.textContent = ahora.toLocaleTimeString();
    }
}

function irAlHome() {
    cambiarModulo('moduloNuevoRegistro', document.querySelector('.btn-modulo'));
}

// ==========================================
// NAVEGACIÓN DE MÓDULOS Y SUBMÓDULOS
// ==========================================
function cambiarModulo(idModulo, btn) {
    document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.btn-modulo').forEach(b => b.classList.remove('activo'));

    const vista = document.getElementById(idModulo);
    if (vista) vista.classList.add('activo');
    if (btn) btn.classList.add('activo');

    if (idModulo === 'moduloAgenda') cargarPendientes();
    if (idModulo === 'moduloNotasLibres') cargarNotasLibres();
    if (idModulo === 'moduloPendientes') cargarPendientes();
    if (idModulo === 'moduloAsistencias') cargarMatrizAsistencias();
    if (idModulo === 'moduloVacaciones') {
        cargarListaPersonalVacaciones();
        cargarResumenVacaciones();
    }
}

function cambiarSubmodulo(idSubmodulo, btn) {
    const contenedor = btn.closest('.modulo-vista');
    if (!contenedor) return;

    contenedor.querySelectorAll('.submodulo-vista').forEach(v => v.classList.remove('activo'));
    contenedor.querySelectorAll('.btn-submodulo').forEach(b => b.classList.remove('activo'));

    const vista = document.getElementById(idSubmodulo);
    if (vista) vista.classList.add('activo');
    if (btn) btn.classList.add('activo');
}


// ==========================================
// GESTIÓN DE ÁREAS Y SELECTORES DE PERSONAL
// ==========================================
async function cargarAreasYSelects() {
    try {
        const res = await fetch('/api/areas');
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
            const setAreas = new Set([...areasListaInicial, ...data]);
            areasListaInicial = Array.from(setAreas);
        }
    } catch (e) {
        console.error("Error al cargar áreas:", e);
    }

    poblarSelectoresArea();
    poblarSelectoresPersonal();
}

function poblarSelectoresArea() {
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

function poblarSelectoresPersonal() {
    const listaPersonal = [
        "Itzel", "Juan Pérez", "María López", "Carlos Ruiz", 
        "Ana Gómez", "Sofía Torres", "Roberto Díaz", "Sin asignar"
    ];

    ['turnado', 'inputLibreNotaResponsable', 'inputNotaResponsable', 'filtroPersonaReporte', 'filtroPersonaMensual', 'vacPersonal', 'filtroCalendarioVacaciones'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            const valActual = sel.value;
            sel.innerHTML = id.includes('filtro') ? '<option value="TODOS">-- Todo el Personal --</option>' : '';
            listaPersonal.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p === "Sin asignar" && id !== 'turnado' ? '' : p;
                opt.textContent = p;
                sel.appendChild(opt);
            });
            if (valActual) sel.value = valActual;
        }
    });
}

async function agregarNuevaAreaPrompt() {
    const nuevaArea = prompt("Ingrese el nombre del nuevo Área o Departamento:");
    if (!nuevaArea || !nuevaArea.trim()) return;

    try {
        const res = await fetch('/api/areas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevaArea.trim() })
        });
        const data = await res.json();
        if (data.areas) {
            areasListaInicial = data.areas;
            poblarSelectoresArea();
            document.getElementById('libreArea').value = nuevaArea.trim();
        }
    } catch (e) {
        mostrarAlerta("Error", "No se pudo guardar la nueva área.");
    }
}


// ==========================================
// MÓDULO 1: NUEVO REGISTRO / EDICIÓN
// ==========================================
function toggleCamposTipo() {
    const tipo = document.getElementById('tipo').value;
    const grupoHora = document.getElementById('grupoHoraReunion');
    const grupoTitulo = document.getElementById('grupoTituloNota');
    const grupoFechaNota = document.getElementById('grupoFechaNota');
    const grupoAreaNota = document.getElementById('grupoAreaNota');
    const grupoPuntosNota = document.getElementById('grupoPuntosNota');
    const grupoPrioridad = document.getElementById('grupoPrioridad');
    const grupoVencimiento = document.getElementById('grupoVencimiento');
    const grupoIncidente = document.getElementById('grupoIncidente');
    const grupoObservaciones = document.getElementById('grupoObservaciones');
    const grupoTurnado = document.getElementById('grupoTurnado');

    // Ocultar todo primero
    [grupoHora, grupoTitulo, grupoFechaNota, grupoAreaNota, grupoPuntosNota, grupoPrioridad, grupoVencimiento, grupoIncidente, grupoObservaciones, grupoTurnado].forEach(el => el.classList.add('oculto'));

    if (tipo === 'Actividad') {
        grupoTurnado.classList.remove('oculto');
        grupoPrioridad.classList.remove('oculto');
        grupoVencimiento.classList.remove('oculto');
        grupoIncidente.classList.remove('oculto');
        grupoObservaciones.classList.remove('oculto');
    } else if (tipo === 'Reunión') {
        grupoHora.classList.remove('oculto');
        grupoTurnado.classList.remove('oculto');
        grupoPrioridad.classList.remove('oculto');
        grupoVencimiento.classList.remove('oculto');
        grupoIncidente.classList.remove('oculto');
        grupoObservaciones.classList.remove('oculto');
    } else if (tipo === 'Nota') {
        grupoTitulo.classList.remove('oculto');
        grupoFechaNota.classList.remove('oculto');
        grupoAreaNota.classList.remove('oculto');
        grupoPuntosNota.classList.remove('oculto');
        document.getElementById('libreFecha').value = new Date().toISOString().split('T')[0];
    }
}

function handleLibreTextAreaKeyDown(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        agregarPuntoFormularioLibre();
    }
}

function agregarPuntoFormularioLibre() {
    const texto = document.getElementById('inputLibreNotaTexto').value.trim();
    const responsable = document.getElementById('inputLibreNotaResponsable').value;
    const prioridad = document.getElementById('inputLibreNotaPrioridad').value;

    if (!texto) return;

    if (indicePuntoEnEdicion !== null) {
        puntosFormularioLibre[indicePuntoEnEdicion] = {
            ...puntosFormularioLibre[indicePuntoEnEdicion],
            texto,
            responsable: responsable || 'General',
            prioridad
        };
        indicePuntoEnEdicion = null;
        const btnAgregar = document.querySelector('.btn-add-punto-verde');
        if (btnAgregar) {
            btnAgregar.style.background = '#34c759';
            btnAgregar.title = "Agregar punto";
        }
    } else {
        puntosFormularioLibre.push({ texto, responsable: responsable || 'General', prioridad, completado: false });
    }

    document.getElementById('inputLibreNotaTexto').value = '';
    document.getElementById('inputLibreNotaResponsable').value = '';
    renderizarTablaPuntosFormularioLibre();
}

function prepararEdicionPuntoLibre(index) {
    const pto = puntosFormularioLibre[index];
    if (!pto) return;

    document.getElementById('inputLibreNotaTexto').value = pto.texto;
    document.getElementById('inputLibreNotaResponsable').value = pto.responsable || '';
    document.getElementById('inputLibreNotaPrioridad').value = pto.prioridad || 'Media';
    indicePuntoEnEdicion = index;

    const btnAgregar = document.querySelector('.btn-add-punto-verde');
    if (btnAgregar) {
        btnAgregar.style.background = '#ff9500';
        btnAgregar.title = "Actualizar punto";
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

        tr.innerHTML = `
            <td class="text-center">${idx + 1}</td>
            <td style="white-space: pre-line;">${pto.texto.replace(/\n/g, '<br>')}</td>
            <td><b>${pto.responsable}</b></td>
            <td class="text-center">${badgePri}</td>
            <td class="text-center" style="display: flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-accion btn-editar" onclick="prepararEdicionPuntoLibre(${idx})" style="padding: 4px 8px; font-size: 11px;">Editar</button>
                <button type="button" class="btn-eliminar-item" onclick="eliminarPuntoFormularioLibre(${idx})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function guardarRegistroGeneral(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo').value;
    const editFolio = document.getElementById('editFolio').value;
    const editNotaId = document.getElementById('editNotaLibreId').value;

    if (tipo === 'Nota') {
        const titulo = document.getElementById('libreTitulo').value.trim();
        const fecha = document.getElementById('libreFecha').value;
        const area = document.getElementById('libreArea').value || 'General';

        if (!titulo || !fecha) {
            mostrarAlerta("Campos requeridos", "Complete el título y la fecha de la nota.");
            return;
        }

        const payload = { titulo, fecha, area, notasLista: puntosFormularioLibre };
        try {
            let url = '/api/notas-libres';
            let method = 'POST';
            if (editNotaId) {
                url += `/${editNotaId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                mostrarAlerta("Éxito", "Nota guardada correctamente.");
                cancelarEdicionFormulario();
                cambiarModulo('moduloNotasLibres', document.querySelectorAll('.btn-modulo')[2]);
            }
        } catch (err) {
            mostrarAlerta("Error", "No se pudo guardar la nota.");
        }
    } else {
        const incidente = document.getElementById('incidente').value.trim();
        const turnado = document.getElementById('turnado').value;
        const vencimiento = document.getElementById('vencimiento').value;
        const horaReunion = document.getElementById('horaReunion').value;
        const observaciones = document.getElementById('observaciones').value.trim();
        const prioridad = document.getElementById('prioridad').value;

        if (!incidente) {
            mostrarAlerta("Campo requerido", "La descripción o incidente es obligatoria.");
            return;
        }

        const payload = { tipo, incidente, turnado, vencimiento, horaReunion, observaciones, prioridad };
        try {
            let url = '/api/pendientes';
            let method = 'POST';
            if (editFolio) {
                url += `/${editFolio}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                mostrarAlerta("Éxito", "Registro guardado exitosamente.");
                cancelarEdicionFormulario();
                cambiarModulo(tipo === 'Reunión' ? 'moduloAgenda' : 'moduloPendientes', document.querySelectorAll('.btn-modulo')[tipo === 'Reunión' ? 1 : 3]);
            }
        } catch (err) {
            mostrarAlerta("Error", "No se pudo guardar el registro.");
        }
    }
}

function cancelarEdicionFormulario() {
    document.getElementById('formPendiente').reset();
    document.getElementById('editFolio').value = '';
    document.getElementById('editNotaLibreId').value = '';
    puntosFormularioLibre = [];
    indicePuntoEnEdicion = null;
    document.getElementById('btnSubmitText').textContent = 'Guardar Registro';
    document.getElementById('btnCancelarEdicion').classList.add('oculto');
    toggleCamposTipo();
    renderizarTablaPuntosFormularioLibre();
}


// ==========================================
// MÓDULOS 2 y 4: AGENDA Y ACTIVIDADES (PENDIENTES)
// ==========================================
async function cargarPendientes() {
    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        
        const filtroFecha = document.getElementById('filtroFechaAgenda')?.value || document.getElementById('filtroFechaPendientes')?.value;

        let filtrados = items;
        if (filtroFecha) {
            filtrados = items.filter(i => i.vencimiento === filtroFecha || i.fecha === filtroFecha);
        }

        renderizarTablaPendientes(filtrados.filter(i => i.tipo === 'Reunión' && !i.finalizado), 'tablaReuniones');
        renderizarTablaPendientes(filtrados.filter(i => i.tipo === 'Reunión' && i.finalizado), 'tablaReunionesFinalizadas', true);
        renderizarTablaPendientes(filtrados.filter(i => i.tipo === 'Actividad' && !i.finalizado), 'tablaPendientes');
        renderizarTablaPendientes(filtrados.filter(i => i.tipo === 'Actividad' && i.finalizado), 'tablaPendientesFinalizadas', true);

        actualizarKpis(items);
    } catch (e) {
        console.error("Error cargando pendientes:", e);
    }
}

function renderizarTablaPendientes(lista, idTbody, esFinalizado = false) {
    const tbody = document.getElementById(idTbody);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay registros disponibles.</td></tr>`;
        return;
    }

    lista.forEach(item => {
        let badgePri = item.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (item.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
        
        const totalNotas = item.notasLista ? item.notasLista.length : 0;
        const notasPendientes = item.notasLista ? item.notasLista.filter(n => !n.completado).length : 0;
        const badgeNotas = totalNotas > 0 ? `<span class="badge badge-pen">${notasPendientes} / ${totalNotas} Pend.</span>` : '<span style="color:var(--text-muted)">Sin notas</span>';

        const asignadosSet = new Set(item.notasLista ? item.notasLista.map(n => n.responsable).filter(Boolean) : []);
        const asignadosStr = asignadosSet.size > 0 ? Array.from(asignadosSet).join(', ') : (item.turnado || 'Sin asignar');

        const tr = document.createElement('tr');
        if (item.finalizado) tr.classList.add('completado');

        tr.innerHTML = `
            <td><b>${item.folio}</b></td>
            <td class="text-center">${badgePri}</td>
            <td>${item.fecha}</td>
            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;" onclick="verIncidenteAmpliado('${item.folio}', \`${item.incidente.replace(/`/g, '\\`')}\`)" title="Ver detalle">${item.incidente}</td>
            <td class="text-center">${item.turnado || '-'}</td>
            <td class="text-center">${badgeNotas}</td>
            <td>${asignadosStr}</td>
            <td class="text-center"><span class="badge ${item.tipo === 'Reunión' ? 'badge-reu' : 'badge-pen'}">${item.estatus || item.tipo}</span></td>
            <td>${item.observaciones || '-'}</td>
            <td class="text-center">
                <input type="checkbox" ${item.finalizado ? 'checked' : ''} onchange="toggleFinalizado('${item.folio}', this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            <td class="text-center">
                <div class="acciones-container">
                    <button class="btn-accion btn-notas" onclick="abrirModalNotas('${item.folio}')" title="Notas/Acuerdos">📝</button>
                    <button class="btn-accion btn-editar" onclick="editarPendiente('${item.folio}')" title="Editar">✏️</button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarPendiente('${item.folio}')" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleFinalizado(folio, estado) {
    try {
        await fetch(`/api/pendientes/${folio}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ finalizado: estado })
        });
        cargarPendientes();
    } catch (e) {
        mostrarAlerta("Error", "No se pudo actualizar el estatus.");
    }
}

async function eliminarPendiente(folio) {
    if (!confirm(`¿Está seguro de eliminar el registro ${folio}?`)) return;
    try {
        await fetch(`/api/pendientes/${folio}`, { method: 'DELETE' });
        cargarPendientes();
    } catch (e) {
        mostrarAlerta("Error", "No se pudo eliminar el registro.");
    }
}

async function editarPendiente(folio) {
    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        const item = items.find(i => i.folio === folio);
        if (!item) return;

        cambiarModulo('moduloNuevoRegistro', document.querySelectorAll('.btn-modulo')[0]);

        document.getElementById('tipo').value = item.tipo;
        toggleCamposTipo();

        document.getElementById('editFolio').value = item.folio;
        document.getElementById('incidente').value = item.incidente;
        document.getElementById('turnado').value = item.turnado || '';
        document.getElementById('vencimiento').value = item.vencimiento || '';
        document.getElementById('horaReunion').value = item.horaReunion || '';
        document.getElementById('observaciones').value = item.observaciones || '';
        document.getElementById('prioridad').value = item.prioridad || 'Media';

        document.getElementById('btnSubmitText').textContent = 'Actualizar Registro';
        document.getElementById('btnCancelarEdicion').classList.remove('oculto');
    } catch (e) {
        mostrarAlerta("Error", "No se pudo cargar el registro para edición.");
    }
}

function actualizarKpis(items) {
    const activas = items.filter(i => !i.finalizado);
    const alta = activas.filter(i => i.tipo === 'Actividad' && i.prioridad === 'Alta').length;
    const media = activas.filter(i => i.tipo === 'Actividad' && i.prioridad === 'Media').length;
    const baja = activas.filter(i => i.tipo === 'Actividad' && i.prioridad === 'Baja').length;
    const reuniones = activas.filter(i => i.tipo === 'Reunión').length;

    document.getElementById('kpiActividadesAlta').textContent = alta;
    document.getElementById('kpiActividadesMedia').textContent = media;
    document.getElementById('kpiActividadesBaja').textContent = baja;
    document.getElementById('kpiReunionesActivas').textContent = reuniones;
}

function clickKpiActividadesAlta() {
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
}
function clickKpiActividadesMedia() {
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
}
function clickKpiActividadesBaja() {
    cambiarModulo('moduloPendientes', document.querySelectorAll('.btn-modulo')[3]);
}
function clickKpiReunionesActivas() {
    cambiarModulo('moduloAgenda', document.querySelectorAll('.btn-modulo')[1]);
}

function limpiarFiltroAgenda() {
    document.getElementById('filtroFechaAgenda').value = '';
    cargarPendientes();
}
function limpiarFiltroPendientes() {
    document.getElementById('filtroFechaPendientes').value = '';
    cargarPendientes();
}


// ==========================================
// MODAL DE NOTAS / ACUERDOS (PENDIENTES Y NOTAS LIBRES)
// ==========================================
let notaActualModalFolio = null;

async function abrirModalNotas(folio) {
    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        const item = items.find(i => i.folio === folio);
        if (!item) return;

        notaActualModalFolio = folio;
        document.getElementById('modalNotasFolio').textContent = `Folio: ${item.folio}`;
        document.getElementById('modalNotasDesc').textContent = item.incidente;

        renderizarTablaNotasModal(item.notasLista || []);
        document.getElementById('modalNotas').style.display = 'flex';
    } catch (e) {
        mostrarAlerta("Error", "No se pudieron cargar las notas.");
    }
}

function cerrarModalSimple() {
    document.getElementById('modalNotas').style.display = 'none';
    cargarPendientes();
}

function handleTextAreaKeyDown(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault();
        agregarNotaModal();
    }
}

async function agregarNotaModal() {
    const texto = document.getElementById('inputNotaTexto').value.trim();
    const responsable = document.getElementById('inputNotaResponsable').value;
    const prioridad = document.getElementById('inputNotaPrioridad').value;

    if (!texto) return;

    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        const item = items.find(i => i.folio === notaActualModalFolio);
        if (!item) return;

        if (!item.notasLista) item.notasLista = [];
        item.notasLista.push({ texto, responsable: responsable || 'General', prioridad, completado: false });

        await fetch(`/api/pendientes/${notaActualModalFolio}/notas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notasLista: item.notasLista })
        });

        document.getElementById('inputNotaTexto').value = '';
        document.getElementById('inputNotaResponsable').value = '';
        renderizarTablaNotasModal(item.notasLista);
    } catch (e) {
        mostrarAlerta("Error", "No se pudo agregar la nota.");
    }
}

function renderizarTablaNotasModal(lista) {
    const tbody = document.getElementById('tablaNotasModal');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay notas agregadas.</td></tr>`;
        return;
    }

    lista.forEach((nota, idx) => {
        let badgePri = nota.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (nota.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
        const tr = document.createElement('tr');
        if (nota.completado) tr.classList.add('completado');

        tr.innerHTML = `
            <td class="text-center"><input type="checkbox" ${nota.completado ? 'checked' : ''} onchange="toggleNotaCompletada(${idx}, this.checked)" style="width: 18px; height: 18px; cursor: pointer;"></td>
            <td style="white-space: pre-line;">${nota.texto.replace(/\n/g, '<br>')}</td>
            <td><b>${nota.responsable}</b></td>
            <td class="text-center">${badgePri}</td>
            <td class="text-center"><button class="btn-eliminar-item" onclick="eliminarNotaModal(${idx})">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function toggleNotaCompletada(index, estado) {
    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        const item = items.find(i => i.folio === notaActualModalFolio);
        if (!item || !item.notasLista[index]) return;

        item.notasLista[index].completado = estado;

        await fetch(`/api/pendientes/${notaActualModalFolio}/notas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notasLista: item.notasLista })
        });

        renderizarTablaNotasModal(item.notasLista);
    } catch (e) {
        mostrarAlerta("Error", "No se pudo actualizar el estatus de la nota.");
    }
}

async function eliminarNotaModal(index) {
    try {
        const res = await fetch('/api/pendientes');
        const items = await res.json();
        const item = items.find(i => i.folio === notaActualModalFolio);
        if (!item) return;

        item.notasLista.splice(index, 1);

        await fetch(`/api/pendientes/${notaActualModalFolio}/notas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notasLista: item.notasLista })
        });

        renderizarTablaNotasModal(item.notasLista);
    } catch (e) {
        mostrarAlerta("Error", "No se pudo eliminar la nota.");
    }
}


// ==========================================
// MÓDULO 3: NOTAS / REUNIONES INTERNAS
// ==========================================
async function cargarNotasLibres() {
    try {
        const res = await fetch('/api/notas-libres');
        const notas = await res.json();
        const filtroArea = document.getElementById('filtroAreaNotas')?.value;

        let filtradas = notas;
        if (filtroArea && filtroArea !== 'TODOS') {
            filtradas = notas.filter(n => n.area === filtroArea);
        }

        const tbody = document.getElementById('tablaNotasLibres');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay notas internas registradas.</td></tr>`;
            return;
        }

        filtradas.forEach(nota => {
            const total = nota.notasLista ? nota.notasLista.length : 0;
            const pendientes = nota.notasLista ? nota.notasLista.filter(n => !n.completado).length : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${nota.fecha}</td>
                <td><b>${nota.titulo}</b></td>
                <td><span class="badge badge-reu">${nota.area}</span></td>
                <td class="text-center">${total}</td>
                <td class="text-center"><span class="badge badge-pen">${pendientes} PEND.</span></td>
                <td class="text-center">
                    <div class="acciones-container" style="justify-content: center;">
                        <button class="btn-accion btn-notas" onclick="verNotaLibreModal('${nota._id}')" title="Ver">Ver</button>
                        <button class="btn-accion btn-editar" onclick="editarNotaLibre('${nota._id}')" title="Editar">Editar</button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarNotaLibre('${nota._id}')" title="Eliminar">Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error cargando notas libres:", e);
    }
}

async function verNotaLibreModal(id) {
    try {
        const res = await fetch(`/api/notas-libres/${id}`);
        const nota = await res.json();
        if (!nota) return;

        let contenidoHtml = `
            <div style="background: white; width: 100%; max-width: 700px; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid var(--border-color); box-sizing: border-box; max-height: 85vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 15px;">
                    <h3 style="margin: 0; font-size: 20px; color: var(--text-main);">📝 ${nota.titulo}</h3>
                    <button type="button" onclick="document.getElementById('modalIncidente').style.display='none'" style="background: #e5e5ea; border: none; width: 30px; height: 30px; border-radius: 50%; font-weight: bold; cursor: pointer;">✕</button>
                </div>
                <p style="margin: 0 0 15px 0; color: var(--text-muted); font-size: 13px;">Fecha: <b>${nota.fecha}</b> | Área: <b>${nota.area}</b> | Total Puntos: <b>${nota.notasLista.length}</b></p>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        `;

        nota.notasLista.forEach((pto, idx) => {
            let badgePri = pto.prioridad === 'Alta' ? '<span class="prioridad-alta">ALTA</span>' : (pto.prioridad === 'Baja' ? '<span class="prioridad-baja">BAJA</span>' : '<span class="prioridad-media">MEDIA</span>');
            contenidoHtml += `
                <div style="background: #fbfbfd; border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 12px; display: flex; align-items: flex-start; gap: 12px;">
                    <input type="checkbox" ${pto.completado ? 'checked' : ''} onchange="togglePuntoNotaLibreModal('${nota._id}', ${idx}, this.checked)" style="margin-top: 3px; width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1; ${pto.completado ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                        <div style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 4px;">${idx + 1}. ${pto.responsable} (${badgePri})</div>
                        <div style="font-size: 13px; color: var(--text-main); white-space: pre-line;">${pto.texto}</div>
                    </div>
                </div>
            `;
        });

        contenidoHtml += `
                </div>
                <div style="text-align: right;">
                    <button type="button" class="btn-cerrar" onclick="document.getElementById('modalIncidente').style.display='none'" style="width: auto; padding: 8px 20px;">Cerrar</button>
                </div>
            </div>
        `;

        document.getElementById('modalIncidenteTexto').innerHTML = '';
        document.getElementById('modalIncidenteTitulo').textContent = '';
        const modalContainer = document.querySelector('#modalIncidente > div');
        modalContainer.innerHTML = contenidoHtml;
        document.getElementById('modalIncidente').style.display = 'flex';
    } catch (e) {
        mostrarAlerta("Error", "No se pudo abrir la nota.");
    }
}

async function togglePuntoNotaLibreModal(idNota, indexPunto, estado) {
    try {
        await fetch(`/api/notas-libres/${idNota}/punto/${indexPunto}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completado: estado })
        });
        verNotaLibreModal(idNota);
        cargarNotasLibres();
    } catch (e) {
        mostrarAlerta("Error", "No se pudo actualizar el punto.");
    }
}

async function editarNotaLibre(id) {
    try {
        const res = await fetch(`/api/notas-libres/${id}`);
        const nota = await res.json();
        if (!nota) return;

        cambiarModulo('moduloNuevoRegistro', document.querySelectorAll('.btn-modulo')[0]);

        document.getElementById('tipo').value = 'Nota';
        toggleCamposTipo();

        document.getElementById('editNotaLibreId').value = nota._id;
        document.getElementById('libreTitulo').value = nota.titulo;
        document.getElementById('libreFecha').value = nota.fecha;
        document.getElementById('libreArea').value = nota.area;
        puntosFormularioLibre = nota.notasLista || [];

        renderizarTablaPuntosFormularioLibre();
        document.getElementById('btnSubmitText').textContent = 'Actualizar Nota de Reunión';
        document.getElementById('btnCancelarEdicion').classList.remove('oculto');
    } catch (e) {
        mostrarAlerta("Error", "No se pudo cargar la nota para edición.");
    }
}

async function eliminarNotaLibre(id) {
    if (!confirm("¿Está seguro de eliminar esta nota interna?")) return;
    try {
        await fetch(`/api/notas-libres/${id}`, { method: 'DELETE' });
        cargarNotasLibres();
    } catch (e) {
        mostrarAlerta("Error", "No se pudo eliminar la nota.");
    }
}

function limpiarFiltroAreaNotas() {
    document.getElementById('filtroAreaNotas').value = 'TODOS';
    cargarNotasLibres();
}


// ==========================================
// MÓDULO 5: ASISTENCIAS
// ==========================================
async function cargarMatrizAsistencias() {
    const fecha = document.getElementById('asistFechaCalendario').value || new Date().toISOString().split('T')[0];
    const listaPersonal = [
        "Itzel", "Juan Pérez", "María López", "Carlos Ruiz", 
        "Ana Gómez", "Sofía Torres", "Roberto Díaz"
    ];

    try {
        const res = await fetch('/api/asistencias');
        const registros = await res.json();

        const tbody = document.getElementById('tablaMatrizAsistencias');
        if (!tbody) return;
        tbody.innerHTML = '';

        listaPersonal.forEach(persona => {
            const reg = registros.find(r => r.personal === persona && r.fecha === fecha);
            const estatusActual = reg ? reg.estatus : 'Asistencia';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                <td class="text-center">
                    <select class="asistencia-select" data-personal="${persona}">
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
        console.error("Error cargando asistencias:", e);
    }
}

async function guardarCambiosAsistencias() {
    const fecha = document.getElementById('asistFechaCalendario').value;
    const selects = document.querySelectorAll('.asistencia-select');

    try {
        for (const sel of selects) {
            const personal = sel.getAttribute('data-personal');
            const estatus = sel.value;

            await fetch('/api/asistencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personal, fecha, estatus })
            });
        }
        mostrarAlerta("Éxito", "Asistencias guardadas correctamente.");
    } catch (e) {
        mostrarAlerta("Error", "No se pudieron guardar las asistencias.");
    }
}


// ==========================================
// MÓDULO 6: VACACIONES
// ==========================================
async function cargarListaPersonalVacaciones() {
    const listaPersonal = [
        "Itzel", "Juan Pérez", "María López", "Carlos Ruiz", 
        "Ana Gómez", "Sofía Torres", "Roberto Díaz"
    ];
    ['vacPersonal', 'filtroCalendarioVacaciones'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            const val = sel.value;
            sel.innerHTML = '';
            listaPersonal.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p; opt.textContent = p;
                sel.appendChild(opt);
            });
            if (val) sel.value = val;
        }
    });
    renderizarCalendarioVacaciones();
}

async function guardarVacaciones(e) {
    e.preventDefault();
    const personal = document.getElementById('vacPersonal').value;
    const periodoAnual = parseInt(document.getElementById('vacAnio').value);
    const tipoPeriodo = parseInt(document.getElementById('vacPeriodo').value);
    const diasSolicitados = parseInt(document.getElementById('vacDiasCount').value);
    const fechaInicio = document.getElementById('vacFecha').value;

    try {
        const res = await fetch('/api/vacaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personal, periodoAnual, tipoPeriodo, diasSolicitados, fechaInicio })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta("Éxito", "Vacaciones registradas correctamente.");
            cargarResumenVacaciones();
            renderizarCalendarioVacaciones();
        } else {
            mostrarAlerta("Aviso", data.error || "No se pudieron registrar las vacaciones.");
        }
    } catch (e) {
        mostrarAlerta("Error", "Ocurrió un error al registrar las vacaciones.");
    }
}

async function cargarResumenVacaciones() {
    try {
        const res = await fetch('/api/vacaciones');
        const vacs = await res.json();
        const listaPersonal = [
            "Itzel", "Juan Pérez", "María López", "Carlos Ruiz", 
            "Ana Gómez", "Sofía Torres", "Roberto Díaz"
        ];

        const tbody = document.getElementById('tablaResumenVacaciones');
        if (!tbody) return;
        tbody.innerHTML = '';

        let hoyStr = new Date().toISOString().split('T')[0];
        let personalHoy = [];

        listaPersonal.forEach(persona => {
            const v1 = vacs.find(v => v.personal === persona && v.tipoPeriodo === 1);
            const v2 = vacs.find(v => v.personal === persona && v.tipoPeriodo === 2);

            const dias1 = v1 ? v1.diasTomados : 0;
            const dias2 = v2 ? v2.diasTomados : 0;

            [v1, v2].forEach(reg => {
                if (reg && reg.fechasSolicitadas) {
                    reg.fechasSolicitadas.forEach(sol => {
                        if (sol.fechas && sol.fechas.includes(hoyStr)) {
                            if (!personalHoy.includes(persona)) personalHoy.push(persona);
                        }
                    });
                }
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${persona}</b></td>
                <td>2026</td>
                <td class="text-center"><span class="badge ${dias1 > 0 ? 'badge-reu' : ''}">${dias1} / 10 días</span></td>
                <td class="text-center"><span class="badge ${dias2 > 0 ? 'badge-reu' : ''}">${dias2} / 10 días</span></td>
                <td class="text-center">-</td>
            `;
            tbody.appendChild(tr);
        });

        const quickEl = document.getElementById('quickVacacionesNombres');
        if (quickEl) {
            quickEl.textContent = personalHoy.length > 0 ? personalHoy.join(', ') : 'Ninguno';
        }
    } catch (e) {
        console.error("Error cargando resumen de vacaciones:", e);
    }
}

async function renderizarCalendarioVacaciones() {
    const personalSeleccionado = document.getElementById('filtroCalendarioVacaciones')?.value;
    try {
        const res = await fetch('/api/vacaciones');
        const vacs = await res.json();
        const filtradas = vacs.filter(v => v.personal === personalSeleccionado);

        const tbody = document.getElementById('tablaCalendarioVacaciones');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--text-muted); padding: 15px;">No hay registros de vacaciones para este empleado.</td></tr>`;
            return;
        }

        filtradas.forEach(v => {
            v.fechasSolicitadas.forEach(sol => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-center"><span class="badge badge-reu">Periodo ${v.tipoPeriodo}</span></td>
                    <td>${sol.inicio}</td>
                    <td class="text-center"><b>${sol.dias} días</b></td>
                    <td>${sol.fechas ? sol.fechas.join(', ') : '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        });
    } catch (e) {
        console.error("Error cargando calendario de vacaciones:", e);
    }
}


// ==========================================
// UTILIDADES / MODALES GENERALES
// ==========================================
function verIncidenteAmpliado(folio, texto) {
    document.getElementById('modalIncidenteTitulo').textContent = `Detalle del Folio: ${folio}`;
    document.getElementById('modalIncidenteTexto').textContent = texto;
    document.getElementById('modalIncidente').style.display = 'flex';
}

function cerrarModalIncidente() {
    document.getElementById('modalIncidente').style.display = 'none';
}

function mostrarAlerta(titulo, mensaje) {
    document.getElementById('tituloModal').textContent = titulo;
    document.getElementById('contenidoModal').textContent = mensaje;
    document.getElementById('modalAlerta').style.display = 'flex';
}

function cerrarAlerta() {
    document.getElementById('modalAlerta').style.display = 'none';
}

async function forzarEnvioTelegram() {
    try {
        const res = await fetch('/api/forzar-telegram', { method: 'POST' });
        const data = await res.json();
        if (data.exito) {
            mostrarAlerta("Telegram", "Notificación enviada con éxito por Telegram.");
        } else {
            mostrarAlerta("Aviso", "No se pudo enviar el reporte por Telegram.");
        }
    } catch (e) {
        mostrarAlerta("Error", "Error de red al intentar enviar Telegram.");
    }
}

function exportarPDF(idSubmodulo) {
    window.print();
}