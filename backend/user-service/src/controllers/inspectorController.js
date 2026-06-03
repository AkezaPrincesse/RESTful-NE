const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const logger = require('../config/logger');
const { sendEmail, inspectorInviteEmail } = require('../config/email');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const nums  = '23456789';
  const spec  = '@$!%*?&';
  const pick  = (s) => s[Math.floor(Math.random() * s.length)];
  return [pick(upper), pick(upper), pick(lower), pick(lower), pick(nums), pick(nums), pick(spec), pick(lower)]
    .sort(() => Math.random() - 0.5)
    .join('');
}

exports.createInspector = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, department } = req.body;

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    const result = await pool.query(
      `INSERT INTO users
         (first_name, last_name, email, password_hash, role, phone, department, first_login, status, created_by)
       VALUES ($1,$2,$3,$4,'inspector',$5,$6,true,'pending',$7)
       RETURNING id, first_name, last_name, email, role, phone, department, status, first_login, created_at`,
      [first_name, last_name, email.toLowerCase(), password_hash, phone || null, department || null, req.user.id]
    );

    const inspector = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
       VALUES ($1,'create_inspector','user',$2,$3,$4)`,
      [req.user.id, inspector.id, JSON.stringify({ email, role: 'inspector' }), req.ip]
    );

    try {
      const { subject, html } = inspectorInviteEmail({
        firstName: first_name, lastName: last_name,
        email: email.toLowerCase(), tempPassword,
        loginUrl: `${FRONTEND_URL}/login`,
      });
      await sendEmail({ to: email.toLowerCase(), subject, html });

      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
         VALUES ($1,'send_invitation','user',$2,$3)`,
        [req.user.id, inspector.id, req.ip]
      );
    } catch (emailErr) {
      logger.error('Inspector invite email failed:', emailErr.message);
    }

    logger.info(`Inspector created: ${email} by admin ${req.user.id}`);
    res.status(201).json({
      success: true,
      message: 'Inspector created and invitation sent',
      data: { inspector },
    });
  } catch (error) {
    logger.error('Create inspector error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInspectors = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [`%${search}%`];
    let where = `role = 'inspector' AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)`;
    if (status) { params.push(status); where += ` AND status = $${params.length}`; }

    const countRes = await pool.query(`SELECT COUNT(*) FROM users WHERE ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department,
              u.is_active, u.status, u.first_login, u.created_at,
              cb.first_name || ' ' || cb.last_name AS created_by_name
       FROM users u
       LEFT JOIN users cb ON cb.id = u.created_by
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: {
        inspectors: result.rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    logger.error('Get inspectors error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getInspectorById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department,
              u.is_active, u.status, u.first_login, u.created_at, u.updated_at,
              cb.first_name || ' ' || cb.last_name AS created_by_name
       FROM users u
       LEFT JOIN users cb ON cb.id = u.created_by
       WHERE u.id = $1 AND u.role = 'inspector'`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Inspector not found' });

    const inspections = await pool.query(
      `SELECT i.id, i.scheduled_date, i.status, i.inspection_type, i.priority,
              e.serial_number, e.location
       FROM inspections i JOIN extinguishers e ON e.id = i.extinguisher_id
       WHERE i.assigned_inspector = $1
       ORDER BY i.scheduled_date DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({ success: true, data: { inspector: result.rows[0], inspections: inspections.rows } });
  } catch (error) {
    logger.error('Get inspector error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateInspector = async (req, res) => {
  try {
    const { first_name, last_name, phone, department, is_active } = req.body;
    const { id } = req.params;

    const exists = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'inspector'", [id]);
    if (!exists.rows[0]) return res.status(404).json({ success: false, message: 'Inspector not found' });

    const result = await pool.query(
      `UPDATE users SET
         first_name  = COALESCE($1, first_name),
         last_name   = COALESCE($2, last_name),
         phone       = COALESCE($3, phone),
         department  = COALESCE($4, department),
         is_active   = COALESCE($5, is_active),
         status      = CASE WHEN $5 = false THEN 'inactive' WHEN $5 = true AND status = 'inactive' THEN 'active' ELSE status END
       WHERE id = $6
       RETURNING id, first_name, last_name, email, phone, department, is_active, status`,
      [first_name, last_name, phone, department, is_active, id]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1,'update_inspector','user',$2,$3)`,
      [req.user.id, id, req.ip]
    );

    res.json({ success: true, message: 'Inspector updated', data: { inspector: result.rows[0] } });
  } catch (error) {
    logger.error('Update inspector error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteInspector = async (req, res) => {
  try {
    const { id } = req.params;
    const exists = await pool.query("SELECT id, email FROM users WHERE id = $1 AND role = 'inspector'", [id]);
    if (!exists.rows[0]) return res.status(404).json({ success: false, message: 'Inspector not found' });

    await pool.query('UPDATE users SET is_active = false, status = $1 WHERE id = $2', ['inactive', id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1,'deactivate_inspector','user',$2,$3)`,
      [req.user.id, id, req.ip]
    );

    res.json({ success: true, message: 'Inspector deactivated' });
  } catch (error) {
    logger.error('Delete inspector error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const inspector = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND role = 'inspector'", [id]
    );
    if (!inspector.rows[0]) return res.status(404).json({ success: false, message: 'Inspector not found' });

    const { first_name, last_name, email } = inspector.rows[0];
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(tempPassword, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, first_login = true, status = $2 WHERE id = $3',
      [password_hash, 'pending', id]
    );

    const { subject, html } = inspectorInviteEmail({
      firstName: first_name, lastName: last_name,
      email, tempPassword, loginUrl: `${FRONTEND_URL}/login`,
    });
    await sendEmail({ to: email, subject, html });

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1,'resend_invitation','user',$2,$3)`,
      [req.user.id, id, req.ip]
    );

    res.json({ success: true, message: 'Invitation resent with new temporary password' });
  } catch (error) {
    logger.error('Resend invitation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
