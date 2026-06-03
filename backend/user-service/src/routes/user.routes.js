const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const userController = require('../controllers/userController');

// Profile routes (authenticated users)
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validate(schemas.updateProfile), userController.updateProfile);
router.put('/profile/password', authenticate, validate(schemas.changePassword), userController.changePassword);

// Notifications
router.get('/notifications', authenticate, userController.getNotifications);
router.put('/notifications/:id/read', authenticate, userController.markNotificationRead);

// Admin-only routes
router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

module.exports = router;
