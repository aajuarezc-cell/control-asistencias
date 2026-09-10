const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

process.on('uncaughtException', (err) => {
    console.error('🔴 Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔴 Promesa rechazada no manejada:', reason);
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tu_usuario:tu_password@cluster.mongodb.net/control_asistencias?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
.then(() => console.log("🟢 Conectado exitosamente a MongoDB"))
.catch(err => console.error("🔴 Error conectando a MongoDB:", err));

const pendienteSchema = new mongoose.Schema({
    folio: { type: String, required: true, unique: true },
    tipo: { type: String, required: true },
    incidente: { type: String, required: true },
    turnado: { type: String, default: '' },
    vencimiento: { type: String, default: '' },
    horaReunion: { type: String, default: '' },
    observaciones: { type: String, default: '' },
    prioridad: { type: String, default: 'Media' },
    finalizado: { type: Boolean, default: false },
    fechaFinalizacion: { type: Date, default: null },
    fecha: { type: String, default: () => new Date().toISOString().split('T')[0] },
    notasLista: [{
        texto: String,
        responsable: String,
        prioridad: String,
        completado: { type: Boolean, default: false }
    }]
});
const Pendiente = mongoose.model('Pendiente', pendienteSchema);

const asistenciaSchema = new mongoose.Schema({
    personal: String,
    fecha: String,
    estatus: String
});
const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

const vacacionesSchema = new mongoose.Schema({
    personal: String,
    periodoAnual: Number,
    tipoPeriodo: Number,
    diasTomados: Number,
    fechasSolicitadas: [{
        inicio: String,
        dias: Number,
        fechas: [String]
    }]
});
const Vacaciones = mongoose.model('Vacaciones', vacacionesSchema);

const areaSchema = new mongoose.Schema({
    nombre: { type: String, unique: true }
});
const Area = mongoose.model('Area', areaSchema);

const notaLibreSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    fecha: { type: String, required: true },
    area: { type: String, default: 'General' },
    notasLista: [{
        texto: String,
        responsable: String,
        prioridad: String,
        completado: { type: Boolean, default: false }
    }]
});
const NotaLibre = mongoose.model('NotaLibre', notaLibreSchema);

