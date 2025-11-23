# Privacy Policy

**Last Updated: November 23, 2025**

Open-EDU is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our open-source learning platform.

---

## 1. Overview

Open-EDU is a **self-hosted, open-source** learning management system. When you deploy your own instance, **you control all data**. This policy describes the data handling practices of the platform software itself.

### Key Principles
- ✅ **Self-Hosted**: You own and control your data
- ✅ **Open Source**: All code is auditable ([MIT License](LICENSE))
- ✅ **Minimal Data Collection**: Only essential data for platform functionality
- ✅ **No Third-Party Analytics**: No Google Analytics, tracking pixels, or advertising networks
- ✅ **Transparent**: All data storage is in your Firebase project

---

## 2. Information We Collect

### 2.1 Authentication Data (Firebase Auth)
When you sign in with Google OAuth, we collect:
- **Google Account Email** - Used for account identification
- **Display Name** - Shown in the UI
- **Google Profile Picture URL** - Optional avatar display
- **User ID (UID)** - Firebase-generated unique identifier

**How We Use It:**
- User authentication and session management
- Displaying your name in the interface
- Role-based access control (admin, instructor, student)

**Storage Location:** Firebase Authentication service

---

### 2.2 User Profile Data (Firestore)
We store additional user information in Firestore:

```typescript
{
  id: string,              // Firebase UID
  email: string,           // Google account email
  displayName: string,     // Your display name
  role: string,           // "admin" | "instructor" | "student"
  createdAt: Timestamp,   // Account creation date
  updatedAt: Timestamp    // Last profile update
}
```

**How We Use It:**
- Role-based access control
- User identification in courses and quizzes
- Analytics and progress tracking

**Storage Location:** Firestore collection `users`

---

### 2.3 Course & Learning Data (Firestore)

#### **Courses**
- Course title, description, instructor
- Lessons (markdown content, order)
- Quizzes (questions, answers, settings)
- Timestamps (created, updated)

#### **Enrollments**
- User ID + Course ID
- Enrollment date
- Progress percentage
- Completion status

#### **Progress Tracking**
- Lesson completion status
- Reading position (scroll position, last visited)
- Time spent on lessons
- Quiz attempts and scores

#### **Notes & Bookmarks**
- Note content and tags
- Bookmark locations
- Associated lesson IDs
- Colors and metadata

**How We Use It:**
- Delivering course content
- Tracking learning progress
- Providing personalized recommendations
- Generating analytics for instructors

**Storage Location:** Firestore collections:
- `courses`, `lessons`, `quizzes`, `questions`
- `enrollments`, `progress`, `quiz_attempts`
- `notes`, `bookmarks`, `analytics`

---

### 2.4 Browser Storage (Local)

#### **localStorage**
- Theme preference (light/dark mode)
- Reading position cache (auto-save)
- UI preferences (font size, reading mode)

#### **sessionStorage**
- Temporary quiz state (during attempts)
- Navigation history

**Note:** This data never leaves your browser and can be cleared anytime.

---

## 3. How We Use Your Information

### 3.1 Essential Platform Functions
- **Authentication**: Verifying your identity and managing sessions
- **Course Delivery**: Showing enrolled courses and lessons
- **Progress Tracking**: Saving your learning progress
- **Quizzes**: Storing attempts, grading, and results
- **Notes**: Saving your personal notes and bookmarks

### 3.2 Instructor Analytics
Instructors can view aggregated analytics:
- Course enrollment numbers
- Lesson completion rates
- Average quiz scores
- Time spent on content

**Privacy Note:** Individual student identities are visible only to instructors of enrolled courses.

### 3.3 No Advertising or Marketing
- ❌ We do NOT use your data for advertising
- ❌ We do NOT sell or share data with third parties
- ❌ We do NOT send marketing emails (unless you deploy email features)
- ❌ We do NOT track you across other websites

---

## 4. Data Sharing & Third-Party Services

### 4.1 Firebase (Google Cloud)
All data is stored in **your Firebase project**:
- **Firebase Authentication**: Google account login
- **Firestore Database**: Course data, user profiles, progress
- **Firebase Storage**: (Optional) File uploads, certificates

**Your Control:** You own the Firebase project and control:
- Data retention policies
- Backup strategies  
- User data exports
- Account deletion

