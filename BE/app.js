const express = require('express');
const app = express();
const usersRoutes = require('./routes/users')
const loginRoutes = require('./routes/login')
const port = 3000;

app.use(express.json());

app.use('/users', usersRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});