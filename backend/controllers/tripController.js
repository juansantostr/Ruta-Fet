const db = require('../db');

exports.startTrip = async (req, res) => {
  const { conductorId, rutaId } = req.body;
  if (!conductorId || !rutaId) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // Validar Horario de Operaci�n
    const [configs] = await db.query("SELECT valor FROM configuraciones WHERE clave = 'horario_operacion'");
    if (configs.length > 0 && configs[0].valor) {
      const [startStr, endStr] = configs[0].valor.split('-').map(s => s.trim());
      if (startStr && endStr) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMins = now.getMinutes();
        const currentTotal = currentHours * 60 + currentMins;
        const [startH, startM] = startStr.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const [endH, endM] = endStr.split(':').map(Number);
        const endTotal = endH * 60 + endM;
        if (currentTotal < startTotal || currentTotal > endTotal) {
          return res.status(400).json({ error: 'El sistema se encuentra fuera del horario de operacin (' + configs[0].valor + ')' });
        }
      }
    }

    // Check if there is already an active trip for this driver
    const [existing] = await db.query('SELECT * FROM active_trips WHERE driver_name = (SELECT nombre FROM usuarios WHERE id = ?) AND status = "active"', [conductorId]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya hay un viaje activo para este conductor' });
    }

    const [driverRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre || 'Desconocido';

    const [routeRows] = await db.query('SELECT nombre_ruta FROM rutas WHERE id = ?', [rutaId]);
    const routeName = routeRows[0]?.nombre_ruta || 'Ruta Desconocida';

    const tripSentido = (req.body.sentido === 'desde_fet') ? 'desde_fet' : 'hacia_fet';
    const orderDirection = (tripSentido === 'desde_fet') ? 'DESC' : 'ASC';

    const [firstStopRows] = await db.query(
      `SELECT nombre FROM paradas WHERE ruta_id = ? ORDER BY orden ${orderDirection} LIMIT 1`,
      [rutaId]
    );
    const initialStage = firstStopRows[0]?.nombre || 'En recorrido';

    const [result] = await db.query(
      'INSERT INTO active_trips (driver_name, route_name, passengers_count, status, stage, is_moving, sentido) VALUES (?, ?, 0, "active", ?, 0, ?)',
      [driverName, routeName, initialStage, tripSentido]
    );

    res.status(201).json({ message: 'Viaje iniciado', tripId: result.insertId, routeName, driverName, stage: initialStage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.updateTripStage = async (req, res) => {
  const { conductorId, stage, isMoving } = req.body;
  if (!conductorId || !stage) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const [driverRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre || 'Desconocido';

    await db.query(
      'UPDATE active_trips SET stage = ?, is_moving = ? WHERE driver_name = ? AND status = "active"',
      [stage, isMoving ? true : false, driverName]
    );

    res.status(200).json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.updateTripAlert = async (req, res) => {
  const { conductorId, alertMessage } = req.body;
  if (!conductorId) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const [driverRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre || 'Desconocido';

    await db.query(
      'UPDATE active_trips SET alert_message = ? WHERE driver_name = ? AND status = "active"',
      [alertMessage || null, driverName]
    );

    res.status(200).json({ message: 'Alerta actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.endTrip = async (req, res) => {
  const { conductorId } = req.body;
  if (!conductorId) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const [driverRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre || 'Desconocido';

    await db.query(
      'UPDATE active_trips SET status = "completed" WHERE driver_name = ? AND status = "active"',
      [driverName]
    );

    res.status(200).json({ message: 'Viaje finalizado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.getActiveTrips = async (req, res) => {
  try {
    const [trips] = await db.query('SELECT * FROM active_trips WHERE status = "active"');
    res.status(200).json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.getDriverActiveTrip = async (req, res) => {
  const { conductorId } = req.params;
  if (!conductorId) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const [driverRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre;
    if (!driverName) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    const [existing] = await db.query(
      'SELECT * FROM active_trips WHERE driver_name = ? AND status = "active" LIMIT 1',
      [driverName]
    );

    if (existing.length > 0) {
      res.status(200).json({ active: true, trip: existing[0] });
    } else {
      res.status(200).json({ active: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.scanQR = async (req, res) => {
  const { qrData, conductorId, rutaId } = req.body;

  if (!qrData || !conductorId || !rutaId) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let estudianteId;
  let timestamp;
  let qrToken;
  let parsed = {};

  try {
    parsed = JSON.parse(qrData);
    estudianteId = parsed.u || parsed.estudiante_id;
    timestamp = parsed.t || parsed.timestamp;
    qrToken = parsed.token;
  } catch (e) {
    return res.status(400).json({ error: 'QR inválido (formato)' });
  }

  if (!estudianteId || !timestamp || !qrToken) {
    return res.status(400).json({ error: 'Faltan datos. El QR dice: ' + JSON.stringify(parsed) });
  }

  // Verificar expiración del QR (30 segundos)
  const now = Date.now();
  if (now - timestamp > 30000) {
    return res.status(400).json({ error: 'QR expirado' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verificar si este QR ya fue escaneado (usamos el token)
    const [existingValidations] = await connection.query(
      'SELECT id FROM validaciones WHERE qr_token = ? FOR UPDATE', 
      [qrToken]
    );
    if (existingValidations.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'QR ya fue utilizado' });
    }

    // Consultar el viaje activo del conductor para saber el sentido de la ruta
    const [driverRows] = await connection.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
    const driverName = driverRows[0]?.nombre || 'Desconocido';

    const [activeTripRows] = await connection.query(
      'SELECT id, sentido FROM active_trips WHERE driver_name = ? AND status = "active" LIMIT 1',
      [driverName]
    );
    const tripSentido = (activeTripRows.length > 0 && activeTripRows[0].sentido) ? activeTripRows[0].sentido : 'hacia_fet';

    // Obtener valor de tarifa base configurada (tarifa base = $10.000 para ida y vuelta)
    const [configs] = await connection.query("SELECT valor FROM configuraciones WHERE clave = 'coste_pasaje'");
    const tarifaBase = configs.length > 0 ? parseFloat(configs[0].valor) : 10000.00;
    const tarifaSencilla = tarifaBase / 2; // $5.000 (solo vuelta)

    const [saldos] = await connection.query('SELECT saldo_actual FROM saldos WHERE estudiante_id = ? FOR UPDATE', [estudianteId]);
    if (saldos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cuenta de estudiante no encontrada' });
    }
    const saldoActual = parseFloat(saldos[0].saldo_actual);

    let montoADescontar = 0;
    let descripcionTransaccion = '';
    let mensajeRespuesta = '';
    let tipoAbordaje = '';

    if (tripSentido === 'hacia_fet') {
      // SENTIDO HACIA LA FET: Se exige cobro de Ida y Vuelta obligatorio ($10.000)
      montoADescontar = tarifaBase;
      if (saldoActual < montoADescontar) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Saldo insuficiente. La ruta hacia la FET requiere Ida y Vuelta (${montoADescontar.toLocaleString('es-CO')})` 
        });
      }

      // Descontar saldo
      await connection.query('UPDATE saldos SET saldo_actual = saldo_actual - ? WHERE estudiante_id = ?', [montoADescontar, estudianteId]);

      // Emitir automáticamente un Pase de Regreso para el día de hoy
      await connection.query(
        'INSERT INTO pases_regreso (estudiante_id, fecha_emision, usado) VALUES (?, CURDATE(), 0)',
        [estudianteId]
      );

      descripcionTransaccion = 'Abordaje Ida y Vuelta (Pase Regreso emitido)';
      mensajeRespuesta = '¡Pasaje Válido! (Ida y Vuelta pagado)';
      tipoAbordaje = 'ida_y_vuelta';

    } else {
      // SENTIDO DESDE LA FET (Salida hacia la ciudad):
      // Verificar si ya tiene un Pase de Regreso emitido hoy y sin usar
      const [pasesHoy] = await connection.query(
        'SELECT id FROM pases_regreso WHERE estudiante_id = ? AND fecha_emision = CURDATE() AND usado = 0 FOR UPDATE',
        [estudianteId]
      );

      if (pasesHoy.length > 0) {
        // CONSUMIR PASE DE REGRESO PREVIAMENTE PAGADO (Costo $0)
        const paseId = pasesHoy[0].id;
        await connection.query(
          'UPDATE pases_regreso SET usado = 1, fecha_uso = NOW() WHERE id = ?',
          [paseId]
        );
        montoADescontar = 0.00;
        descripcionTransaccion = 'Regreso a casa (Pase de Regreso redimido)';
        mensajeRespuesta = '¡Pase de Regreso Válido! ($0 cobrado)';
        tipoAbordaje = 'pase_redimido';

      } else {
        // No tiene pase previo: Se le cobra únicamente el pasaje de regreso sencillo ($5.000)
        montoADescontar = tarifaSencilla;
        if (saldoActual < montoADescontar) {
          await connection.rollback();
          return res.status(400).json({ 
            error: `Saldo insuficiente. El pasaje de regreso cuesta ${montoADescontar.toLocaleString('es-CO')}` 
          });
        }

        await connection.query('UPDATE saldos SET saldo_actual = saldo_actual - ? WHERE estudiante_id = ?', [montoADescontar, estudianteId]);
        descripcionTransaccion = 'Abordaje Solo Vuelta';
        mensajeRespuesta = '¡Pasaje Válido! (Solo Vuelta pagado)';
        tipoAbordaje = 'solo_vuelta';
      }
    }

    // Registrar la transacción si hubo descuento monetario
    if (montoADescontar > 0) {
      await connection.query(
        "INSERT INTO transacciones (usuario_id, tipo, monto, descripcion) VALUES (?, 'GASTO', ?, ?)",
        [estudianteId, montoADescontar, descripcionTransaccion]
      );
    }

    // Registrar validación (viaje)
    await connection.query(
      "INSERT INTO validaciones (ruta_id, estudiante_id, conductor_id, monto_descontado, qr_token, fecha_abordaje) VALUES (?, ?, ?, ?, ?, NOW())",
      [rutaId, estudianteId, conductorId, montoADescontar, qrToken]
    );

    // 6. Actualizar count de pasajeros en el active_trip
    await connection.query(
      'UPDATE active_trips SET passengers_count = passengers_count + 1 WHERE driver_name = ? AND status = "active"',
      [driverName]
    );

    await connection.commit();

    // Obtener info del estudiante para el popup
    const [userRows] = await connection.query('SELECT nombre, documento FROM usuarios WHERE id = ?', [estudianteId]);
    
    res.json({
      message: mensajeRespuesta || 'Escaneo exitoso',
      tipoAbordaje: tipoAbordaje,
      montoDescontado: montoADescontar,
      estudiante: userRows[0] || { nombre: 'Estudiante' }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error procesando QR:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

exports.crearReporteConductor = async (req, res) => {
  try {
    const { conductorId, conductorNombre, ruta, tipo, urgencia, descripcion } = req.body;

    if (!ruta || !tipo || !descripcion) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del reporte' });
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS reportes_incidentes (
        id INT NOT NULL AUTO_INCREMENT,
        usuario_id INT DEFAULT NULL,
        autor_nombre VARCHAR(120) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        ruta VARCHAR(100) NOT NULL,
        motivo VARCHAR(150) NOT NULL,
        urgencia VARCHAR(80) DEFAULT 'Media',
        descripcion TEXT NOT NULL,
        estado VARCHAR(20) DEFAULT 'ACTIVO',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);

    let nombreAutor = conductorNombre || 'Conductor Oficial';
    if (conductorId) {
      const [rows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [conductorId]);
      if (rows.length > 0) nombreAutor = rows[0].nombre;
    }

    const [result] = await db.query(
      'INSERT INTO reportes_incidentes (usuario_id, autor_nombre, rol, ruta, motivo, urgencia, descripcion, estado) VALUES (?, ?, "CONDUCTOR", ?, ?, ?, ?, "ACTIVO")',
      [conductorId || null, nombreAutor, ruta, tipo, urgencia || 'Media', descripcion]
    );

    try {
      await db.query(
        "INSERT INTO auditoria (admin, modulo, accion, fecha) VALUES (?, 'Incidente Conductor', ?, NOW())",
        [nombreAutor, `[${urgencia || 'Media'}] ${ruta} - ${tipo}: ${descripcion.substring(0, 120)}`]
      );
    } catch (e) {
      // Ignorar si tabla auditoria no existe
    }

    res.status(201).json({ message: 'Reporte operativo enviado a central exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error en crearReporteConductor:', error);
    res.status(500).json({ error: 'Error al registrar el reporte operativo' });
  }
};


