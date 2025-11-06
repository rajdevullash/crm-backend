import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../app/modules/auth/auth.model';
import { ENUM_USER_ROLE } from '../enums/user';
import config from '../config';

/**
 * HR Seed Data
 * Creates sample HR users for testing and development
 */
const hrUsersData = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.hr@company.com',
    phone: '+1-555-0101',
    password: 'Hr@123456',
    role: ENUM_USER_ROLE.HR,
    profileImage: null,
    joinDate: new Date('2025-01-15'),
    incentivePercentage: 0,
    performancePoint: 0,
    totalLeads: 0,
    convertedLeads: [],
    tasksCompleted: 0,
  },
  {
    name: 'Michael Chen',
    email: 'michael.hr@company.com',
    phone: '+1-555-0102',
    password: 'Hr@123456',
    role: ENUM_USER_ROLE.HR,
    profileImage: null,
    joinDate: new Date('2025-02-20'),
    incentivePercentage: 0,
    performancePoint: 0,
    totalLeads: 0,
    convertedLeads: [],
    tasksCompleted: 0,
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.hr@company.com',
    phone: '+1-555-0103',
    password: 'Hr@123456',
    role: ENUM_USER_ROLE.HR,
    profileImage: null,
    joinDate: new Date('2025-03-10'),
    incentivePercentage: 0,
    performancePoint: 0,
    totalLeads: 0,
    convertedLeads: [],
    tasksCompleted: 0,
  },
  {
    name: 'David Kim',
    email: 'david.hr@company.com',
    phone: '+1-555-0104',
    password: 'Hr@123456',
    role: ENUM_USER_ROLE.HR,
    profileImage: null,
    joinDate: new Date('2025-04-05'),
    incentivePercentage: 0,
    performancePoint: 0,
    totalLeads: 0,
    convertedLeads: [],
    tasksCompleted: 0,
  },
  {
    name: 'Jessica Martinez',
    email: 'jessica.hr@company.com',
    phone: '+1-555-0105',
    password: 'Hr@123456',
    role: ENUM_USER_ROLE.HR,
    profileImage: null,
    joinDate: new Date('2025-05-12'),
    incentivePercentage: 0,
    performancePoint: 0,
    totalLeads: 0,
    convertedLeads: [],
    tasksCompleted: 0,
  },
];

/**
 * Seed HR Users
 * Creates HR users in the database with hashed passwords
 */
const seedHRUsers = async () => {
  try {
    console.log('🌱 Starting HR seed process...');

    // Connect to database
    if (!config.database_url) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await mongoose.connect(config.database_url);
    console.log('✅ Connected to database');

    // Check if HR users already exist
    const existingHRCount = await User.countDocuments({ role: ENUM_USER_ROLE.HR });
    
    if (existingHRCount > 0) {
      console.log(`⚠️  Found ${existingHRCount} existing HR user(s)`);
      console.log('Do you want to:');
      console.log('1. Skip seeding (existing users will remain)');
      console.log('2. Delete existing HR users and reseed');
      console.log('\nTo delete and reseed, run: npm run seed:hr:force');
      console.log('Exiting without changes...');
      await mongoose.connection.close();
      return;
    }

    // Hash passwords and create users
    const saltRounds = Number(config.bycrypt_salt_rounds) || 12;
    console.log(`🔐 Hashing passwords with ${saltRounds} salt rounds...`);

    const hrUsersWithHashedPasswords = await Promise.all(
      hrUsersData.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        return {
          ...user,
          password: hashedPassword,
        };
      })
    );

    // Insert HR users
    console.log(`📝 Creating ${hrUsersWithHashedPasswords.length} HR users...`);
    const createdUsers = await User.insertMany(hrUsersWithHashedPasswords);

    console.log('\n✅ HR Users created successfully!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 HR User Credentials (for testing):');
    console.log('═══════════════════════════════════════════════════');
    
    createdUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: Hr@123456`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`\n✅ Total HR users created: ${createdUsers.length}`);
    console.log('\n💡 Note: All HR users have the same password for testing: Hr@123456');
    console.log('⚠️  Remember to change passwords in production!\n');

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error seeding HR users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

/**
 * Force Seed (Delete existing and recreate)
 * Use with caution - this will delete all existing HR users
 */
const forceSeedHRUsers = async () => {
  try {
    console.log('🌱 Starting FORCE HR seed process...');
    console.log('⚠️  WARNING: This will delete all existing HR users!');

    // Connect to database
    if (!config.database_url) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    await mongoose.connect(config.database_url);
    console.log('✅ Connected to database');

    // Delete existing HR users
    const deleteResult = await User.deleteMany({ role: ENUM_USER_ROLE.HR });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing HR user(s)`);

    // Hash passwords and create users
    const saltRounds = Number(config.bycrypt_salt_rounds) || 12;
    console.log(`🔐 Hashing passwords with ${saltRounds} salt rounds...`);

    const hrUsersWithHashedPasswords = await Promise.all(
      hrUsersData.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        return {
          ...user,
          password: hashedPassword,
        };
      })
    );

    // Insert HR users
    console.log(`📝 Creating ${hrUsersWithHashedPasswords.length} HR users...`);
    const createdUsers = await User.insertMany(hrUsersWithHashedPasswords);

    console.log('\n✅ HR Users created successfully!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 HR User Credentials (for testing):');
    console.log('═══════════════════════════════════════════════════');
    
    createdUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: Hr@123456`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Role: ${user.role}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log(`\n✅ Total HR users created: ${createdUsers.length}`);
    console.log('\n💡 Note: All HR users have the same password for testing: Hr@123456');
    console.log('⚠️  Remember to change passwords in production!\n');

    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error force seeding HR users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run based on command argument
const args = process.argv.slice(2);
const isForce = args.includes('--force') || args.includes('-f');

if (isForce) {
  forceSeedHRUsers();
} else {
  seedHRUsers();
}

export { seedHRUsers, forceSeedHRUsers };
