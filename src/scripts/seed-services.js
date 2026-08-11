    const mongoose = require('mongoose');

    const env = require('../config/env');
    const Service = require('../models/Service');

    const services = [
    {
        code: 'HOLLYWOOD_PEEL',
        name: 'Hollywood Peel',
        description:
        'Tratamiento facial con láser orientado a limpieza, exfoliación y mejora de la apariencia de la piel.',
        durationMinutes: 30,
        dailyLimit: 20,
        price: 0,
        active: true,
    },
    {
        code: 'LASER_CO2',
        name: 'Láser CO₂ fraccionado',
        description:
        'Tratamiento de renovación de la piel mediante láser CO₂ fraccionado.',
        durationMinutes: 30,
        dailyLimit: 20,
        price: 0,
        active: true,
    },
    ];

    const seedServices = async () => {
    try {
        await mongoose.connect(env.mongoUri);

        console.log('MongoDB connected');

        for (const service of services) {
        await Service.findOneAndUpdate(
            { code: service.code },
            service,
            {
                    upsert: true,
                    returnDocument: 'after',
            }
        );

        console.log(`✓ ${service.name}`);
        }

        console.log('Services seeded successfully');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Seed error:', error);

        process.exit(1);
    }
    };

    seedServices();