app.get('/api/pendientes', async (req, res) => {
    try {
        const items = await Pendiente.find();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/pendientes', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, observaciones, prioridad } = req.body;
        
        const prefijo = tipo === 'Reunión' ? 'REU' : 'ACT';
        const ultimo = await Pendiente.findOne({ tipo: tipo === 'Reunión' ? 'Reunión' : { $ne: 'Reunión' } }).sort({ _id: -1 });
        
        let siguienteNum = 1;
        if (ultimo && ultimo.folio) {
            const partes = ultimo.folio.split('-');
            if (partes.length === 2) {
                const num = parseInt(partes[1]);
                if (!isNaN(num)) siguienteNum = num + 1;
            }
        }
        const folioGenerado = `${prefijo}-${String(siguienteNum).padStart(3, '0')}`;

        const nuevoPendiente = new Pendiente({
            folio: folioGenerado,
            tipo: tipo === 'Reunión' ? 'Reunión' : 'Actividad',
            incidente,
            turnado: turnado || '',
            vencimiento: vencimiento || '',
            horaReunion: horaReunion || '',
            observaciones: observaciones || '',
            prioridad: prioridad || 'Media',
            finalizado: false
        });

        await nuevoPendiente.save();
        res.json(nuevoPendiente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/pendientes/:folio', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, observaciones, prioridad, notasLista } = req.body;
        const updateData = {
            tipo,
            incidente,
            turnado,
            vencimiento: vencimiento || '',
            horaReunion: horaReunion || '',
            observaciones,
            prioridad
        };
        if (notasLista) updateData.notasLista = notasLista;

        const actualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            updateData,
            { new: true }
        );
        res.json(actualizado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/pendientes/:folio', async (req, res) => {
    try {
        const { finalizado } = req.body;
        const updateData = { finalizado };

        if (finalizado) {
            updateData.fechaFinalizacion = new Date();
        } else {
            updateData.fechaFinalizacion = null;
        }

        const actualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            updateData,
            { new: true }
        );
        res.json(actualizado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/pendientes/:folio/notas', async (req, res) => {
    try {
        const { notasLista } = req.body;
        const actualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            { notasLista },
            { new: true }
        );
        res.json(actualizado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/pendientes/:folio', async (req, res) => {
    try {
        await Pendiente.findOneAndDelete({ folio: req.params.folio });
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/pendientes/vaciar-finalizados/:tipo', async (req, res) => {
    try {
        const tipoReq = req.params.tipo;
        await Pendiente.deleteMany({ tipo: tipoReq, finalizado: true });
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/asistencias', async (req, res) => {
    try {
        const registros = await Asistencia.find();
        res.json(registros);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/asistencias', async (req, res) => {
    try {
        const { personal, fecha, estatus } = req.body;
        let reg = await Asistencia.findOne({ personal, fecha });
        if (reg) {
            reg.estatus = estatus;
            await reg.save();
        } else {
            reg = new Asistencia({ personal, fecha, estatus });
            await reg.save();
        }
        res.json(reg);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/vacaciones', async (req, res) => {
    try {
        const vacs = await Vacaciones.find();
        res.json(vacs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/vacaciones', async (req, res) => {
    try {
        const { personal, periodoAnual, tipoPeriodo, diasSolicitados, fechaInicio } = req.body;
        
        let fechaObj = new Date(fechaInicio + 'T00:00:00');
        let fechasArray = [];
        let diasAgregados = 0;

        while (diasAgregados < diasSolicitados) {
            let diaSemana = fechaObj.getDay();
            if (diaSemana !== 0 && diaSemana !== 6) {
                fechasArray.push(fechaObj.toISOString().split('T')[0]);
                diasAgregados++;
            }
            fechaObj.setDate(fechaObj.getDate() + 1);
        }

        let registroVac = await Vacaciones.findOne({ personal, periodoAnual, tipoPeriodo });
        if (!registroVac) {
            registroVac = new Vacaciones({
                personal,
                periodoAnual,
                tipoPeriodo,
                diasTomados: 0,
                fechasSolicitadas: []
            });
        }

        const totalActual = registroVac.diasTomados + diasSolicitados;
        if (totalActual > 10) {
            return res.status(400).json({ error: `El periodo ${tipoPeriodo} excede el límite de 10 días.` });
        }

        registroVac.diasTomados = totalActual;
        registroVac.fechasSolicitadas.push({
            inicio: fechaInicio,
            dias: diasSolicitados,
            fechas: fechasArray
        });

        await registroVac.save();

        for (const fStr of fechasArray) {
            let asistReg = await Asistencia.findOne({ personal, fecha: fStr });
            if (asistReg) {
                asistReg.estatus = 'Vacaciones';
                await asistReg.save();
            } else {
                await new Asistencia({ personal, fecha: fStr, estatus: 'Vacaciones' }).save();
            }
        }

        res.json(registroVac);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/vacaciones/:id', async (req, res) => {
    try {
        await Vacaciones.findByIdAndDelete(req.params.id);
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/areas', async (req, res) => {
    try {
        const areas = await Area.find();
        res.json(areas.map(a => a.nombre));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/areas', async (req, res) => {
    try {
        const { nombre } = req.body;
        const existe = await Area.findOne({ nombre });
        if (!existe) {
            await new Area({ nombre }).save();
        }
        const areas = await Area.find();
        res.json({ areas: areas.map(a => a.nombre) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/notas-libres', async (req, res) => {
    try {
        const notas = await NotaLibre.find();
        res.json(notas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/notas-libres/:id', async (req, res) => {
    try {
        const nota = await NotaLibre.findById(req.params.id);
        res.json(nota);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/notas-libres', async (req, res) => {
    try {
        const { titulo, fecha, area, notasLista } = req.body;
        const nuevaNota = new NotaLibre({ titulo, fecha, area, notasLista });
        await nuevaNota.save();
        res.json(nuevaNota);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/notas-libres/:id', async (req, res) => {
    try {
        const { titulo, fecha, area, notasLista } = req.body;
        const actualizada = await NotaLibre.findByIdAndUpdate(
            req.params.id,
            { titulo, fecha, area, notasLista },
            { new: true }
        );
        res.json(actualizada);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/notas-libres/:id/punto/:index', async (req, res) => {
    try {
        const { completado } = req.body;
        const nota = await NotaLibre.findById(req.params.id);
        if (nota && nota.notasLista && nota.notasLista[req.params.index]) {
            nota.notasLista[req.params.index].completado = completado;
            await nota.save();
            return res.json(nota);
        }
        res.status(404).json({ error: "Punto no encontrado" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/notas-libres/:id', async (req, res) => {
    try {
        await NotaLibre.findByIdAndDelete(req.params.id);
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

async function enviarNotificacionTelegramAutomatica() {
    const botToken = "8693041611:AAEQOOZFCDYLEALj3UY4Sh6xpunztRWt54A";
    const chatId = "7091534524";

    try {
        const pendientes = await Pendiente.find({ finalizado: false });
        
        const reunionesActivas = pendientes.filter(p => p.tipo === 'Reunión');
        const actividadesAlta = pendientes.filter(p => p.tipo !== 'Reunión' && p.prioridad === 'Alta');

        let mensaje = `🔔 *Agenda ejecutiva de actividades*\n\n`;

        mensaje += `📅 *Reuniones Activas (${reunionesActivas.length}):*\n`;
        if (reunionesActivas.length > 0) {
            reunionesActivas.forEach(r => {
                let fechaFormateada = r.vencimiento || 'Sin fecha';
                if (r.vencimiento) {
                    const partes = r.vencimiento.split('-');
                    if (partes.length === 3) {
                        const fechaObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                        const opciones = { weekday: 'long' };
                        const diaSemana = fechaObj.toLocaleDateString('es-ES', opciones);
                        fechaFormateada = `${diaSemana} ${r.vencimiento}`;
                    }
                }
                const horaInfo = r.horaReunion ? ` a las *${r.horaReunion}*` : '';
                mensaje += `• [${r.folio}] ${r.incidente} (${fechaFormateada}${horaInfo})\n\n`;
            });
        } else {
            mensaje += `• Ninguna\n\n`;
        }

        mensaje += `🚨 *Actividades de Prioridad Alta (${actividadesAlta.length}):*\n`;
        if (actividadesAlta.length > 0) {
            actividadesAlta.forEach(a => {
                mensaje += `• [${a.folio}] ${a.incidente} - Asignado a: *${a.turnado || 'General'}*\n\n`;
            });
        } else {
            mensaje += `• Ninguna\n\n`;
        }

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (data.ok) {
            console.log("✅ Notificación automática de Telegram enviada con éxito.");
        } else {
            console.error("🔴 Error al enviar mensaje por Telegram:", data);
        }
    } catch (e) {
        console.error("🔴 Error ejecutando la notificación automática:", e);
    }
}

app.post('/api/forzar-telegram', async (req, res) => {
    try {
        await enviarNotificacionTelegramAutomatica();
        res.json({ exito: true, mensaje: "Envío de Telegram ejecutado manualmente." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

cron.schedule('0 * * * 1-5', () => {
    console.log("⏰ Ejecutando tarea programada: Notificación de Telegram (Lunes a Viernes)");
    enviarNotificacionTelegramAutomatica();
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});