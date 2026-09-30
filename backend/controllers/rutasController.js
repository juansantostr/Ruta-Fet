const db = require('../db');

exports.listarRutasFull = async (req, res) => {
  try {
    const [rutasRows] = await db.query(
      'SELECT id, nombre_ruta as name, origen, destino, tarifa, dias_operacion as diasOperacion, frecuencia, duracion FROM rutas'
    );
    const [paradasRows] = await db.query('SELECT ruta_id, nombre, orden FROM paradas ORDER BY ruta_id, orden ASC');
    const [horariosRows] = await db.query(
      `SELECT h.ruta_id, h.numero_salida, DATE_FORMAT(h.hora, '%H:%i') as hora, p.orden 
       FROM horarios h JOIN paradas p ON h.parada_id = p.id 
       ORDER BY h.ruta_id, h.numero_salida, p.orden ASC`
    );
    const [avisosRows] = await db.query(
      'SELECT id, ruta_id, titulo, mensaje, created_at, activo FROM avisos WHERE activo = TRUE'
    );

    const result = rutasRows.map(ruta => {
      const paradasRutaObj = paradasRows.filter(p => p.ruta_id === ruta.id);
      const paradasRuta = paradasRutaObj.map(p => p.nombre);
      const horariosRuta = horariosRows.filter(h => h.ruta_id === ruta.id);
      
      const salidasMap = {};
      const salidasSet = new Set(horariosRuta.map(h => h.numero_salida));
      
      for (const num of salidasSet) {
        salidasMap[num] = new Array(paradasRutaObj.length).fill('');
      }

      horariosRuta.forEach(h => {
        const pIndex = paradasRutaObj.findIndex(p => p.orden === h.orden);
        if (pIndex !== -1 && salidasMap[h.numero_salida]) {
          salidasMap[h.numero_salida][pIndex] = h.hora;
        }
      });

      const salidas = Object.keys(salidasMap).map(num => ({
        num: parseInt(num),
        horas: salidasMap[num]
      }));

      const avisos = avisosRows.filter(a => a.ruta_id === ruta.id || a.ruta_id === null).map(a => ({
        id: a.id, titulo: a.titulo, mensaje: a.mensaje, created_at: a.created_at, activo: Boolean(a.activo)
      }));

      return {
        id: ruta.name.toLowerCase().replace('ruta ', ''),
        rutaId: ruta.id,
        name: ruta.name,
        origen: ruta.origen,
        destino: ruta.destino,
        diasOperacion: ruta.diasOperacion,
        frecuencia: ruta.frecuencia,
        duracion: ruta.duracion,
        tarifa: `$${parseFloat(ruta.tarifa).toLocaleString('es-CO')}`,
        paradas: paradasRuta,
        salidas,
        avisos
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error listando rutas full:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

exports.listarRutasAdmin = async (req, res) => {
  try {
    const [rutas] = await db.query('SELECT * FROM rutas');
    const [paradas] = await db.query('SELECT * FROM paradas ORDER BY orden ASC');
    const [horarios] = await db.query("SELECT id, ruta_id, numero_salida, parada_id, DATE_FORMAT(hora, '%H:%i') as hora FROM horarios");

    const result = rutas.map(r => {
      const ps = paradas.filter(p => p.ruta_id === r.id).map(p => ({
        id: p.id, nombre: p.nombre, orden: p.orden, esDestino: (p.orden === paradas.filter(p2 => p2.ruta_id === r.id).length)
      }));
      
      const hs = horarios.filter(h => h.ruta_id === r.id);
      const salidasMap = {};
      hs.forEach(h => {
        if (!salidasMap[h.numero_salida]) {
          salidasMap[h.numero_salida] = { id: h.numero_salida, numero: h.numero_salida, horas: {} };
        }
        salidasMap[h.numero_salida].horas[h.parada_id] = h.hora;
      });

      return {
        id: r.id,
        nombre: r.nombre_ruta,
        origen: r.origen,
        destino: r.destino,
        estado: r.estado.toLowerCase(),
        horario: {
          paradas: ps,
          salidas: Object.values(salidasMap)
        }
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando para admin' });
  }
};

exports.guardarRutaAdmin = async (req, res) => {
  const rutaId = req.params.id;
  const { horario } = req.body;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Delete old horarios and paradas
    await connection.query('DELETE FROM horarios WHERE ruta_id = ?', [rutaId]);
    await connection.query('DELETE FROM paradas WHERE ruta_id = ?', [rutaId]);

    // 2. Insert new paradas
    const idMap = {}; // old_id -> new_id
    for (const p of horario.paradas) {
      const [r] = await connection.query('INSERT INTO paradas (ruta_id, nombre, orden) VALUES (?, ?, ?)', [rutaId, p.nombre, p.orden]);
      idMap[p.id] = r.insertId;
    }

    // 3. Insert new horarios
    for (const s of horario.salidas) {
      for (const [oldParadaId, hora] of Object.entries(s.horas)) {
        if (hora && idMap[oldParadaId]) {
          await connection.query(
            'INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (?, ?, ?, ?)',
            [rutaId, s.numero, idMap[oldParadaId], hora]
          );
        }
      }
    }

    await connection.commit();
    res.json({ message: 'Ruta guardada exitosamente' });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error guardando ruta' });
  } finally {
    connection.release();
  }
};

exports.listarAvisos = async (req, res) => {
  try {
    const [avisos] = await db.query(`
      SELECT a.id, a.ruta_id as rutaId, a.titulo, r.nombre_ruta as ruta, a.mensaje, a.created_at, a.activo 
      FROM avisos a
      LEFT JOIN rutas r ON a.ruta_id = r.id
      ORDER BY a.id DESC
    `);
    
    const formatAvisos = avisos.map(a => ({
      ...a,
      ruta: a.titulo || a.ruta || 'Aviso General',
      activo: Boolean(a.activo)
    }));
    
    res.json(formatAvisos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando avisos' });
  }
};

exports.listarRutas = async (req, res) => {
  try {
    const [rutas] = await db.query('SELECT * FROM rutas');
    res.json(rutas);
  } catch (error) {
    res.status(500).json({ error: 'Error del servidor' });
  }
};

exports.guardarAviso = async (req, res) => {
  const { id, rutaId, titulo, mensaje, activo } = req.body;
  const parsedRutaId = rutaId && rutaId !== 'GENERAL' && rutaId !== 'PERSONALIZADO' ? rutaId : null;
  const parsedTitulo = (rutaId === 'GENERAL' || rutaId === 'PERSONALIZADO') ? titulo : null;
  
  try {
    if (id) {
      await db.query(
        'UPDATE avisos SET ruta_id = ?, titulo = ?, mensaje = ?, activo = ? WHERE id = ?',
        [parsedRutaId, parsedTitulo, mensaje, activo ? 1 : 0, id]
      );
      res.json({ message: 'Aviso actualizado' });
    } else {
      const [result] = await db.query(
        'INSERT INTO avisos (ruta_id, titulo, mensaje, activo) VALUES (?, ?, ?, ?)',
        [parsedRutaId, parsedTitulo, mensaje, activo ? 1 : 0]
      );
      
      // Mantener solo un máximo de 10 notificaciones globales (eliminando las más antiguas)
      await db.query(`
        DELETE FROM avisos 
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT id FROM avisos ORDER BY created_at DESC LIMIT 10
          ) as tmp
        )
      `);

      res.json({ id: result.insertId });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error guardando aviso' });
  }
};

exports.eliminarAviso = async (req, res) => {
  try {
    await db.query('DELETE FROM avisos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Aviso eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error eliminando aviso' });
  }
};

