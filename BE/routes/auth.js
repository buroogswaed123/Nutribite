const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../dbSingleton');
const { generateToken, sendResetEmail } = require('../utils/tokenUtils');
const { v4: uuidv4 } = require('uuid');

// Helper function to check token expiration
const isTokenExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
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
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        res.status(201).json({
            message: 'User registered successfully',
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
