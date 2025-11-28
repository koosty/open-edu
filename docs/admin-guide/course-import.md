# Course Import Guide

## Overview

The Course Import feature allows instructors and administrators to create complete courses (including lessons and quizzes) by uploading a JSON or YAML file instead of manually entering data through the UI.

This is especially useful for:
- **Bulk course creation**: Import multiple courses quickly
- **Content migration**: Move courses from other platforms
- **Version control**: Track course changes in git
- **Collaboration**: Work on course content with your team
- **Backup/restore**: Save course structures for later use

## Getting Started

### Step 1: Navigate to Course Creation

1. Log in as an instructor or admin
2. Go to `/admin/courses/new`
3. Click the **"Import from File"** tab

### Step 2: Choose Your Format

You can use either **JSON** or **YAML** format:

| Format | Best For | File Extension |
|--------|----------|----------------|
| JSON | Automation, APIs, developers | `.json` |
| YAML | Human-friendly, content creators | `.yaml`, `.yml` |

### Step 3: Download a Template

Click one of the template download buttons:
- **Download JSON Template** - Example course in JSON format
- **Download YAML Template** - Example course in YAML format

### Step 4: Edit Your Course File

Open the downloaded template in your favorite editor and customize it with your course content.

### Step 5: Upload and Import

1. Click "Choose File" and select your course file
2. Review the preview
3. Click "Import Course"
4. Wait for the import to complete
5. You'll be redirected to your new course!

## File Format Specification

### Required Fields

```yaml
title: "Your Course Title"                    # String, required
description: "Course description"             # String, required
category: "Programming"                       # String, required
difficulty: "Beginner"                        # "Beginner" | "Intermediate" | "Advanced"
duration: "40h"                               # Format: Xm or Xh (e.g., "40h", "2.5h", "90m")
level: "free"                                 # "free" | "premium"
```

> **v1.6.0 Breaking Change**: Duration format changed from "8 weeks" to "40h". Use `Xm` for minutes or `Xh` for hours. Examples: `"30m"`, `"2h"`, `"1.5h"`

### Optional Fields

```yaml
thumbnail: "https://example.com/image.jpg"   # String, URL
price: 49.99                                 # Number (required if level is "premium")
currency: "USD"                              # String (default: "USD")
tags: ["python", "beginner"]                 # Array of strings
prerequisites: ["Basic programming"]         # Array of strings
learningOutcomes: ["Build web apps"]         # Array of strings
isPublished: false                           # Boolean (default: false)
isFeatured: false                            # Boolean (default: false)
```

### Lessons

Each course must have at least one lesson in the `lessons` array:

#### Regular Lesson

```yaml
lessons:
  - title: "Lesson Title"
    type: "lesson"
    duration: "20m"                              # Format: Xm or Xh
    content: |
      # Lesson Content in Markdown
      
      Your lesson content goes here with **full markdown support**.
      
      - Bullet points
      - Code blocks
      - Images
      - And more!
```

#### Quiz Lesson (v1.6.0 - Flattened Structure)

> **v1.6.0 Breaking Change**: Quiz fields are now directly on the lesson object. The nested `quiz:` wrapper has been removed.

```yaml
lessons:
  - title: "Quiz Title"
    type: "quiz"
    duration: "15m"                              # Format: Xm or Xh
    # Quiz fields are now directly on the lesson (no wrapper)
    description: "Test your understanding"       # Optional
    instructions: "Read each question carefully" # Optional
    passingScore: 70                             # Percentage (0-100)
    timeLimit: 900                               # Seconds (optional)
    allowMultipleAttempts: true                  # Default: true
    maxAttempts: 3                               # Optional
    showCorrectAnswers: true                     # Default: true
    showExplanations: true                       # Default: true
    randomizeQuestions: false                    # Default: false
    randomizeOptions: false                      # Default: false
    allowReview: true                            # Default: true
    questions:
      # See question types below
```

## Question Types

### 1. Multiple Choice

Single correct answer from multiple options.

```yaml
- id: "q1"
  type: "multiple-choice"
  question: "What is 2 + 2?"
  options:
    - "3"
    - "4"
    - "5"
  correctAnswer: 1                            # Index (0-based)
  points: 10
  explanation: "2 + 2 equals 4"
```

### 2. True/False

Binary true or false question.

```yaml
- id: "q2"
  type: "true-false"
  question: "The Earth is flat"
  correctAnswer: false
  points: 5
  explanation: "The Earth is spherical"
```

### 3. Multiple Select

Multiple correct answers (checkboxes).

