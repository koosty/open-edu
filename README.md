# 🎓 Open-EDU - Interactive Learning Platform

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-blue?style=for-the-badge)](https://koosty.github.io/open-edu/)
[![Version](https://img.shields.io/badge/Version-v1.0.0-green?style=for-the-badge)](https://github.com/koosty/open-edu/releases/tag/v1.0.0)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**A modern, interactive coding education platform built with SvelteKit, Firebase, and TypeScript.**

Transform your learning journey with hands-on coding challenges, real-time feedback, and a streamlined Google OAuth experience.

---

## 🌟 Features

### ✅ **v1.0.0 - Foundation Complete**
- 🔐 **Google OAuth Authentication** - One-click sign-in with Google
- 🎨 **Modern UI/UX** - Responsive design with Tailwind CSS
- 🔒 **Route Protection** - AuthGuard component for secure pages
- 📱 **Mobile Responsive** - Perfect experience on all devices
- 🚀 **GitHub Pages Deployment** - Live at [koosty.github.io/open-edu](https://koosty.github.io/open-edu/)
- 🧪 **Testing Framework** - Unit tests with Vitest + CI integration
- ⚡ **SvelteKit + Svelte 5** - Modern reactive frontend with runes
- 🔥 **Firebase Integration** - Authentication, Firestore, and Storage ready

### 🔮 **Coming in v1.1.0 - Interactive Features**
- 💻 Monaco Editor integration for code challenges
- 🎯 Interactive coding exercises with real-time feedback
- 📊 Progress tracking and skill assessments
- 🏆 Achievement system and learning paths

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Firebase project (for authentication)

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

### 3. Development
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your app!

### 4. Testing
```bash
# Run unit tests
npm run test

# Run type checking
npm run check

# Run tests in watch mode
npm run test:unit
```

### 5. Production Build
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
- **Database**: Firestore (NoSQL)
- **Deployment**: GitHub Pages with automated CI/CD
- **Testing**: Vitest + Playwright for browser testing
- **TypeScript**: Strict mode with full type safety

### **Project Structure**
```
src/
├── lib/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (Button, Card, etc.)
│   │   ├── AuthGuard.svelte # Route protection
│   │   └── Loading.svelte   # Loading states
│   ├── auth.svelte.ts       # Authentication service (Svelte 5 runes)
│   ├── firebase.ts          # Firebase configuration
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # Utility functions
├── routes/
│   ├── +layout.svelte      # Main application layout
│   ├── +page.svelte        # Homepage
│   ├── auth/
│   │   ├── login/          # Google OAuth login
│   │   └── profile/        # User profile management
│   └── dashboard/          # Protected user dashboard
└── app.css                # Global styles
```

### **Key Design Decisions**
- **Google OAuth Only**: Simplified authentication (no email/password complexity)
- **Svelte 5 Runes**: Modern reactive state with `$state()` in `.svelte.ts` files
- **Component Library**: Custom UI components based on shadcn/ui patterns
- **Release-Only Deployment**: Deploy only on GitHub releases (not every commit)
- **SPA Mode**: Single-page application for GitHub Pages compatibility

---

## 🧪 Testing

We use a comprehensive testing strategy:

### **Unit Tests** (Node.js environment)
- Authentication service logic
- Utility functions
- Business logic components
- **Pattern**: `*.{test,spec}.{js,ts}`

### **Component Tests** (Browser environment)
- UI component interactions
- User interface behavior
- **Pattern**: `*.svelte.{test,spec}.{js,ts}`

### **Current Coverage**
```bash
✓ 9 tests passing
✓ Authentication service structure
✓ Utility functions
✓ CI integration
```

Run tests:
```bash
npm run test          # Run all tests once
npm run test:unit     # Run tests in watch mode
npm run check         # TypeScript + Svelte validation
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

### **✅ v1.0.0 - Foundation (Current)**
- [x] Google OAuth authentication system
- [x] Responsive UI with Tailwind CSS
- [x] Firebase integration (Auth + Firestore)
- [x] GitHub Pages deployment with CI/CD
- [x] Unit testing framework
- [x] TypeScript strict mode
- [x] Mobile-responsive design

### **🔮 v1.1.0 - Interactive Features (Next)**
- [ ] Monaco Editor integration for code editing
- [ ] Interactive coding challenges and exercises
- [ ] Real-time code execution and feedback
- [ ] Progress tracking and skill assessments
- [ ] Course creation and management system

### **🌟 v1.2.0 - Advanced Features (Future)**
- [ ] Multi-language support (Python, JavaScript, Java, etc.)
- [ ] Advanced code analysis and hints
- [ ] Peer code review system
- [ ] Instructor dashboard and analytics
- [ ] Mobile app (React Native/Flutter)

See detailed roadmap: [roadmap/v1.0.0.md](roadmap/v1.0.0.md)

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
- Tailwind CSS for styling
- ESLint + Prettier for formatting

### **Testing Requirements**
- Unit tests for new functionality
- Component tests for UI changes
- All tests must pass before merging

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/) and [Svelte 5](https://svelte.dev/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Deployment powered by [GitHub Pages](https://pages.github.com/)
- Backend services by [Firebase](https://firebase.google.com/)

---

## 📞 Support

- 📚 [Documentation](roadmap/)
- 🐛 [Issue Tracker](https://github.com/koosty/open-edu/issues)
- 💬 [Discussions](https://github.com/koosty/open-edu/discussions)
- 🌐 [Live Demo](https://koosty.github.io/open-edu/)

---

<div align="center">
  <p><strong>Made with ❤️ for the developer community</strong></p>
  <p>
    <a href="https://koosty.github.io/open-edu/">Live Demo</a> •
    <a href="roadmap/v1.0.0.md">Roadmap</a> •
    <a href="DEPLOYMENT.md">Deploy Guide</a>
  </p>
</div>
