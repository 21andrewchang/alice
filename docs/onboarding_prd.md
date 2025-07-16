# Onboarding Product Requirements Document (PRD)

## 1. Overview and Goals
- **Purpose:** Seamlessly introduce new users to the platform, assess their current knowledge, and recommend a personalized learning path.
- **Goals:**
  - Quickly gauge user proficiency across key foundational areas (math, programming, ML basics, etc.)
  - Make onboarding engaging, adaptive, and visually rewarding
  - Provide actionable next steps and a sense of progress

## 2. Quiz Flow
- **Adaptive Quiz:**
  - Users answer a series of questions of varying difficulty (beginner, intermediate, advanced)
  - Quiz adapts based on user performance (correct/incorrect/streaks/skips)
  - Difficulty of next question is adjusted in real time
- **Dev/Debug View:**
  - Show current question's difficulty and the most likely next question's difficulty (for development/testing)
  - Optionally show internal placement score/Elo
- **Question Types:**
  - Multiple choice (single answer)
  - (Future: code snippets, multi-select, etc.)

## 3. Feedback and Proficiency Chart
- **End-of-Quiz Feedback:**
  - Show a chart/graph of user proficiency by section/topic (e.g., Linear Algebra, Probability, Python, ML)
  - Highlight strengths and areas for improvement
  - Optionally, show which questions were missed/skipped by topic

## 4. Personalized Recommendations and Mini Roadmap
- **Recommendations:**
  - Suggest specific topics or nodes to review based on quiz performance
  - Provide a "mini roadmap" of what's up next (e.g., "Start with Linear Algebra, then move to Neural Networks")
  - Allow user to jump directly into recommended content

## 5. Placement Rank (Future)
- **Estimated Placement Rank:**
  - Show a badge or label for user's estimated placement (e.g., Beginner, Intermediate, Advanced)
  - Short description of what this means for their learning journey
  - (To be implemented in a later phase)

## 6. UX/Visual Polish
- **Celebration:**
  - Confetti or animation for quiz completion or high performance
- **Summary:**
  - Clear, visually appealing summary of results and next steps
- **Call to Action:**
  - Prominent "Continue to App" or "Start Learning" button
  - Option to create an account to save progress

---

**Next Steps:**
- Begin with verifying and improving the quiz's difficulty adjustment logic
- Add a dev/debug view for question difficulty and next likely difficulty
- Implement feedback chart and personalized recommendations after quiz completion 