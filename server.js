const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch'); // O usa el fetch nativo de Node si usas versiones recientes

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONEXIÓN A MONGODB
// ==========================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://tu_usuario:tu_password@cluster.mongodb.net/control_asistencias?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("🟢 Conectado exitosamente a MongoDB"))
.catch(err => console.error("🔴 Error conectando a MongoDB:", err));

// ==========================================
// MODELOS DE MONGOOSE
// ==========================================

// 1. Esquema de Pendientes, Reuniones y Actividades
const pendienteSchema = new mongoose.Schema({
    folio: { type: String, required: true, unique: true },
    tipo: { type: String, required: true }, // 'Reunión' o 'Actividad'
    incidente: { type: String, required: true },
    turnado: { type: String, default: '' },
    vencimiento: { type: String, default: '' },
    horaReunion: { type: String, default: '' },
    observaciones: { type: String, default: '' },
    prioridad: { type: String, default: 'Media' },
    finalizado: { type: Boolean, default: false },
    fechaFinalizacion: { type: Date, default: null }, // Fecha exacta en que se marcó como completado
    fecha: { type: String, default: () => new Date().toISOString().split('T')[0] },
    notasLista: [{
        texto: String,
        responsable: String,
        prioridad: String,
        completado: { type: Boolean, default: false }
    }]
});
const Pendiente = mongoose.model('Pendiente', pendienteSchema);

// 2. Esquema de Asistencias
const asistenciaSchema = new mongoose.Schema({
    personal: String,
    fecha: String,
    estatus: String
});
const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

// 3. Esquema de Vacaciones
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

// 4. Esquema de Áreas
const areaSchema = new mongoose.Schema({
    nombre: { type: String, unique: true }
});
const Area = mongoose.model('Area', areaSchema);

// 5. Esquema de Notas Libres
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


// ==========================================
// RUTAS API: PENDIENTES / AGENDA / ACTIVIDADES
// ==========================================

// Obtener todos los pendientes
app.get('/api/pendientes', async (req, res) => {
    try {
        const items = await Pendiente.find();
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Crear nuevo pendiente con generación automática de folio
app.post('/api/pendientes', async (req, res) => {
    try {
        const { tipo, incidente, turnado, vencimiento, horaReunion, observaciones, prioridad } = req.body;
        
        // Generar folio correlativo (REU-001 o ACT-001)
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

// Actualizar pendiente completo (PUT)
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

// Cambiar estatus de finalizado (PATCH) - Registra la fecha de finalización exacta
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

// Actualizar únicamente las notas de un pendiente
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

// Eliminar un pendiente individual
app.delete('/api/pendientes/:folio', async (req, res) => {
    try {
        await Pendiente.findOneAndDelete({ folio: req.params.folio });
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Vaciar (eliminar masivamente) registros finalizados por tipo ('Reunión' o 'Actividad')
app.delete('/api/pendientes/vaciar-finalizados/:tipo', async (req, res) => {
    try {
        const tipoReq = req.params.tipo;
        await Pendiente.deleteMany({ tipo: tipoReq, finalizado: true });
        res.json({ exito: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// ==========================================
// RUTAS API: ASISTENCIAS
// ==========================================

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


// ==========================================
// RUTAS API: VACACIONES
// ==========================================

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
        
        // Calcular los días hábiles (lunes a viernes) solicitados a partir de la fecha de inicio
        let fechaObj = new Date(fechaInicio + 'T00:00:00');
        let fechasArray = [];
        let diasAgregados = 0;

        while (diasAgregados < diasSolicitados) {
            let diaSemana = fechaObj.getDay(); // 0: Dom, 6: Sáb
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
            return.status(400).json({ error: `El periodo ${tipoPeriodo} excede el límite de 10 días (actuales: ${registroVac.diasTomados}, solicitados: ${diasSolicitados}).` });
        }

        registroVac.diasTomados = totalActual;
        registroVac.fechasSolicitadas.push({
            inicio: fechaInicio,
            dias: diasSolicitados,
            fechas: fechasArray
        });

        await registroVac.save();

        // Registrar automáticamente como 'Vacaciones' en la matriz de asistencias para los días hábiles calculados
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


// ==========================================
// RUTAS API: ÁREAS Y NOTAS LIBRES
// ==========================================

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

// Ruta comodín para frontend SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});