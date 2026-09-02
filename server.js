// --- ESQUEMA Y MODELO DE VACACIONES ---
const vacacionSchema = new mongoose.Schema({
    personal: String,
    periodoAnual: Number, // Año de vigencia (ej. 2026)
    tipoPeriodo: { type: Number, enum: [1, 2] }, // Periodo 1 o Periodo 2
    diasTomados: { type: Number, default: 0 }, // Máximo 10 días por periodo
    fechasSolicitadas: { type: Array, default: [] }, // Detalle de los días registrados
    estatus: { type: String, default: 'Activo' }
});

const Vacacion = mongoose.model('Vacacion', vacacionSchema);

// --- RUTAS API VACACIONES ---

// Obtener registros de vacaciones
app.get('/api/vacaciones', async (req, res) => {
    try {
        const vacaciones = await Vacacion.find();
        res.json(vacaciones);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Registrar o solicitar días de vacaciones con validación de límite
app.post('/api/vacaciones', async (req, res) => {
    try {
        const { personal, periodoAnual, tipoPeriodo, diasSolicitados, fechaSolicitud } = req.body;
        
        // Buscar o crear el registro para ese personal, año y periodo específico
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

        // Validar si ya cumplió o excede los 10 días permitidos en ese periodo
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

// Eliminar un registro o ajuste de vacaciones
app.delete('/api/vacaciones/:id', async (req, res) => {
    try {
        await Vacacion.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Registro de vacaciones eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});