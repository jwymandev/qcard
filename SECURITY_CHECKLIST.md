# Security Checklist for QCard Project

## Immediate Actions for Database Credential Exposure

1. **Rotate All Exposed Credentials**
   - [x] Change DigitalOcean database password immediately
   - [x] Generate new NextAuth secret
   - [x] Update all environment files with new credentials
   - [x] Update all deployed instances with new secrets

2. **Remove Sensitive Files from Git History**
   ```bash
   # Remove sensitive files from Git tracking
   git rm --cached .env.do .env.production .env-e .env
   
   # Commit this change
   git commit -m "chore: remove sensitive files from git tracking"
   
   # Update .gitignore (already done)
   
   # If sensitive information is deep in Git history, consider using:
   # WARNING: This rewrites Git history - only use if absolutely necessary and coordinate with team
   # git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env*" --prune-empty --tag-name-filter cat -- --all
   ```

3. **Secure Environment Variables in CI/CD**
   - [ ] Update all CI/CD pipelines to use secrets/environment variables
   - [ ] Ensure no hardcoded credentials in deployment scripts
   - [ ] Use secrets manager in production environments

## Ongoing Security Practices

1. **Environment Variables Management**
   - [ ] Keep `.env.example` updated with all required variables but NO real values
   - [ ] Never commit `.env*` files to the repository
   - [ ] Use separate environment files for different environments
   - [ ] Consider using a secret manager (AWS Secrets Manager, Hashicorp Vault, etc.)

2. **Database Security**
   - [ ] Use environment-specific database users with minimal permissions
   - [ ] Regularly rotate database credentials
   - [ ] Enable SSL/TLS for all database connections
   - [ ] Implement connection pooling with proper timeout settings

3. **Authentication**
   - [ ] Rotate NEXTAUTH_SECRET regularly
   - [ ] Ensure JWT expiration times are appropriate
   - [ ] Implement proper session validation
   - [ ] Consider enabling two-factor authentication for admin users

4. **Secure Coding Practices**
   - [ ] Implement input validation for all user inputs
   - [ ] Use parameterized queries for database access
   - [ ] Implement proper CSRF protection
   - [ ] Set secure and HttpOnly flags on cookies
   - [ ] Implement proper Content Security Policy (CSP)

5. **Regular Security Audits**
   - [ ] Perform dependency scanning (npm audit)
   - [ ] Code reviews with security focus
   - [ ] Consider automated security scanning tools
   - [ ] Regular penetration testing

## Additional Recommendations

1. **DigitalOcean Database Security**
   - [ ] Restrict database access to specific IP addresses
   - [ ] Use VPC for database connections where possible
   - [ ] Enable automated backups
   - [ ] Monitor database access logs

2. **Application Monitoring**
   - [ ] Implement error logging
   - [ ] Set up alerts for suspicious activities
   - [ ] Monitor for unusual traffic patterns

3. **Documentation**
   - [ ] Document security procedures for the team
   - [ ] Create incident response plan
   - [ ] Maintain list of all external services and access methods

## Command Reference

### Generate New NextAuth Secret
```bash
# Generate a new secure random string for NEXTAUTH_SECRET
openssl rand -base64 32
```

### Rotate Secrets
```bash
# Run the secret rotation script
node scripts/rotate-secrets.js
```

### Check Git for Sensitive Files
```bash
# Check if sensitive files are tracked by Git
git ls-files | grep -i "\.env\|secret\|password\|key"
```