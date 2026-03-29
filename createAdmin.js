require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

/**
 * Script to create initial admin user
 * Run with: node createAdmin.js
 */

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Connected to MongoDB');

        // Check if admin already exists in User collection
        let admin = await User.findOne({ email: 'admin@example.com' });

        if (admin) {
            console.log('User exists. Updating to Admin role...');
            admin.role = 'admin';
            admin.password = 'admin123'; // Will be hashed by pre-save hook
            await admin.save();
            console.log('✅ User updated to Admin successfully!');
        } else {
            // Create new admin user
            admin = new User({
                name: 'System Admin',
                email: 'admin@example.com',
                password: 'admin123', // Will be hashed automatically by the model
                role: 'admin',
                phone: '0000000000'
            });
            await admin.save();
            console.log('✅ Admin user created successfully in User collection!');
        }

        console.log('Email: admin@example.com');
        console.log('Password: admin123');
        console.log('\n⚠️  Please change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
