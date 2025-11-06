# HR Seed Script

## Overview
This seed script creates sample HR users for testing and development purposes.

## Features
- ✅ Creates 5 HR users with test credentials
- ✅ Hashes passwords securely using bcrypt
- ✅ Checks for existing HR users to prevent duplicates
- ✅ Force mode to delete and recreate HR users
- ✅ Displays credentials after seeding for easy testing

## HR Users Created

The script creates 5 HR users with the following details:

| Name | Email | Phone | Password |
|------|-------|-------|----------|
| Sarah Johnson | sarah.hr@company.com | +1-555-0101 | Hr@123456 |
| Michael Chen | michael.hr@company.com | +1-555-0102 | Hr@123456 |
| Emily Rodriguez | emily.hr@company.com | +1-555-0103 | Hr@123456 |
| David Kim | david.hr@company.com | +1-555-0104 | Hr@123456 |
| Jessica Martinez | jessica.hr@company.com | +1-555-0105 | Hr@123456 |

## Usage

### Normal Seed (Safe Mode)
This will only create HR users if none exist:

```bash
npm run seed:hr
# or
yarn seed:hr
```

**Output if HR users already exist:**
```
⚠️  Found X existing HR user(s)
Do you want to:
1. Skip seeding (existing users will remain)
2. Delete existing HR users and reseed

To delete and reseed, run: npm run seed:hr:force
Exiting without changes...
```

### Force Seed (Danger Mode)
⚠️ **WARNING:** This will delete ALL existing HR users and recreate them:

```bash
npm run seed:hr:force
# or
yarn seed:hr:force
```

**Output:**
```
🌱 Starting FORCE HR seed process...
⚠️  WARNING: This will delete all existing HR users!
✅ Connected to database
🗑️  Deleted X existing HR user(s)
🔐 Hashing passwords with 12 salt rounds...
📝 Creating 5 HR users...

✅ HR Users created successfully!

═══════════════════════════════════════════════════
📋 HR User Credentials (for testing):
═══════════════════════════════════════════════════

1. Sarah Johnson
   Email: sarah.hr@company.com
   Password: Hr@123456
   Phone: +1-555-0101
   Role: hr

[... more users ...]

═══════════════════════════════════════════════════

✅ Total HR users created: 5

💡 Note: All HR users have the same password for testing: Hr@123456
⚠️  Remember to change passwords in production!
```

## Script Location
```
backend/src/seed/hrSeed.ts
```

## Environment Requirements

Make sure your `.env` file contains:
```env
DATABASE_URL=mongodb://localhost:27017/your-database
BCRYPT_SALT_ROUNDS=12
```

## Testing the Seeded Users

### Login via API
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "sarah.hr@company.com",
  "password": "Hr@123456"
}
```

### View in Admin Panel
1. Login as Admin or Super Admin
2. Navigate to `/dashboard/admin/hr`
3. You should see all 5 HR users listed

## Customization

To customize the HR users, edit the `hrUsersData` array in `src/seed/hrSeed.ts`:

```typescript
const hrUsersData = [
  {
    name: 'Your HR Name',
    email: 'your.hr@company.com',
    phone: '+1-555-XXXX',
    password: 'YourPassword123',
    role: ENUM_USER_ROLE.HR,
    // ... other fields
  },
  // Add more users as needed
];
```

## Security Notes

⚠️ **IMPORTANT:**
- The default password `Hr@123456` is for **testing purposes only**
- Never use these credentials in production
- Change all passwords immediately after seeding in production environments
- Consider using environment variables for passwords in production seeds

## Troubleshooting

### Error: "DATABASE_URL is not defined"
- Ensure `.env` file exists in backend root
- Verify `DATABASE_URL` is set in `.env`

### Error: "Cannot connect to database"
- Check if MongoDB is running
- Verify DATABASE_URL is correct
- Check network connectivity

### Error: "E11000 duplicate key error"
- An HR user with the same email or phone already exists
- Use force mode: `npm run seed:hr:force`
- Or manually delete the conflicting user

## Integration with Other Seeds

You can create additional seed scripts following the same pattern:

```typescript
// src/seed/representativeSeed.ts
// src/seed/adminSeed.ts
// etc.
```

Then add to `package.json`:
```json
{
  "scripts": {
    "seed:representatives": "ts-node src/seed/representativeSeed.ts",
    "seed:all": "npm run seed:hr && npm run seed:representatives"
  }
}
```

## Development vs Production

### Development
```bash
npm run seed:hr:force  # OK to use force mode
```

### Production
```bash
# Never use force mode in production!
# Consider using environment-specific seed data
NODE_ENV=production npm run seed:hr
```

## License
Part of the CRM project - internal use only.