```yaml
- id: "q3"
  type: "multiple-select"
  question: "Which are programming languages?"
  options:
    - "Python"
    - "HTML"
    - "JavaScript"
    - "CSS"
  correctAnswers: [0, 2]                      # Multiple indices
  points: 15
  explanation: "Python and JavaScript are programming languages"
```

### 4. Fill in the Blank

Short answer text input.

```yaml
- id: "q4"
  type: "fill-blank"
  question: "The capital of France is ___"
  correctAnswer: "Paris"
  caseSensitive: false                        # Optional (default: false)
  points: 10
  explanation: "Paris is the capital of France"
```

### 5. Ordering

Arrange items in the correct order.

```yaml
- id: "q5"
  type: "ordering"
  question: "Order these numbers from smallest to largest:"
  items:
    - "1"
    - "5"
    - "3"
    - "9"
  correctOrder: [0, 2, 1, 3]                  # Indices in correct order
  points: 20
  explanation: "The correct order is: 1, 3, 5, 9"
```

### 6. Matching

Match items from left column to right column.

```yaml
- id: "q6"
  type: "matching"
  question: "Match the country to its capital:"
  pairs:
    - left: "France"
      right: "Paris"
    - left: "Japan"
      right: "Tokyo"
    - left: "Italy"
      right: "Rome"
  points: 20
  explanation: "Each country has been matched with its capital city"
```

## Complete Examples

See the `examples/` directory for complete working examples:

- **`course-template.json`** - Web development course in JSON
- **`course-template.yaml`** - Python programming course in YAML

## Validation

The import process validates your file and will show clear error messages if:

- Required fields are missing
- Field types are incorrect
- Quiz questions are malformed
- Premium courses don't have a price

Review the error message and fix the issues in your file before re-uploading.

## Tips & Best Practices

### Content Writing

