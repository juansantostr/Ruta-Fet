const db = require('../db');

exports.escanearQR = async (req, res) => {
  const { qrData, conductorId, rutaId } = req.body;

  try {
    let estudianteId;
    let qrToken;
    let qrTimestamp;

    try {
      const parsedData = JSON.parse(qrData);
      estudianteId = parsedData.estudiante_id;
      qrToken = parsedData.token;
      qrTimestamp = parsedData.timestamp;
    } catch (err) {
      return res.status(400).json({ error: 'QR Inválido o corrupto', valid: false });
    }

    if (!estudianteId || !conductorId || !rutaId || !qrToken || !qrTimestamp) {
      return res.status(400).json({ error: 'Datos de QR incompletos (requiere actualización de app)', valid: false });
    }

    // Validar expiración (5 minutos = 300,000 ms)
    const MAX_QR_AGE = 5 * 60 * 1000;
    if (Date.now() - qrTimestamp > MAX_QR_AGE) {
      return res.status(400).json({ error: 'QR Expirado. Genera uno nuevo.', valid: false });
    }

    // Validar que el token no haya sido usado ya
    const [existingValidations] = await db.query('SELECT id FROM validaciones WHERE qr_token = ?', [qrToken]);
    if (existingValidations.length > 0) {
      return res.status(400).json({ error: 'QR ya fue utilizado', valid: false });
    }

    // 1. Obtener saldo del estudiante
    const [saldos] = await db.query('SELECT saldo_actual FROM saldos WHERE estudiante_id = ?', [estudianteId]);
    
    if (saldos.length === 0) {
      return res.status(404).json({ error: 'Cuenta de estudiante no encontrada', valid: false });
    }

    const saldoActual = parseFloat(saldos[0].saldo_actual);
    const [configs] = await db.query("SELECT valor FROM configuraciones WHERE clave = 'coste_pasaje'");
    const costoPasaje = configs.length > 0 ? parseFloat(configs[0].valor) : 10000.00;

    // 2. Verificar si hay saldo suficiente
    if (saldoActual < saldoMinimo) {
      return res.status(400).json({ 
        error: 'Saldo insuficiente', 
        saldoActual,
        valid: false 
      });
    }

    // 3. Descontar saldo y registrar la validación en transacción
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Doble check por si hay concurrencia (condición de carrera)
      const [duplicateCheck] = await connection.query('SELECT id FROM validaciones WHERE qr_token = ? FOR UPDATE', [qrToken]);
      if (duplicateCheck.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'QR ya fue utilizado', valid: false });
      }

      // Restar saldo
      const nuevoSaldo = saldoActual - costoPasaje;
      await connection.query(
        'UPDATE saldos SET saldo_actual = ? WHERE estudiante_id = ?', 
        [nuevoSaldo, estudianteId]
      );

      // Registrar validación
      await connection.query(
        'INSERT INTO validaciones (estudiante_id, conductor_id, ruta_id, qr_token, monto_descontado) VALUES (?, ?, ?, ?, ?)',
        [estudianteId, conductorId, rutaId, qrToken, costoPasaje]
      );

      // Incrementar pasajeros en active_trips
      const [driverRows] = await connection.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
      const driverName = driverRows[0]?.nombre || 'Desconocido';
      
      await connection.query(
        'UPDATE active_trips SET passengers_count = passengers_count + 1 WHERE driver_name = ? AND status = "active"',
        [driverName]
      );

      await connection.commit();
      
      return res.status(200).json({ 
        message: 'Pasaje validado correctamente', 
        nuevoSaldo,
        valid: true 
      });

    } catch (transactionError) {
      await connection.rollback();
      console.error('Error en transacción de saldo:', transactionError);
      if (transactionError.code === 'ER_DUP_ENTRY') {
         return res.status(400).json({ error: 'QR ya fue utilizado', valid: false });
      }
      return res.status(500).json({ error: 'Error procesando el pago', valid: false });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error en escanearQR:', error);
    res.status(500).json({ error: 'Error interno del servidor', valid: false });
  }
};

exports.verificarToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ pagado: false });

    const [rows] = await db.query('SELECT id FROM validaciones WHERE qr_token = ?', [token]);
    if (rows.length > 0) {
      return res.status(200).json({ pagado: true });
    } else {
      return res.status(200).json({ pagado: false });
    }
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ pagado: false });
  }
};
