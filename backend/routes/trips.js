const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.post('/start', tripController.startTrip);
router.post('/end', tripController.endTrip);
router.put('/update-stage', tripController.updateTripStage);
router.put('/update-alert', tripController.updateTripAlert);
router.get('/active', tripController.getActiveTrips);
router.get('/driver/:conductorId', tripController.getDriverActiveTrip);
router.post('/scan', tripController.scanQR);
router.post('/reportar', tripController.crearReporteConductor);

module.exports = router;
