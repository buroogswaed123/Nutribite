// Middleware: ensure the current user is an admin
// - If req.user exists, we check its user_type.
// - Otherwise, if there's a session user_id, we load the user and attach to req.user.
// - If not admin, respond 403 and block the request.
const db = require('../dbSingleton');
const conn = db.getConnection && db.getConnection();
const getConn = () => {
 
  if (!conn) throw new Error('DB connection not initialized');
  return conn;
};

const runQuery = async (sql, params = []) => {
  const conn = getConn();
  if (typeof conn.promise === 'function') return conn.promise().query(sql, params);
  if (typeof conn.query === 'function') {
    return new Promise((resolve, reject) => {
      conn.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }
  throw new Error('Unsupported DB client on connection');
};

module.exports = function requireAdmin(req, res, next) {
  try {
    // Must be authenticated first (use requireActiveUser before this)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const isAdmin = String(req.user.user_type || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Optional: log successful admin access
    // console.debug(`Admin access: ${req.user.username || req.user.user_id}`);
    return next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
