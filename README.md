# 🎓 Open-EDU - Interactive Learning Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-blue?style=for-the-badge)](https://koosty.github.io/open-edu/)
[![Version](https://img.shields.io/badge/Version-v1.6.0-green?style=for-the-badge)](https://github.com/koosty/open-edu/releases/tag/v1.6.0)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![codecov](https://codecov.io/gh/koosty/open-edu/graph/badge.svg?token=IMAX8MJSEQ)](https://codecov.io/gh/koosty/open-edu)

**A modern, feature-rich learning platform with markdown rendering, interactive quizzes, progress tracking, and comprehensive course management.**

Built with SvelteKit, Firebase, and TypeScript. Transform your learning journey with a best-in-class reading experience, content analytics, and mobile-optimized design.

---

## 🎯 About Us

Open-EDU is a **100% open-source learning management system** built for developers, educators, and institutions who value:

- **🔓 Full Control** - Self-hosted on your infrastructure, no vendor lock-in
- **💰 Zero Cost** - Free forever, no hidden fees or premium tiers
- **🔒 Privacy-First** - Your data stays in your Firebase project, no tracking
- **🛠️ Developer-Friendly** - Modern tech stack (SvelteKit, TypeScript, Firebase)
- **🚀 Easy Deployment** - Deploy to GitHub Pages, Vercel, Netlify, or Cloudflare in <5 minutes
- **📚 Rich Features** - Markdown lessons, interactive quizzes, progress tracking, note-taking

### Why Open-EDU?

Traditional LMS platforms (Moodle, Canvas, Blackboard) are either:
- ❌ **Expensive** - $1-5 per student/month (adds up fast!)
- ❌ **Clunky** - Old UI/UX, slow performance
- ❌ **Closed Source** - Can't customize or audit code
- ❌ **Vendor Lock-In** - Hard to migrate data out

**Open-EDU is different:**
- ✅ MIT licensed - Use commercially, modify freely
- ✅ Modern stack - Fast, responsive, mobile-first
- ✅ Firebase-powered - Serverless, scales automatically
- ✅ Active development - New features added regularly

### Who Uses Open-EDU?

- **Bootcamps & Training Programs** - Teach programming, design, or any skill
- **Educational Institutions** - Schools, universities, online academies
- **Corporate Training** - Employee onboarding and skill development
- **Content Creators** - Bloggers, YouTubers building course businesses
- **Open Source Projects** - Community learning resources

### Our Mission

Make high-quality education technology accessible to everyone. No subscriptions, no usage limits, no tracking. Just a powerful, privacy-respecting learning platform that you control.

---

## 💰 Pricing

### Free Forever

Open-EDU is **100% free** and **open source** under the MIT License.

**What you get:**
- ✅ Unlimited courses, lessons, and quizzes
- ✅ Unlimited students and instructors
- ✅ All features (no premium tier)
- ✅ Commercial use allowed
- ✅ Self-hosted (you control your data)
- ✅ Community support (GitHub Issues & Discussions)

### Firebase Costs (Your Only Expense)

Open-EDU uses Firebase for backend services. **Most small deployments run for free** on Firebase's generous free tier:

| Service | Free Tier | Typical Usage (100 students) | Est. Cost |
|---------|-----------|------------------------------|-----------|
| **Authentication** | 50,000 MAU | 100 users | **$0** |
| **Firestore Reads** | 50,000/day | ~5,000/day | **$0** |
| **Firestore Writes** | 20,000/day | ~1,000/day | **$0** |
| **Firestore Storage** | 1 GB | ~100 MB | **$0** |
| **Hosting** | 10 GB/month | ~2 GB/month | **$0** |
| **Functions** | 2M invocations | ~50k/month | **$0** |

**Total Monthly Cost (100 students):** **$0** ✨

#### Scaling Costs (Large Deployments)

For larger deployments (1,000+ active students):

| Students | Reads/Day | Est. Firebase Cost | Open-EDU Cost |
|----------|-----------|-------------------|---------------|
| 100 | 5,000 | **$0** (free tier) | **$0** |
| 500 | 25,000 | **$0** (free tier) | **$0** |
| 1,000 | 50,000 | **$0-5/month** | **$0** |
| 5,000 | 250,000 | **$20-40/month** | **$0** |
| 10,000 | 500,000 | **$60-100/month** | **$0** |

**Compare with Competitors:**

| Platform | 100 Students | 1,000 Students | 10,000 Students | Control |
|----------|--------------|----------------|-----------------|---------|
| **Open-EDU** | **$0** | **$0-5/mo** | **$60-100/mo** | ✅ Full |
| Teachable | $119/mo | $299/mo | $2,000+/mo | ❌ None |
| Thinkific | $99/mo | $499/mo | Custom ($$$$) | ❌ None |
| Kajabi | $149/mo | $399/mo | Custom ($$$$) | ❌ None |
| Canvas LMS | $200+/mo | $1,000+/mo | $10,000+/mo | ⚠️ Limited |

### Hidden Savings

Beyond infrastructure costs, Open-EDU saves you money on:
- ❌ **No Transaction Fees** - Keep 100% of course revenue
- ❌ **No Per-User Fees** - Scale without paying more
- ❌ **No Setup Fees** - Start immediately, no contracts
- ❌ **No Consulting Fees** - Open source code is self-documenting
- ❌ **No Migration Fees** - Own your data, export anytime

### Cost Optimization Tips

**Keep Firebase costs low:**
1. Enable caching (reduce reads)
2. Use composite indexes (faster queries)
3. Implement pagination (limit query size)
4. Archive old courses (reduce storage)
5. Use Firebase Emulators for development (free local testing)

See [Firebase Pricing Calculator](https://firebase.google.com/pricing) for detailed estimates.

### Enterprise Support (Optional)

While Open-EDU is free, you can purchase optional services:
- **Custom Development** - Need custom features? Hire the maintainers
- **Migration Services** - Import from Moodle, Canvas, etc.
- **Training & Onboarding** - Live workshops for your team
- **Priority Support** - SLA-backed responses

📧 Interested? Open a [GitHub Discussion](https://github.com/koosty/open-edu/discussions) to discuss.

---

## 🌟 Features

### 🎓 **Learning Experience**
- 📝 **Rich Markdown Lessons** - GFM support with syntax highlighting (180+ languages) and LaTeX math (KaTeX)
- 📊 **Progress Tracking** - Scroll-based reading progress with time estimation and auto-save position
- 📒 **Note-Taking System** - Create notes with tags, colors, and bookmarks with full-text search
- 📑 **Table of Contents** - Auto-generated TOC with active heading tracking
- ⌨️ **Keyboard Navigation** - Arrow keys for lesson navigation, focus mode, font size control
- 🌙 **Dark Mode** - Light/dark themes with WCAG AA compliance

### 📝 **Quiz System**
- 🎯 **6 Question Types** - Multiple choice, multiple select, true/false, short answer, essay, fill-in-the-blank
- 🎨 **Visual Quiz Builder** - Drag-and-drop interface for instructors
- ⏱️ **Quiz Timer** - Countdown timer with time limit enforcement
- 📊 **Automated Grading** - Instant scoring with configurable pass thresholds
- 🔄 **Multiple Attempts** - Configurable retry system with attempt tracking
- 💡 **Hints & Explanations** - Optional hints during quiz, detailed explanations in results
- 📈 **Quiz Analytics** - Real-time statistics (attempts, average score, pass rate)

### 👥 **User Management**
- 🔐 **Google OAuth** - One-click sign-in with Firebase Authentication
- 👥 **Role-Based Access** - Admin, instructor, and student roles
- 📋 **Enrollment System** - Course discovery and enrollment management
- 🔒 **Route Protection** - Secure pages with AuthGuard component

### 🏫 **Instructor Tools**
- 📚 **Course Management** - Full CRUD for courses, lessons, and quizzes
- 📈 **Content Analytics** - Engagement metrics and student progress insights
- 🧪 **Quiz Management** - Publishing, monitoring, and editing interface
- 📱 **Mobile-Optimized** - Touch gestures, responsive design, bottom sheet UI

### 🛠️ **Technical Stack**
- ⚡ **SvelteKit + Svelte 5** - Modern reactive frontend with runes
- 🔥 **Firebase** - Authentication, Firestore database, and Cloud Storage
- 🎨 **Tailwind CSS 4.x** - Modern styling with custom component library
- 🧪 **Vitest** - Comprehensive testing with browser and unit tests
- 📦 **TypeScript** - Strict mode with full type safety

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Firebase project (for authentication and database)

### 1. Clone & Install
```bash
git clone https://github.com/koosty/open-edu.git
cd open-edu
npm install
```

### 2. Firebase Configuration
Create a Firebase project at [firebase.google.com](https://firebase.google.com) and enable:
- Authentication (Google provider)
- Firestore Database
- Storage (optional)

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Add your Firebase config:
```env
PUBLIC_FIREBASE_API_KEY=your_api_key_here
PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Deploy Firebase Rules and Indexes
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

### 4. Database Seeding
After setting up Firebase, you need to seed the database with initial data (admin user and sample courses):

#### **🚀 Automated Seeding (Recommended)**
```bash
# One command to seed everything automatically
./seed-automated.sh
```

This automated script will:
1. ✅ Temporarily deploy open security rules 
2. ✅ Create admin user with your Google account
4. ✅ Restore production security rules

#### **📋 Manual Seeding (Alternative)**
If the automated script doesn't work, you can manually add data:

1. **Get your User UID**:
```bash
firebase auth:export temp-users.json
# Find your UID in the exported file, then:
rm temp-users.json
```

2. **Open Firebase Console**: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/data

3. **Create admin user**:
   - Create collection: `users`
   - Create document with your UID as document ID
   - Add fields: `{ id, email, displayName: "Admin User", role: "admin", ... }`

4. **Add sample courses**:
   - Create collection: `courses` 
   - Add sample course documents with lesson data

For detailed JSON structures, see the automated seeding script: `scripts/automated-seed.mjs`

### 5. Development
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your app!

### 6. Testing
```bash
# Run unit tests
npm run test

# Run type checking
npm run check

# Run tests in watch mode
npm run test:unit

# Run specific test file
npm run test:unit -- src/lib/services/markdown.spec.ts
```

### 7. Production Build
```bash
npm run build
npm run preview
```

---

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: SvelteKit 2.x with Svelte 5 (runes)
- **Styling**: Tailwind CSS 4.x with custom component library
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firestore (NoSQL) with composite indexes
- **Storage**: Firebase Cloud Storage
- **Markdown**: Marked.js + Highlight.js + KaTeX
- **Testing**: Vitest with browser and unit tests
- **TypeScript**: Strict mode with full type safety

### **Key Design Decisions**
- **Google OAuth Only**: Simplified authentication (no email/password complexity)
- **Svelte 5 Runes**: Modern reactive state with `$state()` in `.svelte.ts` files
- **shadcn-svelte Components**: Beautifully designed, accessible UI components built on Bits UI
- **Markdown-First**: Rich content rendering with full GFM support
- **Mobile-First**: Touch gestures and responsive design throughout
- **Analytics-Driven**: Instructor insights for engagement optimization

---

## 🚀 Deployment

### **Automatic Deployment**
The app automatically deploys to GitHub Pages when you create a release:

1. **Continuous Integration**: Tests run on every push
2. **Release Deployment**: Deploy only when creating GitHub releases
3. **Live URL**: [koosty.github.io/open-edu](https://koosty.github.io/open-edu/)

### **Manual Deployment**
```bash
# Build for production
npm run build

# Deploy to GitHub Pages (requires setup)
# See DEPLOYMENT.md for detailed instructions
```

For detailed deployment setup, see [DEPLOYMENT.md](DEPLOYMENT.md).



---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure tests pass: `npm run test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### **Code Style**
- TypeScript strict mode
- Svelte 5 runes for reactivity  
- Tailwind CSS 4.x for styling
- shadcn-svelte for UI components
- ESLint + Prettier for formatting
- Comprehensive JSDoc comments

### **Testing Requirements**
- Unit tests for new functionality
- Component tests for UI changes
- All tests must pass before merging
- Aim for >80% code coverage

### **Commit Message Convention**
```
type(scope): subject

feat(markdown): add callout block support
fix(auth): resolve login redirect issue
test(notes): add bookmark CRUD tests
docs(readme): update feature list
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Support & Community

- 🌐 [Live Demo](https://koosty.github.io/open-edu/)
- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/koosty/open-edu/issues)
- 💬 [Discussions](https://github.com/koosty/open-edu/discussions)
- 🔒 [Privacy Policy](PRIVACY.md)

---

## 🎯 Getting Help

### Common Issues

**Q: Firebase authentication not working?**
A: Make sure you've enabled Google OAuth in Firebase Console and added your domain to authorized domains.

**Q: Database seeding fails?**
A: Check that your Firebase config is correct in `.env.local` and you have proper permissions.

**Q: Tests failing on install?**
A: Run `npm install` again and ensure Node.js 18+ is installed.

**Q: Reading position not saving?**
A: Ensure Firestore indexes are deployed with `firebase deploy --only firestore:indexes`.

---

<div align="center">
  <p><strong>Made with ❤️ for the developer community</strong></p>
  <p>
    <a href="https://koosty.github.io/open-edu/">Live Demo</a> •
    <a href="docs/">Documentation</a> •
    <a href="PRIVACY.md">Privacy</a>
  </p>
  <p>
    <strong>v1.6.0</strong> - Open Source Learning Platform
  </p>
</div>
