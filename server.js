const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Conexión a MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://aajuarezc_db_user:mAotwq0PxUIxyDX0@cluster0.o1rvg4h.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Conectado exitosamente a MongoDB Atlas"))
  .catch(err => console.error("Error al conectar a MongoDB:", err));

// 2. Definición de Esquemas y Modelos en la Base de Datos
const pendienteSchema = new mongoose.Schema({
    folio: { type: String, unique: true },
    tipo: String,
    incidente: String,
    turnado: String,
    vencimiento: String,
    horaReunion: String,
    observaciones: String,
    finalizado: { type: Boolean, default: false },
    fecha: String
});

const asistenciaSchema = new mongoose.Schema({
    personal: String,
    fecha: String,
    estatus: String
});

const Pendiente = mongoose.model('Pendiente', pendienteSchema);
const Asistencia = mongoose.model('Asistencia', asistenciaSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTAS DE PENDIENTES / REUNIONES ---

app.get('/api/pendientes', async (req, res) => {
    try {
        const data = await Pendiente.find();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/pendientes', async (req, res) => {
    try {
        const count = await Pendiente.countDocuments();
        const folio = `FOL-${String(count + 1).padStart(3, '0')}`;
        const fechaActual = new Date().toISOString().split('T')[0];

        const nuevoPendiente = new Pendiente({
            folio,
            fecha: fechaActual,
            ...req.body
        });

        await nuevoPendiente.save();
        res.json(nuevoPendiente);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/pendientes/:folio', async (req, res) => {
    try {
        const actualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            req.body,
            { new: true }
        );
        res.json(actualizado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/pendientes/:folio', async (req, res) => {
    try {
        const actualizado = await Pendiente.findOneAndUpdate(
            { folio: req.params.folio },
            { finalizado: req.body.finalizado },
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
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- RUTAS DE ASISTENCIAS (ESTAS ERAN LAS QUE FALTABAN) ---

app.get('/api/asistencias', async (req, res) => {
    try {
        const data = await Asistencia.find();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/asistencias', async (req, res) => {
    try {
        const { personal, fecha, estatus } = req.body;
        // Busca si ya existe registro para esa persona en esa fecha; si existe lo actualiza, si no lo crea
        const resultado = await Asistencia.findOneAndUpdate(
            { personal: personal.trim(), fecha },
            { estatus },
            { upsert: true, new: true }
        );
        res.json(resultado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});