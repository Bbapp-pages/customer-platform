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

// Debe usarse después de protect (necesita req.admin ya cargado).
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permiso para realizar esta acción',
    });
  }

  return next();
};

module.exports = { protect, restrictTo };
