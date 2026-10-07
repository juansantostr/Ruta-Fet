const db = require('../db');

exports.buscarEstudiantes = async (req, res) => {
  try {
    const { q } = req.query; // Query de búsqueda
    
    let query = `
      SELECT 
        u.id, 
        u.nombre, 
        u.documento, 
        u.correo, 
        u.telefono,
        u.ruta_favorita as rutaFavorita,
        IFNULL(s.saldo_actual, 0) as saldoActual,
        (
          SELECT COUNT(*) 
          FROM validaciones v 
          WHERE v.estudiante_id = u.id 
            AND MONTH(v.fecha_abordaje) = MONTH(CURRENT_DATE()) 
            AND YEAR(v.fecha_abordaje) = YEAR(CURRENT_DATE())
        ) as viajesMes
      FROM usuarios u 
      LEFT JOIN saldos s ON u.id = s.estudiante_id 
      WHERE u.rol = 'ESTUDIANTE'
    `;
    let params = [];

    if (q) {
      query += ` AND (u.nombre LIKE ? OR u.documento LIKE ? OR u.correo LIKE ?)`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' LIMIT 100';

    const [estudiantes] = await db.query(query, params);
    res.json(estudiantes);
  } catch (error) {
    console.error('Error buscando estudiantes:', error);
    res.status(500).json({ error: 'Error del servidor al buscar estudiantes' });
  }
};

exports.actualizarEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, documento, correo, telefono, rutaFavorita } = req.body;

    if (!nombre || !documento || !correo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const [result] = await db.query(
      'UPDATE usuarios SET nombre = ?, documento = ?, correo = ?, telefono = ?, ruta_favorita = ? WHERE id = ? AND rol = "ESTUDIANTE"',
      [nombre, documento, correo, telefono || null, rutaFavorita || null, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    res.json({ mensaje: 'Datos del estudiante actualizados correctamente' });
  } catch (error) {
    console.error('Error actualizando estudiante:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar estudiante' });
  }
};

