require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const { authenticate, authorize } = require('./middleware/auth');
const reportCtrl = require('./controllers/reportController');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json({ limit: '10kb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

const swaggerDoc = {
  openapi: '3.0.0',
  info: { title: 'FEMS Reporting Service API', version: '1.0.0' },
  servers: [{ url: `http://localhost:${PORT}` }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
};
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Report routes
app.get('/api/reports/overview', authenticate, reportCtrl.getOverallReport);
app.get('/api/reports/maintenance-history', authenticate, reportCtrl.getMaintenanceHistory);
app.get('/api/reports/stock', authenticate, reportCtrl.getStockReport);
app.get('/api/reports/export/pdf', authenticate, authorize('admin', 'inspector'), reportCtrl.exportReportPDF);
app.get('/api/reports/export/csv', authenticate, authorize('admin', 'inspector'), reportCtrl.exportReportCSV);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reporting-service', timestamp: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Reporting Service running on port ${PORT}`);
});

module.exports = app;
