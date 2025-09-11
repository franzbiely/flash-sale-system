import mongoose from 'mongoose';
import { Admin } from '../models/Admin';
import { hashPassword } from '../utils/password';
import { connectToDatabase } from '../config/db';
import { env } from '../config/env';

async function createAdminUser() {
  try {
    // Connect to database
    await connectToDatabase(env.MONGODB_URI);
    console.log('Connected to database');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists with email: admin@example.com');
      process.exit(0);
    }

    // Hash the password
    const passwordHash = await hashPassword('admin123');

    // Create admin user
    const admin = new Admin({
      email: 'admin@example.com',
      passwordHash
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Admin ID:', admin._id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the script
createAdminUser();
