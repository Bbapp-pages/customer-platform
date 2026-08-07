const jwt = require('jsonwebtoken');

const env = require('../config/env');
const Admin = require('../models/Admin');

const signToken = (admin) =>
  jwt.sign({ id: admin._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required',
      });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password');

    if (!admin || !admin.active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = signToken(admin);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
};

module.exports = {
  login,
  me,
};
