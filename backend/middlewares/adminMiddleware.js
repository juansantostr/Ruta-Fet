module.exports = (req, res, next) => {
  if (!req.user || req.user.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Requiere privilegios de Administrador.' });
  }
  next();
};
