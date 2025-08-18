const express = require("express");
const router = express.Router();
const db = require("../dbSingleton");

// Helpers
const getConn = () => {
  const conn = db.getConnection && db.getConnection();
  if (!conn) throw new Error('DB connection not initialized');
  return conn;
};
const sendError = (res, err, code = 500) => {
  console.error(err);
  res.status(code).json({ message: err.message || 'Server error' });
};
const requireFields = (res, body, fields) => {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
    return false;
  }
  return true;
};

//get all
router.get("/", (req, res) => {
  try {
    const conn = getConn();
    conn.query("SELECT * FROM customers", (err, results) => err ? sendError(res, err) : res.json(results));
  } catch (e) { sendError(res, e); }
});

// Get a customer by user_id (used by FE to retrieve cust_id and name)
router.get("/by-user/:user_id", (req, res) => {
  try {
    const conn = getConn();
    conn.query(
      "SELECT * FROM customers WHERE user_id = ? LIMIT 1",
      [req.params.user_id],
      (err, rows) => {
        if (err) return sendError(res, err);
        if (!rows || rows.length === 0) return res.status(404).json({ message: "Customer not found" });
        return res.json(rows[0]);
      }
    );
  } catch (e) { sendError(res, e); }
});

// Delete a customer
router.delete("/:cust_id", (req, res) => {
  try {
    const conn = getConn();
    conn.query("DELETE FROM customers WHERE cust_id = ?", [req.params.cust_id], (err, results) => {
      if (err) return sendError(res, err);
      if (results.affectedRows === 0) return res.status(404).json({ message: "Customer not found!" });
      res.json({ message: "Customer deleted successfully" });
    });
  } catch (e) { sendError(res, e); }
});

// Add a customer: given a user_id, verify users.user_type === 'customer' then insert into customers
router.post("/", async (req, res) => {
  try {
    if (!requireFields(res, req.body, ["user_id"])) return;
    const { user_id } = req.body;
    const conn = getConn();

    // 1) Check the user exists and is of type 'customer'
    conn.query("SELECT user_id, user_type FROM users WHERE user_id = ? LIMIT 1", [user_id], (err, rows) => {
      if (err) return sendError(res, err);
      if (!rows || rows.length === 0) return res.status(404).json({ message: "User not found" });

      const user = rows[0];
      if (user.user_type !== 'customer') {
        return res.status(400).json({ message: "User is not a customer" });
      }

      // 2) Check if already in customers table
      conn.query("SELECT cust_id FROM customers WHERE user_id = ? LIMIT 1", [user_id], (err2, existing) => {
        if (err2) return sendError(res, err2);
        if (existing && existing.length) {
          return res.status(409).json({ message: "Customer already exists" });
        }

        // 3) Insert into customers (adjust columns as needed)
        conn.query("INSERT INTO customers (user_id) VALUES (?)", [user_id], (err3, result) => {
          if (err3) return sendError(res, err3);
          res.status(201).json({ message: "Customer added", cust_id: result.insertId });
        });
      });
    });
  } catch (e) {
    sendError(res, e);
  }
});

// Update customer details (partial: name, address, phone)
router.put('/:cust_id', (req, res) => {
  const { cust_id } = req.params;
  const { name, address, phone } = req.body;

  // Build dynamic SET only for provided fields
  const setClauses = [];
  const params = [];
  if (typeof name !== 'undefined') { setClauses.push('name = ?'); params.push(name); }
  if (typeof address !== 'undefined') { setClauses.push('address = ?'); params.push(address); }
  if (typeof phone !== 'undefined') { setClauses.push('phone = ?'); params.push(phone); }

  if (setClauses.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  try {
    const conn = getConn();
    const sql = `UPDATE customers SET ${setClauses.join(', ')} WHERE cust_id = ?`;
    params.push(cust_id);
    conn.query(sql, params, (err, result) => {
      if (err) return sendError(res, err);
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Customer not found' });
      return res.json({ message: 'Customer updated successfully' });
    });
  } catch (e) { sendError(res, e); }
});

module.exports = router;