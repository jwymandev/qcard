# User Roles and Administrative Access

This document explains how to manage user roles in the QCard application.

## Available Roles

QCard uses three user roles:

1. **USER** - Regular users with standard access (default)
2. **ADMIN** - Administrators who can manage users and content
3. **SUPER_ADMIN** - Super administrators with full system access

## How to Promote Users

We provide two simple scripts to promote users to higher privilege levels:

### Promote to ADMIN

```bash
./make-admin.sh user@example.com
```

This will:
- Find the user with the specified email
- Promote them to ADMIN role
- Display the updated role information

### Promote to SUPER_ADMIN

```bash
./make-super-admin.sh user@example.com
```

This will:
- Find the user with the specified email
- Promote them to SUPER_ADMIN role
- Display the updated role information

## Using These Scripts in Production

On your DigitalOcean deployment:

1. Upload the scripts to your server
2. Make them executable:
   ```
   chmod +x make-admin.sh make-super-admin.sh
   chmod +x scripts/make-user-admin.js scripts/make-user-super-admin.js
   ```
3. Run the appropriate script with the user's email

The scripts will automatically load your environment variables to ensure they connect to the right database.

## Role Permissions

### ADMIN Users Can:
- Manage studio and talent profiles
- View and modify content across the platform
- Access the admin dashboard
- Run administrative reports
- Manage casting calls and projects

### SUPER_ADMIN Users Can:
- Do everything ADMIN users can
- Manage all users including other admins
- Access system configuration
- View system logs
- Perform database operations
- Access development features

## Security Considerations

- Only promote trusted individuals to higher roles
- Regularly audit your admin and super admin users
- Consider implementing additional authentication for admin actions
- Log all administrative actions for audit purposes