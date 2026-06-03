const pool = require('../config/db');
const logger = require('../config/logger');

exports.createExtinguisher = async (req, res) => {
  try {
    const {
      serial_number, location, type, size, installation_date,
      expiry_date, status, manufacturer, model, notes, next_inspection_date
    } = req.body;

    const existing = await pool.query(
      'SELECT id FROM extinguishers WHERE serial_number = $1', [serial_number]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Serial number already exists' });
    }

    const result = await pool.query(
      `INSERT INTO extinguishers
         (serial_number, location, type, size, installation_date, expiry_date, status,
          manufacturer, model, notes, next_inspection_date, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [serial_number, location, type, size, installation_date, expiry_date,
       status || 'Active', manufacturer, model, notes, next_inspection_date, req.user.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
       VALUES ($1,'create','extinguisher',$2,$3,$4)`,
      [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
    );

    logger.info(`Extinguisher created: ${serial_number} by ${req.user.email}`);
    res.status(201).json({ success: true, message: 'Extinguisher registered', data: { extinguisher: result.rows[0] } });
  } catch (error) {
    logger.error('Create extinguisher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllExtinguishers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const type = req.query.type || '';
    const location = req.query.location || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += ` AND (e.serial_number ILIKE $${paramCount} OR e.location ILIKE $${paramCount} OR e.manufacturer ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    if (status) {
      paramCount++;
      whereClause += ` AND e.status = $${paramCount}`;
      params.push(status);
    }
    if (type) {
      paramCount++;
      whereClause += ` AND e.type = $${paramCount}`;
      params.push(type);
    }
    if (location) {
      paramCount++;
      whereClause += ` AND e.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    const query = `
      SELECT e.*,
             u.first_name || ' ' || u.last_name AS registered_by_name,
             CASE WHEN e.expiry_date < CURRENT_DATE THEN true ELSE false END AS is_expired,
             CASE WHEN e.next_inspection_date < CURRENT_DATE THEN true ELSE false END AS inspection_overdue
      FROM extinguishers e
      LEFT JOIN users u ON e.registered_by = u.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countResult.rows[0].count);

    const fullQuery = `${query} ORDER BY e.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(fullQuery, params);

    res.json({
      success: true,
      data: {
        extinguishers: result.rows,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get all extinguishers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getExtinguisherById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*,
              u.first_name || ' ' || u.last_name AS registered_by_name,
              CASE WHEN e.expiry_date < CURRENT_DATE THEN true ELSE false END AS is_expired
       FROM extinguishers e
       LEFT JOIN users u ON e.registered_by = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    // Get recent inspections
    const inspections = await pool.query(
      `SELECT i.*, u.first_name || ' ' || u.last_name AS inspector_name
       FROM inspections i
       LEFT JOIN users u ON i.assigned_inspector = u.id
       WHERE i.extinguisher_id = $1
       ORDER BY i.scheduled_date DESC LIMIT 5`,
      [req.params.id]
    );

    // Get recent maintenance logs
    const maintenance = await pool.query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS technician_name
       FROM maintenance_logs m
       LEFT JOIN users u ON m.performed_by = u.id
       WHERE m.extinguisher_id = $1
       ORDER BY m.action_date DESC LIMIT 5`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        extinguisher: result.rows[0],
        recent_inspections: inspections.rows,
        recent_maintenance: maintenance.rows,
      },
    });
  } catch (error) {
    logger.error('Get extinguisher by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateExtinguisher = async (req, res) => {
  try {
    const {
      location, type, size, installation_date, expiry_date,
      status, manufacturer, model, notes, next_inspection_date
    } = req.body;

    const existing = await pool.query('SELECT * FROM extinguishers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    const result = await pool.query(
      `UPDATE extinguishers SET
         location = COALESCE($1, location),
         type = COALESCE($2, type),
         size = COALESCE($3, size),
         installation_date = COALESCE($4, installation_date),
         expiry_date = COALESCE($5, expiry_date),
         status = COALESCE($6, status),
         manufacturer = COALESCE($7, manufacturer),
         model = COALESCE($8, model),
         notes = COALESCE($9, notes),
         next_inspection_date = COALESCE($10, next_inspection_date)
       WHERE id = $11
       RETURNING *`,
      [location, type, size, installation_date, expiry_date, status,
       manufacturer, model, notes, next_inspection_date, req.params.id]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1,'update','extinguisher',$2,$3,$4,$5)`,
      [req.user.id, req.params.id, JSON.stringify(existing.rows[0]), JSON.stringify(result.rows[0]), req.ip]
    );

    res.json({ success: true, message: 'Extinguisher updated', data: { extinguisher: result.rows[0] } });
  } catch (error) {
    logger.error('Update extinguisher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteExtinguisher = async (req, res) => {
  try {
    const existing = await pool.query('SELECT id FROM extinguishers WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    await pool.query('DELETE FROM extinguishers WHERE id = $1', [req.params.id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES ($1,'delete','extinguisher',$2,$3)`,
      [req.user.id, req.params.id, req.ip]
    );

    res.json({ success: true, message: 'Extinguisher removed successfully' });
  } catch (error) {
    logger.error('Delete extinguisher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'Active') AS active,
        COUNT(*) FILTER (WHERE status = 'Expired' OR expiry_date < CURRENT_DATE) AS expired,
        COUNT(*) FILTER (WHERE status = 'Under Maintenance') AS under_maintenance,
        COUNT(*) FILTER (WHERE status = 'Inactive') AS inactive,
        COUNT(*) FILTER (WHERE next_inspection_date < CURRENT_DATE AND status = 'Active') AS inspection_overdue,
        COUNT(*) FILTER (WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_soon
      FROM extinguishers
    `);

    const byType = await pool.query(`
      SELECT type, COUNT(*) AS count FROM extinguishers GROUP BY type ORDER BY count DESC
    `);

    const byStatus = await pool.query(`
      SELECT status, COUNT(*) AS count FROM extinguishers GROUP BY status
    `);

    const recentActivity = await pool.query(`
      SELECT e.serial_number, e.location, e.status, e.updated_at
      FROM extinguishers e
      ORDER BY e.updated_at DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        summary: stats.rows[0],
        by_type: byType.rows,
        by_status: byStatus.rows,
        recent_activity: recentActivity.rows,
      },
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
