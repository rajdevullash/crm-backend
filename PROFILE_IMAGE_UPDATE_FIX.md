# Profile Image Update Fix

## Problem
When users (especially representatives) tried to update their profile image, the backend was not saving it due to **permission restrictions** in the authentication middleware.

## Root Cause
The PATCH route `/auth/:id` was configured to only allow `SUPER_ADMIN` and `ADMIN` roles:

```typescript
// BEFORE (auth.route.ts)
router.patch(
  '/:id',
  uploadProfileImage,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN), // ❌ Representatives blocked!
  AuthController.updateUser
)
```

This meant **representatives couldn't update their own profiles**, including their profile pictures.

## Solution

### 1. Updated Route Permissions (`auth.route.ts`)
Added `REPRESENTATIVE` role to the allowed roles:

```typescript
// AFTER
router.patch(
  '/:id',
  uploadProfileImage,
  auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.REPRESENTATIVE), // ✅ Representatives allowed
  AuthController.updateUser
)
```

### 2. Added Security Check (`auth.controller.ts`)
Added a security check to ensure representatives can only update their **own** profile:

```typescript
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = (req as any).user; // Get the authenticated user

  // Security check: Representatives can only update their own profile
  if (user?.role === 'representative' && user?.userId !== id) {
    return res.status(httpStatus.FORBIDDEN).json({
      success: false,
      message: 'You can only update your own profile',
    });
  }

  // ... rest of the update logic
});
```

## What Works Now

✅ **Administrators** can update any user's profile (including profile images)
✅ **Representatives** can update their own profile and profile image
✅ **Representatives** cannot update other users' profiles (security enforced)
✅ Profile images are correctly uploaded to `/uploads/profileImages/`
✅ Image paths are saved in the database as `/uploads/profileImages/filename.ext`

## Files Modified

1. **`backend/src/app/modules/auth/auth.route.ts`**
   - Added `ENUM_USER_ROLE.REPRESENTATIVE` to the PATCH `/:id` route

2. **`backend/src/app/modules/auth/auth.controller.ts`**
   - Added security check to prevent representatives from updating other users' profiles

## Testing

### Test Representative Profile Update
1. Login as a representative user
2. Go to profile page
3. Update profile image
4. Click "Save Changes"
5. **Expected**: Profile image should update successfully ✅
6. **Expected**: Image should display with correct URL ✅

### Test Security
1. Login as a representative user
2. Try to update another user's profile via API
3. **Expected**: Should receive 403 Forbidden error ✅

### Test Admin/Super Admin
1. Login as admin or super admin
2. Update any user's profile
3. **Expected**: Should work without restrictions ✅

## Related Frontend Changes

The frontend already has the correct implementation:
- Uses `FormData` to send the profile image
- Calls `updateUser` action from Redux
- Image URL utility automatically handles localhost and production URLs

## Verification Checklist

- [✅] Representatives can access the PATCH `/:id` route
- [✅] Representatives can only update their own profile
- [✅] Admins can update any user's profile
- [✅] Profile images are saved to disk
- [✅] Profile image paths are saved in database
- [✅] Multer middleware is correctly configured
- [✅] No linter errors

## Additional Notes

### Multer Configuration
The `uploadProfileImage` middleware is already correctly configured:
- **Storage**: `/uploads/profileImages/`
- **File types**: JPG, PNG, WEBP
- **Size limit**: 10 MB
- **Field name**: `profileImage`

### Database Schema
The `User` model already has the `profileImage` field:
```typescript
profileImage?: string; // Path: /uploads/profileImages/filename.ext
```

### Frontend Integration
The frontend already uses:
- `getProfileImageUrl()` to construct full URLs
- `FormData` for file uploads
- Proper Redux actions for updates

## Next Steps (Optional Enhancements)

1. **Image Optimization**: Consider resizing images on upload
2. **Old Image Cleanup**: Delete old profile images when updating
3. **Cloudinary Integration**: Move from local storage to cloud storage for production
4. **Image Validation**: Add more robust image validation (dimensions, format verification)
5. **Progress Indicator**: Show upload progress in frontend

