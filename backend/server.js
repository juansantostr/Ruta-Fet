const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const validacionesRoutes = require('./routes/validaciones');
const estudiantesRoutes = require('./routes/estudiantes');
const adminRoutes = require('./routes/admin');
const tripsRoutes = require('./routes/trips');
const rutasRoutes = require('./routes/rutas');

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/validaciones', validacionesRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/rutas', rutasRoutes);

// Servir el frontend compilado (carpeta dist) para acceso por link público / producción
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Cualquier ruta que no empiece por /api devuelve index.html (React Router)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
