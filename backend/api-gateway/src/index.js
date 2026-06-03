require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3000;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'api-gateway' },
  transports: [new winston.transports.Console()],
});

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests' },
}));

app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Service URLs
const SERVICES = {
  USER:          process.env.USER_SERVICE_URL          || 'http://localhost:3001',
  EXTINGUISHER:  process.env.EXTINGUISHER_SERVICE_URL  || 'http://localhost:3002',
  INSPECTION:    process.env.INSPECTION_SERVICE_URL    || 'http://localhost:3003',
  REPORTING:     process.env.REPORTING_SERVICE_URL     || 'http://localhost:3004',
};

const proxyOpts = (target) => ({
  target,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      logger.error(`Proxy error to ${target}: ${err.message}`);
      res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    },
  },
});

// Route proxies
app.use('/api/auth',          createProxyMiddleware(proxyOpts(SERVICES.USER)));
app.use('/api/users',         createProxyMiddleware(proxyOpts(SERVICES.USER)));
app.use('/api/extinguishers', createProxyMiddleware(proxyOpts(SERVICES.EXTINGUISHER)));
app.use('/api/inspections',   createProxyMiddleware({ ...proxyOpts(SERVICES.INSPECTION), pathRewrite: { '^/api/inspections': '/api/inspections' } }));
app.use('/api/maintenance',   createProxyMiddleware({ ...proxyOpts(SERVICES.INSPECTION), pathRewrite: { '^/api/maintenance': '/api/maintenance' } }));
app.use('/api/reports',       createProxyMiddleware(proxyOpts(SERVICES.REPORTING)));

