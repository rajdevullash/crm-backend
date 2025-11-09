import mongoose from 'mongoose';
import config from '../config';
import { PermissionService } from '../app/modules/permission/permission.service';

async function seedPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to MongoDB');

    // Initialize default permissions
    console.log('🌱 Seeding default permissions...');
    await PermissionService.initializeDefaultPermissions();
    console.log('✅ Default permissions seeded successfully');

    // Close connection
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seedPermissions();
}

export default seedPermissions;

