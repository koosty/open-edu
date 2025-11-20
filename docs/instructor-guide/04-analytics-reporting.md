# Instructor Guide: Analytics & Reporting

This comprehensive guide explains how to use Open-EDU's analytics dashboard to monitor course effectiveness, student engagement, and quiz performance.

## Table of Contents
1. [Accessing Analytics](#accessing-analytics)
2. [Overview Tab](#overview-tab)
3. [Students Tab](#students-tab)
4. [Lessons Tab](#lessons-tab)
5. [Quizzes Tab](#quizzes-tab)
6. [Interpreting Data](#interpreting-data)
7. [Taking Action on Insights](#taking-action-on-insights)

---

## Accessing Analytics

### Navigating to Analytics Dashboard

1. Go to **Admin Panel** → **Courses**
2. Select your course
3. Click **"View Analytics"** button

Or:
1. Open your course in admin panel
2. Click **"Analytics"** tab at the top

### Dashboard Overview

The analytics dashboard has **4 main tabs**:

```
┌────────────────────────────────────────────────┐
│ [Overview] [Students] [Lessons] [Quizzes]     │
├────────────────────────────────────────────────┤
│                                                │
│  Summary Cards & Insights                     │
│                                                │
└────────────────────────────────────────────────┘
```

Each tab provides different insights into your course performance.

---

## Overview Tab

The Overview tab gives you a high-level snapshot of course performance.

### Summary Cards

**4 Key Metrics Displayed**:

**1. Students Enrolled**
```
┌─────────────────┐
│ 👥 45 Students  │
│ Enrolled        │
└─────────────────┘
```
- Total number of enrolled students
- All active enrollments
- Includes students who haven't started

**2. Completion Rate**
```
┌─────────────────┐
│ ✅ 68%          │
│ Completion Rate │
└─────────────────┘
```
- Percentage of students who completed ≥80% of course
- **Good**: >60%
- **Excellent**: >80%

**3. Average Progress**
```
┌─────────────────┐
│ 📊 72%          │
│ Avg Progress    │
└─────────────────┘
```
- Mean progress across all students
- Calculated from lessons completed
- **Goal**: >70% by mid-course

**4. Average Time Spent**
```
┌─────────────────┐
│ ⏱️ 4.2 hours    │
│ Avg Time Spent  │
└─────────────────┘
```
- Average time students spend in course
- Includes reading and quiz time
- Compare to expected course duration

### At-Risk Students Alert

**What It Shows**:
```
⚠️ 8 Students Need Attention
[View At-Risk Students →]
```

**At-Risk Criteria**:
- Progress <25% after 2 weeks
- No activity in 7+ days
- Multiple failed quizzes
- Low engagement score

**Actions**:
- Click to see full list in Students tab
- Reach out proactively
- Offer support and resources

### Most Popular Lessons

**Top 5 Lessons by Engagement**:
```
1. Introduction to Functions    Score: 95
2. Working with Arrays           Score: 92
3. Object-Oriented Programming   Score: 88
4. Variables and Data Types      Score: 85
5. Introduction to JavaScript    Score: 82
```

**Engagement Score Calculation**:
- Completion rate (40%)
- Time spent relative to average (30%)
- Quiz performance (if applicable) (30%)
- Higher score = more engaging

**Insights**:
- These lessons are working well
- Students find them valuable
- Consider similar format for other lessons

### Least Engaging Lessons

**Bottom 5 Lessons by Engagement**:
```
1. Advanced Closures           Score: 42  ⚠️
2. Asynchronous Programming    Score: 48  ⚠️
3. Prototypes and Inheritance  Score: 52  ⚠️
4. Regular Expressions         Score: 58
5. Error Handling              Score: 61
```

**What This Means**:
- These lessons may need improvement
- Topics might be too complex
- Content might be unclear
- Students may be skipping or struggling

**Actions to Take**:
- Review and revise content
- Add more examples
- Break into smaller lessons
- Add video or visual aids
- Check for technical issues

### Quiz Performance Overview

**Summary of All Quizzes**:
```
Total Quizzes: 8
Total Attempts: 342
Average Score: 76%
Pass Rate: 82%
```

**Color Indicators**:
- **Green**: Pass rate >70%
- **Yellow**: Pass rate 50-70%
- **Red**: Pass rate <50%

---

## Students Tab

Deep dive into individual student performance.

### Students Table

**Columns Displayed**:

| Column | Information | Sortable |
|--------|-------------|----------|
| Student | Name + Avatar | Yes |
| Progress | Completion % | Yes |
| Lessons | Completed / Total | Yes |
| Time | Hours spent | Yes |
| Last Active | Date/time | Yes |
| Activity | Badge indicator | Yes |

**Example Row**:
```
👤 Alice Johnson    [████████░░] 80%    16/20    6.2h    2h ago    🔥 High
```

### Sorting & Filtering

**Sort Options**:
- By name (A-Z or Z-A)
- By progress (high to low or low to high)
- By activity (most recent first)
- By time spent

**Filter Options**:
- ☑ **Show At-Risk Only**: Display only struggling students
- Clear filter to see all students

### Activity Badges

**4 Activity Levels**:

**🔥 High Activity**
- Active daily or multiple times per week
- Making good progress
- Completing lessons regularly

**🟢 Medium Activity**
- Active 2-3 times per week
- Steady progress
- On track for completion

**🟡 Low Activity**
- Active once per week or less
- Slow progress
- May need encouragement

**⭕ Inactive**
- No activity in 7+ days
- At risk of dropping out
- **Immediate intervention needed**

### Student Detail View

Click any student name to see:
- Complete progress breakdown
- Lesson-by-lesson status
- All quiz attempts and scores
- Activity timeline
- Notes taken (if accessible)
- Time spent per lesson

---

## Lessons Tab

Analyze performance across all lessons in your course.

### Lessons Table

**Columns**:

| Column | Information |
|--------|-------------|
| Lesson | Lesson title |
| Completed | # students completed |
| Completion Rate | % completed |
| Engagement Score | 0-100 (higher = better) |
| Progress Bar | Visual indicator |

**Example Row**:
```
Lesson 3: Functions    38/45 (84%)    [████████░░] 87    
```

### Engagement Score

**What It Measures**:
- **Completion rate** (40 points max)
  - % of students who finished
- **Average time spent** (30 points max)
  - Compared to expected reading time
- **Quiz performance** (30 points max)
  - If lesson has quiz

**Score Ranges**:
- **90-100**: Excellent engagement
- **70-89**: Good engagement
- **50-69**: Moderate engagement
- **Below 50**: Needs improvement ⚠️

**Using Engagement Scores**:
- Identify best-performing lessons
- Find lessons needing improvement
- Compare similar topics
- Track changes after revisions

### Completion Rate Insights

**High Completion (>85%)**:
- ✅ Content is accessible
- ✅ Appropriate difficulty
- ✅ Well-paced
- **Action**: Use as template for other lessons

**Medium Completion (60-85%)**:
- ⚠️ Some students struggling or skipping
- Review for clarity
- Check length and complexity

**Low Completion (<60%)**:
- 🔴 Significant issues
- Content too difficult?
- Technical problems?
- Too long or boring?
- **Action**: Immediate revision needed

---

## Quizzes Tab

Detailed analytics for each quiz in your course.

### Quizzes Table

**Columns**:

| Column | Information |
|--------|-------------|
| Quiz | Quiz title |
| Status | Published or Draft |
| Attempts | Total across all students |
| Avg Score | Mean score percentage |
| Pass Rate | % students who passed |

**Example Row**:
```
JavaScript Basics Quiz    Published    127 attempts    76%    82%
                         (3.2 avg)              (Good)  (Good)
```

### Interpreting Quiz Metrics

**Total Attempts**:
- Higher = more engagement
- Divide by # students = avg attempts per student
- Many attempts might indicate difficulty

**Average Attempts Per Student**:
- **1-2 attempts**: Good first-time pass rate
- **3-4 attempts**: Students learning from retakes
- **5+ attempts**: Quiz may be too hard

**Average Score**:
- **>80%**: Students understand material well
- **70-79%**: Adequate understanding
- **60-69%**: Some struggle, review material
- **<60%**: Significant issues ⚠️

**Pass Rate** (% scoring ≥ passing score):
- **>80%**: Excellent - material well-taught
- **60-80%**: Good - room for improvement
- **40-60%**: Concerning - review content/quiz
- **<40%**: Critical - immediate action needed

### Quiz Performance by Question

Click a quiz to see:
- Performance on each question
- % students answering correctly
- Most missed questions
- Time spent per question

**Example**:
```
Question 1: Variable declaration
✓ Correct: 92%  (41/45 students)

Question 2: Closures explanation
✗ Correct: 38%  (17/45 students)  ⚠️ Review
```

**Low-Performing Questions (<60% correct)**:
- Question poorly worded?
- Concept not taught clearly?
- Multiple correct interpretations?
- **Actions**:
  - Reteach the concept
  - Rewrite the question
  - Add explanations
  - Provide more examples

---

## Interpreting Data

### Health Check Indicators

**Your Course is Healthy If**:
- ✅ Completion rate >60%
- ✅ Average progress >70%
- ✅ <15% at-risk students
- ✅ Quiz pass rates >70%
- ✅ Most engagement scores >70
- ✅ Activity levels mostly high/medium

**Your Course Needs Attention If**:
- ⚠️ Completion rate <50%
- ⚠️ Average progress <60%
- ⚠️ >25% at-risk students
- ⚠️ Quiz pass rates <60%
- ⚠️ Multiple low engagement scores
- ⚠️ Many inactive students

### Comparing Cohorts

**If teaching multiple sections**:
- Compare completion rates
- Identify better-performing sections
- Analyze what's different
- Adjust teaching strategies

**Over Time**:
- Track improvements after revisions
- See if engagement increases
- Monitor at-risk student trends
- Evaluate new content effectiveness

### Setting Benchmarks

**Establish Your Baselines**:
1. Note current metrics after first cohort
2. Set realistic improvement goals
3. Track progress toward goals
4. Celebrate wins

**Example Goals**:
- Increase completion rate by 10%
- Reduce at-risk students by 20%
- Improve quiz average from 72% to 78%
- Boost engagement scores for problem lessons

---

## Taking Action on Insights

### Based on Overview Metrics

**Low Completion Rate (<60%)**:
**Possible Causes**:
- Course too long or demanding
- Early lessons not engaging
- Difficult content
- Technical issues

**Actions**:
1. Review early lessons (students may drop early)
2. Survey students for feedback
3. Check lesson engagement scores
4. Simplify complex topics
5. Add motivational elements

**High At-Risk Count (>20%)**:
**Actions**:
1. Send proactive outreach emails
2. Offer office hours or tutoring
3. Create FAQ or help resources
4. Check if deadlines are realistic
5. Identify common struggles

**Low Average Time Spent**:
**Could Mean**:
- Content too easy (students skim)
- Students skipping sections
- Technical issues loading content

**Actions**:
1. Add more depth or challenge
2. Include thought-provoking questions
3. Verify all content loads properly
4. Add interactive elements

### Based on Student Tab

**Many Inactive Students**:
**Actions**:
1. Send re-engagement emails
2. Offer deadline extensions
3. Create "catch-up" plan
4. Remove inactive enrollments (if policy allows)

**Varying Progress Levels**:
**Actions**:
1. Create optional "fast track" for advanced students
2. Offer remedial resources for struggling students
3. Group students for peer learning
4. Provide differentiated materials

### Based on Lessons Tab

**Low Engagement Lesson**:
**Actions**:
1. **Revise content**: Simplify, add examples
2. **Break into parts**: Split long lessons
3. **Add media**: Videos, diagrams, interactive elements
4. **Check prerequisites**: Is prior knowledge assumed?
5. **Test yourself**: Take the lesson as a student would

**Skipped Lessons**:
**Actions**:
1. Investigate why students skip
2. Make prerequisites clearer
3. Highlight importance in announcements
4. Consider removing if truly optional

### Based on Quizzes Tab

**Low Quiz Pass Rate (<60%)**:
**Actions**:
1. **Review material**: Is content taught clearly?
2. **Revise quiz**: Questions too hard or ambiguous?
3. **Lower passing score**: If set too high
4. **Add practice quiz**: Before graded assessment
5. **Provide study guide**: Help students prepare

**Specific Questions Missed**:
**Actions**:
1. Reteach that concept in lesson
2. Rewrite confusing question
3. Add explanation or hint
4. Provide additional examples
5. Create supplementary content

**Low Attempt Count**:
**Could Mean**:
- Students not reaching quiz
- Quiz optional and skipped
- Access issues

**Actions**:
1. Check quiz is published
2. Verify lesson prerequisites
3. Announce quiz availability
4. Consider making required

---

## Exporting Data

### Export Options

**Student List**:
- Export to CSV or Excel
- Includes all metrics
- Use for grade reporting
- Share with administrators

**Quiz Results**:
- Export all attempts
- Individual student scores
- Question-level performance
- Timestamp data

**Course Summary**:
- Overall analytics report
- PDF or CSV format
- Share with stakeholders
- Track over time

### How to Export

1. Go to specific tab (Students, Lessons, or Quizzes)
2. Click **"Export"** or **"Download"** button
3. Choose format (CSV, Excel, PDF)
4. File downloads to your computer

---

## Analytics Best Practices

### Regular Monitoring

**Weekly Check-In**:
- Review at-risk students
- Monitor completion rates
- Respond to drops in engagement
- Reach out to inactive students

**Mid-Course Review**:
- Analyze quiz performance
- Identify problem lessons
- Make mid-course corrections
- Survey students for feedback

**Post-Course Analysis**:
- Final completion rate
- Overall quiz performance
- Lesson effectiveness
- Plan improvements for next offering

### Data-Driven Decisions

**Don't Guess - Measure**:
- Use data to guide revisions
- Test changes and compare results
- Track before/after metrics
- Share insights with colleagues

**Balance Quantitative and Qualitative**:
- Analytics show WHAT is happening
- Student feedback shows WHY
- Combine both for complete picture

### Privacy and Ethics

**Use Data Responsibly**:
- Don't publicly shame low performers
- Keep individual data confidential
- Follow institutional policies (FERPA, GDPR)
- Use insights to help, not punish

---

## Quick Reference: Analytics Actions

| Metric | Threshold | Action |
|--------|-----------|--------|
| Completion Rate | <60% | Revise early lessons |
| At-Risk Students | >20% | Proactive outreach |
| Quiz Pass Rate | <60% | Review content/quiz |
| Engagement Score | <50 | Revise lesson content |
| Inactive Students | >15% | Re-engagement campaign |
| Quiz Attempts | >5 avg | Simplify or review content |

---

## Next Steps

- **[Student Management](./03-student-management.md)**: Use insights to support students
- **[Quiz Creation](./02-quiz-creation.md)**: Improve quiz design based on data
- **[Course Creation](./01-course-creation.md)**: Apply lessons to future courses

---

**Data is your friend!** Regular analytics review helps you create better courses, support struggling students, and continuously improve the learning experience.

**Last Updated**: November 2025 | **Version**: 1.4.0
