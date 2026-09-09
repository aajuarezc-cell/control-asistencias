async function enviarNotificacionTelegramAutomatica() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log("⚠️ Faltan las variables de entorno TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
        return false;
    }

    try {
        const pendientes = await Pendiente.find({ finalizado: false });
        const mensaje = `🔔 *Reporte Horario de Actividades Activas*\nTotal pendientes: ${pendientes.length}`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        console.log(`📤 Intentando enviar mensaje a Telegram (Chat ID: ${chatId})...`);

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
            console.log("✅ ¡Notificación de Telegram enviada con éxito!");
            return true;
        } else {
            console.error("🔴 Telegram rechazó el mensaje:", data);
            return false;
        }
    } catch (e) {
        console.error("🔴 Error de red o conexión al intentar enviar a Telegram:", e);
        return false;
    }
}