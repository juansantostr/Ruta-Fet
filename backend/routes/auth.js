const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta de registro de estudiante
router.post('/register', authController.register);

// Ruta de login para cualquier usuario (Estudiante, Conductor, Admin)
router.post('/login', authController.login);

module.exports = router;
