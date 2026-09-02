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

        // Generar los días de lunes a viernes a partir de la fecha de inicio
        let current = new Date(fechaInicio + 'T00:00:00');
        let addedDays = 0;
        let fechasAgregadas = [];

        while (addedDays < diasSolicitados) {
            let dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Solo días hábiles (Lunes a Viernes)
                let fechaStr = current.toISOString().split('T')[0];
                fechasAgregadas.push(fechaStr);
                
                // Registrar o actualizar automáticamente en el módulo de Asistencias
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