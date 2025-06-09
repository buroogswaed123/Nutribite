const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const nodemailer = require('nodemailer');

// Generate a secure session secret
const generateSecret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const app = express();

// Security middleware
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src 'self'");
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nutribite_db'
});

// Initialize database
const initDatabase = () => {
  // Add reset_code and reset_code_expires columns if they don't exist
  const addColumnsQuery = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS reset_code VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_code_expires DATETIME
  `;

  db.query(addColumnsQuery, (err) => {
    if (err) {
      console.error('Error adding columns:', err);
      return;
    }
    console.log('Database initialized successfully');
  });
};

// Initialize database when server starts
initDatabase();

// Test database connection
try {
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      console.error('Database connection error details:', {
        code: err.code,
        errno: err.errno,
        sqlMessage: err.sqlMessage
      });
      return;
    }
    
    // Test query to verify connection
    db.query('SELECT 1', (err, results) => {
      if (err) {
        console.error('Error executing test query:', err);
        console.error('Test query error details:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return;
      }
      console.log('Database connection successful');
      console.log('Test query results:', results);
    });
  });
} catch (err) {
  console.error('Database connection error:', err);
  console.error('Connection error details:', {
    code: err.code,
    errno: err.errno,
    sqlMessage: err.sqlMessage
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: generateSecret(),
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Change to true in production
    httpOnly: true,
    maxAge: 1000 * 60 * 30, // 30 minutes
    sameSite: 'strict'
  }
}));

// API routes
app.post('/api/login', (req, res) => {
  console.log('Login endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  console.log('Login request received:', { email });
  console.log('Database query:', db.format('SELECT * FROM users WHERE email = ?', [email]));

  // Query the database for the user
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (results.length === 0) {
      console.log('No user found with email:', email);
      return res.status(401).json({ error: 'User not found' });
    }

    const user = results[0];
    console.log('Found user:', user.email);

    // Compare hashed password
    bcrypt.compare(password, user.password, (err, same) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Password verification failed' });
      }

      if (!same) {
        console.log('Password mismatch for user:', user.email);
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Set session
      req.session.isAuthenticated = true;
      req.session.user = user.email;
      
      console.log('Login successful for user:', user.email);
      res.json({ success: true, user: { email: user.email, username: user.username, user_type: user.user_type } });
    });
  });
});

// Register new user
app.post('/api/register', (req, res) => {
  console.log('Register endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  const { email, password, username, user_type } = req.body;
  
  if (!email || !password || !username || !user_type) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Email, password, username, and user_type are required' });
  }

  // Check if user already exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (results.length > 0) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Password hashing error:', err);
        return res.status(500).json({ error: 'Password hashing failed' });
      }

      // Insert new user with hashed password
      const insertQuery = 'INSERT INTO users (email, password, username, user_type) VALUES (?, ?, ?, ?)';
      console.log('Insert query:', db.format(insertQuery, [email, hash, username, user_type]));

      db.query(insertQuery, [email, hash, username, user_type], (err, result) => {
        if (err) {
          console.error('Insert error:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        console.log('User registered successfully:', email);
        // Automatically log in the new user
        req.session.isAuthenticated = true;
        req.session.user = email;
        
        res.json({ 
          success: true, 
          user: { 
            email: email, 
            username: username, 
            user_type: user_type 
          }
        });
      });
    });
  });
});

const PORT = process.env.PORT || 3001;

// Root route
app.get('/', (req, res) => {
  res.send('Backend server is running');
});

// Generate a reset code for password recovery
app.get('/api/password-reset/:email', (req, res) => {
  const { email } = req.params;
  console.log('Password reset request for email:', email);
  
  // Generate a random reset code
  const resetCode = Math.random().toString(36).substring(2, 15);
  console.log('Generated reset code:', resetCode);
  
  // First, check if user exists
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Error checking user existence:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Store the reset code in the database
    db.query('UPDATE users SET reset_code = ?, reset_code_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE email = ?', 
      [resetCode, email], (err, result) => {
      if (err) {
        console.error('Error storing reset code:', err);
        return res.status(500).json({ error: 'Failed to generate reset code' });
      }

      if (result.affectedRows === 0) {
        console.log('No rows updated');
        return res.status(500).json({ error: 'Failed to update reset code' });
      }

      console.log('Reset code stored successfully');
      
      // Create a transporter for sending emails
      const transporter = nodemailer.createTransport({
        // For production, use your actual email service configuration
        // For now, we'll use a dummy configuration
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'noreply@example.com',
          pass: 'password'
        }
      });

      // Send the reset code email
      const mailOptions = {
        from: 'noreply@example.com',
        to: email,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${resetCode}
        This code will expire in 15 minutes.
        Please keep it safe and do not share it with anyone.
        If you did not request a password reset, please ignore this email.`
      };

      // Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          // In production, we would handle this error differently
          // For now, we'll just log it and continue
        } else {
          console.log('Email sent: ' + info.response);
        }

        // Return only a success message
        res.json({ 
          success: true, 
          message: 'Password reset code sent successfully'
        });
      });
    });
  });
});

// Reset password using reset code
app.post('/api/reset-password', (req, res) => {
  const { resetCode, newPassword } = req.body;
  
  if (!resetCode || !newPassword) {
    return res.status(400).json({ error: 'Reset code and new password are required' });
  }

  // Check if the reset code is valid
  db.query('SELECT * FROM users WHERE reset_code = ? AND reset_code_expires > NOW()', [resetCode], (err, results) => {
    if (err) {
      console.error('Error checking reset code:', err);
      return res.status(500).json({ error: 'Failed to verify reset code' });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const user = results[0];
    
    // Hash the new password
    bcrypt.hash(newPassword, 10, (err, hash) => {
      if (err) {
        console.error('Password hashing error:', err);
        return res.status(500).json({ error: 'Failed to update password' });
      }

      // Update the password and clear the reset code
      db.query('UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?', 
        [hash, user.id], (err, result) => {
        if (err) {
          console.error('Error updating password:', err);
          return res.status(500).json({ error: 'Failed to update password' });
        }

        res.json({ 
          success: true, 
          message: 'Password updated successfully'
        });
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
