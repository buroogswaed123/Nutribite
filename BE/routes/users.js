// Users routes (accounts, auth-ish endpoints, profile image)
const express = require("express");
const dbSingleton = require("../dbSingleton");
const db = dbSingleton.getConnection();
const bcrypt = require("bcrypt");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper functions: password hashing/compare and error sender
const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
const sendError = (res, err, status = 500) => res.status(status).json({ message: err.message || err });

// requireFields: ensure presence of required body keys
const requireFields = (res, body, fields) => {
  for (let field of fields) {
    if (!body[field]) {
      res.status(400).json({ message: `Missing field: ${field}` });
      return false;
    }
  }
  return true;
};

// GET /api/users
// Get all users
router.get("/", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => err ? sendError(res, err) : res.json(results));
});

// DELETE /api/users/:user_id
// Delete a user
router.delete("/:user_id", (req, res) => {
  db.query("DELETE FROM users WHERE user_id = ?", [req.params.user_id], (err, results) => {
    if (err) return sendError(res, err);
    if (results.affectedRows === 0) return res.status(404).json({ message: "User not found!" });
    res.json({ message: "User deleted successfully" });
  });
});

// POST /api/users
// Add a user (signup)
router.post("/", async (req, res) => {
  if (!requireFields(res, req.body, ["name", "email", "password"])) return;
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await hashPassword(password);
    db.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
      (err, results) => err ? sendError(res, err) : res.status(201).json({ message: "User created successfully", userId: results.insertId })
    );
  } catch (err) {
    sendError(res, err);
  }
});

