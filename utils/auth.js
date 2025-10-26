// utils/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';


function signToken(payload, opts = {}) {
return jwt.sign(payload, JWT_SECRET, { expiresIn: opts.expiresIn || '1h' });
}


function verifyToken(token) {
try {
return jwt.verify(token, JWT_SECRET);
} catch (err) {
return null;
}
}


module.exports = { signToken, verifyToken };