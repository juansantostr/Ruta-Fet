const express = require('express');
const router = express.Router();
const estudianteController = require('../controllers/estudianteController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/dashboard', authMiddleware, estudianteController.getDashboardData);
router.put('/perfil', authMiddleware, estudianteController.updateProfile);
router.put('/ruta-favorita', authMiddleware, estudianteController.updateRutaFavorita);
router.post('/reportar', authMiddleware, estudianteController.crearReporteIncidente);

module.exports = router;