// PUT /api/users/:user_id
// Update a user (partial). name/username free; email change requires currentPassword.
router.put("/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { name, username, email, currentPassword } = req.body;

  // Build dynamic SET clause only for provided fields
  const setClauses = [];
  const params = [];
  if (typeof name !== 'undefined') { setClauses.push("name = ?"); params.push(name); }
  if (typeof username !== 'undefined') { setClauses.push("username = ?"); params.push(username); }
  if (typeof email !== 'undefined') { setClauses.push("email = ?"); params.push(email); }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  const performUpdate = () => {
    const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = ?`;
    params.push(user_id);
    db.query(sql, params, (err) => {
      if (err) return sendError(res, err);
      return res.json({ message: "User updated successfully" });
    });
  };

  // If email is being changed, require currentPassword and verify it first
  if (typeof email !== 'undefined') {
    if (!currentPassword) {
      return res.status(400).json({ message: "currentPassword is required to change email" });
    }
    db.query("SELECT password_hash FROM users WHERE user_id = ?", [user_id], async (err, results) => {
      if (err) return sendError(res, err);
      if (results.length === 0) return res.status(404).json({ message: "User not found" });
      const storedHash = results[0].password_hash;
      if (!(await comparePassword(currentPassword, storedHash))) {
        return res.status(401).json({ message: "Invalid current password!" });
      }
      performUpdate();
    });
  } else {
    // No email change -> no password check needed
    performUpdate();
  }
});

// POST /api/users/login
// Login by email/password
router.post("/login", (req, res) => {
  if (!requireFields(res, req.body, ["email", "password"])) return;
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return sendError(res, err);
    if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" });

    const user = results[0];
    if (!(await comparePassword(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful", userId: user.user_id });
  });
});

// -----------------------------
// Password policy: expiry check and apply latest reset
// -----------------------------

// GET /api/users/:user_id/password/expired
// Returns { expired: boolean, refDate: ISOString|null, source: 'reset'|'created'|null }
router.get('/:user_id/password/expired', async (req, res) => {
  const { user_id } = req.params;
  try {
    // 1) Get user's email and account_creation_time
    const userRows = await new Promise((resolve, reject) => {
      db.query('SELECT email, account_creation_time FROM users WHERE user_id = ? LIMIT 1', [user_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    if (!userRows.length) return res.status(404).json({ message: 'User not found' });
    const email = userRows[0].email;
    const createdAt = userRows[0].account_creation_time ? new Date(userRows[0].account_creation_time) : null;

    // 2) Find latest password reset entry for this email (using new_password column)
    let latestReset = null;
    try {
      const resetRows = await new Promise((resolve, reject) => {
        db.query('SELECT new_password, created_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1', [email], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
      if (resetRows.length) latestReset = resetRows[0];
    } catch (e) {
      latestReset = null;
    }

    const refDate = latestReset?.created_at ? new Date(latestReset.created_at) : (createdAt || null);
    if (!refDate || isNaN(refDate.getTime())) {
      return res.json({ expired: false, refDate: null, source: null });
    }
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const expired = refDate.getTime() <= sixMonthsAgo.getTime();
    return res.json({ expired, refDate: refDate.toISOString(), source: latestReset?.created_at ? 'reset' : 'created' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to evaluate password expiry', error: err.message });
  }
});

// POST /api/users/:user_id/password/apply-latest
// Apply latest plaintext reset to users.password_hash. Returns { updated }.
router.post('/:user_id/password/apply-latest', async (req, res) => {
  const { user_id } = req.params;
  try {
    // 1) Get user's email
    const userRows = await new Promise((resolve, reject) => {
      db.query('SELECT email FROM users WHERE user_id = ? LIMIT 1', [user_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    if (!userRows.length) return res.status(404).json({ message: 'User not found' });
    const email = userRows[0].email;

    // 2) Pull latest new_password for that email
    const resetRows = await new Promise((resolve, reject) => {
      db.query('SELECT new_password FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1', [email], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    if (!resetRows.length || !resetRows[0].new_password) {
      return res.json({ updated: false, message: 'No pending reset found' });
    }
    const plainNew = String(resetRows[0].new_password);
    const hashed = await hashPassword(plainNew);

    // 3) Update users.password_hash
    await new Promise((resolve, reject) => {
      db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hashed, user_id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    return res.json({ updated: true });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to apply latest reset', error: err.message });
  }
});

// -----------------------------
// Profile image upload endpoint
// -----------------------------
// Ensure upload directory exists
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const profileDir = path.join(uploadsRoot, 'profile');
try { fs.mkdirSync(profileDir, { recursive: true }); } catch {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = `user_${req.params.user_id}_${Date.now()}`;
    cb(null, base + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/users/:user_id/profile-image
// Update user's profile image (stores under uploads/profile)
router.post('/:user_id/profile-image', upload.single('image'), (req, res) => {
  const { user_id } = req.params;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const relativePath = path.posix.join('uploads', 'profile', req.file.filename);

  // 1) Fetch old image
  db.query('SELECT profile_image FROM users WHERE user_id = ? LIMIT 1', [user_id], (selErr, rows) => {
    if (selErr) {
      try { fs.unlinkSync(path.join(__dirname, '..', relativePath)); } catch {}
      return sendError(res, selErr);
    }
    if (!rows || rows.length === 0) {
      try { fs.unlinkSync(path.join(__dirname, '..', relativePath)); } catch {}
      return res.status(404).json({ message: 'User not found' });
    }
    const oldImg = rows[0].profile_image || '';

    // 2) Update with new image
    db.query('UPDATE users SET profile_image = ? WHERE user_id = ?', [relativePath, user_id], (updErr, result) => {
      if (updErr) {
        try { fs.unlinkSync(path.join(__dirname, '..', relativePath)); } catch {}
        return sendError(res, updErr);
      }
      if (result.affectedRows === 0) {
        try { fs.unlinkSync(path.join(__dirname, '..', relativePath)); } catch {}
        return res.status(404).json({ message: 'User not found' });
      }

      // 3) Delete old image if it was a user-uploaded file under uploads/profile and not the same as new
      if (oldImg && oldImg !== relativePath) {
        try {
          // Normalize and ensure inside uploads dir
          const oldRel = oldImg.replace(/^\/+|^\\+/, '');
          const oldAbs = path.join(__dirname, '..', oldRel);
          const uploadsRoot = path.join(__dirname, '..', 'uploads');
          const isUnderUploads = oldAbs.startsWith(uploadsRoot);
          const looksLikeProfile = /(^|\\|\/)uploads(\\|\/)profile(\\|\/)/.test(oldAbs);
          if (isUnderUploads && looksLikeProfile && fs.existsSync(oldAbs)) {
            fs.unlinkSync(oldAbs);
          }
        } catch {}
      }

      return res.json({ message: 'Profile image updated', profile_image: relativePath });
    });
  });
});

module.exports = router;