exports.recargarSaldo = async (req, res) => {
  try {
    const { estudianteId, monto } = req.body;

    if (!estudianteId || !monto || monto <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Incrementar saldo o crear registro si no existe
      await connection.query(
        'INSERT INTO saldos (estudiante_id, saldo_actual) VALUES (?, ?) ON DUPLICATE KEY UPDATE saldo_actual = saldo_actual + ?',
        [estudianteId, monto, monto]
      );

      // Registrar transacción
      await connection.query(
        "INSERT INTO transacciones (usuario_id, tipo, monto, descripcion) VALUES (?, 'RECARGA', ?, 'Recarga de saldo por Admin')",
        [estudianteId, monto]
      );

      // Obtener el nuevo saldo para devolverlo
      const [nuevoSaldo] = await connection.query(
        'SELECT saldo_actual FROM saldos WHERE estudiante_id = ?',
        [estudianteId]
      );

      await connection.commit();
      res.json({ message: 'Recarga exitosa', nuevoSaldo: parseFloat(nuevoSaldo[0].saldo_actual) });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error recargando saldo:', error);
    res.status(500).json({ error: 'Error interno del servidor al recargar' });
  }
};

exports.descontarSaldo = async (req, res) => {
  try {
    const { estudianteId, monto } = req.body;

    if (!estudianteId || !monto || monto <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [actual] = await connection.query(
        'SELECT saldo_actual FROM saldos WHERE estudiante_id = ?',
        [estudianteId]
      );

      if (!actual.length || parseFloat(actual[0].saldo_actual) < monto) {
        await connection.rollback();
        return res.status(400).json({ error: 'El estudiante no tiene suficiente saldo para esta deducción' });
      }

      await connection.query(
        'UPDATE saldos SET saldo_actual = saldo_actual - ? WHERE estudiante_id = ?',
        [monto, estudianteId]
      );

      // Registrar transacción de descuento
      await connection.query(
        "INSERT INTO transacciones (usuario_id, tipo, monto, descripcion) VALUES (?, 'GASTO', ?, 'Ajuste de saldo por Admin')",
        [estudianteId, monto]
      );

      const [nuevoSaldo] = await connection.query(
        'SELECT saldo_actual FROM saldos WHERE estudiante_id = ?',
        [estudianteId]
      );

      await connection.commit();
      res.json({ message: 'Deducción exitosa', nuevoSaldo: parseFloat(nuevoSaldo[0].saldo_actual) });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error descontando saldo:', error);
    res.status(500).json({ error: 'Error interno del servidor al descontar saldo' });
  }
};

exports.obtenerReportes = async (req, res) => {
  try {
    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultEnd.getDate() - 29); // 30 days default

    const inicioStr = req.query.inicio || defaultStart.toISOString().split('T')[0];
    const finStr = req.query.fin || defaultEnd.toISOString().split('T')[0];

    const inicioDate = new Date(inicioStr + 'T00:00:00');
    const finDate = new Date(finStr + 'T23:59:59');

    const diasDiff = Math.round((finDate - inicioDate) / (1000 * 60 * 60 * 24));

    // 1. Total recaudado (validaciones) en el periodo
    const [recaudo] = await db.query(
      'SELECT SUM(monto_descontado) as total_recaudo, COUNT(id) as total_viajes FROM validaciones WHERE fecha_abordaje >= ? AND fecha_abordaje <= ?',
      [inicioStr + ' 00:00:00', finStr + ' 23:59:59']
    );
    
    // 2. Uso por rutas
    const [rutasStats] = await db.query(`
      SELECT r.nombre_ruta, COUNT(v.id) as abordajes 
      FROM rutas r 
      LEFT JOIN validaciones v ON r.id = v.ruta_id AND v.fecha_abordaje >= ? AND v.fecha_abordaje <= ?
      GROUP BY r.id
    `, [inicioStr + ' 00:00:00', finStr + ' 23:59:59']);

    // 3. Linea de recaudos en el periodo
    const [recaudosPeriodo] = await db.query(`
      SELECT DATE(fecha) as d, SUM(monto) as total
      FROM transacciones
      WHERE tipo = 'GASTO' AND fecha >= ? AND fecha <= ?
      GROUP BY d ORDER BY d ASC
    `, [inicioStr + ' 00:00:00', finStr + ' 23:59:59']);

    // Construir arreglo continuo para lineaDatos
    const lineaDatos = [];
    for (let i = diasDiff; i >= 0; i--) {
      const date = new Date(finDate);
      date.setDate(date.getDate() - i);
      const dStrLocal = date.toISOString().split('T')[0];
      const match = recaudosPeriodo.find(r => {
        const rowDate = new Date(r.d);
        rowDate.setMinutes(rowDate.getMinutes() - rowDate.getTimezoneOffset());
        return rowDate.toISOString().split('T')[0] === dStrLocal;
      });
      lineaDatos.push({ 
        label: `${date.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][date.getMonth()]}`, 
        valor: match ? parseFloat(match.total) : 0 
      });
    }

    // 4. Barras de abordajes por dia de semana en el periodo
    const [abordajesSemana] = await db.query(`
      SELECT WEEKDAY(fecha_abordaje) as dia_semana, COUNT(id) as total
      FROM validaciones
      WHERE fecha_abordaje >= ? AND fecha_abordaje <= ?
      GROUP BY dia_semana
    `, [inicioStr + ' 00:00:00', finStr + ' 23:59:59']);
    
    const barrasSemana = [0, 0, 0, 0, 0, 0, 0];
    abordajesSemana.forEach(r => {
      barrasSemana[r.dia_semana] = r.total;
    });

    // 5. Alertas recientes (reportes reales de estudiantes y conductores)
    let alertas = [];
    try {
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

      const [incidentesRows] = await db.query(
        "SELECT id, autor_nombre, rol, ruta, motivo, urgencia, descripcion, created_at FROM reportes_incidentes WHERE estado = 'ACTIVO' ORDER BY created_at DESC LIMIT 25"
      );

      alertas = incidentesRows.map(inc => {
        const esCritica = inc.rol === 'CONDUCTOR' && inc.urgencia && inc.urgencia.toLowerCase().includes('alta');
        const etiquetaRol = inc.rol === 'CONDUCTOR' ? 'Conductor' : 'Estudiante';
        return {
          id: inc.id,
          severidad: esCritica ? 'critica' : 'media',
          rol: inc.rol,
          autor: inc.autor_nombre,
          ruta: inc.ruta,
          urgencia: inc.urgencia,
          fecha: inc.created_at,
          titulo: `[${etiquetaRol}] ${inc.ruta} — ${inc.motivo}`,
          descripcion: `${inc.autor_nombre}${inc.rol === 'CONDUCTOR' && inc.urgencia ? ' (' + inc.urgencia + ')' : ''}: "${inc.descripcion}"`,
          accion: 'Marcar atendido'
        };
      });
    } catch (errAlertas) {
      console.error('Error consultando reportes_incidentes:', errAlertas);
    }

    // Sparklines 
    const sparklineRecaudo = [];
    const sparklineViajes = [];
    const sparklineRutaN = [];
    const sparklineRutaS = [];

    // Llenar sparklineRecaudo
    const limitSpark = Math.min(7, lineaDatos.length);
    for(let i = limitSpark - 1; i >= 0; i--) {
      sparklineRecaudo.push(lineaDatos[lineaDatos.length - 1 - i].valor);
    }

    res.json({
      total_recaudado: recaudo[0].total_recaudo || 0,
      total_viajes: recaudo[0].total_viajes || 0,
      rutas: rutasStats,
      lineaDatos,
      barrasSemana,
      alertas,
      sparklineRecaudo,
      sparklineViajes,
      sparklineRutaN,
      sparklineRutaS
    });
  } catch (error) {
    console.error('Error generando reportes:', error);
    res.status(500).json({ error: 'Error generando estadísticas' });
  }
};

exports.obtenerTransacciones = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    const query = `
      SELECT t.id, t.tipo, t.monto, t.fecha, t.descripcion as nota,
             u.nombre as estudianteNombre, u.documento as estudianteDocumento,
             IFNULL((SELECT saldo_actual FROM saldos WHERE estudiante_id = t.usuario_id), 0) as saldoResultante,
             'Sistema' as ejecutadoPor
      FROM transacciones t
      JOIN usuarios u ON t.usuario_id = u.id
      ORDER BY t.fecha DESC
      LIMIT ? OFFSET ?
    `;
    const [transacciones] = await db.query(query, [Number(limit), Number(offset)]);

    const [[{ total_registros }]] = await db.query('SELECT COUNT(*) as total_registros FROM transacciones');
    const totalPages = Math.ceil(total_registros / limit);

    const [stats] = await db.query(`
      SELECT 
        SUM(CASE WHEN tipo='RECARGA' THEN monto ELSE 0 END) as total_recargado,
        SUM(CASE WHEN tipo='GASTO' AND LOWER(descripcion) NOT LIKE '%ajuste%' THEN monto ELSE 0 END) as total_consumido,
        SUM(CASE WHEN tipo='GASTO' AND LOWER(descripcion) LIKE '%ajuste%' THEN 1 ELSE 0 END) as total_ajustes
      FROM transacciones
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const formatedData = transacciones.map(tx => {
      let tipoFrontend = '';
      if (tx.tipo === 'RECARGA') {
        tipoFrontend = 'recarga';
      } else if (tx.tipo === 'GASTO') {
        if (tx.nota && tx.nota.toLowerCase().includes('ajuste')) {
          tipoFrontend = 'ajuste';
        } else {
          tipoFrontend = 'abordaje';
        }
      } else {
        tipoFrontend = 'ajuste';
      }

      return {
        id: tx.id,
        tipo: tipoFrontend,
        monto: parseFloat(tx.monto) * (tx.tipo === 'GASTO' ? -1 : 1),
        fecha: tx.fecha,
        saldoResultante: parseFloat(tx.saldoResultante),
        estudiante: { nombre: tx.estudianteNombre, documento: tx.estudianteDocumento || '0' },
        ejecutadoPor: tx.ejecutadoPor,
        nota: tx.nota
      };
    });

    res.json({
      transacciones: formatedData,
      totalPages: totalPages,
      estadisticas: {
        recargado: parseFloat(stats[0].total_recargado) || 0,
        consumido: parseFloat(stats[0].total_consumido) || 0,
        ajustes: parseInt(stats[0].total_ajustes) || 0
      }
    });
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerViajes = async (req, res) => {
  try {
    const query = `
      SELECT id, driver_name as conductor, route_name as ruta, 
             passengers_count as pasajeros, status as estado, start_time as fechaInicio,
             alert_message as incidencia
      FROM active_trips
      ORDER BY start_time DESC
      LIMIT 100
    `;
    const [viajes] = await db.query(query);

    const [configs] = await db.query("SELECT clave, valor FROM configuraciones WHERE clave IN ('coste_pasaje', 'tiempo_maximo_viaje')");
    let tarifa = 10000;
    let maxTiempo = 45;
    configs.forEach(c => {
      if(c.clave === 'coste_pasaje') tarifa = parseFloat(c.valor);
      if(c.clave === 'tiempo_maximo_viaje') maxTiempo = parseInt(c.valor);
    });
    const now = new Date();
    for (let v of viajes) {
      if (v.estado === 'active') {
        const diffMin = (now - new Date(v.fechaInicio)) / 60000;
        if (diffMin > maxTiempo) {
          v.incidencia = 'Excede tiempo m�ximo';
          await db.query("UPDATE active_trips SET alert_message = 'Excede tiempo m�ximo' WHERE id = ?", [v.id]);
        }
      }
    }
    const formatedData = viajes.map(v => ({
      id: 'VJ-' + String(v.id).padStart(4, '0'),
      ruta: v.ruta,
      conductor: v.conductor,
      pasajeros: v.pasajeros,
      recaudo: v.pasajeros * tarifa,
      fechaInicio: v.fechaInicio,
      duracion: v.estado === 'completed' ? '45 min' : 'En curso',
      estado: v.estado === 'completed' ? 'completado' : 'en_curso',
      incidencia: !!v.incidencia,
      validaciones: [] // Mock empty array for now
    }));

    res.json(formatedData);
  } catch (error) {
    console.error('Error obteniendo viajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.obtenerConductores = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.nombre, u.documento, u.correo, u.telefono, u.placa,
             t.route_name as rutaAsignada,
             (SELECT COUNT(*) FROM active_trips WHERE driver_name = u.nombre AND status = 'active') > 0 as enRuta,
             (SELECT COUNT(*) FROM validaciones WHERE conductor_id = u.id AND MONTH(fecha_abordaje) = MONTH(CURRENT_DATE())) as viajesMes,
             (SELECT COUNT(*) FROM validaciones WHERE conductor_id = u.id) as validacionesTotales
      FROM usuarios u
      LEFT JOIN active_trips t ON t.driver_name = u.nombre AND t.status = 'active'
      WHERE u.rol = 'CONDUCTOR'
      GROUP BY u.id, u.nombre, u.documento, u.correo, u.telefono, u.placa, t.route_name
    `;
    const [conductores] = await db.query(query);

    const formatedData = conductores.map(c => ({
      id: c.id,
      documento: c.documento,
      nombre: c.nombre,
      correo: c.correo,
      telefono: c.telefono || '-',
      placa: c.placa || '',
      rutaAsignada: c.rutaAsignada || null,
      estado: c.enRuta ? 'en_ruta' : 'disponible',
      viajesMes: c.viajesMes,
      validacionesTotales: c.validacionesTotales,
      pasajerosPorDia: [0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Mock for now
      historialViajes: [] // Mock for now
    }));

    // Find active trips info if enRuta
    for (let c of formatedData) {
      if (c.estado === 'en_ruta') {
        const [trips] = await db.query('SELECT stage, passengers_count, start_time, alert_message FROM active_trips WHERE driver_name = ? AND status = "active"', [c.nombre]);
        if(trips.length > 0) {
           const startT = new Date(trips[0].start_time);
           c.viajeActivo = {
             etapa: trips[0].stage,
             pasajerosABordo: trips[0].passengers_count,
             horaInicio: startT.toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'}),
             horaInicioRaw: trips[0].start_time,
             aviso: trips[0].alert_message
           };
        }
      }

      // Fetch historialViajes (grouped by day and route as a "trip")
      const [historial] = await db.query(`
        SELECT 
            DATE(fecha_abordaje) as fecha, 
            COUNT(*) as pasajeros,
            SUM(monto_descontado) as recaudo
        FROM validaciones
        WHERE conductor_id = ?
        GROUP BY DATE(fecha_abordaje), ruta_id
        ORDER BY fecha DESC
        LIMIT 30
      `, [c.id]);

      c.historialViajes = historial.map((h, i) => ({
        id: i,
        fecha: h.fecha,
        pasajeros: h.pasajeros,
        duracion: '45m', // Simulated duration
        recaudo: parseFloat(h.recaudo),
        aTiempo: true // Simulated punctuality
      }));

      // Fetch pasajerosPorDia (last 14 days)
      const [pordia] = await db.query(`
        SELECT 
            DATE(fecha_abordaje) as fecha,
            COUNT(*) as pasajeros
        FROM validaciones
        WHERE conductor_id = ? AND fecha_abordaje >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        GROUP BY DATE(fecha_abordaje)
        ORDER BY fecha ASC
      `, [c.id]);

      const arr14 = new Array(14).fill(0);
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      
      pordia.forEach(row => {
        const rowDate = new Date(row.fecha);
        rowDate.setHours(0,0,0,0);
        const diffTime = hoy - rowDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 14) {
          arr14[13 - diffDays] = row.pasajeros;
        }
      });
      
      c.pasajerosPorDia = arr14;
    }

    res.json(formatedData);
  } catch (error) {
    console.error('Error obteniendo conductores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crearConductor = async (req, res) => {
  try {
    const { nombre, documento, correo, telefono, placa, password } = req.body;

    if (!nombre || !documento || !correo || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, documento, correo, telefono, placa, password, rol) VALUES (?, ?, ?, ?, ?, ?, "CONDUCTOR")',
      [nombre, documento, correo, telefono || null, placa || null, hashedPassword]
    );

    res.status(201).json({ mensaje: 'Conductor creado correctamente', id: result.insertId });
  } catch (error) {
    console.error('Error creando conductor:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El documento o correo ya está registrado' });
    }
    res.status(500).json({ error: 'Error interno del servidor al crear' });
  }
};

