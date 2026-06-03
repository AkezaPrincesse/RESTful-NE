const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/inspectionController');

// Inspections
router.post('/inspections', authenticate, ctrl.scheduleInspection);
router.get('/inspections', authenticate, ctrl.getAllInspections);
router.get('/inspections/:id', authenticate, ctrl.getInspectionById);
router.put('/inspections/:id', authenticate, authorize('admin', 'inspector'), ctrl.updateInspection);
router.delete('/inspections/:id', authenticate, authorize('admin'), ctrl.cancelInspection);

// Maintenance logs
router.post('/maintenance', authenticate, authorize('admin', 'inspector'), ctrl.logMaintenance);
router.get('/maintenance', authenticate, ctrl.getMaintenanceLogs);
router.get('/maintenance/:id', authenticate, ctrl.getMaintenanceLogById);

module.exports = router;
