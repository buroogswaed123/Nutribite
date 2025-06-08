const mysql = require('mysql2');

// Create a connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nutribite_db',
    port: 3306
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL!');

    // Test the connection by querying the users table
    connection.query('SELECT COUNT(*) as count FROM users', (err, results) => {
        if (err) throw err;
        console.log(`Successfully connected to database. Users table contains ${results[0].count} records.`);
        connection.end();
    });
});
