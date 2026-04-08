const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// ─────────────────────────────────────────────
//  REGISTER  →  POST /api/auth/register
// ─────────────────────────────────────────────
const register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone, role } = req.body;

        // 1. Check all required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email and password are required.' });
        }

        // 2. Check if email or username already exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email or username already taken.' });
        }

        // 3. Hash the password (never store plain text!)
        const password_hash = await bcrypt.hash(password, 10);
        // 10 = "salt rounds" — how many times to scramble. 10 is standard.

        // 4. Insert new user into DB
        const [result] = await db.query(
            `INSERT INTO users (username, email, password_hash, full_name, phone, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, password_hash, full_name || null, phone || null, role || 'buyer']
        );

        // 5. Create JWT token so they're instantly logged in
        const token = jwt.sign(
            { id: result.insertId, username, role: role || 'buyer' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: { id: result.insertId, username, email, role: role || 'buyer' }
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};


// ─────────────────────────────────────────────
//  LOGIN  →  POST /api/auth/login
// ─────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // 2. Find user by email
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];

        // 3. Compare password with stored hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 4. Create JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
};


// ─────────────────────────────────────────────
//  GET ME  →  GET /api/auth/me
//  Returns the currently logged-in user's info
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, full_name, phone, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user: users[0] });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};


module.exports = { register, login, getMe };
