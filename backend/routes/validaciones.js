const express = require('express');
const router = express.Router();
const validacionController = require('../controllers/validacionController');

// Ruta para que el conductor escanee y valide el pasaje
router.post('/escanear', validacionController.escanearQR);

// Ruta para que el estudiante verifique si su QR ya fue escaneado exitosamente
router.get('/verificar/:token', validacionController.verificarToken);

module.exports = router;