// Aggregated Swagger
const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'FEMS - Fire Extinguisher Management System API',
    version: '1.0.0',
    description: `## TWZ Ltd Fire Extinguisher Management System\n\nMicroservices-based REST API for managing fire extinguishers, inspections, maintenance, and reporting.\n\n### Services\n- **User Service** (port 3001): Authentication, user management\n- **Extinguisher Service** (port 3002): Extinguisher CRUD\n- **Inspection Service** (port 3003): Inspections & maintenance logs\n- **Reporting Service** (port 3004): Reports, PDF/CSV export\n\n### Authentication\nAll endpoints except registration and login require a JWT Bearer token.`,
    contact: { name: 'TWZ Ltd', email: 'tech@twzltd.com' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: `http://localhost:${PORT}`, description: 'API Gateway (Development)' },
    { url: 'http://localhost:3001', description: 'User Service (Direct)' },
    { url: 'http://localhost:3002', description: 'Extinguisher Service (Direct)' },
    { url: 'http://localhost:3003', description: 'Inspection Service (Direct)' },
    { url: 'http://localhost:3004', description: 'Reporting Service (Direct)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT token from /api/auth/login' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'inspector', 'user'] },
          phone: { type: 'string' },
          department: { type: 'string' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Extinguisher: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serial_number: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string', enum: ['Water', 'CO2', 'Foam', 'Dry Chemical'] },
          size: { type: 'string', enum: ['2.5 lbs', '5 lbs', '9 lbs', '12 lbs'] },
          installation_date: { type: 'string', format: 'date' },
          expiry_date: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['Active', 'Inactive', 'Expired', 'Under Maintenance', 'Decommissioned'] },
        },
      },
      Inspection: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          extinguisher_id: { type: 'string', format: 'uuid' },
          scheduled_date: { type: 'string', format: 'date-time' },
          inspection_type: { type: 'string', enum: ['routine', 'emergency', 'annual', 'monthly'] },
          status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'] },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        },
      },
      MaintenanceLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          extinguisher_id: { type: 'string', format: 'uuid' },
          action_taken: { type: 'string' },
          action_date: { type: 'string', format: 'date' },
          conditions_noted: { type: 'string' },
          result: { type: 'string', enum: ['pass', 'fail', 'needs_attention'] },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          pages: { type: 'integer' },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'Register, login, logout, password management' },
    { name: 'Users', description: 'User profile and admin user management' },
    { name: 'Extinguishers', description: 'Fire extinguisher CRUD operations' },
    { name: 'Inspections', description: 'Inspection scheduling and management' },
    { name: 'Maintenance', description: 'Maintenance logging' },
    { name: 'Reports', description: 'Reporting and data export' },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['first_name', 'last_name', 'email', 'password'],
                properties: {
                  first_name: { type: 'string', example: 'John' },
                  last_name: { type: 'string', example: 'Doe' },
                  email: { type: 'string', example: 'john.doe@example.com' },
                  password: { type: 'string', example: 'Pass@1234' },
                  phone: { type: 'string', example: '+250788123456' },
                  department: { type: 'string', example: 'Facilities' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          409: { description: 'Email already exists' },
          422: { description: 'Validation error' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@twzltd.com' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns JWT token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/logout': {
      post: { tags: ['Authentication'], summary: 'Logout', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Logged out' } } },
    },
    '/api/auth/forgot-password': {
      post: { tags: ['Authentication'], summary: 'Request password reset email', responses: { 200: { description: 'Reset link sent' } } },
    },
    '/api/auth/reset-password': {
      post: { tags: ['Authentication'], summary: 'Reset password with token', responses: { 200: { description: 'Password reset' } } },
    },
    '/api/users/profile': {
      get: { tags: ['Users'], summary: 'Get own profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile data' } } },
      put: { tags: ['Users'], summary: 'Update own profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Profile updated' } } },
    },
    '/api/users/profile/password': {
      put: { tags: ['Users'], summary: 'Change password', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Password changed' } } },
    },
    '/api/users': {
      get: { tags: ['Users'], summary: 'List all users (Admin only)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated users list' } } },
    },
    '/api/extinguishers': {
      get: {
        tags: ['Extinguishers'],
        summary: 'List all extinguishers (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          { in: 'query', name: 'search', schema: { type: 'string' } },
          { in: 'query', name: 'status', schema: { type: 'string', enum: ['Active', 'Inactive', 'Expired', 'Under Maintenance'] } },
          { in: 'query', name: 'type', schema: { type: 'string', enum: ['Water', 'CO2', 'Foam', 'Dry Chemical'] } },
        ],
        responses: { 200: { description: 'Paginated extinguishers list' } },
      },
      post: {
        tags: ['Extinguishers'],
        summary: 'Register new extinguisher (Admin/Inspector)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Extinguisher registered' } },
      },
    },
    '/api/extinguishers/{id}': {
      get: { tags: ['Extinguishers'], summary: 'Get extinguisher by ID', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Extinguisher details' } } },
      put: { tags: ['Extinguishers'], summary: 'Update extinguisher', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Extinguishers'], summary: 'Delete extinguisher (Admin)', security: [{ bearerAuth: [] }], parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/extinguishers/stats': {
      get: { tags: ['Extinguishers'], summary: 'Dashboard stats', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Statistics' } } },
    },
    '/api/inspections': {
      get: { tags: ['Inspections'], summary: 'List inspections', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated list' } } },
      post: { tags: ['Inspections'], summary: 'Schedule inspection', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Inspection scheduled' } } },
    },
    '/api/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List maintenance logs', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated logs' } } },
      post: { tags: ['Maintenance'], summary: 'Log maintenance action (Inspector/Admin)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Logged' } } },
    },
    '/api/reports/overview': {
      get: { tags: ['Reports'], summary: 'Overall system report', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'period', schema: { type: 'string', enum: ['daily', 'monthly', 'yearly', 'all'], default: 'all' } }], responses: { 200: { description: 'Report data' } } },
    },
    '/api/reports/export/pdf': {
      get: { tags: ['Reports'], summary: 'Export report as PDF', security: [{ bearerAuth: [] }], responses: { 200: { description: 'PDF file download', content: { 'application/pdf': {} } } } },
    },
    '/api/reports/export/csv': {
      get: { tags: ['Reports'], summary: 'Export data as CSV', security: [{ bearerAuth: [] }], parameters: [{ in: 'query', name: 'type', schema: { type: 'string', enum: ['extinguishers', 'inspections', 'maintenance'], default: 'extinguishers' } }], responses: { 200: { description: 'CSV file download' } } },
    },
  },
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: '.swagger-ui .topbar { background-color: #c0392b; }',
  customSiteTitle: 'FEMS API Documentation',
}));

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      user: SERVICES.USER,
      extinguisher: SERVICES.EXTINGUISHER,
      inspection: SERVICES.INSPECTION,
      reporting: SERVICES.REPORTING,
    },
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'FEMS API Gateway',
    version: '1.0.0',
    docs: `/api/docs`,
    health: `/health`,
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
