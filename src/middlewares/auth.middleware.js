const jwt = require('jsonwebtoken');

const env = require('../config/env');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.active) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, admin not found or inactive',
      });
    }

    req.admin = admin;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, invalid or expired token',
    });
  }
};

module.exports = { protect };