exports.actualizarConductor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, documento, correo, telefono, placa } = req.body;

    if (!nombre || !documento || !correo) {
      return res.status(400).json({ error: 'Nombre, documento y correo son requeridos' });
    }

    const [result] = await db.query(
      'UPDATE usuarios SET nombre = ?, documento = ?, correo = ?, telefono = ?, placa = ? WHERE id = ? AND rol = "CONDUCTOR"',
      [nombre, documento, correo, telefono || null, placa || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    res.json({ mensaje: 'Datos del conductor actualizados correctamente' });
  } catch (error) {
    console.error('Error actualizando conductor:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar' });
  }
};

exports.obtenerConfiguracion = async (req, res) => {
  try {
    const [admins] = await db.query(
      "SELECT id, nombre, documento, correo, rol, '2026-09-18 10:00:00' as ultimoAcceso FROM usuarios WHERE rol = 'ADMIN'"
    );

    const [configs] = await db.query("SELECT clave, valor FROM configuraciones");
    const settings = {};
    configs.forEach(c => settings[c.clave] = c.valor);

    const [auditoria] = await db.query("SELECT id, admin, modulo, accion, fecha FROM auditoria ORDER BY fecha DESC, id DESC LIMIT 50");

    res.json({ admins, configuraciones: settings, auditoria });
  } catch (error) {
    console.error('Error obteniendo configuracion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.actualizarConfiguracion = async (req, res) => {
  try {
    const { coste_pasaje, tiempo_maximo_viaje, horario_operacion } = req.body;
    const adminNombre = (req.user && req.user.nombre) ? req.user.nombre : 'Admin';

    const [currentConfigs] = await db.query("SELECT clave, valor FROM configuraciones WHERE clave IN ('coste_pasaje', 'tiempo_maximo_viaje', 'horario_operacion')");
    const current = {};
    currentConfigs.forEach(c => current[c.clave] = c.valor);

    const cambiosRegistrados = [];

    if (coste_pasaje !== undefined && String(current.coste_pasaje) !== String(coste_pasaje)) {
      await db.query("UPDATE configuraciones SET valor = ? WHERE clave = 'coste_pasaje'", [coste_pasaje]);
      cambiosRegistrados.push(`Tarifa base cambiada a ${coste_pasaje}`);
    }
    if (tiempo_maximo_viaje !== undefined && String(current.tiempo_maximo_viaje) !== String(tiempo_maximo_viaje)) {
      await db.query("INSERT INTO configuraciones (clave, valor) VALUES ('tiempo_maximo_viaje', ?) ON DUPLICATE KEY UPDATE valor = ?", [tiempo_maximo_viaje, tiempo_maximo_viaje]);
      cambiosRegistrados.push(`Tiempo máximo de viaje ajustado a ${tiempo_maximo_viaje} min`);
    }
    if (horario_operacion !== undefined && String(current.horario_operacion) !== String(horario_operacion)) {
      await db.query("INSERT INTO configuraciones (clave, valor) VALUES ('horario_operacion', ?) ON DUPLICATE KEY UPDATE valor = ?", [horario_operacion, horario_operacion]);
      cambiosRegistrados.push(`Horario de operación modificado a ${horario_operacion}`);
    }

    for (const cambio of cambiosRegistrados) {
      await db.query(
        "INSERT INTO auditoria (admin, modulo, accion, fecha) VALUES (?, 'Configuración', ?, NOW())",
        [adminNombre, cambio]
      );
    }

    res.json({ message: 'Configuracion actualizada' });
  } catch (error) {
    console.error('Error actualizando configuracion:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.exportarReporte = async (req, res) => {
  try {
    const { tipo, inicio, fin } = req.query;
    
    let query = '';
    let params = [];
    let tituloColumnas = [];
    let filas = [];

    const defaultEnd = new Date().toISOString().split('T')[0] + ' 23:59:59';
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const startStr = inicio ? `${inicio} 00:00:00` : defaultStart.toISOString().split('T')[0] + ' 00:00:00';
    const endStr = fin ? `${fin} 23:59:59` : defaultEnd;

    switch (tipo) {
      case 'Recaudo por período':
        query = `
          SELECT DATE(fecha) as fecha, COUNT(*) as cantidad_recargas, SUM(monto) as total_recaudo
          FROM transacciones 
          WHERE tipo = 'RECARGA' AND fecha >= ? AND fecha <= ?
          GROUP BY DATE(fecha)
          ORDER BY fecha DESC
        `;
        params = [startStr, endStr];
        tituloColumnas = ['Fecha', 'Cantidad Recargas', 'Total Recaudado'];
        
        const [recaudos] = await db.query(query, params);
        filas = recaudos.map(r => [
          r.fecha ? r.fecha.toISOString().split('T')[0] : 'N/A', 
          r.cantidad_recargas, 
          r.total_recaudo
        ]);
        break;

      case 'Uso por ruta':
        query = `
          SELECT r.nombre_ruta, COUNT(v.id) as abordajes, SUM(v.monto_descontado) as ingresos
          FROM rutas r 
          LEFT JOIN validaciones v ON r.id = v.ruta_id AND v.fecha_abordaje >= ? AND v.fecha_abordaje <= ?
          GROUP BY r.id
          ORDER BY abordajes DESC
        `;
        params = [startStr, endStr];
        tituloColumnas = ['Nombre Ruta', 'Total Abordajes', 'Ingresos Generados'];
        
        const [usoRuta] = await db.query(query, params);
        filas = usoRuta.map(r => [
          r.nombre_ruta, 
          r.abordajes, 
          r.ingresos || 0
        ]);
        break;

      case 'Actividad por estudiante':
        query = `
          SELECT u.nombre, u.documento, COUNT(v.id) as viajes, SUM(v.monto_descontado) as gastado
          FROM usuarios u
          JOIN validaciones v ON u.id = v.estudiante_id
          WHERE u.rol = 'ESTUDIANTE' AND v.fecha_abordaje >= ? AND v.fecha_abordaje <= ?
          GROUP BY u.id
          ORDER BY viajes DESC
        `;
        params = [startStr, endStr];
        tituloColumnas = ['Nombre Estudiante', 'Documento', 'Viajes Realizados', 'Dinero Gastado'];
        
        const [actividadEst] = await db.query(query, params);
        filas = actividadEst.map(r => [
          r.nombre, 
          r.documento, 
          r.viajes, 
          r.gastado || 0
        ]);
        break;

      default:
        // Por defecto si no coincide
        tituloColumnas = ['Aviso'];
        filas = [['Reporte no implementado todavía']];
    }

    res.json({
      tipo: tipo || 'Reporte',
      rango: `${inicio || 'Inicio'} al ${fin || 'Fin'}`,
      columnas: tituloColumnas,
      filas: filas
    });

  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno generando reporte' });
  }
};




exports.crearAdmin = async (req, res) => {
  try {
    const { nombre, documento, correo, password } = req.body;
    if (!nombre || !documento || !correo || !password) return res.status(400).json({ error: 'Faltan datos' });
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO usuarios (nombre, documento, correo, password, rol) VALUES (?, ?, ?, ?, 'ADMIN')", [nombre, documento, correo, hash]);

    const adminActor = (req.user && req.user.nombre) ? req.user.nombre : 'Admin';
    await db.query(
      "INSERT INTO auditoria (admin, modulo, accion, fecha) VALUES (?, 'Administradores', ?, NOW())",
      [adminActor, `Nuevo administrador creado: ${nombre} (${correo})`]
    );

    res.json({ message: 'Administrador creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando admin. Es posible que el correo o documento ya existan.' });
  }
};


exports.eliminarAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (id == 1) return res.status(403).json({ error: 'No se puede eliminar al admin principal' });

    // Obtener datos del admin a eliminar para el reporte
    const [target] = await db.query("SELECT nombre, correo FROM usuarios WHERE id = ? AND rol = 'ADMIN'", [id]);
    const nombreEliminado = target.length > 0 ? target[0].nombre : `ID #${id}`;
    const correoEliminado = target.length > 0 ? target[0].correo : '';

    await db.query("DELETE FROM usuarios WHERE id = ? AND rol = 'ADMIN'", [id]);

    const adminActor = (req.user && req.user.nombre) ? req.user.nombre : 'Admin';
    await db.query(
      "INSERT INTO auditoria (admin, modulo, accion, fecha) VALUES (?, 'Administradores', ?, NOW())",
      [adminActor, `Administrador revocado/eliminado: ${nombreEliminado} ${correoEliminado ? '(' + correoEliminado + ')' : ''}`]
    );

    res.json({ message: 'Administrador eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.atenderIncidente = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE reportes_incidentes SET estado = 'ATENDIDO' WHERE id = ?", [id]);
    res.json({ message: 'Incidente marcado como atendido' });
  } catch (error) {
    console.error('Error atendiendo incidente:', error);
    res.status(500).json({ error: 'Error al actualizar el incidente' });
  }
};
