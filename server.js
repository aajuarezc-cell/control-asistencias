const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para leer JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// CONEXIÓN A MONGODB ATLAS (O LOCAL)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/control_oficina';

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Conectado exitosamente a MongoDB'))
    .catch(err => console.error('🔴 Error al conectar a MongoDB:', err));

// CONFIGURACIÓN DE TELEGRAM (Toma los datos de las variables de entorno de Render)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarNotificacionTelegram(mensajeHtml) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("🔴 Faltan las credenciales de Telegram en las variables de entorno.");
        return;
    }
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensajeHtml,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error("Error al enviar notificación a Telegram:", error);
    }
}

// 1. ESQUEMA Y MODELO DE PENDIENTES Y REUNIONES
const pendienteSchema = new mongoose.Schema({
    folio: { type: String, unique: true },
    tipo: String,
    prioridad: { type: String, default: 'Media' },
    incidente: String,
    turnado: String,
    vencimiento: String,
    horaReunion: String,
    notasLista: { type: Array, default: [] },
    observaciones: String,
    finalizado: { type: Boolean, default: false },
    fecha: String
});

const Pendiente = mongoose.model('Pendiente', pendienteSchema);

// 2. ESQUEMA Y MODELO DE ASISTENCIAS
const asistenciaSchema = new mongoose.Schema({
    personal: String,
    fecha: String,
    estatus: String
});

const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

// 3. ESQUEMA Y MODELO DE VACACIONES
const vacacionSchema = new mongoose.Schema({
    personal: String,
    periodoAnual: Number, 
    tipoPeriodo: { type: Number, enum: [1, 2] }, 
    diasTomados: { type: Number, default: 0 }, 
    fechasSolicitadas: { type: Array, default: [] }, 
    estatus: { type: String, default: 'Activo' }
});

const Vacacion = mongoose.model('Vacacion', vacacionSchema);

// FUNCIÓN AUXILIAR PARA ARMAR EL REPORTE CON LA ESTRUCTURA EXACTA EN TELEGRAM
async function generarYEnviarReporteTelegram(esManual = false) {
    const pendientesActivos = await Pendiente.find({ finalizado: false });
    const reuniones = pendientesActivos.filter(p => p.tipo === 'Reunión');
    const actividades = pendientesActivos.filter(p => p.tipo !== 'Reunión');

    const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const fechaActual = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (pendientesActivos.length === 0) {
        await enviarNotificacionTelegram(`🟢 <b>Estado del Sistema: Al Día</b>\nNo hay reuniones ni actividades pendientes en este momento.\n<i>Actualizado a las ${horaActual} (${fechaActual})</i>`);
        return;
    }

    // --- SECCIÓN AGENDA ---
    let textoAgenda = "";
    if (reuniones.length === 0) {
        textoAgenda = "<i>No hay reuniones activas.</i>\n";
    } else {
        reuniones.forEach((r, index) => {
            const totalNotas = r.notasLista ? r.notasLista.length : 0;
            const fechaHora = `${r.vencimiento}${r.horaReunion ? ' a las ' + r.horaReunion + 'h' : ''}`;
            textoAgenda += `${index + 1}. <b>[${r.folio}]</b> ${fechaHora}, ${r.incidente}, cantidad de notas: <b>${totalNotas}</b>\n`;
        });
    }

    // --- SECCIÓN ACTIVIDADES AGRUPADAS POR PRIORIDAD ---
    const actAltas = actividades.filter(a => a.prioridad === 'Alta');
    const actMedias = actividades.filter(a => a.prioridad === 'Media');
    const actBajas = actividades.filter(a => a.prioridad === 'Baja');

    let textoActividades = "";

    // Prioridad Alta
    textoActividades += `<b>Prioridad ALTA:</b>\n`;
    if (actAltas.length === 0) {
        textoActividades += `<i>Sin actividades de alta prioridad.</i>\n\n`;
    } else {
        actAltas.forEach((a, index) => {
            const totalNotas = a.notasLista ? a.notasLista.length : 0;
            textoActividades += `${index + 1}. <b>[${a.folio}]</b> ${a.incidente}, turnado a: <b>${a.turnado}</b>, cantidad de notas: <b>${totalNotas}</b>\n`;
        });
        textoActividades += `\n`;
    }

    // Prioridad Media
    textoActividades += `<b>Prioridad MEDIA:</b>\n`;
    if (actMedias.length === 0) {
        textoActividades += `<i>Sin actividades de prioridad media.</i>\n\n`;
    } else {
        actMedias.forEach((a, index) => {
            const totalNotas = a.notasLista ? a.notasLista.length : 0;
            textoActividades += `${index + 1}. <b>[${a.folio}]</b> ${a.incidente}, turnado a: <b>${a.turnado}</b>, cantidad de notas: <b>${totalNotas}</b>\n`;
        });
        textoActividades += `\n`;
    }

    // Prioridad Baja
    if (actBajas.length > 0) {
        textoActividades += `<b>Prioridad BAJA:</b>\n`;
        actBajas.forEach((a, index) => {
            const totalNotas = a.notasLista ? a.notasLista.length : 0;
            textoActividades += `${index + 1}. <b>[${a.folio}]</b> ${a.incidente}, turnado a: <b>${a.turnado}</b>, cantidad de notas: <b>${totalNotas}</b>\n`;
        });
    }

    const tituloReporte = esManual ? `🕹️ <b>REPORTE MANUAL SOLICITADO</b>` : `📋 <b>REPORTE PROGRAMADO DE ACTIVIDADES</b>`;
    const mensajeFinal = `${tituloReporte}\n📊 <b>Resumen Operativo — ${horaActual}</b>\n\n📅 <b>AGENDA</b>\n${textoAgenda}\n⚡ <b>ACTIVIDADES</b>\n${textoActividades}\n<i>Control de Oficina • ${fechaActual}</i>`;

    await enviarNotificacionTelegram(mensajeFinal);
}

