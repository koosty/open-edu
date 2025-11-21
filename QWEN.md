# Open-EDU Project Context

## Project Overview
Open-EDU is a modern, feature-rich learning platform built with SvelteKit, Firebase, and TypeScript. It provides an interactive learning experience with markdown rendering, quizzes, progress tracking, and comprehensive course management. The platform is currently at version 1.4.0 and features an interactive quiz system, rich markdown rendering with LaTeX math support, note-taking capabilities, and role-based access control.

## Architecture & Tech Stack
- **Frontend**: SvelteKit 2.x with Svelte 5 (runes)
- **Styling**: Tailwind CSS 4.x with custom component library
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firestore (NoSQL) with composite indexes
- **Storage**: Firebase Cloud Storage
- **Markdown**: Marked.js + Highlight.js + KaTeX
- **Testing**: Vitest (89+ unit tests)
- **TypeScript**: Strict mode with full type safety

## Key Features
1. **Quiz System**: Complete quiz creation, taking, and grading with 6 question types
2. **Rich Markdown Rendering**: GFM support with syntax highlighting for 180+ languages
3. **LaTeX Math Support**: Inline and block math rendering with KaTeX
4. **Progress Tracking**: Scroll-based progress with time estimation
5. **Note-Taking System**: Create notes with tags, colors, and bookmarks
6. **Multi-Theme System**: 3 color variants with WCAG AA accessibility compliance
7. **Role-Based Access**: Admin, instructor, and student roles
8. **Course Management**: Full CRUD for courses and lessons

## Project Structure
```
src/
├── lib/
│   ├── components/     # UI components
│   ├── services/       # Business logic services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── auth.svelte.ts  # Authentication service
│   └── firebase.ts     # Firebase configuration
├── routes/             # SvelteKit pages and routes
├── scripts/            # Build and deployment scripts
```

## Building and Running
1. **Prerequisites**: Node.js 18+, npm or pnpm, Firebase project
2. **Installation**:
   ```bash
   npm install
   cp .env.example .env.local  # Then add your Firebase config
   ```
3. **Database Seeding**:
   ```bash
   ./seed-automated.sh  # One command to seed everything automatically
   ```
4. **Development**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) to see your app
5. **Testing**:
   ```bash
   npm run test          # Run all tests
   npm run test:unit     # Run tests in watch mode
   npm run check         # TypeScript checking
   ```
6. **Production Build**:
   ```bash
   npm run build
   npm run preview
   ```

## Development Conventions
- TypeScript strict mode with comprehensive JSDoc comments
- Svelte 5 runes for reactivity (`$state()` in `.svelte.ts` files)
- bits-ui for headless components with full customization
- ESLint + Prettier for code formatting
- Commit messages follow conventional format: `type(scope): subject`
- Comprehensive unit tests required for new functionality
- Aim for >80% code coverage

## Firebase Integration
The project uses Firebase for authentication, Firestore database, and storage:
- Security rules enforce role-based access control
- Multiple Firestore indexes for optimized queries
- Google OAuth as the primary authentication method
- Separate production and open rules for seeding

## Testing Strategy
- Unit tests using Vitest (Node.js environment)
- Component tests for UI components
- Comprehensive coverage for core services (89+ tests)
- Test patterns: `*.{test,spec}.{js,ts}` and `*.svelte.{test,spec}.{js,ts}`

## Deployment
- Automatic deployment to GitHub Pages when creating releases
- Uses SvelteKit adapter-static for static site generation
- Configured for GitHub Pages as a single-page application
- Cache headers configured for optimal performance

## Agent Guidelines

### Build/Lint/Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Run Svelte type checking and linting
- `npm run test:unit` - Run all tests in watch mode
- `npm run test` - Run all tests once
- `vitest run src/path/to/file.spec.ts` - Run a single test file
- Use `svelte-autofixer` MCP tools to check/fix Svelte code style issues

### Workflow Guidelines
- Read tasks in `roadmap/*.md` before starting work
- Update task status in `roadmap/*.md` when completing
- For Svelte documentation, you can invoke the `get_documentation` tool with paths like:
  - `cli/overview` - Project setup and CLI tools
  - `cli/sv-create` - Creating new Svelte apps
  - `cli/sv-add` - Adding features to existing projects
  - `cli/sv-check` - Code quality and type checking
  - `cli/vitest` - Testing setup and usage
  - `kit/introduction` - Learning SvelteKit basics
  - `kit/routing` - Routing and navigation
  - `kit/load` - Data loading and API calls
  - `kit/form-actions` - Form handling and submissions
  - `kit/adapters` - Deployment configurations
  - And many more documentation paths as needed

### Project-Specific Notes
- The project uses Svelte 5 runes for reactivity
- Authentication is handled via Google OAuth through Firebase
- Rich Markdown rendering uses Marked.js with Highlight.js for syntax highlighting and KaTeX for math
- Firestore security rules enforce role-based access control
- The project follows WCAG AA accessibility standards
- Testing is done with Vitest and includes both unit and component tests