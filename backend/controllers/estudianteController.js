const db = require('../db');

exports.getDashboardData = async (req, res) => {
  try {
    const estudianteId = req.user.id;

    // Obtener balance
    const [saldos] = await db.query('SELECT saldo_actual FROM saldos WHERE estudiante_id = ?', [estudianteId]);
    
    // Obtener info del usuario (including ruta_favorita)
    let usuarios = [];
    try {
      [usuarios] = await db.query('SELECT nombre, correo, documento, telefono, ruta_favorita FROM usuarios WHERE id = ?', [estudianteId]);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        [usuarios] = await db.query('SELECT nombre, correo, documento FROM usuarios WHERE id = ?', [estudianteId]);
      } else {
        throw err;
      }
    }
    const usuario = usuarios.length > 0 ? usuarios[0] : null;

    // Obtener historial de transacciones (recargas y pagos)
    const [transacciones] = await db.query(
      "SELECT id, tipo, monto, descripcion, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_corta, fecha FROM transacciones WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 50",
      [estudianteId]
    );

    const ruta_favorita = usuario?.ruta_favorita || 'N/A';

    // Obtener gastos de la última semana (por día L, M, M, J, V, S, D)
    const [gastosPorDia] = await db.query(`
      SELECT WEEKDAY(fecha) as dia_semana, SUM(monto) as total
      FROM transacciones
      WHERE usuario_id = ? AND tipo = 'GASTO' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY dia_semana
    `, [estudianteId]);

    const grafica = [0, 0, 0, 0, 0, 0, 0];
    gastosPorDia.forEach(g => {
      grafica[g.dia_semana] = parseFloat(g.total);
    });

    const [configs] = await db.query("SELECT clave, valor FROM configuraciones");
    const settings = {};
    configs.forEach(c => settings[c.clave] = c.valor);
    const coste_pasaje = settings['coste_pasaje'] ? parseFloat(settings['coste_pasaje']) : 10000;

    // Verificar si el estudiante tiene un Pase de Regreso activo y no usado para el día de hoy
    const [pases] = await db.query(
      "SELECT id, fecha_emision, created_at FROM pases_regreso WHERE estudiante_id = ? AND fecha_emision = CURDATE() AND usado = 0 LIMIT 1",
      [estudianteId]
    );
    const tiene_pase_regreso = pases.length > 0;
    const pase_regreso = tiene_pase_regreso ? pases[0] : null;

    res.json({
      saldo_actual: saldos.length > 0 ? parseFloat(saldos[0].saldo_actual) : 0,
      usuario: { ...usuario, id: estudianteId },
      transacciones: transacciones,
      ruta_favorita: ruta_favorita,
      grafica_semanal: grafica,
      configuraciones: { coste_pasaje },
      pase_regreso: pase_regreso,
      tiene_pase_regreso: tiene_pase_regreso
    });

  } catch (error) {
    console.error('Error en getDashboardData:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const estudianteId = req.user.id;
    const { nombre, telefono } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    try {
      await db.query(
        'UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?',
        [nombre, telefono || null, estudianteId]
      );
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // La columna telefono no existe, la creamos
        await db.query('ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20) DEFAULT NULL');
        await db.query(
          'UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?',
          [nombre, telefono || null, estudianteId]
        );
      } else {
        throw err;
      }
    }

    res.json({ message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
};

exports.updateRutaFavorita = async (req, res) => {
  try {
    const estudianteId = req.user.id;
    const { rutaId } = req.body; // 'norte', 'sur', 'oriente', or null

    let nombreRuta = null;
    
    if (rutaId) {
      // Map 'norte' -> 'Ruta Norte'
      const rutaNameMap = {
        'norte': 'Ruta Norte',
        'sur': 'Ruta Sur',
        'oriente': 'Ruta Oriente'
      };
      nombreRuta = rutaNameMap[rutaId.toLowerCase()] || null;
    }

    await db.query('UPDATE usuarios SET ruta_favorita = ? WHERE id = ? AND rol = "ESTUDIANTE"', [nombreRuta, estudianteId]);
    
    res.json({ message: 'Ruta favorita actualizada', ruta_favorita: nombreRuta });
  } catch (error) {
    console.error('Error en updateRutaFavorita:', error);
    res.status(500).json({ error: 'Error al actualizar la ruta favorita' });
  }
};

exports.crearReporteIncidente = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const usuarioNombre = req.user.nombre || 'Estudiante';
    const { ruta, motivo, descripcion } = req.body;

    if (!ruta || !motivo || !descripcion) {
      return res.status(400).json({ error: 'Todos los campos del reporte son obligatorios' });
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

    const [userRows] = await db.query('SELECT nombre FROM usuarios WHERE id = ?', [usuarioId]);
    const nombreReal = userRows.length > 0 ? userRows[0].nombre : usuarioNombre;

    const [result] = await db.query(
      'INSERT INTO reportes_incidentes (usuario_id, autor_nombre, rol, ruta, motivo, urgencia, descripcion, estado) VALUES (?, ?, "ESTUDIANTE", ?, ?, "Media", ?, "ACTIVO")',
      [usuarioId, nombreReal, ruta, motivo, descripcion]
    );

    try {
      await db.query(
        "INSERT INTO auditoria (admin, modulo, accion, fecha) VALUES (?, 'Reporte Estudiante', ?, NOW())",
        [nombreReal, `${ruta} - ${motivo}: ${descripcion.substring(0, 120)}`]
      );
    } catch (e) {
      // Si la tabla auditoria no existe aún, continuamos sin bloquear
    }

    res.status(201).json({ message: 'Reporte enviado al administrador exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error en crearReporteIncidente:', error);
    res.status(500).json({ error: 'Error al enviar el reporte' });
  }
};