1. **Use Markdown**: All lesson content supports full markdown syntax
2. **Code Blocks**: Use triple backticks for code examples
3. **Structure**: Use headings (# ## ###) to organize content
4. **Media**: Include images and videos with markdown syntax

### Quiz Design

1. **Question IDs**: Use unique IDs for each question (e.g., "q1", "q2")
2. **Points**: Distribute points based on difficulty
3. **Passing Score**: Set between 60-80% for most courses
4. **Time Limits**: Optional, but recommended for assessments
5. **Explanations**: Always provide explanations for learning

### File Organization

1. **Version Control**: Keep course files in git for history
2. **Naming**: Use descriptive filenames (e.g., `python-basics.yaml`)
3. **Templates**: Create templates for your common course structures
4. **Backup**: Keep copies of your course files

### Premium Courses

For premium courses, remember to:
- Set `level: "premium"`
- Include a `price` (must be greater than 0)
- Optionally set `currency` (default is USD)

```yaml
level: "premium"
price: 49.99
currency: "USD"
```

## Troubleshooting

### File Won't Parse

**Error**: "Failed to parse file"

**Solutions**:
- Check file extension matches format (.json or .yaml/.yml)
- Validate JSON syntax at jsonlint.com
- Validate YAML syntax at yamllint.com
- Check for special characters or encoding issues

### Validation Failed

**Error**: "Validation failed: [specific error]"

**Solutions**:
- Read the error message carefully - it tells you what's wrong
- Check all required fields are present
- Verify field types (string, number, boolean, array)
- For premium courses, ensure price > 0

### Quiz Import Failed

**Error**: "Failed to create quiz for lesson..."

**Solutions**:
- Verify quiz structure matches the specification
- Check all questions have unique IDs
- Ensure correct answer indices are valid
- Verify points are positive numbers

### Import Succeeds but Course Looks Wrong

**Solutions**:
- Clear browser cache
- Refresh the course page
- Check the Firestore console for the actual data
- Review the import preview before importing

## Advanced Usage

### Automation

You can generate course files programmatically:

```javascript
// Example: Generate course from external data
const courseData = {
  title: "Generated Course",
  description: "Auto-generated content",
  // ... rest of the fields
};

const json = JSON.stringify(courseData, null, 2);
fs.writeFileSync('course.json', json);
```

### Batch Import

For importing multiple courses:

1. Create multiple course files
2. Import them one by one through the UI
3. Or use the Firebase Admin SDK to import programmatically

### Content Management

You can:
- Edit course files in your favorite editor
- Use diff tools to track changes
- Collaborate on courses using git
- Review course changes through pull requests

## Support

If you encounter issues:

1. Check this documentation
2. Review the example templates
3. Validate your file format
4. Check the browser console for errors
5. Contact support with your error message

## What's Next?

After importing a course:

1. **Review**: Check all lessons and quizzes display correctly
2. **Edit**: Use the course editor to make any adjustments
3. **Test**: Take the quizzes yourself to verify they work
4. **Publish**: Set `isPublished: true` or use the UI to publish
5. **Monitor**: Track student engagement and quiz results

---

## Technical Details (v1.6.0)

### Data Architecture

As of v1.6.0, Open-EDU uses a separate collection architecture for improved scalability:

| Data | Storage Location | Benefit |
|------|------------------|---------|
| Course metadata | `courses/{courseId}` | Fast course listings |
| Lesson content | `lessons/{lessonId}` | 100+ lessons per course |
| Quiz content | `quizzes/{quizId}` | Independent quiz management |

When you import a course:

1. **Course document** is created with:
   - Course metadata (title, description, etc.)
   - `lessonsMetadata[]` - lightweight lesson info for listings
   - `quizzesMetadata[]` - lightweight quiz info for course overview
   - `totalLessons` and `totalQuizzes` counts

2. **Lesson documents** are created in the `lessons` collection with:
   - Full lesson content
   - Reference to parent course (`courseId`)
   - Order and metadata

3. **Quiz documents** are created in the `quizzes` collection with:
   - Full quiz content and questions
   - References to course and lesson

This architecture allows:
- **Courses with 100+ lessons** (no 1MB document limit)
- **Efficient reads** (load only what's needed)
- **Concurrent editing** (multiple instructors)
- **Fast course overviews** (single read operation)

### Import Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max lessons per course | Unlimited | Was ~40 in v1.5.0 |
| Max file size | 10MB | JSON/YAML input file |
| Max lesson content | ~900KB | Per lesson (Firestore limit) |
| Max questions per quiz | 500 | Practical limit |

---

## Migrating from v1.5.0 to v1.6.0

If you have existing course import files in the old format, you need to update them:

### 1. Duration Format Change

**Old format (v1.5.0 and earlier):**
```yaml
duration: "8 weeks"
duration: "30 min"
duration: "2 hours"
```

**New format (v1.6.0):**
```yaml
duration: "40h"     # 40 hours
duration: "30m"     # 30 minutes
duration: "2h"      # 2 hours
```

### 2. Quiz Structure Change (Flattened)

**Old format (v1.5.0) - nested quiz object:**
```yaml
lessons:
  - title: "Assessment"
    type: "quiz"
    duration: "15 min"
    quiz:
      title: "Module 1 Quiz"
      description: "Test your knowledge"
      passingScore: 70
      timeLimit: 900
      questions:
        - id: "q1"
          type: "multiple-choice"
          question: "What is 2+2?"
          options: ["3", "4", "5"]
          correctAnswer: 1
          points: 10
          explanation: "Basic math"
```

**New format (v1.6.0) - flattened:**
```yaml
lessons:
  - title: "Assessment"
    type: "quiz"
    duration: "15m"
    # Quiz fields directly on lesson (no wrapper)
    description: "Test your knowledge"
    passingScore: 70
    timeLimit: 900
    questions:
      - id: "q1"
        type: "multiple-choice"
        question: "What is 2+2?"
        options: ["3", "4", "5"]
        correctAnswer: 1
        points: 10
        explanation: "Basic math"
```

### Key Changes Summary

| Aspect | v1.5.0 (Old) | v1.6.0 (New) |
|--------|--------------|--------------|
| Duration | `"30 min"`, `"2 hours"` | `"30m"`, `"2h"` |
| Quiz structure | Nested under `quiz:` | Flattened on lesson |
| Quiz title | `quiz.title` | Uses lesson `title` |
| Quiz description | `quiz.description` | `description` on lesson |
| Quiz settings | Under `quiz:` | Directly on lesson |

### Migration Script (Optional)

You can manually update your files or use a script:

```javascript
// Example migration helper
function migrateLesson(lesson) {
  // Update duration format
  lesson.duration = convertDuration(lesson.duration);
  
  // Flatten quiz structure
  if (lesson.quiz) {
    const { title, ...quizFields } = lesson.quiz;
    // Move quiz fields to lesson level
    Object.assign(lesson, quizFields);
    delete lesson.quiz;
  }
  
  return lesson;
}

function convertDuration(duration) {
  const match = duration.match(/(\d+(?:\.\d+)?)\s*(min|hour|h|m)/i);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('h')) return `${value}h`;
    if (unit.startsWith('m')) return `${value}m`;
  }
  return duration;
}
```

---

**Last Updated**: November 2025  
**Version**: 1.6.0
