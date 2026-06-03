const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const inspectorController = require('../controllers/inspectorController');

const adminOnly = [authenticate, authorize('admin')];

router.post('/',           adminOnly, validate(schemas.createInspector), inspectorController.createInspector);
router.get('/',            adminOnly, inspectorController.getInspectors);
router.get('/:id',         adminOnly, inspectorController.getInspectorById);
router.put('/:id',         adminOnly, validate(schemas.updateInspector), inspectorController.updateInspector);
router.delete('/:id',      adminOnly, inspectorController.deleteInspector);
router.post('/:id/resend', adminOnly, inspectorController.resendInvitation);

module.exports = router;
