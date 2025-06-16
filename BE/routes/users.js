const express = require("express");
const db = require("../dbSingleton");
const router = express.Router();
const bcrypt = require("bcryptjs");

// Get all users
router.get("/", (req, res) => {
  const query = "SELECT * FROM users";
  db.query(query, (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// Delete a user
router.delete("/:user_id", (req, res) => {
  const user_id = req.params.user_id;
  const query = "DELETE FROM users WHERE user_id = ?";
  db.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.affectedRows === 0)
      return res.status(404).json({ message: "User not found!" });
    res.json({ message: "User deleted successfully" });
  });
});

// Add a user (signup)
router.post("/", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  bcrypt.genSalt(10, (err, salt) => {
    if (err) return res.status(500).send(err);
    bcrypt.hash(password, salt, (err, hashedPassword) => {
      if (err) return res.status(500).send(err);

      const query =
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
      db.query(query, [name, email, hashedPassword], (err, results) => {
        if (err) return res.status(500).send(err);
        res.status(201).json({
          message: "User created successfully",
          userId: results.insertId,
        });
      });
    });
  });
});

// Update a user
router.put("/:user_id", (req, res) => {
  const user_id = req.params.user_id;
  const { name, email, password, currentPassword } = req.body;

  if (!email || !password || !currentPassword)
    return res.status(400).json({ message: "Missing fields" });

  const getUserQuery = "SELECT password FROM users WHERE user_id = ?";
  db.query(getUserQuery, [user_id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0)
      return res.status(404).json({ message: "User not found" });

    const storedHash = results[0].password;

    bcrypt.compare(currentPassword, storedHash, (err, match) => {
      if (err) return res.status(500).send(err);
      if (!match)
        return res.status(401).json({ message: "Invalid current password!" });

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send(err);

        const updateQuery =
          "UPDATE users SET name = ?, email = ?, password = ? WHERE user_id = ?";
        db.query(
          updateQuery,
          [name, email, hashedPassword, user_id],
          (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "User updated successfully" });
          }
        );
      });
    });
  });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing fields" });

  const query = "SELECT * FROM users WHERE email = ?";
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send(err);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid email or password" });

      res.json({
        message: "Login successful",
        userId: user.user_id,
      });
    });
  });
});

module.exports = router;
