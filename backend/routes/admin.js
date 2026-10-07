const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Todas las rutas de admin requieren estar logueado y ser ADMIN
router.use(authMiddleware, adminMiddleware);

router.get('/estudiantes', adminController.buscarEstudiantes);
router.put('/estudiantes/:id', adminController.actualizarEstudiante);
router.post('/recargar', adminController.recargarSaldo);
router.post('/descontar', adminController.descontarSaldo);
router.get('/reportes', adminController.obtenerReportes);
router.get('/exportar-reporte', adminController.exportarReporte);
router.get('/transacciones', adminController.obtenerTransacciones);
router.get('/viajes', adminController.obtenerViajes);
router.get('/conductores', adminController.obtenerConductores);
router.post('/conductores', adminController.crearConductor);
router.post('/crear-admin', adminController.crearAdmin);
router.delete('/eliminar-admin/:id', adminController.eliminarAdmin);
router.put('/conductores/:id', adminController.actualizarConductor);
router.get('/configuracion', adminController.obtenerConfiguracion);
router.put('/configuracion', adminController.actualizarConfiguracion);
router.put('/incidentes/:id/atender', adminController.atenderIncidente);

module.exports = router;




