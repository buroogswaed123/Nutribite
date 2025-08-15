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

// Update a user
router.put("/:user_id", async (req, res) => {
  if (!requireFields(res, req.body, ["email", "password", "currentPassword"])) return;
  const { user_id } = req.params;
  const { name, email, password, currentPassword } = req.body;

  db.query("SELECT password FROM users WHERE user_id = ?", [user_id], async (err, results) => {
    if (err) return sendError(res, err);
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    const storedHash = results[0].password;
    if (!(await comparePassword(currentPassword, storedHash)))
      return res.status(401).json({ message: "Invalid current password!" });

    try {
      const hashedPassword = await hashPassword(password);
      db.query(
        "UPDATE users SET name = ?, email = ?, password = ? WHERE user_id = ?",
        [name, email, hashedPassword, user_id],
        (err) => err ? sendError(res, err) : res.json({ message: "User updated successfully" })
      );
    } catch (err) {
      sendError(res, err);
    }
  });
});

// Login
router.post("/login", (req, res) => {
  if (!requireFields(res, req.body, ["email", "password"])) return;
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return sendError(res, err);
    if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" });

    const user = results[0];
    if (!(await comparePassword(password, user.password)))
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({ message: "Login successful", userId: user.user_id });
  });
});

module.exports = router;
