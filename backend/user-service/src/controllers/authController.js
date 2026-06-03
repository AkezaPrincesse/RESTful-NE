const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const logger = require('../config/logger');
const { sendEmail, passwordResetEmail } = require('../config/email');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, department, role } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const assignedRole = req.user?.role === 'admin' ? (role || 'user') : 'user';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, phone, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, role, phone, department, created_at`,
      [first_name, last_name, email.toLowerCase(), password_hash, assignedRole, phone || null, department || null]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
       VALUES ($1, 'register', 'user', $2, $3, $4)`,
      [result.rows[0].id, result.rows[0].id, JSON.stringify({ email, role: assignedRole }), req.ip]
    );

    logger.info(`New user registered: ${email}`);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: result.rows[0] },
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, 'login', 'user', $2, $3)`,
      [user.id, user.id, req.ip]
    );

    logger.info(`User logged in: ${email}`);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          department: user.department,
          first_login: user.first_login,
          status: user.status,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address)
       VALUES ($1, 'logout', 'user', $2, $3)`,
      [req.user.id, req.user.id, req.ip]
    );
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    const { accessToken, refreshToken } = generateTokens(result.rows[0].id, result.rows[0].role);
    res.json({ success: true, data: { accessToken, refreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always return success to prevent email enumeration
    if (!result.rows[0]) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, result.rows[0].id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmail({ firstName: result.rows[0].first_name, resetUrl });
    try { await sendEmail({ to: email.toLowerCase(), subject, html }); } catch (e) { logger.error('Reset email failed:', e.message); }

    res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
      // Only expose token in dev mode
      ...(process.env.NODE_ENV === 'development' && { reset_token: token }),
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, department } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, phone, department)
       VALUES ($1, $2, $3, $4, 'admin', $5, $6)
       RETURNING id, first_name, last_name, email, role, phone, department, created_at`,
      [first_name, last_name, email.toLowerCase(), password_hash, phone || null, department || null]
    );

    logger.info(`Admin created: ${email}`);
    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: { user: result.rows[0] },
    });
  } catch (error) {
    logger.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [password_hash, result.rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
