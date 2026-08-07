    const mongoose = require('mongoose');

    const Customer = require('../src/models/Customer');
    const Service = require('../src/models/Service');
    const Employee = require('../src/models/Employee');
    const Appointment = require('../src/models/Appointment');
    const Conversation = require('../src/models/Conversation');
    const Message = require('../src/models/Message');

    describe('MongoDB Models', () => {
    test('should load all models correctly', () => {
        expect(Customer).toBeDefined();
        expect(Service).toBeDefined();
        expect(Employee).toBeDefined();
        expect(Appointment).toBeDefined();
        expect(Conversation).toBeDefined();
        expect(Message).toBeDefined();
    });
    });
