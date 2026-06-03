const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/extinguisherController');

/**
 * @swagger
 * tags:
 *   name: Extinguishers
 *   description: Fire extinguisher management
 */

router.get('/stats', authenticate, ctrl.getDashboardStats);

/**
 * @swagger
 * /api/extinguishers:
 *   get:
 *     summary: List all extinguishers (paginated)
 *     tags: [Extinguishers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Inactive, Expired, Under Maintenance] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [Water, CO2, Foam, Dry Chemical] }
 *     responses:
 *       200: { description: List of extinguishers with pagination }
 */
router.get('/', authenticate, ctrl.getAllExtinguishers);

/**
 * @swagger
 * /api/extinguishers/{id}:
 *   get:
 *     summary: Get extinguisher by ID
 *     tags: [Extinguishers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Extinguisher details with inspection and maintenance history }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, ctrl.getExtinguisherById);

/**
 * @swagger
 * /api/extinguishers:
 *   post:
 *     summary: Register a new extinguisher
 *     tags: [Extinguishers]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serial_number, location, type, size, installation_date, expiry_date]
 *             properties:
 *               serial_number: { type: string }
 *               location: { type: string }
 *               type: { type: string, enum: [Water, CO2, Foam, Dry Chemical] }
 *               size: { type: string, enum: ['2.5 lbs', '5 lbs', '9 lbs', '12 lbs'] }
 *               installation_date: { type: string, format: date }
 *               expiry_date: { type: string, format: date }
 *               status: { type: string, default: Active }
 *     responses:
 *       201: { description: Extinguisher registered }
 *       409: { description: Serial number exists }
 */
router.post('/', authenticate, authorize('admin', 'inspector'), validate(schemas.createExtinguisher), ctrl.createExtinguisher);

/**
 * @swagger
 * /api/extinguishers/{id}:
 *   put:
 *     summary: Update extinguisher details
 *     tags: [Extinguishers]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', authenticate, authorize('admin', 'inspector'), validate(schemas.updateExtinguisher), ctrl.updateExtinguisher);

/**
 * @swagger
 * /api/extinguishers/{id}:
 *   delete:
 *     summary: Remove extinguisher record
 *     tags: [Extinguishers]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteExtinguisher);

module.exports = router;
