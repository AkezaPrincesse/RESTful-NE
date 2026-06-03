const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const authController = require('../controllers/authController');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password]
 *             properties:
 *               first_name: { type: string, example: John }
 *               last_name: { type: string, example: Doe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: 'Pass@123' }
 *               phone: { type: string }
 *               department: { type: string }
 *     responses:
 *       201: { description: User registered }
 *       409: { description: Email already registered }
 *       422: { description: Validation error }
 */
router.post('/register', validate(schemas.register), authController.register);
router.post('/create-admin', validate(schemas.createAdmin), authController.createAdmin);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful with JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(schemas.login), authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 */
router.post('/forgot-password', validate(schemas.forgotPassword), authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 */
router.post('/reset-password', validate(schemas.resetPassword), authController.resetPassword);

module.exports = router;
