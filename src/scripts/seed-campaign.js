    const mongoose = require('mongoose');

    const env = require('../config/env');

    const Campaign = require('../models/Campaign');
    const Service = require('../models/Service');

    const createCampaign = async () => {
    try {
        await mongoose.connect(env.mongoUri);

        console.log('MongoDB connected');

        const hollywoodPeel = await Service.findOne({
        code: 'HOLLYWOOD_PEEL',
        });

        const laserCO2 = await Service.findOne({
        code: 'LASER_CO2',
        });

        if (!hollywoodPeel || !laserCO2) {
        throw new Error(
            'Services not found. Run seed-services.js first.'
        );
        }

        const campaign = await Campaign.findOneAndUpdate(
        {
            name: 'Campaña Facial 2026',
        },
        {
            name: 'Campaña Facial 2026',

            description:
            'Campaña promocional de tratamientos faciales gratuitos.',

            selectionRate: 0.95,

            firstBookingDate: new Date(
            '2026-08-10T00:00:00-05:00'
            ),

            active: true,

            services: [
            hollywoodPeel._id,
            laserCO2._id,
            ],
        },
        {
            upsert: true,
            returnDocument: 'after',
        }
        );

        console.log('✓ Campaign created');
        console.log('Campaign ID:', campaign._id);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Campaign seed error:', error);

        process.exit(1);
    }
    };

    createCampaign();