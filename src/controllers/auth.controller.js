const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const env = require('../config/env');
const Admin = require('../models/Admin');
const systemLogService = require('../services/systemLog.service');

const signToken = (admin) =>
  jwt.sign({ id: admin._id }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

// Limita intentos del código de acceso por IP para dificultar fuerza bruta
// sobre un código fijo de 8 dígitos. En memoria: suficiente para esta app de
// una sola instancia, se reinicia si el servidor se reinicia (aceptable).
const REGISTER_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const REGISTER_ATTEMPT_LIMIT = 5;
const registerAttempts = new Map();

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = registerAttempts.get(ip);

  if (!entry || now - entry.firstAttempt > REGISTER_ATTEMPT_WINDOW_MS) {
    registerAttempts.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  entry.count += 1;
  return entry.count > REGISTER_ATTEMPT_LIMIT;
};

const codeMatches = (candidate, expectedCode) => {
  const expected = String(expectedCode || '');
  const given = String(candidate || '');

  if (!expected || given.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

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

const register = async (req, res, next) => {
  try {
    const ip = req.ip;

    if (isRateLimited(ip)) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos. Intenta de nuevo en unos minutos.',
      });
    }

    const { name, email, password, code } = req.body;

    if (!name || !email || !password || !code) {
      return res.status(400).json({
        success: false,
        message: 'name, email, password y code son obligatorios',
      });
    }

    let role = null;
    if (codeMatches(code, env.adminSignupCode)) {
      role = 'admin';
    } else if (codeMatches(code, env.receptionistSignupCode)) {
      role = 'receptionist';
    }

    if (!role) {
      systemLogService.logError({
        type: 'auth',
        message: 'Intento de registro con código de acceso inválido',
        meta: { ip, email },
      });

      return res.status(401).json({
        success: false,
        message: 'Código de acceso inválido.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Admin.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe una cuenta con ese correo.',
      });
    }

    const admin = await Admin.create({
      name,
      email: normalizedEmail,
      password,
      role,
    });

    const token = signToken(admin);

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
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
  register,
  me,
};
