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

// CONFIGURACIÓN DE DISCORD WEBHOOK
const DISCORD_WEBHOOK_URL = 'https://discordapp.com/api/webhooks/1544456950140633229/4iuLpEcABT_lMADH8OI0amIyAYDsV0VXfVXcW043sx8vQKIi5pZh9TNzuFwZLdZdnNwb';

async function enviarNotificacionDiscord(mensaje) {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('AQUÍ_PEGA')) return;
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: mensaje })
        });
    } catch (error) {
        console.error("Error al enviar notificación a Discord:", error);
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

// FUNCIÓN AUXILIAR PARA ARMAR EL REPORTE DIVIDIDO (O "SIN NOVEDADES")
async function generarYEnviarReporteDiscord(esManual = false, soloSiHayNovedades = false) {
    const pendientesActivos = await Pendiente.find({ finalizado: false });
    const reuniones = pendientesActivos.filter(p => p.tipo === 'Reunión');
    const actividades = pendientesActivos.filter(p => p.tipo !== 'Reunión');

    const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    if (soloSiHayNovedades && pendientesActivos.length === 0) {
        await enviarNotificacionDiscord(`🟢 **[${horaActual}]** Sin novedades.`);
        return;
    }

    let mensaje = esManual ? `🕹️ **REPORTE MANUAL (FORZADO) - ${horaActual}**\n\n` : `📋 **REPORTE HORARIO - ${horaActual}**\n\n`;

    mensaje += `📅 **AGENDA DE REUNIONES (${reuniones.length})**\n`;
    if (reuniones.length === 0) {
        mensaje += `_No hay reuniones activas._\n\n`;
    } else {
        reuniones.forEach(r => {
            let iconoPri = r.prioridad === 'Alta' ? '🔴' : (r.prioridad === 'Baja' ? '🟢' : '🟡');
            mensaje += `• ${iconoPri} **[${r.folio}]** ${r.incidente} _(${r.vencimiento} ${r.horaReunion ? 'a las ' + r.horaReunion + 'h' : ''})_\n`;
        });
        mensaje += `\n`;
    }

    mensaje += `⚡ **ACTIVIDADES Y PENDIENTES (${actividades.length})**\n`;
    if (actividades.length === 0) {
        mensaje += `_No hay actividades activas._\n`;
    } else {
        actividades.forEach(a => {
            let iconoPri = a.prioridad === 'Alta' ? '🔴' : (a.prioridad === 'Baja' ? '🟢' : '🟡');
            mensaje += `• ${iconoPri} **[${a.folio}]** ${a.incidente} -> *Asignado a: ${a.turnado}* _(Vence: ${a.vencimiento})_\n`;
        });
    }

    await enviarNotificacionDiscord(mensaje);
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

        if (nuevoPendiente.prioridad === 'Alta') {
            const textoAlerta = `🚨 **¡NUEVO REGISTRO URGENTE!** (${nuevoPendiente.folio})\n` +
                                `• **Tipo:** ${nuevoPendiente.tipo}\n` +
                                `• **Detalle:** ${nuevoPendiente.incidente}\n` +
                                `• **Asignado a:** ${nuevoPendiente.turnado || 'General'}\n` +
                                `• **Fecha:** ${nuevoPendiente.vencimiento}`;
            await enviarNotificacionDiscord(textoAlerta);
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

// --- RUTA API PARA FORZAR DISCORD DESDE EL BOTÓN ---
app.post('/api/forzar-discord', async (req, res) => {
    try {
        await generarYEnviarReporteDiscord(true, false);
        res.json({ exito: true });
    } catch (error) {
        console.error("Error al forzar envío a Discord:", error);
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
        const { personal, periodoAnual, tipoPeriodo, diasSolicitados, fechaSolicitud } = req.body;
        
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

        registro.diasTomados += diasSolicitados;
        registro.fechasSolicitadas.push({ fecha: fechaSolicitud, dias: diasSolicitados });

        await registro.save();
        res.status(201).json({ mensaje: 'Vacaciones registradas correctamente', registro });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/vacaciones/:id', async (req, res) => {
    try {
        await Vacacion.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Registro de vacaciones eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ⏱️ PROGRAMADOR DE TAREAS (CRON JOBS) ---

cron.schedule('*/14 * * * *', async () => {
    try {
        await generarYEnviarReporteDiscord(false, true);
    } catch (error) {
        console.error("Error en tarea de 14 minutos:", error);
    }
});

cron.schedule('0 8-21 * * *', async () => {
    try {
        await generarYEnviarReporteDiscord(false, false);
        const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        console.log(`[CRON] Reporte horario completo enviado a Discord a las ${horaActual}`);
    } catch (error) {
        console.error("Error al enviar el reporte horario programado:", error);
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});