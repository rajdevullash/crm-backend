# Database Seeders

This directory contains database seeding scripts for initializing the CRM system with default data.

## Available Seeders

### 1. Role Seeder (`roleSeed.ts`)
Seeds system roles into the database.

**System Roles:**
- `super_admin` - Full system access with all permissions
- `admin` - Administrative access to manage users, permissions, and settings
- `hr` - Human Resources role with hiring and employee management access
- `representative` - Sales representative with leads and dashboard access

**Usage:**
```bash
npm run seed:roles
```

**What it does:**
- Creates or updates system roles
- Sets `isSystem: true` for protected roles
- Cannot be deleted from the UI

---

### 2. Permission Seeder (`permissionSeed.ts`)
Seeds permissions, modules, and role-permission mappings.

**Modules:**
- HR (Jobs, Applications)
- Leads (CRUD, Assign, Activities, Notes, Attachments)
- Deals (CRUD, Close Requests, Approve/Reject)
- Tasks (CRUD, Assign, Complete)
- Dashboard (View, Stats, Reports, Analytics)

**Usage:**
```bash
npm run seed:permissions
```

**What it does:**
- Creates all permissions for each module
- Creates module definitions
- Initializes system roles (if not exists)
- Assigns default permissions to each role:
  - `super_admin` - All permissions
  - `admin` - All permissions
  - `hr` - Only HR module permissions
  - `representative` - Leads and Dashboard permissions

---

### 3. HR Seeder (`hrSeed.ts`)
Seeds HR users for testing.

**Usage:**
```bash
npm run seed:hr          # Skip if users exist
npm run seed:hr:force    # Force recreate users
```

---

### 4. Hiring Seeder (`hiringSeed.ts`)
Seeds job postings and applications for testing.

**Usage:**
```bash
npm run seed:hiring       # Skip if jobs exist
npm run seed:hiring:force # Force recreate jobs
```

---

## Recommended Seeding Order

For a fresh database setup:

```bash
# 1. Seed roles first
npm run seed:roles

# 2. Seed permissions and assign to roles
npm run seed:permissions

# 3. Seed HR users (optional for testing)
npm run seed:hr

# 4. Seed hiring data (optional for testing)
npm run seed:hiring
```

---

## Notes

- All seeders are idempotent (safe to run multiple times)
- System roles and permissions are protected from deletion
- Make sure MongoDB connection is configured in `.env`
- Seeders will automatically disconnect after completion