**Firebase Privacy:** See [Google Cloud Privacy Policy](https://cloud.google.com/terms/cloud-privacy-notice)

### 4.2 Google OAuth
When you sign in with Google:
- Google provides your email, name, and profile picture
- Google's privacy policy applies: [Google Privacy Policy](https://policies.google.com/privacy)
- We only request basic profile information (no Drive, Calendar, etc.)

### 4.3 No Other Third Parties
Open-EDU does **not** integrate with:
- Analytics services (Google Analytics, Mixpanel, etc.)
- Advertising networks
- Social media trackers
- Email marketing platforms (unless you add them)

---

## 5. Data Security

### 5.1 Firebase Security Rules
All data access is controlled by Firestore security rules:
- Users can only access their own data
- Instructors can only access their own courses
- Admins have elevated privileges
- All rules are open-source and auditable

See: [`firestore.production.rules`](firestore.production.rules)

### 5.2 Authentication Security
- Google OAuth with industry-standard security
- No passwords stored (handled by Google)
- Session tokens managed by Firebase SDK
- HTTPS-only communication (enforced in production)

### 5.3 Your Responsibilities (Self-Hosted)
When you deploy Open-EDU, **you are responsible for**:
- ✅ Securing your Firebase project
- ✅ Configuring proper security rules
- ✅ Enabling HTTPS on your domain
- ✅ Regular backups of Firestore data
- ✅ Monitoring access logs
- ✅ Keeping dependencies updated

---

## 6. Data Retention & Deletion

### 6.1 Account Deletion
Users can request account deletion. When deleted:
- ✅ User profile is removed from Firestore
- ✅ Firebase Authentication account is deleted
- ✅ Personal notes and bookmarks are deleted
- ⚠️ Course enrollments and quiz attempts may be retained for analytics (anonymized)

**How to Delete:** Contact your platform administrator or use the Firebase Console.

### 6.2 Data Retention Policies
Default retention (configurable by administrators):
- **User Accounts**: Indefinite (until deletion requested)
- **Course Progress**: Indefinite (for learning history)
- **Quiz Attempts**: Indefinite (for academic records)
- **Notes**: Indefinite (until user deletion)
- **Session Data**: 30 days (Firebase default)

### 6.3 Data Export
Users can request a copy of their data:
- User profile information
- Enrollment history
- Quiz scores and attempts
- Notes and bookmarks

**How to Export:** Use Firebase Console or contact your administrator.

---

## 7. Cookies & Tracking

### 7.1 Essential Cookies Only
Open-EDU uses minimal cookies for essential functionality:

| Cookie Name | Purpose | Duration |
|-------------|---------|----------|
| Firebase Session | Authentication session | Until logout |
| Theme Preference | Light/dark mode | 1 year (localStorage) |

### 7.2 No Tracking Cookies
- ❌ No analytics cookies (Google Analytics, etc.)
- ❌ No advertising cookies
- ❌ No third-party tracking pixels
- ❌ No social media tracking

---

## 8. Children's Privacy

Open-EDU does **not knowingly collect** information from children under 13 without parental consent.

If you are deploying Open-EDU for educational institutions with minors:
- ✅ Ensure compliance with COPPA (USA) and local laws
- ✅ Obtain parental consent where required
- ✅ Implement age verification if necessary
- ✅ Review your Firebase project's privacy settings

---

## 9. Your Rights (GDPR & CCPA)

If you are in the EU or California, you have additional rights:

### GDPR Rights (EU)
- **Right to Access**: Request a copy of your data
- **Right to Rectification**: Correct inaccurate data
- **Right to Erasure**: Delete your account and data
- **Right to Data Portability**: Export your data
- **Right to Object**: Opt-out of certain processing

### CCPA Rights (California)
- **Right to Know**: What data we collect and why
- **Right to Delete**: Request data deletion
- **Right to Opt-Out**: We don't sell data (nothing to opt-out of)
- **Right to Non-Discrimination**: No penalties for exercising rights

**How to Exercise Rights:** Contact your platform administrator or Firebase project owner.

---

## 10. Changes to This Policy

We may update this Privacy Policy to reflect:
- Changes to platform features
- Legal compliance requirements
- Security improvements

**Notification:** Check the "Last Updated" date at the top of this page. Major changes will be announced in release notes.

---

## 11. Open Source Transparency

### Audit the Code
All data handling code is open source:
- **Authentication**: [`src/lib/auth.svelte.ts`](src/lib/auth.svelte.ts)
- **User Service**: [`src/lib/services/courses.ts`](src/lib/services/courses.ts)
- **Firebase Config**: [`src/lib/firebase.ts`](src/lib/firebase.ts)
- **Security Rules**: [`firestore.production.rules`](firestore.production.rules)

### Security Issues
Found a security vulnerability? Please report it:
- 🔒 **Private Report**: Email the project owner (see GitHub profile)
- 📢 **Public Issues**: [GitHub Issues](https://github.com/koosty/open-edu/issues) (for non-sensitive bugs)

---

## 12. Contact Information

### For Self-Hosted Instances
If you are using someone else's Open-EDU deployment:
- **Contact**: Your platform administrator (not the Open-EDU developers)
- **Data Requests**: Submit to the organization running the platform

### For Open-EDU Software
If you have questions about the platform software itself:
- **GitHub**: [github.com/koosty/open-edu](https://github.com/koosty/open-edu)
- **Issues**: [github.com/koosty/open-edu/issues](https://github.com/koosty/open-edu/issues)
- **Discussions**: [github.com/koosty/open-edu/discussions](https://github.com/koosty/open-edu/discussions)

---

## 13. Legal Compliance

### Open-EDU Software Compliance
The platform is designed to support:
- ✅ **GDPR** (General Data Protection Regulation - EU)
- ✅ **CCPA** (California Consumer Privacy Act)
- ✅ **FERPA** (Family Educational Rights and Privacy Act - USA schools)
- ✅ **COPPA** (Children's Online Privacy Protection Act - with proper setup)

**Your Responsibility:** When you deploy Open-EDU, **you** must ensure compliance with applicable laws in your jurisdiction.

---

## 14. Summary (TL;DR)

✅ **You control all data** (self-hosted, open source)  
✅ **Minimal data collection** (only what's needed for learning)  
✅ **No tracking or ads** (no analytics, no third-party trackers)  
✅ **Firebase-powered** (data stored in your Firebase project)  
✅ **Transparent & auditable** (all code is open source)  
✅ **Your rights respected** (GDPR, CCPA compliant)  

**Questions?** Open an issue on [GitHub](https://github.com/koosty/open-edu/issues) or contact your platform administrator.

---

<div align="center">
  <p><strong>Open-EDU - Privacy-Respecting, Open Source Learning</strong></p>
  <p>
    <a href="README.md">Back to README</a> •
    <a href="LICENSE">License</a> •
    <a href="https://github.com/koosty/open-edu">GitHub</a>
  </p>
</div>
