const express = require("express");
const db = require("../dbSingleton");
const bcrypt = require("bcrypt");
const router = express.Router();

// Helper functions
const hashPassword = (password) => bcrypt.hash(password, 10);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
const sendError = (res, err, status = 500) => res.status(status).json({ message: err.message || err });

// Check required fields
const requireFields = (res, body, fields) => {
  for (let field of fields) {
    if (!body[field]) {
      res.status(400).json({ message: `Missing field: ${field}` });
      return false;
    }
  }
  return true;
};

// Get all users
router.get("/", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => err ? sendError(res, err) : res.json(results));
});

// Delete a user
router.delete("/:user_id", (req, res) => {
  db.query("DELETE FROM users WHERE user_id = ?", [req.params.user_id], (err, results) => {
    if (err) return sendError(res, err);
    if (results.affectedRows === 0) return res.status(404).json({ message: "User not found!" });
    res.json({ message: "User deleted successfully" });
  });
});

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

// Update a user (partial updates)
// - name/username can be updated without any password verification
// - email change requires currentPassword verification but does NOT require setting a new password
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

// Login
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

module.exports = router;
