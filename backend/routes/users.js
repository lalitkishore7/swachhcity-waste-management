const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../database');
const { authenticateToken, authorizeRoles, generateToken } = require('../middleware/auth');

// ─── Email / OTP Setup ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
    },
});

// In-memory OTP stores (email → { otp, expiresAt, ...data })
const signupOtpStore = new Map();
const resetOtpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(to, otp, purpose = 'verification') {
    const subject = purpose === 'reset'
        ? 'SwachhCity – Password Reset OTP'
        : 'SwachhCity – Email Verification OTP';

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0">
            <div style="text-align:center;margin-bottom:24px">
                <span style="font-size:36px">🌿</span>
                <h2 style="color:#065f46;margin:8px 0 0">SwachhCity</h2>
            </div>
            <p style="color:#334155;font-size:15px">Your one-time verification code is:</p>
            <div style="text-align:center;margin:24px 0">
                <span style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:8px;color:#059669;background:#d1fae5;padding:16px 32px;border-radius:12px">${otp}</span>
            </div>
            <p style="color:#64748b;font-size:13px">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"SwachhCity" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html,
    });
}

// ─── POST /api/users/send-otp ────────────────────────────────────────────────
// Step 1 of signup: validate inputs, send OTP, store pending data
router.post('/send-otp', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if email already exists
        const [existing] = await db.query(`SELECT user_id FROM users WHERE email = ?`, [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const otp = generateOtp();
        const validRoles = ['citizen', 'admin', 'worker'];
        const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'citizen';

        signupOtpStore.set(email, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            name,
            password,
            role: userRole,
        });

        await sendOtpEmail(email, otp, 'verification');
        res.json({ message: 'OTP sent to your email', email });
    } catch (err) {
        console.error('Send OTP error:', err.message);
        res.status(500).json({ error: 'Failed to send OTP: ' + err.message });
    }
});

// ─── POST /api/users/verify-otp ──────────────────────────────────────────────
// Step 2 of signup: verify OTP and create account
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }

        const stored = signupOtpStore.get(email);
        if (!stored) {
            return res.status(400).json({ error: 'No OTP request found. Please request a new one.' });
        }
        if (Date.now() > stored.expiresAt) {
            signupOtpStore.delete(email);
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        if (stored.otp !== otp.toString()) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        // OTP valid — create the user
        signupOtpStore.delete(email);

        const hashedPassword = await bcrypt.hash(stored.password, 10);
        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role, is_email_verified) VALUES (?, ?, ?, ?, ?, TRUE)`,
            [stored.name, email, hashedPassword, '0000000000', stored.role]
        );

        const newUser = { id: result.insertId, name: stored.name, email, role: stored.role };
        const token = generateToken(newUser);
        res.status(201).json({ message: 'Account verified and created successfully', user: newUser, token });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// ─── POST /api/users/resend-otp ──────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const stored = signupOtpStore.get(email);
        if (!stored) {
            return res.status(400).json({ error: 'No pending signup found. Please start over.' });
        }

        const otp = generateOtp();
        stored.otp = otp;
        stored.expiresAt = Date.now() + OTP_EXPIRY_MS;
        signupOtpStore.set(email, stored);

        await sendOtpEmail(email, otp, 'verification');
        res.json({ message: 'New OTP sent to your email' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resend OTP: ' + err.message });
    }
});

// ─── POST /api/users/forgot-password ─────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const [rows] = await db.query(`SELECT user_id FROM users WHERE email = ?`, [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        const otp = generateOtp();
        resetOtpStore.set(email, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });

        await sendOtpEmail(email, otp, 'reset');
        res.json({ message: 'Password reset OTP sent to your email' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send reset OTP: ' + err.message });
    }
});

// ─── POST /api/users/reset-password ──────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const stored = resetOtpStore.get(email);
        if (!stored) {
            return res.status(400).json({ error: 'No reset request found. Please request a new OTP.' });
        }
        if (Date.now() > stored.expiresAt) {
            resetOtpStore.delete(email);
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }
        if (stored.otp !== otp.toString()) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        resetOtpStore.delete(email);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(`UPDATE users SET password_hash = ? WHERE email = ?`, [hashedPassword, email]);

        res.json({ message: 'Password reset successfully. You can now login with your new password.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// POST /api/users/signup (legacy direct signup — kept for backward compat)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        const validRoles = ['citizen', 'admin', 'worker'];
        const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'citizen';

        const [existing] = await db.query(`SELECT user_id FROM users WHERE email = ?`, [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userPhone = req.body.mobile || req.body.phone || '0000000000';

        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, userPhone, userRole]
        );

        const newUser = { id: result.insertId, name, email, role: userRole };
        const token = generateToken(newUser);
        res.status(201).json({ message: 'User created successfully', user: newUser, token });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const [rows] = await db.query(`SELECT * FROM users WHERE email = ?`, [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

        const token = generateToken({ id: user.user_id, name: user.name, email: user.email, role: user.role });
        res.json({
            message: 'Login successful',
            user: { id: user.user_id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// GET /api/users/me
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT user_id, name, email, phone, role FROM users WHERE user_id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/profile  – authenticated user updates their own profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, username, mobile, password } = req.body;
        const userId = req.user.id;

        // Build dynamic update
        const updates = [];
        const params = [];

        if (name && name.trim()) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (mobile !== undefined || req.body.phone !== undefined) {
            updates.push('phone = ?');
            params.push((mobile || req.body.phone || '').trim() || null);
        }
        if (password && password.trim()) {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            updates.push('password_hash = ?');
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(userId);
        await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
            params
        );

        // Return updated user
        const [rows] = await db.query(
            `SELECT user_id, name, email, phone, role FROM users WHERE user_id = ?`,
            [userId]
        );
        res.json({ message: 'Profile updated successfully', user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// GET /api/users/workers  – list all workers (admin only) with location
router.get('/workers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    // We will use the worker_performance_view to get worker summaries
    try {
        const [rows] = await db.query(
            `SELECT u.user_id as id, u.name, u.email, w.current_latitude as worker_lat, w.current_longitude as worker_lon,
             w.tasks_pending as assigned_count, w.tasks_completed as resolved_count
             FROM users u JOIN workers w ON u.user_id = w.user_id WHERE u.role = 'worker'`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/workers/:id/location  – worker updates their GPS position
router.put('/workers/:id/location', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'latitude and longitude required' });
        }

        // Workers can only update their own location; admins can update any
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [result] = await db.query(
            `UPDATE workers SET current_latitude = ?, current_longitude = ? WHERE user_id = ?`,
            [parseFloat(latitude), parseFloat(longitude), id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Worker not found' });
        res.json({ message: 'Location updated', id, latitude, longitude });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/worker-tasks/:id – get tasks for a specific worker
router.get('/worker-tasks/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT * FROM complaints WHERE assigned_worker_id = ? AND status != 'resolved' ORDER BY priority_score DESC`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