// --- RUTAS API PENDIENTES / REUNIONES ---

app.get('/api/pendientes', async (req, res) => {
    try {
        const pendientes = await Pendiente.find();
        res.json(pendientes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pendientes', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, notasLista, observaciones, prioridad } = req.body;
        
        const prefijo = tipo === 'Reunión' ? 'REU-' : 'ACT-';
        const ultimo = await Pendiente.findOne({ folio: new RegExp(`^${prefijo}`) }).sort({ _id: -1 });
        
        let siguienteNumero = 1;
        if (ultimo && ultimo.folio && ultimo.folio.startsWith(prefijo)) {
            const numeroStr = ultimo.folio.split('-')[1];
            const num = parseInt(numeroStr);
            if (!isNaN(num)) siguienteNumero = num + 1;
        }
        const folioGenerado = `${prefijo}${String(siguienteNumero).padStart(3, '0')}`;
        
        const fechaActual = new Date().toISOString().split('T')[0];

        const nuevoPendiente = new Pendiente({
            folio: folioGenerado,
            tipo,
            prioridad: prioridad || 'Media',
            incidente,
            turnado: turnado || 'N/A',
            vencimiento: vencimiento || fechaActual,
            horaReunion: horaReunion || '',
            notasLista: notasLista || [],
            observaciones: observaciones || '',
            finalizado: false,
            fecha: fechaActual
        });

        await nuevoPendiente.save();

        // Alerta inmediata vía Telegram para Prioridad Alta
        if (nuevoPendiente.prioridad === 'Alta') {
            const alertaAlta = `🚨 <b>¡NUEVO REGISTRO URGENTE (${nuevoPendiente.folio})!</b>\n\n` +
                               `• <b>Tipo:</b> ${nuevoPendiente.tipo}\n` +
                               `• <b>Asignado a:</b> ${nuevoPendiente.turnado || 'General'}\n` +
                               `• <b>Fecha:</b> ${nuevoPendiente.vencimiento}\n` +
                               `• <b>Detalle:</b> ${nuevoPendiente.incidente}`;
            await enviarNotificacionTelegram(alertaAlta);
        }

        res.status(201).json(nuevoPendiente);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pendientes/:folio', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, notasLista, observaciones, prioridad } = req.body;
        const pendienteActualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            { tipo, incidente, turnado, vencimiento, horaReunion, notasLista, observaciones, prioridad },
            { new: true }
        );
        res.json(pendienteActualizado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/pendientes/:folio', async (req, res) => {
    try {
        const { finalizado } = req.body;
        const pendienteActualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            { finalizado },
            { new: true }
        );
        res.json(pendienteActualizado);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pendientes/:folio', async (req, res) => {
    try {
        await Pendiente.findOneAndDelete({ folio: req.params.folio });
        res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTA API PARA FORZAR TELEGRAM DESDE EL BOTÓN DE LA WEB ---
app.post('/api/forzar-discord', async (req, res) => {
    try {
        await generarYEnviarReporteTelegram(true);
        res.json({ exito: true });
    } catch (error) {
        console.error("Error al forzar envío a Telegram:", error);
        res.status(500).json({ exito: false, error: error.message });
    }
});

// --- RUTAS API ASISTENCIAS ---

app.get('/api/asistencias', async (req, res) => {
    try {
        const asistencias = await Asistencia.find();
        res.json(asistencias);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/asistencias', async (req, res) => {
    try {
        const { personal, fecha, estatus } = req.body;
        let asistencia = await Asistencia.findOne({ personal, fecha });
        if (asistencia) {
            asistencia.estatus = estatus;
            await asistencia.save();
        } else {
            asistencia = new Asistencia({ personal, fecha, estatus });
            await asistencia.save();
        }
        res.status(200).json(asistencia);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS API VACACIONES ---

app.get('/api/vacaciones', async (req, res) => {
    try {
        const vacaciones = await Vacacion.find();
        res.json(vacaciones);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vacaciones', async (req, res) => {
    try {
        const { personal, periodoAnual, tipoPeriodo, diasSolicitados, fechaInicio } = req.body;
        
        let registro = await Vacacion.findOne({ personal, periodoAnual, tipoPeriodo });
        
        if (!registro) {
            registro = new Vacacion({
                personal,
                periodoAnual,
                tipoPeriodo,
                diasTomados: 0,
                fechasSolicitadas: []
            });
        }

        if (registro.diasTomados >= 10) {
            return res.status(400).json({ error: `El personal ${personal} ya ha completado los 10 días autorizados para el Periodo ${tipoPeriodo}.` });
        }

        if (registro.diasTomados + diasSolicitados > 10) {
            return res.status(400).json({ error: `No se pueden autorizar ${diasSolicitados} días. Solo le quedan ${10 - registro.diasTomados} días disponibles en este periodo.` });
        }

        let current = new Date(fechaInicio + 'T00:00:00');
        let addedDays = 0;
        let fechasAgregadas = [];

        while (addedDays < diasSolicitados) {
            let dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                let fechaStr = current.toISOString().split('T')[0];
                fechasAgregadas.push(fechaStr);
                
                await Asistencia.findOneAndUpdate(
                    { personal, fecha: fechaStr },
                    { estatus: 'Vacaciones' },
                    { upsert: true, new: true }
                );
                addedDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        registro.diasTomados += diasSolicitados;
        registro.fechasSolicitadas.push({ inicio: fechaInicio, dias: diasSolicitados, fechas: fechasAgregadas });

        await registro.save();
        res.status(201).json({ mensaje: 'Vacaciones registradas y reflejadas en asistencias', registro });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/vacaciones/:id', async (req, res) => {
    try {
        const vacacion = await Vacacion.findById(req.params.id);
        if (vacacion) {
            if (vacacion.fechasSolicitadas && vacacion.fechasSolicitadas.length > 0) {
                for (let sol of vacacion.fechasSolicitadas) {
                    if (sol.fechas && sol.fechas.length > 0) {
                        for (let fechaStr of sol.fechas) {
                            await Asistencia.findOneAndDelete({
                                personal: vacacion.personal,
                                fecha: fechaStr,
                                estatus: 'Vacaciones'
                            });
                        }
                    }
                }
            }
            await Vacacion.findByIdAndDelete(req.params.id);
        }
        res.json({ mensaje: 'Registro de vacaciones eliminado y asistencias restablecidas' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ⏱️ PROGRAMADOR DE TAREAS (CRON JOBS TELEGRAM) ---

// Reporte matutino (8:00 AM)
cron.schedule('0 8 * * *', async () => {
    try {
        await generarYEnviarReporteTelegram(false);
        console.log(`[CRON] Reporte matutino enviado a Telegram.`);
    } catch (error) {
        console.error("Error en cron matutino:", error);
    }
});

// Reporte de cierre (7:00 PM / 19:00 hrs)
cron.schedule('0 19 * * *', async () => {
    try {
        await generarYEnviarReporteTelegram(false);
        console.log(`[CRON] Reporte nocturno enviado a Telegram.`);
    } catch (error) {
        console.error("Error en cron nocturno:", error);
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});