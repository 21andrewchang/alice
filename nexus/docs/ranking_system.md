# Nexus Ranking System Design

## Overview
The ranking system will enhance user experience by providing clear progression paths and achievement metrics. It will help users understand their learning progress and guide them towards optimal learning sequences.

### 1. Dual Ranking System
- **Visible Rank**
  - Bronze, Silver, Gold, Platinum, Diamond, Master
  - Each tier has 3 divisions (e.g., Gold III, Gold II, Gold I)
  - Clear progression visible to users
  - Based on consistent performance and engagement

- **Hidden MMR (Matchmaking Rating)**
  - Numerical value (e.g., 0-3000)
  - More volatile for new users
  - Used to determine actual skill level
  - Affects visible rank changes

### 2. Volatility System
- **High Volatility (New Users)**
  - Larger MMR changes (±50-100 points)
  - Quick initial placement
  - Rapidly adjusts to demonstrated understanding
  - First 3-5 papers have highest volatility

- **Stabilizing Volatility**
  - Decreases with each paper completion
  - Smaller MMR changes (±15-25 points)
  - More papers needed to change visible rank
  - Rewards consistency over time

### 3. Initial Paper Assessment
For first-time paper reading (e.g., "Attention Is All You Need"):

**Assessment Metrics:**
1. **Comprehension Checkpoints**
   - Key concept identification
   - Architecture understanding
   - Mathematical formulation grasp
   - Implementation insights
   - Each checkpoint worth 0-100 points

2. **Engagement Metrics**
   - Time spent per section
   - Re-reading patterns
   - Note-taking activity
   - Reference exploration
   - Each metric contributes to confidence score

3. **Interactive Verification**
   - Quick concept quizzes
   - Architecture diagram assembly
   - Formula explanation
   - Use-case identification
   - Performance impacts confidence score

**Scoring Formula:**
```
Initial_MMR = Base_MMR + 
              (Comprehension_Score * 0.4) +
              (Engagement_Score * 0.3) +
              (Verification_Score * 0.3)

Confidence = min(1.0, Papers_Completed * 0.2)
Volatility = max(25, 100 * (1 - Confidence))
```

### 4. MMR Adjustment Factors
- **Performance Metrics**
  - Comprehension score (40%)
  - Engagement level (30%)
  - Verification success (30%)

- **Confidence Calculation**
  ```
  Confidence_Score = (
    (Time_Spent_Weight * Normalized_Time) +
    (Quiz_Performance_Weight * Quiz_Score) +
    (Interaction_Weight * Interaction_Score)
  ) / Total_Weight
  ```

- **MMR Change Formula**
  ```
  MMR_Change = Volatility * (Performance_Score - Expected_Score) * Confidence_Multiplier
  ```

### 5. Rank Thresholds
```
Bronze:    0-999 MMR
Silver:    1000-1499 MMR
Gold:      1500-1999 MMR
Platinum:  2000-2499 MMR
Diamond:   2500-2999 MMR
Master:    3000+ MMR

Divisions:
III: Lower third of tier range
II:  Middle third of tier range
I:   Upper third of tier range
```

### 6. Initial Placement Strategy
1. **First Paper Reading**
   - Start at 500 MMR (Bronze II)
   - High volatility (±100 MMR)
   - Can jump multiple divisions based on performance

2. **Performance Assessment**
   - Track time spent on complex sections
   - Monitor interaction with mathematical notations
   - Evaluate understanding of key concepts
   - Assess ability to connect ideas

3. **Placement Calculation**
   ```
   Initial_Placement_Score = 
     Base_Score +
     (Concept_Understanding * 0.4) +
     (Technical_Grasp * 0.3) +
     (Engagement_Quality * 0.3)
   
   Initial_MMR = 
     500 + (Initial_Placement_Score * Volatility_Multiplier)
   ```

### 7. Future Considerations
1. **Cross-Paper Performance**
   - Track concept retention across related papers
   - Reward building connections between papers
   - Higher weights for advanced concept mastery

2. **Domain Specialization**
   - Track performance in specific domains
   - Separate MMR for different fields
   - Composite ranking for overall expertise

3. **Adaptive Difficulty**
   - Suggest papers based on current MMR
   - Adjust assessment difficulty
   - Dynamic learning paths

4. **Anti-Gaming Measures**
   - Minimum time thresholds
   - Pattern detection for superficial reading
   - Randomized verification questions
   - Cross-reference checks

### Confidence-Based LP Gain & Milestone Reminders
- Each user’s hidden **MMR** also stores a _confidence score_ \(0–1) that grows with the number and recency of assessed items.
- **LP (League Points)** earned/lost per session is scaled by `confidence` so early games move rank faster while mature accounts stabilize.
- **Experience (XP)** only influences _user level_ (progression & feature unlocks) and is **decoupled** from visible rank.
- Rank reveal is **gated until Level 30**; once the XP threshold is met, Alice shows a progress bar on every screen so users know how close they are.
- After unlock, progress toward next rank division/tier continues to be surfaced via an always-visible LP meter.

### Next Steps
- Define formula: `LP_delta = Base * Performance * confidence` with min/max caps.
- Simulate various confidence curves to ensure fair LP gains.
- UX: add subtle header banner showing “Level 27 → 30” progress percentage during onboarding and regular lessons. 