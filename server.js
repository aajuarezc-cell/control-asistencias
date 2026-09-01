const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

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
    estatus: String // 'Asistencia', 'Retardo', 'Falta'
});

const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

// --- RUTAS API PENDIENTES / REUNIONES ---

// Obtener todos los pendientes
app.get('/api/pendientes', async (req, res) => {
    try {
        const pendientes = await Pendiente.find();
        res.json(pendientes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear un nuevo pendiente o reunión con generación de folio automático (Folio-001)
app.post('/api/pendientes', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, notasLista, observaciones, prioridad } = req.body;
        
        // Calcular folio automático
        const ultimo = await Pendiente.findOne().sort({ _id: -1 });
        let siguienteNumero = 1;
        if (ultimo && ultimo.folio && ultimo.folio.startsWith('Folio-')) {
            const numeroStr = ultimo.folio.split('-')[1];
            const num = parseInt(numeroStr);
            if (!isNaN(num)) siguienteNumero = num + 1;
        }
        const folioGenerado = `Folio-${String(siguienteNumero).padStart(3, '0')}`;
        
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

        // 🚨 ENVÍO DE ALTA A DISCORD SI LA PRIORIDAD ES ALTA
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

// Actualizar un pendiente completo (incluyendo notas, prioridades, etc.)
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

// Cambiar estado finalizado (Completado)
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

// Eliminar un pendiente
app.delete('/api/pendientes/:folio', async (req, res) => {
    try {
        await Pendiente.findOneAndDelete({ folio: req.params.folio });
        res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS API ASISTENCIAS ---

// Obtener registros de asistencias
app.get('/api/asistencias', async (req, res) => {
    try {
        const asistencias = await Asistencia.find();
        res.json(asistencias);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Guardar o actualizar la asistencia de un colaborador en una fecha específica
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});