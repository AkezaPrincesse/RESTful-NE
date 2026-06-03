const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const pool = require('../config/db');
const logger = require('../config/logger');

const getDateFilter = (period) => {
  const now = new Date();
  switch (period) {
    case 'daily':   return new Date(now.setDate(now.getDate() - 1));
    case 'monthly': return new Date(now.setMonth(now.getMonth() - 1));
    case 'yearly':  return new Date(now.setFullYear(now.getFullYear() - 1));
    default:        return new Date(0);
  }
};

exports.getOverallReport = async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const since = period !== 'all' ? getDateFilter(period) : new Date(0);

    const [extStats, inspStats, maintStats, expiredStats, byType, byLocation, overdueInspections] =
      await Promise.all([
        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'Active') AS active,
            COUNT(*) FILTER (WHERE status = 'Expired' OR expiry_date < CURRENT_DATE) AS expired,
            COUNT(*) FILTER (WHERE status = 'Under Maintenance') AS under_maintenance,
            COUNT(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_soon,
            COUNT(*) FILTER (WHERE created_at >= $1) AS added_in_period
          FROM extinguishers`, [since]),

        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed,
            COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
            COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE created_at >= $1) AS in_period
          FROM inspections`, [since]),

        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE result = 'pass') AS passed,
            COUNT(*) FILTER (WHERE result = 'fail') AS failed,
            COUNT(*) FILTER (WHERE result = 'needs_attention') AS needs_attention,
            COALESCE(SUM(cost), 0) AS total_cost,
            COUNT(*) FILTER (WHERE action_date >= $1) AS in_period
          FROM maintenance_logs`, [since]),

        pool.query(`
          SELECT serial_number, location, type, size, expiry_date,
                 expiry_date - CURRENT_DATE AS days_until_expiry
          FROM extinguishers
          WHERE expiry_date < CURRENT_DATE OR expiry_date <= CURRENT_DATE + INTERVAL '30 days'
          ORDER BY expiry_date ASC`),

        pool.query('SELECT type, COUNT(*) AS count FROM extinguishers GROUP BY type ORDER BY count DESC'),

        pool.query(`
          SELECT location, COUNT(*) AS count FROM extinguishers GROUP BY location ORDER BY count DESC LIMIT 10`),

        pool.query(`
          SELECT i.*, e.serial_number, e.location,
                 u.first_name || ' ' || u.last_name AS inspector_name
          FROM inspections i
          LEFT JOIN extinguishers e ON i.extinguisher_id = e.id
          LEFT JOIN users u ON i.assigned_inspector = u.id
          WHERE i.scheduled_date < CURRENT_TIMESTAMP AND i.status NOT IN ('completed','cancelled')
          ORDER BY i.scheduled_date ASC LIMIT 20`),
      ]);

    res.json({
      success: true,
      data: {
        period,
        generated_at: new Date().toISOString(),
        extinguishers: extStats.rows[0],
        inspections: inspStats.rows[0],
        maintenance: maintStats.rows[0],
        expired_and_expiring: expiredStats.rows,
        by_type: byType.rows,
        by_location: byLocation.rows,
        overdue_inspections: overdueInspections.rows,
      },
    });
  } catch (error) {
    logger.error('Overall report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMaintenanceHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM maintenance_logs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.*, e.serial_number, e.location, e.type AS ext_type,
              u.first_name || ' ' || u.last_name AS technician_name
       FROM maintenance_logs m
       LEFT JOIN extinguishers e ON m.extinguisher_id = e.id
       LEFT JOIN users u ON m.performed_by = u.id
       ORDER BY m.action_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Maintenance history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.exportReportPDF = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.serial_number, e.location, e.type, e.size, e.status,
             e.installation_date, e.expiry_date, e.last_inspection_date,
             e.next_inspection_date,
             CASE WHEN e.expiry_date < CURRENT_DATE THEN 'YES' ELSE 'NO' END AS is_expired
      FROM extinguishers e
      ORDER BY e.location, e.serial_number`);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fems-report-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#c0392b').text('TWZ Ltd - Fire Extinguisher Management System', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).fillColor('#333').text('Extinguisher Status Report', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary box
    const active = result.rows.filter(r => r.status === 'Active').length;
    const expired = result.rows.filter(r => r.is_expired === 'YES').length;
    const maintenance = result.rows.filter(r => r.status === 'Under Maintenance').length;

    doc.fontSize(12).fillColor('#333');
    doc.rect(50, doc.y, 495, 70).fillAndStroke('#f8f9fa', '#dee2e6');
    const summaryY = doc.y - 65;
    doc.fillColor('#333').text(`Total Extinguishers: ${result.rows.length}`, 70, summaryY + 10);
    doc.text(`Active: ${active}`, 70, summaryY + 28);
    doc.text(`Expired: ${expired}`, 200, summaryY + 28);
    doc.text(`Under Maintenance: ${maintenance}`, 330, summaryY + 28);
    doc.moveDown(3);

    // Table header
    const tableY = doc.y;
    const cols = [50, 145, 270, 340, 400, 460];
    const headers = ['Serial #', 'Location', 'Type', 'Status', 'Expiry', 'Expired?'];

    doc.rect(50, tableY, 495, 20).fill('#c0392b');
    doc.fontSize(9).fillColor('white');
    headers.forEach((h, i) => doc.text(h, cols[i], tableY + 5, { width: cols[i + 1] ? cols[i + 1] - cols[i] - 5 : 80 }));

    // Table rows
    result.rows.forEach((row, idx) => {
      const y = tableY + 20 + idx * 18;
      if (idx % 2 === 0) doc.rect(50, y, 495, 18).fill('#f8f9fa');
      doc.fillColor(row.is_expired === 'YES' ? '#c0392b' : '#333').fontSize(8);
      doc.text(row.serial_number, cols[0], y + 4, { width: 90 });
      doc.text(row.location.substring(0, 35), cols[1], y + 4, { width: 120 });
      doc.text(row.type, cols[2], y + 4, { width: 65 });
      doc.text(row.status, cols[3], y + 4, { width: 55 });
      doc.text(row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : 'N/A', cols[4], y + 4, { width: 55 });
      doc.text(row.is_expired, cols[5], y + 4, { width: 40 });
      if (y > 700) doc.addPage();
    });

    doc.end();
  } catch (error) {
    logger.error('Export PDF error:', error);
    res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
};

