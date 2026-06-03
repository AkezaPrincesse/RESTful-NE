const pool = require('../config/db');
const logger = require('../config/logger');

exports.scheduleInspection = async (req, res) => {
  try {
    const {
      extinguisher_id, assigned_inspector, scheduled_date,
      inspection_type, priority, notes
    } = req.body;

    // Verify extinguisher exists
    const ext = await pool.query('SELECT id, serial_number, location FROM extinguishers WHERE id = $1', [extinguisher_id]);
    if (!ext.rows[0]) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    // Verify inspector exists if assigned
    if (assigned_inspector) {
      const inspector = await pool.query(
        "SELECT id FROM users WHERE id = $1 AND role IN ('inspector', 'admin')", [assigned_inspector]
      );
      if (!inspector.rows[0]) {
        return res.status(404).json({ success: false, message: 'Inspector not found or invalid role' });
      }
    }

    const result = await pool.query(
      `INSERT INTO inspections
         (extinguisher_id, scheduled_by, assigned_inspector, scheduled_date, inspection_type, priority, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [extinguisher_id, req.user.id, assigned_inspector || null, scheduled_date,
       inspection_type || 'routine', priority || 'normal', notes || null]
    );

    // Create notification for inspector
    if (assigned_inspector) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_entity, related_id)
         VALUES ($1, $2, $3, 'info', 'inspection', $4)`,
        [
          assigned_inspector,
          'New Inspection Scheduled',
          `You have been assigned to inspect extinguisher ${ext.rows[0].serial_number} at ${ext.rows[0].location} on ${new Date(scheduled_date).toLocaleDateString()}`,
          result.rows[0].id,
        ]
      );
    }

    // Update extinguisher next inspection date
    await pool.query(
      'UPDATE extinguishers SET next_inspection_date = $1 WHERE id = $2',
      [scheduled_date, extinguisher_id]
    );

    logger.info(`Inspection scheduled: ${result.rows[0].id} for extinguisher ${extinguisher_id}`);
    res.status(201).json({ success: true, message: 'Inspection scheduled', data: { inspection: result.rows[0] } });
  } catch (error) {
    logger.error('Schedule inspection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllInspections = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const inspectorId = req.query.inspector_id || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND i.status = $${paramCount}`;
      params.push(status);
    }
    if (inspectorId) {
      paramCount++;
      whereClause += ` AND i.assigned_inspector = $${paramCount}`;
      params.push(inspectorId);
    }
    // Inspectors can only see their own assignments
    if (req.user.role === 'inspector') {
      paramCount++;
      whereClause += ` AND i.assigned_inspector = $${paramCount}`;
      params.push(req.user.id);
    }

    const baseQuery = `
      SELECT i.*,
             e.serial_number, e.location, e.type AS ext_type,
             u1.first_name || ' ' || u1.last_name AS scheduled_by_name,
             u2.first_name || ' ' || u2.last_name AS inspector_name
      FROM inspections i
      LEFT JOIN extinguishers e ON i.extinguisher_id = e.id
      LEFT JOIN users u1 ON i.scheduled_by = u1.id
      LEFT JOIN users u2 ON i.assigned_inspector = u2.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${baseQuery}) AS t`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `${baseQuery} ORDER BY i.scheduled_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        inspections: result.rows,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get all inspections error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInspectionById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*,
              e.serial_number, e.location, e.type AS ext_type, e.size, e.status AS ext_status,
              u1.first_name || ' ' || u1.last_name AS scheduled_by_name,
              u2.first_name || ' ' || u2.last_name AS inspector_name
       FROM inspections i
       LEFT JOIN extinguishers e ON i.extinguisher_id = e.id
       LEFT JOIN users u1 ON i.scheduled_by = u1.id
       LEFT JOIN users u2 ON i.assigned_inspector = u2.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, data: { inspection: result.rows[0] } });
  } catch (error) {
    logger.error('Get inspection by id error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateInspection = async (req, res) => {
  try {
    const { scheduled_date, assigned_inspector, status, priority, notes, inspection_type } = req.body;

    const existing = await pool.query('SELECT * FROM inspections WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    const result = await pool.query(
      `UPDATE inspections SET
         scheduled_date = COALESCE($1, scheduled_date),
         assigned_inspector = COALESCE($2, assigned_inspector),
         status = COALESCE($3, status),
         priority = COALESCE($4, priority),
         notes = COALESCE($5, notes),
         inspection_type = COALESCE($6, inspection_type)
       WHERE id = $7
       RETURNING *`,
      [scheduled_date, assigned_inspector, status, priority, notes, inspection_type, req.params.id]
    );

    res.json({ success: true, message: 'Inspection updated', data: { inspection: result.rows[0] } });
  } catch (error) {
    logger.error('Update inspection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.cancelInspection = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE inspections SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    res.json({ success: true, message: 'Inspection cancelled' });
  } catch (error) {
    logger.error('Cancel inspection error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Maintenance logs
exports.logMaintenance = async (req, res) => {
  try {
    const {
      extinguisher_id, inspection_id, action_taken, action_date,
      conditions_noted, pressure_reading, weight_reading, seal_intact,
      pin_intact, label_readable, physical_damage, result: mainResult,
      next_service_date, cost, parts_replaced
    } = req.body;

    // Verify extinguisher
    const ext = await pool.query('SELECT id FROM extinguishers WHERE id = $1', [extinguisher_id]);
    if (!ext.rows[0]) {
      return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    }

    const result = await pool.query(
      `INSERT INTO maintenance_logs
         (extinguisher_id, inspection_id, performed_by, action_taken, action_date,
          conditions_noted, pressure_reading, weight_reading, seal_intact,
          pin_intact, label_readable, physical_damage, result, next_service_date, cost, parts_replaced)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [extinguisher_id, inspection_id || null, req.user.id, action_taken, action_date,
       conditions_noted, pressure_reading, weight_reading, seal_intact,
       pin_intact, label_readable, physical_damage || false, mainResult || 'pass',
       next_service_date, cost, parts_replaced]
    );

    // Update extinguisher last inspection date
    await pool.query(
      'UPDATE extinguishers SET last_inspection_date = $1 WHERE id = $2',
      [action_date, extinguisher_id]
    );

    // Mark inspection as completed if linked
    if (inspection_id) {
      await pool.query(
        "UPDATE inspections SET status = 'completed' WHERE id = $1",
        [inspection_id]
      );
    }

    logger.info(`Maintenance logged for extinguisher ${extinguisher_id} by ${req.user.email}`);
    res.status(201).json({ success: true, message: 'Maintenance logged', data: { log: result.rows[0] } });
  } catch (error) {
    logger.error('Log maintenance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMaintenanceLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const extinguisherId = req.query.extinguisher_id || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (extinguisherId) {
      paramCount++;
      whereClause += ` AND m.extinguisher_id = $${paramCount}`;
      params.push(extinguisherId);
    }

    const baseQuery = `
      SELECT m.*,
             e.serial_number, e.location,
             u.first_name || ' ' || u.last_name AS technician_name
      FROM maintenance_logs m
      LEFT JOIN extinguishers e ON m.extinguisher_id = e.id
      LEFT JOIN users u ON m.performed_by = u.id
      ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${baseQuery}) AS t`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `${baseQuery} ORDER BY m.action_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    res.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    logger.error('Get maintenance logs error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMaintenanceLogById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, e.serial_number, e.location, u.first_name || ' ' || u.last_name AS technician_name
       FROM maintenance_logs m
       LEFT JOIN extinguishers e ON m.extinguisher_id = e.id
       LEFT JOIN users u ON m.performed_by = u.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    }
    res.json({ success: true, data: { log: result.rows[0] } });
  } catch (error) {
    logger.error('Get maintenance log error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
