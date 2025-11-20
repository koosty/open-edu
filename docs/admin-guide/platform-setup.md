# Administrator Guide: Platform Setup & Maintenance

This guide covers setting up, deploying, and maintaining Open-EDU for platform administrators.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Database Seeding](#database-seeding)
5. [Security Rules](#security-rules)
6. [User Management](#user-management)
7. [Deployment](#deployment)
8. [Maintenance & Monitoring](#maintenance--monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Local Development**:
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or pnpm 8.x+)
- **Git**: For version control
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

**Firebase Account**:
- Google account
- Firebase project (free Spark plan sufficient to start)
- Billing enabled for production (Blaze plan)

**Optional**:
- GitHub account (for CI/CD)
- Domain name (for custom hosting)

### Skills Required

**Technical Knowledge**:
- Basic command line usage
- JavaScript/TypeScript basics
- Firebase Console navigation
- Git fundamentals

---

## Initial Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/koosty/open-edu.git
cd open-edu

# Install dependencies
npm install
```

### Step 2: Verify Installation

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Check npm version
npm --version   # Should be 9.x or higher

# Run type checking
npm run check   # Should pass with no errors

# Run tests
npm run test    # Should show 89 tests passing
```

**Expected Output**:
```
✓ 89 tests passing
  ✓ Markdown Service (35 tests)
  ✓ Reading Progress (33 tests)
  ✓ Notes Service (21 tests)
```

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name (e.g., "open-edu-prod")
4. Enable Google Analytics (optional but recommended)
5. Click **"Create Project"**

### Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get Started"**
3. Navigate to **"Sign-in Method"** tab
4. Enable **"Google"** provider:
   - Toggle on "Enable"
   - Set support email
   - Click "Save"

**Add Authorized Domains** (for production):
1. Go to **"Settings"** in Authentication
2. Under **"Authorized domains"**, click **"Add domain"**
3. Add your production domain (e.g., `yourdomain.com`)
4. Add localhost for development (already included)

### Step 3: Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **"Create Database"**
3. Choose **"Start in test mode"** (we'll deploy rules later)
4. Select location (choose closest to your users):
   - `us-central1` (USA)
   - `europe-west1` (Europe)
   - `asia-northeast1` (Asia)
5. Click **"Enable"**

### Step 4: Enable Cloud Storage (Optional)

1. Go to **Storage** in Firebase Console
2. Click **"Get Started"**
3. Accept default rules
4. Choose same location as Firestore
5. Click **"Done"**

### Step 5: Get Firebase Config

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **"Web"** icon (</>)
4. Register app with nickname (e.g., "Open-EDU Web")
5. Copy the Firebase config object

### Step 6: Create Environment File

```bash
# Copy example environment file
cp .env.example .env.local
```

**Edit `.env.local`** with your Firebase config:

```env
# Firebase Configuration (from Firebase Console)
PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Admin User Configuration (for seeding)
ADMIN_USER_UID=will_be_filled_after_first_login
ADMIN_USER_EMAIL=admin@yourdomain.com
ADMIN_USER_DISPLAY_NAME=Admin User

# Optional: Codecov (for CI/CD coverage reporting)
CODECOV_TOKEN=your_codecov_token_here
```

> **Security Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

---

## Database Seeding

### Why Seeding is Needed

Fresh Firebase projects have no data. You need:
- Admin user with proper role
- Sample courses (optional but recommended)
- Initial lesson content
- Test quiz data

### Automated Seeding (Recommended)

**Step 1: Login First**
```bash
# Start development server
npm run dev

# Open http://localhost:5173
# Click "Sign In" and log in with Google
# This creates your user in Firebase Auth
```

**Step 2: Get Your User UID**
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Export users to get your UID
firebase auth:export temp-users.json --project your-project-id

# Open temp-users.json and copy your UID
# It looks like: "uid": "AbCdEf123456..."

# Delete the file (don't commit!)
rm temp-users.json
```

**Step 3: Update Environment**

Add your UID to `.env.local`:
```env
ADMIN_USER_UID=AbCdEf123456...  # Your UID here
ADMIN_USER_EMAIL=your-email@gmail.com
ADMIN_USER_DISPLAY_NAME=Admin User
```

**Step 4: Run Automated Seeding**
```bash
# Make script executable
chmod +x seed-automated.sh

# Run seeding script
./seed-automated.sh
```

**What This Does**:
1. ✅ Deploys temporary open rules to Firestore
2. ✅ Creates your admin user document
3. ✅ Seeds sample courses (JavaScript & React)
4. ✅ Creates lessons with markdown content
5. ✅ Adds sample quizzes
6. ✅ Restores production security rules

**Expected Output**:
```
✅ Admin user created successfully
✅ Sample courses seeded
✅ Security rules deployed
🎉 Database seeding complete!
```

### Manual Seeding (Alternative)

If automated seeding fails:

**1. Create Admin User**:
- Go to Firestore Console
- Create collection: `users`
- Create document with your UID as document ID
- Add fields:
  ```json
  {
    "id": "your-uid-here",
    "email": "admin@example.com",
    "displayName": "Admin User",
    "role": "admin",
    "createdAt": "2025-01-20T12:00:00Z"
  }
  ```

**2. Create Sample Course**:
- Create collection: `courses`
- Add document with auto-generated ID
- Use structure from `scripts/automated-seed.mjs`

**3. Deploy Security Rules**:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Security Rules

### Firestore Rules

Open-EDU includes 3 rule sets:

**1. Open Rules** (`firestore.open.rules`):
- Development only
- Allows all reads/writes
- **Never use in production!**

**2. Production Rules** (`firestore.production.rules`):
- Role-based access control
- Admins: Full access
- Instructors: Can manage their courses
- Students: Read-only + own progress

**3. Standard Rules** (`firestore.rules`):
- Default rules file
- Copy from production rules

### Deploying Rules

**Initial Deployment**:
```bash
# Deploy production rules
firebase deploy --only firestore:rules --project your-project-id

# Deploy composite indexes (required!)
firebase deploy --only firestore:indexes --project your-project-id
```

**Verifying Rules**:
1. Go to Firestore Console
2. Click **"Rules"** tab
3. Verify rules match `firestore.production.rules`
4. Check last deployed timestamp

### Testing Rules

```bash
# Test rules locally
firebase emulators:start --only firestore

# In another terminal, run tests
npm run test
```

### Common Rule Patterns

**Admin-Only Collection**:
```javascript
match /admins/{document=**} {
  allow read, write: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**User-Owned Documents**:
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

**Public Read, Admin Write**:
```javascript
match /courses/{courseId} {
  allow read: if true;
  allow write: if request.auth != null 
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'instructor'];
}
```

---

## User Management

### Creating Admin Users

**Method 1: During Seeding**
- Set `ADMIN_USER_UID` in `.env.local`
- Run seeding script
- User gets admin role automatically

**Method 2: Manual Promotion**
1. User signs in with Google
2. Go to Firestore Console
3. Find user document in `users` collection
4. Edit document, change `role` field to `"admin"`
5. Save

**Method 3: Firebase CLI**
```bash
# Using Firebase CLI (install first)
firebase firestore:write users/USER_UID_HERE '{
  "role": "admin",
  "displayName": "New Admin",
  "email": "admin@example.com"
}' --project your-project-id
```

### Role Hierarchy

**Roles Available**:
1. **admin**: Full platform access
   - Create courses
   - Manage all users
   - View all analytics
   - Access admin panel

2. **instructor**: Course management
   - Create own courses
   - Manage enrolled students
   - View course analytics
   - Grade quizzes

3. **student**: Learning access (default)
   - Enroll in courses
   - Take quizzes
   - Track progress
   - Add notes/bookmarks

### Removing Users

**Soft Delete** (Recommended):
1. Go to Firestore Console
2. Find user document
3. Change `role` to `"inactive"`
4. User can't access admin/instructor features
5. Data preserved for audit

**Hard Delete** (Permanent):
```bash
# Delete from Authentication
firebase auth:delete USER_UID --project your-project-id

# Delete from Firestore (via Console)
# Go to Firestore > users > [userId] > Delete
```

> **Warning**: Hard delete cannot be undone. Consider soft delete first.

---

## Deployment

### Development Environment

```bash
# Start dev server with hot reload
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

**Build Output**:
- Static files in `build/` directory
- Ready for deployment to any static host

### Deployment Options

#### Option 1: GitHub Pages (Free)

**Setup**:
1. Push code to GitHub repository
2. Go to Repository Settings → Pages
3. Source: GitHub Actions
4. Workflow file: `.github/workflows/deploy.yml` (included)

**Automatic Deployment**:
- Deploys on release creation
- URL: `https://yourusername.github.io/open-edu`

**Manual Deployment**:
```bash
npm run build
npm run deploy
```

#### Option 2: Firebase Hosting

```bash
# Initialize Firebase Hosting
firebase init hosting

# Choose options:
# - Public directory: build
# - Single-page app: Yes
# - GitHub auto-deploy: Optional

# Deploy
firebase deploy --only hosting
```

**Custom Domain**:
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow DNS configuration steps
4. Wait for SSL certificate (automatic)

#### Option 3: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

#### Option 4: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Production
netlify deploy --prod
```

### Environment Variables in Production

**Important**: Set environment variables in your hosting platform:

**GitHub Pages**: Use repository secrets
**Firebase Hosting**: Use `.env` files (not tracked in git)
**Vercel/Netlify**: Use dashboard environment variable settings

---

## Maintenance & Monitoring

### Regular Tasks

**Daily**:
- Monitor error logs (Firebase Console → Functions/Hosting)
- Check user signups and activity
- Respond to support requests

**Weekly**:
- Review course analytics
- Check database usage (Firestore quotas)
- Review authentication logs
- Update content as needed

**Monthly**:
- Audit user roles and permissions
- Review Firebase costs
- Update dependencies (`npm outdated`)
- Backup Firestore data

### Monitoring Dashboard

**Firebase Console Metrics**:
1. **Authentication**: Active users, sign-ins
2. **Firestore**: Reads, writes, deletes
3. **Storage**: File uploads, bandwidth
4. **Hosting**: Page views, bandwidth

**Setting Up Alerts**:
1. Go to Firebase Console → Integrations
2. Connect to Google Cloud Monitoring
3. Set up alerts for:
   - High error rates
   - Quota limits
   - Unusual traffic

### Database Backups

**Automated Backups** (Blaze plan required):
```bash
# Export Firestore to Cloud Storage
gcloud firestore export gs://your-bucket-name/backups

# Schedule daily backups with Cloud Scheduler
```

**Manual Export**:
1. Go to Firestore Console
2. Click **"Import/Export"** tab
3. Click **"Export"**
4. Choose collections
5. Download to local machine

### Performance Optimization

**Firestore Indexes**:
- Composite indexes defined in `firestore.indexes.json`
- Deploy with: `firebase deploy --only firestore:indexes`
- Monitor index usage in Console

**Caching Strategy**:
- Static assets cached at CDN
- Firestore queries use offline persistence
- Consider adding Service Worker

**Scaling Tips**:
- Use pagination for large lists
- Implement lazy loading
- Optimize images (WebP format)
- Use Firebase CDN for static files

---

## Troubleshooting

### Common Issues

**Issue: "Permission Denied" Errors**

**Causes**:
- Security rules not deployed
- User role incorrect
- Firestore indexes missing

**Solutions**:
```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Check user role in Firestore Console
```

**Issue: Authentication Not Working**

**Causes**:
- Domain not authorized
- Firebase config incorrect
- Google OAuth not enabled

**Solutions**:
1. Check Firebase Console → Authentication → Settings
2. Verify authorized domains include your deployment URL
3. Re-check `.env.local` values
4. Clear browser cache and retry

**Issue: Slow Performance**

**Causes**:
- Missing composite indexes
- Large unoptimized images
- Too many real-time listeners

**Solutions**:
1. Check Chrome DevTools Console for index warnings
2. Deploy missing indexes
3. Optimize images with tools like TinyPNG
4. Implement pagination

**Issue: Database Seeding Fails**

**Causes**:
- Open rules not deployed temporarily
- Firebase config incorrect
- Network issues

**Solutions**:
```bash
# Deploy open rules temporarily
firebase deploy --only firestore:rules --config firestore.open.rules

# Run seeding
node scripts/automated-seed.mjs

# Restore production rules
firebase deploy --only firestore:rules
```

### Debug Mode

**Enable Debug Logging**:
```javascript
// In src/lib/firebase.ts
import { setLogLevel } from 'firebase/firestore';
setLogLevel('debug');
```

**Browser Console**:
- Press F12 to open DevTools
- Check Console tab for errors
- Check Network tab for failed requests
- Check Application tab for Firebase data

### Getting Help

**Resources**:
- [Firebase Documentation](https://firebase.google.com/docs)
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [GitHub Issues](https://github.com/koosty/open-edu/issues)

**Support Channels**:
- Open issue on GitHub
- Firebase support (for Firebase issues)
- Stack Overflow (tag: sveltekit, firebase)

---

## Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git
- ✅ Use different Firebase projects for dev/prod
- ✅ Rotate API keys regularly
- ✅ Restrict API keys by domain (Firebase Console)

### Firestore Rules

- ✅ Always use production rules in production
- ✅ Test rules before deploying
- ✅ Principle of least privilege
- ✅ Validate all user inputs

### Authentication

- ✅ Enable only required sign-in methods
- ✅ Set authorized domains correctly
- ✅ Monitor authentication logs
- ✅ Implement rate limiting (Firebase App Check)

### Data Privacy

- ✅ Follow GDPR/CCPA guidelines
- ✅ Implement data deletion requests
- ✅ Don't store sensitive data in Firestore
- ✅ Use Firebase Security Rules for access control

---

## Scaling Considerations

### Free Tier Limits (Spark Plan)

**Firestore**:
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB stored

**Authentication**:
- 10 GB/month
- 50,000 verifications

**Hosting**:
- 10 GB storage
- 360 MB/day transfer

### Upgrading to Blaze Plan

**When to Upgrade**:
- >50 daily active users
- >1 GB data stored
- Need automated backups
- Want Cloud Functions

**Cost Estimate** (as of 2025):
- Pay-as-you-go pricing
- First tier often free
- Monitor usage in Firebase Console
- Set up billing alerts

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build production
npm run preview                # Preview build

# Testing
npm run test                   # Run tests
npm run check                  # Type check

# Firebase
firebase login                 # Login to Firebase
firebase deploy                # Deploy everything
firebase deploy --only firestore:rules    # Deploy rules
firebase deploy --only hosting            # Deploy hosting

# Database
./seed-automated.sh           # Seed database
```

### Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Environment variables (local) |
| `firebase.json` | Firebase project config |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Composite indexes |
| `seed-automated.sh` | Database seeding script |

---

**Platform administration** requires vigilance, regular monitoring, and proactive maintenance. Follow this guide, keep backups, and test changes in development before production deployment.

**Last Updated**: November 2025 | **Version**: 1.4.0
