const mongoose = require('mongoose');

const env = require('../config/env');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    const name = env.adminSeedName;
    const email = env.adminSeedEmail;
    const password = env.adminSeedPassword;

    if (!email || !password) {
      throw new Error(
        'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set in .env'
      );
    }

    await mongoose.connect(env.mongoUri);

    console.log('MongoDB connected');

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingAdmin) {
      console.log(`✓ Admin already exists: ${existingAdmin.email}`);
    } else {
      const admin = await Admin.create({
        name,
        email,
        password,
        role: 'superadmin',
      });

      console.log('✓ Admin created');
      console.log('Email:', admin.email);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Admin seed error:', error);

    process.exit(1);
  }
};

seedAdmin();
