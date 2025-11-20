# Instructor Guide: Quiz Creation

This comprehensive guide covers everything you need to know about creating effective quizzes on Open-EDU using the visual QuizBuilder interface.

## Table of Contents
1. [Quiz Basics](#quiz-basics)
2. [Creating a New Quiz](#creating-a-new-quiz)
3. [Using the QuizBuilder Interface](#using-the-quizbuilder-interface)
4. [Question Types Guide](#question-types-guide)
5. [Quiz Settings Configuration](#quiz-settings-configuration)
6. [Testing Your Quiz](#testing-your-quiz)
7. [Publishing and Managing Quizzes](#publishing-and-managing-quizzes)
8. [Best Practices](#best-practices)
9. [Quiz Analytics](#quiz-analytics)

---

## Quiz Basics

### What Makes a Good Quiz?

Quizzes serve multiple purposes:
- **Formative Assessment**: Check understanding during learning
- **Summative Assessment**: Evaluate mastery at course end
- **Practice**: Reinforce concepts through repetition
- **Feedback**: Help students identify knowledge gaps

### Quiz Components

Every quiz has:
1. **Metadata**: Title, description, instructions
2. **Settings**: Time limits, attempts, passing score
3. **Questions**: 1-20 questions of various types
4. **Feedback**: Explanations, correct answers, results

---

## Creating a New Quiz

### Step 1: Navigate to Quiz Management

1. Go to **Admin Panel** → **Courses**
2. Select your course
3. Click **"Quizzes"** tab
4. Click **"Create New Quiz"** button

### Step 2: Choose Quiz Type

**Practice Quiz**:
- Multiple attempts allowed
- Immediate feedback
- Show correct answers
- Lower stakes

**Graded Assessment**:
- Limited attempts (1-3)
- May delay feedback
- Higher stakes
- Counts toward final grade

### Step 3: Set Basic Information

**Quiz Title** (Required)
- Clear, descriptive name
- Example: "JavaScript Fundamentals Quiz"
- Students see this in lesson list

**Description** (Optional but recommended)
- Brief overview of quiz content
- 1-2 sentences
- Example: "Test your understanding of variables, functions, and control flow"

**Instructions** (Optional)
- Detailed guidance for students
- Mention time limit, attempts, resources allowed
- Example: "This quiz has 10 questions. You have 20 minutes. You may use course notes."

---

## Using the QuizBuilder Interface

### Interface Overview

The QuizBuilder has three main sections:

```
┌────────────────────────────────────────┐
│  Quiz Settings                         │  <- Top: Metadata & Settings
├────────────────────────────────────────┤
│  Questions                             │  <- Middle: Question List
│  [1] Multiple Choice Question          │
│  [2] Short Answer Question             │
│  [+ Add Question]                      │
├────────────────────────────────────────┤
│  [Preview] [Save Draft] [Publish]      │  <- Bottom: Actions
└────────────────────────────────────────┘
```

### Adding Questions

1. **Click "Add Question"**
2. **Select Question Type** from dropdown:
   - Multiple Choice
   - Multiple Answer
   - True/False
   - Short Answer
   - Fill in the Blank
   - Essay

3. **Fill in Question Details** (see section below)
4. **Click "Save Question"**

### Reordering Questions

- **Drag and Drop**: Grab the handle (≡) icon and drag
- **Number Field**: Type new order number
- Questions automatically renumber

### Editing Questions

- Click **"Edit"** button on any question
- Make changes
- Click **"Save"** to apply

### Deleting Questions

- Click **"Delete"** button (trash icon)
- Confirm deletion
- Cannot be undone - be careful!

### Duplicating Questions

- Click **"Duplicate"** button (copy icon)
- Creates exact copy below original
- Useful for similar questions

---

## Question Types Guide

### 1. Multiple Choice

**When to Use**:
- One correct answer from 2-6 options
- Fact recall
- Concept identification

**Creating Multiple Choice Questions**:

1. **Enter Question Text**
   ```
   What is the output of console.log(typeof null)?
   ```

2. **Add Options** (2-6 recommended)
   - Click "Add Option"
   - Enter option text
   - Select correct answer (radio button)

3. **Best Practices**:
   - Use 4 options (research-backed sweet spot)
   - Make all options plausible
   - Avoid "All of the above" or "None of the above"
   - Keep options similar in length

**Example**:
```
Question: Which keyword declares a constant in JavaScript?

Options:
○ var
○ variable  
● const     <- Correct
○ immutable

Points: 1
Explanation: const declares a constant reference that cannot be reassigned.
```

### 2. Multiple Answer (Checkboxes)

**When to Use**:
- Multiple correct answers
- "Select all that apply" scenarios
- Testing comprehensive knowledge

**Creating Multiple Answer Questions**:

1. **Enter Question Text**
   ```
   Which of the following are valid JavaScript data types? (Select all that apply)
   ```

2. **Add Options**
   - Click "Add Option"
   - Check ALL correct options
   - Student must select ALL to get points

3. **Grading**:
   - ALL correct options selected = full points
   - ANY incorrect selection = 0 points
   - Partial credit not available

**Best Practices**:
- Clearly state "Select all that apply"
- Have 2-4 correct answers
- Include plausible distractors
- Award more points (2-3) due to difficulty

**Example**:
```
Question: Which are primitive types in JavaScript?

Options:
☑ String    <- Correct
☑ Number    <- Correct
☐ Array
☑ Boolean   <- Correct
☐ Object

Points: 2
```

### 3. True/False

**When to Use**:
- Testing understanding of facts or concepts
- Quick checks of knowledge
- Controversial statements requiring critical thinking

**Creating True/False Questions**:

1. **Enter Statement**
   ```
   JavaScript is a compiled language.
   ```

2. **Select Correct Answer**
   - ○ True
   - ● False

3. **Add Explanation** (highly recommended)
   ```
   JavaScript is an interpreted language, executed at runtime by the browser or Node.js.
   ```

**Best Practices**:
- Make statements clearly true or false (avoid ambiguity)
- Avoid absolute terms like "always" or "never" (unless truly absolute)
- Award 1 point
- Always provide explanations
- Use sparingly (easy to guess)

**Example**:
```
Question: Arrays in JavaScript can hold multiple data types.

Answer: True ✓

Explanation: JavaScript arrays are dynamic and can contain strings, numbers, objects, etc.
```

### 4. Short Answer

**When to Use**:
- One-word or short phrase answers
- Technical terms
- Simple recall

**Creating Short Answer Questions**:

1. **Enter Question**
   ```
   What method adds an element to the end of a JavaScript array?
   ```

2. **Enter Correct Answer**
   ```
   push
   ```

3. **Configure Matching**:
   - Case sensitive: Yes/No
   - Acceptable variations: `push`, `.push()`, `push()`

4. **Set Points** (usually 1-2)

**Grading**:
- Automated exact match
- Case-insensitive by default
- Supports multiple acceptable answers
- Trim whitespace automatically

**Best Practices**:
- Ask for specific terms (not sentences)
- Include common variations as acceptable
- Be forgiving with formatting
- Use case-insensitive when possible

**Example**:
```
Question: What keyword is used to define a function?

Correct Answer: function
Acceptable Answers: function, func, fn
Case Sensitive: No
Points: 1
```

### 5. Fill in the Blank

**When to Use**:
- Complete a sentence or code snippet
- Test knowledge of specific terms
- Sentence completion

**Creating Fill in the Blank Questions**:

1. **Enter Question with Blank**
   ```
   To declare a constant in JavaScript, use the _____ keyword.
   ```

2. **Enter Correct Answer**
   ```
   const
   ```

3. **Configure Matching** (same as short answer)

**Best Practices**:
- Use "______" or "___" for blank
- Only one blank per question
- Accept variations
- Provide context around the blank

**Example**:
```
Question: The _____ method removes the last element from an array.

Correct Answer: pop
Acceptable: pop, .pop(), pop()
Case Sensitive: No
```

### 6. Essay (Long Answer)

**When to Use**:
- Complex explanations required
- Critical thinking
- Application of concepts
- Paragraph or multi-paragraph responses

**Creating Essay Questions**:

1. **Enter Question**
   ```
   Explain the difference between == and === in JavaScript with examples.
   ```

2. **Set Length Limits**
   - Minimum: 100 characters (optional)
   - Maximum: 1000 characters (optional)

3. **Set Points** (usually 3-10)

4. **Provide Rubric in Explanation**
   ```
   Look for:
   - Definition of type coercion (==)
   - Definition of strict equality (===)
   - At least one code example
   - Clear explanation
   ```

**Grading**:
- **Manual grading required**
- Instructor reviews and assigns points
- Can provide written feedback
- Takes more time to grade

**Best Practices**:
- Be specific about what you want
- Set realistic length limits
- Provide grading rubric
- Use sparingly (time-consuming to grade)
- Award more points (5-10)

**Example**:
```
Question: Explain closures in JavaScript with an example.

Min Length: 150 characters
Max Length: 500 characters
Points: 5

Rubric:
- Definition of closure (2 points)
- Working code example (2 points)
- Explanation of scope (1 point)
```

---

## Quiz Settings Configuration

### Basic Settings

**Passing Score** (Default: 70%)
- Percentage required to pass
- Common values: 60%, 70%, 80%
- Affects pass/fail indicator
- Students can see this

**Time Limit** (Optional)
- Minutes to complete quiz
- Leave blank for untimed
- Timer shown to students
- Auto-submits when time expires

**Attempts**:
- **Allow Multiple Attempts**: Yes/No
- **Max Attempts**: 1, 2, 3, or Unlimited
- Practice quizzes: 3+ attempts
- Assessments: 1-2 attempts

### Feedback Settings

**Show Correct Answers After Submission**
- Yes: Students see which they got wrong
- No: Only show score
- **Recommendation**: Yes for practice, No for high-stakes

**Show Explanations**
- Requires correct answers to be shown
- Displays explanation text
- **Recommendation**: Always Yes for learning

**Allow Review After Completion**
- Students can revisit quiz and see their answers
- **Recommendation**: Yes for practice quizzes

### Randomization (Optional)

**Randomize Question Order**
- Questions appear in different order per attempt
- Reduces cheating
- Use for high-stakes assessments

**Randomize Answer Options**
- Multiple choice/select options shuffled
- Enabled by default
- Prevents pattern memorization

### Publishing

**Published Status**:
- **Draft**: Only you can see it
- **Published**: Available to students
- Start with Draft, test, then Publish

---

## Testing Your Quiz

### Pre-Launch Checklist

Before publishing, test thoroughly:

- [ ] **Take the quiz yourself** as an instructor
- [ ] **Verify all questions load** correctly
- [ ] **Check answer grading** (take intentionally wrong answers)
- [ ] **Test time limit** (if timed)
- [ ] **Review feedback** students will see
- [ ] **Proofread** all text for errors
- [ ] **Test on mobile** device
- [ ] **Verify passing score** is reasonable

### Using Preview Mode

1. **Click "Preview" button** in quiz list
2. **Orange preview banner** appears
3. **Take the quiz** as a student would see it
4. **Click "Reset"** to clear answers and try again
5. **Submit is blocked** - no scores saved
6. **Click "Exit Preview"** when done

**Preview Mode Features**:
- See exactly what students see
- Test timer functionality
- Try all question types
- No attempts or scores recorded
- Can reset and retry unlimited times

### Common Issues to Check

**Questions**:
- [ ] Question text is clear and unambiguous
- [ ] All options are plausible (multiple choice)
- [ ] Correct answers marked properly
- [ ] Explanations are helpful and accurate
- [ ] Points assigned appropriately

**Settings**:
- [ ] Time limit is reasonable (1-2 min per question)
- [ ] Passing score is achievable
- [ ] Attempt limit makes sense
- [ ] Feedback settings align with quiz purpose

**Technical**:
- [ ] No broken images or links
- [ ] Code blocks formatted correctly
- [ ] Mobile layout looks good
- [ ] Timer works correctly

---

## Publishing and Managing Quizzes

### Publishing Your Quiz

1. **Complete Pre-Launch Testing**
2. **Click "Publish" button**
3. **Confirm publication**
4. **Quiz goes live immediately**
5. **Students can now access it**

### Editing Published Quizzes

**You can edit anytime**, but be careful:

**Safe Edits**:
- ✅ Fix typos in questions
- ✅ Clarify confusing wording
- ✅ Update explanations
- ✅ Add more questions

**Risky Edits**:
- ⚠️ Changing correct answers (invalidates past attempts)
- ⚠️ Removing questions (breaks analytics)
- ⚠️ Changing point values (affects past scores)

**Best Practice**: If major changes needed, unpublish, edit, and republish

### Unpublishing a Quiz

1. **Go to quiz settings**
2. **Change status to "Draft"**
3. **Save changes**
4. **Students can no longer access** (new attempts blocked)
5. **Existing attempts/scores preserved**

### Duplicating a Quiz

1. **Select quiz** in quiz list
2. **Click "Duplicate" button**
3. **New copy created** with "(Copy)" suffix
4. **Edit as needed**
5. **Publish when ready**

**Use Cases**:
- Create variations for different sections
- Make practice version of assessment
- Archive old version before major edits
- Create quiz templates

### Bulk Operations

**Select Multiple Quizzes**:
- Check boxes next to quizzes
- **Publish All**: Publish multiple at once
- **Unpublish All**: Unpublish multiple
- **Delete All**: Remove multiple (careful!)
- **Export to JSON**: Download for backup

### Exporting Quizzes

1. **Select quiz(zes)**
2. **Click "Export" button**
3. **JSON file downloads**
4. **Contains all questions and settings**
5. **Use for backup or transfer**

---

## Best Practices

### Quiz Design Principles

**1. Align with Learning Objectives**
- Every question should test a learning outcome
- Don't test trivia - test understanding
- Connect questions to course content

**2. Vary Question Types**
- Mix multiple choice, true/false, short answer
- Prevents monotony
- Tests different cognitive levels

**3. Progressive Difficulty**
- Start easy to build confidence
- Gradually increase difficulty
- End with challenging questions

**4. Appropriate Length**
- 5-10 questions for weekly quizzes
- 10-20 questions for unit assessments
- 20-30 questions for final exams
- Consider time: 1-2 min per question

**5. Provide Meaningful Feedback**
- Always include explanations
- Help students learn from mistakes
- Guide them to correct understanding

### Question Writing Tips

**Clarity**:
- Use simple, direct language
- Avoid double negatives
- One idea per question
- No trick questions

**Fairness**:
- Test material actually taught
- Don't require outside knowledge
- Avoid cultural bias
- Ensure accessibility

**Quality**:
- Peer review with colleagues
- Test questions yourself
- Revise based on student performance
- Remove ambiguous questions

### Grading Strategy

**Point Distribution**:
- Easy questions: 1 point
- Medium questions: 2 points
- Hard questions: 3-5 points
- Essay questions: 5-10 points

**Passing Scores**:
- Formative (practice): 60-70%
- Summative (graded): 70-80%
- High-stakes: 80-90%

**Multiple Attempts**:
- Practice quizzes: Unlimited or 5+
- Learning quizzes: 3 attempts
- Assessments: 1-2 attempts
- **Record**: Best score, latest score, or average

### Time Limits

**General Guidelines**:
- Multiple choice: 1 minute per question
- Short answer: 2 minutes per question
- Essay: 5-10 minutes per question
- Add 20% buffer for reading time

**Example**: 10 multiple choice + 2 essays
- 10 × 1 min = 10 minutes
- 2 × 10 min = 20 minutes
- Buffer: 6 minutes
- **Total: 36 minutes → Set to 40 minutes**

### Common Pitfalls to Avoid

**❌ Too Difficult**
- Passing score too high
- Questions too ambiguous
- Material not covered

**❌ Too Easy**
- All multiple choice
- Obvious correct answers
- No challenge

**❌ Poor Feedback**
- No explanations
- Vague explanations
- Delayed feedback

**❌ Technical Issues**
- Not tested before launch
- Time limit too short
- Broken images/links

---

## Quiz Analytics

See detailed analytics after students take your quiz:

### Accessing Analytics

1. **Go to Course → Analytics tab**
2. **Click "Quizzes" section**
3. **View metrics for all quizzes**

### Key Metrics

**Attempts**:
- Total attempts across all students
- Average attempts per student
- Attempt distribution

**Scores**:
- Average score
- Score distribution
- Pass rate
- Highest/lowest scores

**Performance by Question**:
- % students who got each question right
- Identifies problem questions
- Helps improve quiz quality

**Time**:
- Average time to complete
- Identifies if time limit is appropriate

### Using Analytics to Improve

**Low Average Score (<60%)**:
- Quiz too hard?
- Material not taught well?
- Questions ambiguous?
- **Action**: Review and revise quiz

**High Average Score (>95%)**:
- Quiz too easy?
- Questions too obvious?
- **Action**: Add challenging questions

**Specific Question <40% Correct**:
- Question poorly worded?
- Concept not well-taught?
- **Action**: Reteach concept or rewrite question

**Students Running Out of Time**:
- Time limit too short?
- **Action**: Increase time limit by 20-30%

---

## Next Steps

Now that you can create quizzes, learn how to:

- **[Manage Students](./03-student-management.md)**: Track progress and engagement
- **[Use Analytics](./04-analytics-reporting.md)**: Deep dive into performance metrics
- **[Create Courses](./01-course-creation.md)**: Build complete courses with lessons

---

## Quick Reference: Question Type Cheat Sheet

| Type | Use For | Grading | Points | Best For |
|------|---------|---------|--------|----------|
| Multiple Choice | Single correct answer | Auto | 1-2 | Facts, concepts |
| Multiple Answer | Multiple correct answers | Auto | 2-3 | Comprehensive knowledge |
| True/False | Binary facts | Auto | 1 | Quick checks |
| Short Answer | One word/phrase | Auto | 1-2 | Terms, definitions |
| Fill Blank | Sentence completion | Auto | 1 | Context understanding |
| Essay | Explanations | Manual | 5-10 | Critical thinking |

---

**Happy Quiz Creating!** Great quizzes are essential for effective learning. Take time to craft thoughtful questions and iterate based on student performance.

**Last Updated**: November 2025 | **Version**: 1.4.0
