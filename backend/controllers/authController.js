const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

exports.register = async (req, res) => {
  const { nombre, documento, correo, telefono, password, rutaFavorita } = req.body;

  if (!nombre || !documento || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  try {
    // 1. Verificar si el usuario ya existe (por correo o documento)
    const [existingUsers] = await db.query(
      'SELECT * FROM usuarios WHERE correo = ? OR documento = ?',
      [correo, documento]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'El correo o documento ya está registrado' });
    }

    // 2. Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insertar el nuevo usuario con rol 'ESTUDIANTE'
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, documento, correo, telefono, password, rol, ruta_favorita) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, documento, correo, telefono || null, hashedPassword, 'ESTUDIANTE', rutaFavorita || null]
    );

    const newUserId = result.insertId;

    // 4. Inicializar su tabla de saldos en 0
    await db.query(
      'INSERT INTO saldos (estudiante_id, saldo_actual) VALUES (?, ?)',
      [newUserId, 0.00]
    );

    res.status(201).json({ message: 'Estudiante registrado con éxito' });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.login = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    // 1. Buscar al usuario
    const [users] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    const user = users[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 2. Verificar la contraseña
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Generar JWT
    const payload = {
      id: user.id,
      rol: user.rol,
      nombre: user.nombre
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
