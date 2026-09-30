const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rutasController');

router.get('/full', ctrl.listarRutasFull);
router.get('/admin', ctrl.listarRutasAdmin);
router.put('/admin/:id', ctrl.guardarRutaAdmin);
router.get('/avisos', ctrl.listarAvisos);
router.post('/admin/avisos', ctrl.guardarAviso);
router.delete('/admin/avisos/:id', ctrl.eliminarAviso);
router.get('/', ctrl.listarRutas);

module.exports = router;
