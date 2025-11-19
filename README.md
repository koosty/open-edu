# 🎓 Open-EDU - Interactive Learning Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-blue?style=for-the-badge)](https://koosty.github.io/open-edu/)
[![Version](https://img.shields.io/badge/Version-v1.2.0-green?style=for-the-badge)](https://github.com/koosty/open-edu/releases/tag/v1.2.0)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-89_Passing-success?style=for-the-badge)](package.json)

**A modern, feature-rich learning platform with markdown rendering, progress tracking, and interactive note-taking.**

Built with SvelteKit, Firebase, and TypeScript. Transform your learning journey with a best-in-class reading experience, content analytics, and mobile-optimized design.

---

## 🌟 Features

### ✅ **v1.2.0 - Enhanced Reading Experience (Current)**
- 📝 **Rich Markdown Rendering** - GFM support with syntax highlighting (180+ languages)
- 🧮 **LaTeX Math Support** - Inline and block math with KaTeX
- 📊 **Reading Progress Tracking** - Scroll-based progress with time estimation
- 📒 **Note-Taking System** - Create notes with tags, colors, and bookmarks
- 📑 **Table of Contents** - Auto-generated TOC with active heading tracking
- 📱 **Mobile-Optimized** - Touch gestures, bottom sheet notes, responsive design
- 📈 **Content Analytics** - Instructor dashboard with engagement metrics
- 🔍 **Search & Filter** - Full-text search across notes and bookmarks
- 🎨 **Reading Modes** - Focus mode, font size control, light/dark themes
- ⌨️ **Keyboard Navigation** - Arrow keys for lesson navigation
- 💾 **Auto-Save** - Reading position and progress auto-saved
- 🧪 **Comprehensive Tests** - 89 unit tests with 100% core coverage

### ✅ **v1.1.0 - Core Course Features**
- 📚 **Course Management** - Full CRUD for courses and lessons
- 👥 **Role-Based Access** - Admin, instructor, and student roles
- 📋 **Enrollment System** - Course discovery and enrollment
- 🎯 **Progress Tracking** - Lesson completion and course progress
- 🏫 **Instructor Tools** - Course creation, lesson management, analytics

### ✅ **v1.0.0 - Foundation**
- 🔐 **Google OAuth Authentication** - One-click sign-in
- 🎨 **Modern UI/UX** - Responsive design with Tailwind CSS 4.x
- 🔒 **Route Protection** - AuthGuard component for secure pages
- 📱 **Mobile Responsive** - Perfect experience on all devices
- 🚀 **GitHub Pages Deployment** - Live at [koosty.github.io/open-edu](https://koosty.github.io/open-edu/)
- ⚡ **SvelteKit + Svelte 5** - Modern reactive frontend with runes
- 🔥 **Firebase Integration** - Authentication, Firestore, and Storage

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
3. ✅ Add sample courses (JavaScript & React)
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
- **Testing**: Vitest (89 unit tests)
- **TypeScript**: Strict mode with full type safety

### **Project Structure**
```
src/
├── lib/
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── AuthGuard.svelte       # Route protection
│   │   ├── MarkdownRenderer.svelte # Rich markdown display
│   │   ├── CodeBlock.svelte       # Syntax-highlighted code
│   │   ├── TableOfContents.svelte # Auto-generated TOC
│   │   ├── NotesPanel.svelte      # Notes sidebar
│   │   ├── NoteWidget.svelte      # Note creation modal
│   │   ├── BookmarkButton.svelte  # Quick bookmarking
│   │   ├── ReadingProgress.svelte # Progress indicator
│   │   └── LessonNavigation.svelte # Prev/next navigation
│   ├── services/
│   │   ├── markdown.ts            # Markdown parsing + sanitization
│   │   ├── markdown.spec.ts       # 35 tests
│   │   ├── readingProgress.ts     # Progress tracking
│   │   ├── readingProgress.spec.ts # 33 tests
│   │   ├── notes.ts               # Note-taking CRUD
│   │   ├── notes.spec.ts          # 21 tests
│   │   ├── courses.ts             # Course management
│   │   ├── enrollment.ts          # Enrollment service
│   │   ├── progress.ts            # Progress tracking
│   │   ├── analytics.ts           # Content analytics
│   │   └── readingPosition.ts     # Auto-save position
│   ├── types/
│   │   ├── lesson.ts              # Lesson types
│   │   ├── notes.ts               # Note/bookmark types
│   │   ├── progress.ts            # Progress types
│   │   └── analytics.ts           # Analytics types
│   ├── auth.svelte.ts             # Authentication service (Svelte 5 runes)
│   ├── firebase.ts                # Firebase configuration
│   └── utils.ts                   # Utility functions
├── routes/
│   ├── +layout.svelte             # Main application layout
│   ├── +page.svelte               # Homepage
│   ├── auth/
│   │   ├── login/                 # Google OAuth login
│   │   └── profile/               # User profile management
│   ├── dashboard/                 # Student dashboard
│   ├── courses/
│   │   ├── [courseId]/+page.svelte          # Course detail
│   │   └── [courseId]/learn/[lessonId]/     # Lesson viewer
│   └── admin/
│       ├── +page.svelte           # Admin dashboard
│       ├── analytics/+page.svelte # Content analytics
│       └── courses/[id]/          # Course editor
scripts/
├── automated-seed.mjs             # Database seeding script
└── validate-firebase-config.mjs   # Config validation
firestore.rules                    # Firebase security rules
firestore.indexes.json             # Composite indexes
seed-automated.sh                  # Automated Firebase seeding
```

### **Key Design Decisions**
- **Google OAuth Only**: Simplified authentication (no email/password complexity)
- **Svelte 5 Runes**: Modern reactive state with `$state()` in `.svelte.ts` files
- **bits-ui Components**: Headless UI components with full customization
- **Markdown-First**: Rich content rendering with full GFM support
- **Mobile-First**: Touch gestures and responsive design throughout
- **Analytics-Driven**: Instructor insights for engagement optimization
- **Test Coverage**: Comprehensive unit tests for core services

---

## 🧪 Testing

We use a comprehensive testing strategy with Vitest:

### **Unit Tests** (Node.js environment)
- Authentication service logic
- Utility functions
- Business logic components
- Service layer (CRUD operations)
- **Pattern**: `*.{test,spec}.{js,ts}`

### **Component Tests** (Browser environment with vitest-browser-svelte)
- UI component interactions
- User interface behavior
- Svelte component logic
- **Pattern**: `*.svelte.{test,spec}.{js,ts}`

### **Current Coverage**
```bash
✓ 89 tests passing across 3 test suites

Markdown Service (35 tests):
  ✓ Markdown parsing and sanitization
  ✓ Syntax highlighting (180+ languages)
  ✓ XSS protection with DOMPurify
  ✓ KaTeX math rendering
  ✓ Heading extraction for TOC
  ✓ Reading time estimation

Reading Progress (33 tests):
  ✓ Scroll tracking and percentages
  ✓ Time spent calculation
  ✓ Section completion tracking
  ✓ Progress state management
  ✓ Time formatting utilities

Notes Service (21 tests):
  ✓ Note CRUD operations
  ✓ Bookmark management
  ✓ Query filters (tags, colors, lessons)
  ✓ Search functionality
  ✓ Error handling
```

Run tests:
```bash
npm run test          # Run all tests once
npm run test:unit     # Run tests in watch mode
npm run check         # TypeScript + Svelte validation
vitest run src/lib/services/markdown.spec.ts  # Single file
```

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

## 🗺️ Roadmap

### **✅ v1.0.0 - Foundation (Complete)**
- [x] Google OAuth authentication system
- [x] Responsive UI with Tailwind CSS
- [x] Firebase integration (Auth + Firestore)
- [x] GitHub Pages deployment with CI/CD
- [x] Unit testing framework
- [x] TypeScript strict mode
- [x] Mobile-responsive design

### **✅ v1.1.0 - Core Course Features (Complete)**
- [x] Course management system (CRUD)
- [x] Lesson creation and editing
- [x] Role-based access control (admin/instructor/student)
- [x] Enrollment system
- [x] Progress tracking
- [x] Course catalog and discovery

### **✅ v1.2.0 - Enhanced Reading Experience (Complete - Current)**
- [x] Rich markdown rendering with GFM
- [x] Syntax highlighting (Highlight.js)
- [x] LaTeX math support (KaTeX)
- [x] Reading progress tracking
- [x] Note-taking system with bookmarks
- [x] Table of contents auto-generation
- [x] Mobile reading experience (touch gestures)
- [x] Content analytics for instructors
- [x] Auto-save reading position
- [x] Comprehensive test coverage (89 tests)

### **🔮 v1.3.0 - Interactive Features & Assessments (Next)**
- [ ] Quiz creation and management
- [ ] Multiple question types (multiple choice, true/false, short answer)
- [ ] Automatic grading system
- [ ] Student performance tracking
- [ ] Gradebook for instructors
- [ ] Quiz analytics and insights

### **🌟 v2.0.0 - Advanced Features (Future)**
- [ ] Monaco Editor integration for code challenges
- [ ] Real-time code execution sandbox
- [ ] Multi-language support (Python, JavaScript, Java, etc.)
- [ ] Advanced code analysis and hints
- [ ] Peer code review system
- [ ] Discussion forums and Q&A
- [ ] Video content support
- [ ] Mobile app (React Native/Flutter)

See detailed roadmap files: [roadmap/](roadmap/)

---

## 📊 Project Statistics

### **Codebase**
- **Lines of Code**: ~20,000+
- **Components**: 40+ Svelte components
- **Services**: 12+ service modules
- **Tests**: 89 unit tests (markdown, progress, notes)
- **Firestore Collections**: 10+ collections
- **Test Coverage**: Core services 100%

### **Features Delivered**
- **Releases**: 3 major versions (v1.0, v1.1, v1.2)
- **Tasks Completed**: 112/158 total roadmap tasks (71%)
- **Security**: Role-based access control with Firestore rules
- **Performance**: Optimized with code splitting and lazy loading

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
- bits-ui for headless components
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

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/) and [Svelte 5](https://svelte.dev/)
- UI components with [bits-ui](https://bits-ui.com/) - Headless component library for Svelte
- Markdown parsing with [Marked.js](https://marked.js.org/)
- Syntax highlighting by [Highlight.js](https://highlightjs.org/)
- Math rendering with [KaTeX](https://katex.org/)
- Icons by [Lucide Svelte](https://lucide.dev/)
- Styling utilities: [Tailwind Merge](https://github.com/dcastil/tailwind-merge) + [clsx](https://github.com/lukeed/clsx) + [CVA](https://cva.style/)
- Testing with [Vitest](https://vitest.dev/)
- Deployment powered by [GitHub Pages](https://pages.github.com/)
- Backend services by [Firebase](https://firebase.google.com/)

---

## 📞 Support

- 📚 [Documentation](roadmap/)
- 🐛 [Issue Tracker](https://github.com/koosty/open-edu/issues)
- 💬 [Discussions](https://github.com/koosty/open-edu/discussions)
- 🌐 [Live Demo](https://koosty.github.io/open-edu/)

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
    <a href="roadmap/">Roadmap</a> •
    <a href="DEPLOYMENT.md">Deploy Guide</a>
  </p>
  <p>
    <strong>v1.2.0</strong> - Enhanced Reading Experience
  </p>
</div>
