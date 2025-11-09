import mongoose from 'mongoose';
import config from '../config';
import { Role } from '../app/modules/permission/permission.model';

const systemRoles = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystem: true,
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description: 'Administrative access to manage users, permissions, and system settings',
    isSystem: true,
  },
  {
    name: 'hr',
    displayName: 'HR',
    description: 'Human Resources role with access to hiring and employee management',
    isSystem: true,
  },
  {
    name: 'representative',
    displayName: 'Representative',
    description: 'Sales representative role with access to leads, activities, and dashboard',
    isSystem: true,
  },
];

const seedRoles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.database_url as string);
    console.log('📦 Connected to MongoDB');

    // Clear existing roles (optional - remove if you don't want to clear)
    // await Role.deleteMany({});
    // console.log('🗑️  Cleared existing roles');

    // Insert system roles
    for (const roleData of systemRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        // Update existing role
        await Role.findOneAndUpdate(
          { name: roleData.name },
          roleData,
          { new: true }
        );
        console.log(`✅ Updated role: ${roleData.displayName}`);
      } else {
        // Create new role
        await Role.create(roleData);
        console.log(`✅ Created role: ${roleData.displayName}`);
      }
    }

    console.log('\n🎉 Role seeding completed successfully!');
    console.log('\nSystem Roles:');
    const roles = await Role.find({ isSystem: true });
    roles.forEach((role) => {
      console.log(`  - ${role.displayName} (@${role.name})`);
    });

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
};

// Run seeder
seedRoles();

