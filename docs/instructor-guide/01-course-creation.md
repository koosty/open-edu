# Instructor Guide: Course Creation

This comprehensive guide will teach you how to create, organize, and publish effective courses on Open-EDU.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Your First Course](#creating-your-first-course)
3. [Course Settings & Metadata](#course-settings--metadata)
4. [Creating Lessons](#creating-lessons)
5. [Organizing Course Structure](#organizing-course-structure)
6. [Writing Effective Content](#writing-effective-content)
7. [Publishing Your Course](#publishing-your-course)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

Before creating courses, ensure you have:
- **Instructor Account**: Admin must grant instructor permissions
- **Access to Admin Panel**: Navigate to `/admin` URL
- **Course Planning**: Outline of what you want to teach
- **Content Ready**: Lessons prepared (at least drafts)

### Accessing the Admin Panel

1. Log in to Open-EDU
2. Navigate to `/admin` or click "Admin Panel" if available
3. You'll see the instructor dashboard with:
   - Overview of your courses
   - Quick actions
   - Analytics summary

---

## Creating Your First Course

### Step 1: Navigate to Course Creation

1. Go to **Admin Panel** → **Courses**
2. Click **"Create New Course"** button
3. You'll see the course creation form

### Step 2: Fill in Basic Information

**Required Fields**:

**Course Title** (Required)
- Clear, descriptive title
- Example: "Introduction to JavaScript Programming"
- Keep it under 100 characters
- Use title case

**Course Description** (Required)
- 2-3 paragraphs explaining what students will learn
- Include learning outcomes
- Mention prerequisites if any
- Make it engaging and clear

**Example**:
```
Learn the fundamentals of JavaScript programming from scratch. 
This course covers variables, functions, loops, and objects through 
hands-on exercises. Perfect for beginners with no prior programming 
experience.

By the end of this course, you'll be able to:
- Write basic JavaScript programs
- Understand core programming concepts
- Build interactive web pages
- Debug common errors
```

**Instructor Name** (Required)
- Your full name or preferred instructor name
- Displayed to students
- Example: "Dr. Jane Smith" or "Jane Smith, PhD"

### Step 3: Set Course Metadata

**Category** (Optional but recommended)
- Programming, Mathematics, Science, etc.
- Helps students find your course
- Select from predefined categories

**Difficulty Level** (Optional)
- Beginner, Intermediate, Advanced
- Sets student expectations
- Affects course recommendations

**Duration Estimate** (Optional)
- Estimated hours to complete
- Example: "8 hours" or "4 weeks"
- Helps students plan their time

**Prerequisites** (Optional)
- List required knowledge or courses
- Example: "Basic HTML/CSS knowledge recommended"
- Can link to other courses

**Tags** (Optional)
- Keywords for searchability
- Example: "javascript, programming, web development"
- Comma-separated

### Step 4: Upload Course Image (Optional)

- Click "Upload Image" or drag-and-drop
- **Recommended size**: 1200x630 pixels
- **Format**: JPG or PNG
- **Max size**: 2MB
- Shows on course cards in catalog

### Step 5: Save Draft

- Click **"Save as Draft"** to save without publishing
- Or click **"Create & Publish"** to make immediately available
- **Tip**: Save as draft first, add lessons, then publish

---

## Course Settings & Metadata

### Course Status

**Draft**
- Only visible to you (instructor)
- Students cannot see or enroll
- Use for work-in-progress courses

**Published**
- Visible in course catalog
- Students can enroll
- Lessons must be added before publishing

**Archived**
- Hidden from catalog
- Enrolled students can still access
- Use for outdated courses

### Enrollment Settings

**Open Enrollment** (Default)
- Any student can enroll
- No approval needed
- Best for public courses

**Instructor Approval Required**
- Students request enrollment
- You manually approve/deny
- Use for restricted courses

**Closed Enrollment**
- No new enrollments accepted
- Current students can continue
- Use when course is full

### Visibility Settings

**Public**
- Appears in course catalog
- Anyone can view description
- Default for most courses

**Private**
- Only enrolled students see it
- Not in public catalog
- Share direct link to enroll

**Institution-Only**
- Limited to your institution's domain
- Email domain verification
- Set by administrator

---

## Creating Lessons

### Types of Lessons

Open-EDU supports two lesson types:

1. **Text Lessons** (Reading)
   - Markdown-formatted content
   - Support for headings, lists, code, images
   - Auto-tracked reading progress

2. **Quiz Lessons** (Assessment)
   - 6 question types supported
   - Timed or untimed
   - Multiple attempts configurable
   - See [Quiz Creation Guide](./02-quiz-creation.md)

### Adding a New Lesson

1. **Open Your Course** in admin panel
2. **Click "Add Lesson"** button
3. **Choose Lesson Type**:
   - Text Lesson (for content)
   - Quiz Lesson (for assessment)

### Creating a Text Lesson

**Step 1: Basic Information**

**Lesson Title** (Required)
- Clear, descriptive title
- Example: "Variables and Data Types"
- Shows in lesson list

**Lesson Order** (Auto-assigned)
- Determines sequence
- Can reorder later by drag-and-drop
- Students see lessons in this order

**Step 2: Write Content**

Open-EDU uses **Markdown** for formatting:

**Headings**:
```markdown
# Main Heading (H1)
## Subheading (H2)
### Section (H3)
```

**Text Formatting**:
```markdown
**Bold text**
*Italic text*
`inline code`
[Link text](https://example.com)
```

**Lists**:
```markdown
- Bullet point
- Another point
  - Nested point

1. Numbered item
2. Second item
```

**Code Blocks**:
````markdown
```javascript
function example() {
  return "Hello, World!";
}
```
````

**Images**:
```markdown
![Alt text](https://example.com/image.jpg)
```

**Tables**:
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

**Step 3: Preview and Save**

- Click **"Preview"** to see how it looks
- Make adjustments as needed
- Click **"Save Lesson"** to add to course
- You can edit anytime later

---

## Organizing Course Structure

### Lesson Order

**Drag and Drop Reordering**:
1. Go to course edit page
2. Find lesson list
3. Drag lessons by handle (≡ icon)
4. Drop in new position
5. Order saves automatically

**Best Practices**:
- Start with introduction
- Build from simple to complex
- Intersperse quizzes every 3-5 lessons
- End with comprehensive assessment

### Course Modules (Optional)

If your course has many lessons, group them into modules:

**Module Structure**:
```
Course: JavaScript Programming
├── Module 1: Basics
│   ├── Lesson 1: Introduction
│   ├── Lesson 2: Variables
│   └── Quiz 1: Basics Quiz
├── Module 2: Functions
│   ├── Lesson 3: Function Syntax
│   ├── Lesson 4: Parameters
│   └── Quiz 2: Functions Quiz
└── Module 3: Objects
    ├── Lesson 5: Object Basics
    ├── Lesson 6: Methods
    └── Final Quiz
```

**Creating Modules** (if feature available):
1. Click "Create Module"
2. Name the module
3. Assign lessons to module
4. Set module description

### Prerequisites Between Lessons

Some platforms allow lesson prerequisites:
- Student must complete Lesson 1 before accessing Lesson 2
- Useful for sequential learning
- Check if your Open-EDU instance supports this

---

## Writing Effective Content

### Content Structure

**Every Lesson Should Have**:

1. **Introduction** (What & Why)
   - What will be learned
   - Why it matters
   - Hook to engage students

2. **Main Content** (How)
   - Detailed explanation
   - Examples with code or images
   - Step-by-step instructions

3. **Practice/Examples** (Apply)
   - Hands-on exercises
   - Real-world applications
   - Code examples to try

4. **Summary** (Recap)
   - Key takeaways (3-5 points)
   - Reinforce main concepts
   - Link to next lesson

5. **Additional Resources** (Optional)
   - Links to documentation
   - Videos or tutorials
   - Further reading

### Writing Style Best Practices

**Clarity**:
- Use simple, direct language
- Short sentences and paragraphs
- Active voice ("You will learn" not "It will be learned")

**Engagement**:
- Address students as "you"
- Ask rhetorical questions
- Use examples students can relate to

**Formatting**:
- Break up text with headings
- Use bullet points for lists
- Highlight key terms in **bold**
- Include code examples
- Add images/diagrams where helpful

**Accessibility**:
- Provide alt text for images
- Don't rely solely on color
- Use clear, readable fonts (handled by platform)
- Structure with proper headings

### Example Lesson Structure

```markdown
# Lesson 2: Variables and Data Types

## Introduction

In this lesson, you'll learn how to store and work with data in 
JavaScript using variables. Variables are fundamental to all 
programming - think of them as labeled boxes where you keep information.

## What is a Variable?

A variable is a named container for storing data. In JavaScript, we 
create variables using `let`, `const`, or `var`.

**Example**:
```javascript
let userName = "Alice";
let userAge = 25;
const PI = 3.14159;
```

## Data Types

JavaScript has several data types...
[Continue with detailed explanation]

## Practice Exercise

Try creating variables for...

## Key Takeaways

- Variables store data values
- Use `let` for changeable values
- Use `const` for constants
- JavaScript has dynamic typing

## Next Steps

In the next lesson, we'll explore functions...

## Additional Resources

- [MDN: JavaScript Variables](https://developer.mozilla.org/...)
```

---

## Publishing Your Course

### Pre-Publication Checklist

Before publishing, ensure:

**Content Complete**:
- [ ] All lessons created and proofread
- [ ] Images load correctly
- [ ] Code examples work
- [ ] Links are valid
- [ ] Quizzes tested

**Metadata Set**:
- [ ] Course title and description clear
- [ ] Instructor name correct
- [ ] Category and tags added
- [ ] Difficulty level set
- [ ] Duration estimate provided
- [ ] Course image uploaded

**Quality Check**:
- [ ] No spelling/grammar errors
- [ ] Consistent formatting
- [ ] Logical lesson order
- [ ] Appropriate pacing
- [ ] Clear learning outcomes

### Publishing Steps

1. **Final Review**:
   - Preview the course as a student
   - Click through all lessons
   - Take all quizzes
   - Check mobile view

2. **Set Status to Published**:
   - Go to course settings
   - Change status from "Draft" to "Published"
   - Click "Save Changes"

3. **Course Goes Live**:
   - Appears in course catalog immediately
   - Students can enroll
   - You'll receive notifications (if enabled)

### Post-Publication

**Monitor Enrollments**:
- Check who enrolls
- Approve requests (if approval required)
- Welcome students (optional)

**Respond to Feedback**:
- Students may report issues
- Fix typos or unclear sections
- Update content as needed

**Track Analytics**:
- See lesson completion rates
- Monitor quiz scores
- Identify problem areas
- See [Analytics Guide](./04-analytics-reporting.md)

---

## Best Practices

### Course Design Principles

**1. Start with Learning Outcomes**
- What should students be able to DO after the course?
- Write 3-5 specific, measurable outcomes
- Design lessons to achieve these outcomes

**2. Chunk Content Appropriately**
- One main concept per lesson
- 5-15 minutes reading time per lesson
- Break long topics into multiple lessons

**3. Vary Learning Activities**
- Alternate reading and quizzes
- Include code examples
- Add images and diagrams
- Mix theory with practice

**4. Provide Clear Navigation**
- Logical lesson sequence
- Descriptive lesson titles
- Module grouping (if many lessons)
- Preview what's coming next

**5. Include Assessments**
- Quiz after every 3-5 lessons minimum
- Mix question types
- Provide feedback/explanations
- Allow multiple attempts (for learning)

### Content Creation Tips

**Efficiency**:
- Reuse content from existing materials
- Create templates for similar lessons
- Use AI tools to draft (then edit heavily)
- Save commonly used code snippets

**Quality**:
- Peer review with colleague
- Test with a student before publishing
- Iterate based on feedback
- Update content regularly

**Engagement**:
- Tell stories and use examples
- Relate to real-world applications
- Use conversational tone
- Add personality (within professionalism)

### Common Pitfalls to Avoid

**❌ Too Much Text**
- Students skim long blocks of text
- Break into smaller sections
- Use visuals to break up content

**❌ Assuming Knowledge**
- Clearly state prerequisites
- Define technical terms
- Link to background material

**❌ Inconsistent Quality**
- Some lessons detailed, others rushed
- Maintain similar depth throughout
- Proofread everything

**❌ No Assessments**
- Students need to practice
- Quizzes reinforce learning
- Include at least 3-5 quizzes per course

**❌ Outdated Content**
- Technology changes fast
- Review courses annually
- Update examples and links
- Remove deprecated information

---

## Managing Your Published Course

### Editing Published Courses

**You Can Edit Anytime**:
- Fix typos or errors
- Add new lessons
- Update outdated content
- Reorder lessons

**Changes Are Immediate**:
- Students see updates right away
- No republishing needed
- Be careful with major changes mid-semester

**Best Practices**:
- Announce major updates to students
- Don't remove lessons students are working on
- Test changes in a draft course first

### Handling Student Questions

**Common Sources**:
- Confusing lesson content
- Technical issues
- Quiz questions
- General course inquiries

**Response Strategies**:
- Answer within 24-48 hours
- Be professional and patient
- If question reveals unclear content, update lesson
- Use FAQ section if many ask same question

### Course Maintenance

**Regular Tasks**:
- Check analytics monthly
- Fix reported issues
- Update outdated links
- Refresh examples annually

**Semester/Term Basis**:
- Review completion rates
- Analyze quiz performance
- Gather student feedback
- Make improvements for next cohort

---

## Next Steps

Now that you've created your course, learn how to:

- **[Create Quizzes](./02-quiz-creation.md)**: Add assessments to your course
- **[Manage Students](./03-student-management.md)**: Track progress and engagement
- **[Use Analytics](./04-analytics-reporting.md)**: Measure and improve effectiveness

---

## Quick Reference: Markdown Cheat Sheet

| Element | Syntax | Result |
|---------|--------|--------|
| Heading | `# H1` | <h1>H1</h1> |
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Code | `` `code` `` | `code` |
| Link | `[title](url)` | [title](url) |
| Image | `![alt](url)` | ![alt](url) |
| List | `- item` | • item |
| Numbered | `1. item` | 1. item |

---

**Happy Teaching!** Creating great courses takes time and iteration. Don't aim for perfection on the first try - publish, gather feedback, and continuously improve.

**Last Updated**: November 2025 | **Version**: 1.4.0
