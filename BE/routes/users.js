const express = require("express");
const dbSingleton = require("../dbSingleton");
const router = express.Router();
const db = dbSingleton.getConnection();
const bcrypt = require("bcrypt");

router.get("/", (rq, res) => {
  const query = "SELECT * FROM users ";
  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.json(results);
  });
});

//delete a user from the database
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM users WHERE id = ?";
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (results.affectedRows === 0) {
      res.status(404).json({ message: "User not found!" });
      return;
    }
    res.json({ message: "User deleted successfully" });
  });
});

//add a user to the database,ensure the password is hashed and saved
router.post("/", (req, res) => {
  const { name, email, password } = req.body;

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

//update user info in the database
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { name, email, password, currentPassword } = req.body;

  // get stored hash from DB
  const getUserQuery = "SELECT password FROM users WHERE id = ?";
  db.query(getUserQuery, [id], (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0)
      return res.status(404).json({ message: "User not found" });

    const storedHash = results[0].password;

    //compare entered current password with stored hash
    bcrypt.compare(currentPassword, storedHash, (err, match) => {
      if (err) return res.status(500).send(err);
      if (!match) return res.status(401).json({ message: "Invalid password!" });

      //Hash new password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send(err);

        //update user info
        const updateQuery =
          "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?";
        db.query(
          updateQuery,
          [name, email, hashedPassword, id],
          (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "User updated successfully" });
          }
        );
      });
    });
  });
});

//login request
router.post("/login", (req, res) => {
  const { email, password } = req.body;

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

      res.json({ message: "Login successful", userId: user.id });
    });
  });
});

module.exports = router;
