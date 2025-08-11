const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = jwt.verify(token, 'admin_secret');
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(403).send('Invalid token');
  }
};