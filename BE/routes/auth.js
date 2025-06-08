const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../dbSingleton');
const { generateToken, sendVerificationEmail, sendResetEmail } = require('../utils/tokenUtils');
const { v4: uuidv4 } = require('uuid');

// Helper function to check token expiration
const isTokenExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
};

// Helper function to verify token
const verifyToken = async (token) => {
    const conn = db.getConnection();
    const [user] = await conn.promise().query(
        'SELECT * FROM users WHERE verification_token = ? AND verification_status = ?',
        [token, 'pending']
    );

    if (!user.length || isTokenExpired(user[0].verification_expires_at)) {
        return null;
    }

    return user[0];
};

// Helper function to generate verification token
const generateVerificationToken = async (userId, email) => {
    const token = generateToken();
    const conn = db.getConnection();
    
    await conn.promise().query(
        'UPDATE users SET verification_token = ?, verification_status = ?, verification_expires_at = ? WHERE id = ?',
        [token, 'pending', new Date(Date.now() + 24 * 60 * 60 * 1000), userId]
    );

    await sendVerificationEmail(email, token);
    return token;
};

// Helper function to generate reset token
const generateResetToken = async (email) => {
    const token = generateToken();
    const conn = db.getConnection();
    
    await conn.promise().query(
        'UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE email = ?',
        [token, new Date(Date.now() + 60 * 60 * 1000), email]
    );

    await sendResetEmail(email, token);
    return token;
};

// Register new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const conn = db.getConnection();
        const [existingUser] = await conn.promise().query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                message: 'Email or username already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await conn.promise().query(
            'INSERT INTO users (username, email, password, verification_status) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, 'pending']
        );

        // Generate verification token
        await generateVerificationToken(result.insertId, email);

        res.status(201).json({
            message: 'User registered successfully. Please check your email for verification.',
            user: {
                id: result.insertId,
                username,
                email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
    const { token } = req.params;
    const user = await verifyToken(token);

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const conn = db.getConnection();
    await conn.promise().query(
        'UPDATE users SET verification_status = ?, email_verified = ? WHERE id = ?',
        ['verified', true, user.id]
    );

    res.json({ message: 'Email verified successfully' });
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const conn = db.getConnection();
        const [user] = await conn.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user.length) {
            return res.status(400).json({ message: 'No user found with this email' });
        }

        await generateResetToken(email);
        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Failed to send password reset email' });
    }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const conn = db.getConnection();
        const [user] = await conn.promise().query(
            'SELECT * FROM users WHERE reset_token = ?',
            [token]
        );

        if (!user.length || isTokenExpired(user[0].reset_token_expires_at)) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await conn.promise().query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
            [hashedPassword, user[0].id]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const conn = db.getConnection();
        const [user] = await conn.promise().query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (!user.length) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user[0].email_verified) {
            return res.status(401).json({ message: 'Please verify your email first' });
        }

        const validPassword = await bcrypt.compare(password, user[0].password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Return user data without password
        const userData = {
            id: user[0].id,
            username: user[0].username,
            email: user[0].email
        };

        res.json({ user: userData });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
});

module.exports = router;