exports.exportReportCSV = async (req, res) => {
  try {
    const type = req.query.type || 'extinguishers';
    let rows, fields;

    if (type === 'maintenance') {
      const result = await pool.query(`
        SELECT m.id, e.serial_number, e.location, m.action_taken, m.action_date,
               m.conditions_noted, m.pressure_reading, m.result, m.cost,
               u.first_name || ' ' || u.last_name AS technician
        FROM maintenance_logs m
        LEFT JOIN extinguishers e ON m.extinguisher_id = e.id
        LEFT JOIN users u ON m.performed_by = u.id
        ORDER BY m.action_date DESC`);
      rows = result.rows;
      fields = ['id', 'serial_number', 'location', 'action_taken', 'action_date',
                'conditions_noted', 'pressure_reading', 'result', 'cost', 'technician'];
    } else if (type === 'inspections') {
      const result = await pool.query(`
        SELECT i.id, e.serial_number, e.location, i.inspection_type, i.scheduled_date,
               i.status, i.priority,
               u1.first_name || ' ' || u1.last_name AS scheduled_by,
               u2.first_name || ' ' || u2.last_name AS inspector
        FROM inspections i
        LEFT JOIN extinguishers e ON i.extinguisher_id = e.id
        LEFT JOIN users u1 ON i.scheduled_by = u1.id
        LEFT JOIN users u2 ON i.assigned_inspector = u2.id
        ORDER BY i.scheduled_date DESC`);
      rows = result.rows;
      fields = ['id', 'serial_number', 'location', 'inspection_type', 'scheduled_date',
                'status', 'priority', 'scheduled_by', 'inspector'];
    } else {
      const result = await pool.query(`
        SELECT e.serial_number, e.location, e.type, e.size, e.status,
               e.installation_date, e.expiry_date, e.last_inspection_date, e.next_inspection_date,
               CASE WHEN e.expiry_date < CURRENT_DATE THEN 'Yes' ELSE 'No' END AS expired
        FROM extinguishers e ORDER BY e.location, e.serial_number`);
      rows = result.rows;
      fields = ['serial_number', 'location', 'type', 'size', 'status',
                'installation_date', 'expiry_date', 'last_inspection_date', 'next_inspection_date', 'expired'];
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="fems-${type}-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Export CSV error:', error);
    res.status(500).json({ success: false, message: 'CSV generation failed' });
  }
};

exports.getStockReport = async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    const dateFormat = period === 'daily' ? 'YYYY-MM-DD' : period === 'monthly' ? 'YYYY-MM' : 'YYYY';
    const truncPeriod = period === 'daily' ? 'day' : period === 'monthly' ? 'month' : 'year';

    const result = await pool.query(`
      SELECT
        DATE_TRUNC('${truncPeriod}', created_at)::date AS period,
        COUNT(*) AS total_added,
        COUNT(*) FILTER (WHERE status = 'Active') AS active_added,
        COUNT(*) FILTER (WHERE status = 'Expired') AS expired_added
      FROM extinguishers
      GROUP BY DATE_TRUNC('${truncPeriod}', created_at)
      ORDER BY period DESC LIMIT 24`);

    res.json({ success: true, data: { period, stock_trends: result.rows } });
  } catch (error) {
    logger.error('Stock report error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
