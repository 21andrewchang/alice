# V0 Ranked System Architecture

## Technical Implementation Details

### 1. MMR & LP System
Reference: [PRD Section 2: MMR System]

```typescript
// Base LP gains (similar to League's system)
const BASE_LP_GAIN = 25;

// Confidence modifiers
const confidenceMultipliers = {
  veryLow: 1.24,    // +31 LP
  low: 1.12,        // +28 LP
  normal: 1.0,      // +25 LP
  high: 0.92,       // +23 LP
  veryHigh: 0.84    // +21 LP
};

// Difficulty impact multipliers
const difficultyMultipliers = {
  // Mastering nodes at your tier
  SAME_TIER: 1.0,        // +25 LP (base)
  
  // Mastering nodes above your tier
  TIER_PLUS_ONE: 1.2,    // +30 LP
  TIER_PLUS_TWO: 1.4,    // +35 LP
  
  // Mastering nodes below your tier
  TIER_MINUS_ONE: 0.8,   // +20 LP
  TIER_MINUS_TWO: 0.6    // +15 LP
};

// Final LP calculation
const calculateLP = (baseLP, confidence, difficultyDelta) => {
  const confidenceMultiplier = confidenceMultipliers[confidence];
  const difficultyMultiplier = getDifficultyMultiplier(difficultyDelta);
  
  return Math.round(baseLP * confidenceMultiplier * difficultyMultiplier);
};
```

### 2. Checkpoint System
Reference: [PRD Section 3: Checkpoint System]

```typescript
interface Checkpoint {
  id: string;
  type: 'concept_check' | 'implementation' | 'synthesis' | 'application';
  difficulty: NodeDifficulty;
  position: {
    section: string;
    natural_break_point: boolean;  // True if it follows a major concept
  };
  format: {
    style: 'interactive' | 'diagram' | 'completion' | 'explanation';
    expected_time: number;  // in seconds
  };
}

interface CheckpointScore {
  completion: number;      // 0-1: Did they attempt it?
  accuracy: number;        // 0-1: Were they correct?
  time_taken: number;      // Seconds spent
  attempts: number;        // Number of tries
  confidence_impact: {
    increase: number;      // How much to increase confidence if done well
    decrease: number;      // How much to decrease if struggled
  };
}

// Checkpoint weight in final assessment
const checkpointWeights = {
  concept_check: 0.25,
  implementation: 0.3,
  synthesis: 0.25,
  application: 0.2
};

// Impact on MMR/LP calculations
function calculateCheckpointImpact(scores: CheckpointScore[]) {
  return scores.reduce((impact, score) => {
    const weight = checkpointWeights[score.type];
    const performance = (score.completion * 0.3) + (score.accuracy * 0.7);
    return impact + (performance * weight);
  }, 0);
}
```

### 3. Node Difficulty System
Reference: [PRD Section 1: Ranking Tiers]

```typescript
enum NodeDifficulty {
  FOUNDATIONAL = 0,    // Iron - Basic math, fundamental concepts
  BASIC = 1,          // Bronze - Calculus, basic programming
  INTERMEDIATE = 2,   // Silver - Linear algebra, basic ML concepts
  PROFICIENT = 3,     // Gold - Neural networks, optimization
  ADVANCED = 4,       // Platinum - Advanced architectures
  EXPERT = 5,         // Diamond - Novel approaches, research papers
  APEX = 6            // Master+ - Cutting-edge research understanding
}

// Difficulty calculation factors
interface DifficultyFactors {
  prerequisiteDepth: number;    // How deep is the prerequisite chain
  mathComplexity: number;       // 0-3 scale of mathematical sophistication
  conceptualDepth: number;      // 0-3 scale of theoretical complexity
  implementationComplexity: number;  // 0-3 scale of implementation difficulty
}

function calculateNodeDifficulty(factors: DifficultyFactors): NodeDifficulty {
  const baseScore = 
    Math.log2(factors.prerequisiteDepth) * 0.5 +
    factors.mathComplexity +
    factors.conceptualDepth +
    factors.implementationComplexity;
    
  return Math.min(APEX, Math.floor(baseScore));
}
```

### 4. Engagement Tracking
Reference: [PRD Section 2: MMR System]

```typescript
// Timeout threshold for inactivity
const TIMEOUT_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds

// Track active time with timeout
function calculateActiveTime(interactions) {
  let activeTime = 0;
  let lastInteractionTime = null;
  
  interactions.forEach(interaction => {
    const currentTime = interaction.timestamp;
    
    if (lastInteractionTime) {
      const timeDiff = currentTime - lastInteractionTime;
      // Only count time if within timeout threshold
      if (timeDiff < TIMEOUT_THRESHOLD) {
        activeTime += timeDiff;
      }
    }
    lastInteractionTime = currentTime;
  });
  
  return activeTime;
}

// Calculate engagement score with timeout consideration
function calculateEngagement(interactions, totalTime) {
  const activeTime = calculateActiveTime(interactions);
  const activeRatio = activeTime / totalTime;
  
  return {
    Time_Factor: Math.min(0.3, activeTime / expected_time),
    Engagement: (
      section_coverage * activeRatio +
      interaction_depth +
      quiz_completion
    ) / 3
  };
}
```

### 5. Promotion System
Reference: [PRD Section 4: Progression System]

```typescript
// Promotion series requirements
const promotionRules = {
  // Division promotions (e.g., Gold IV to Gold III)
  divisionPromo: {
    required: 100,        // LP needed to trigger
    matches: 2,          // Best of 3
    wins_needed: 2
  },
  
  // Tier promotions (e.g., Gold I to Platinum IV)
  tierPromo: {
    required: 100,
    matches: 3,          // Best of 5
    wins_needed: 3
  }
};

// Demotion protection
const demotionShield = {
  newTier: 10,          // 10 games protection on reaching new tier
  lowLP: 3              // 3 games protection at 0 LP
};
```

### Database Schema

```sql
-- User Rankings
CREATE TABLE user_rankings (
  user_id UUID PRIMARY KEY,
  visible_rank TEXT NOT NULL,
  division INT NOT NULL,
  mmr INT NOT NULL,
  lp INT NOT NULL,
  peak_rank TEXT NOT NULL,
  peak_mmr INT NOT NULL,
  confidence FLOAT NOT NULL,
  volatility FLOAT NOT NULL,
  papers_completed INT NOT NULL DEFAULT 0
);

-- Checkpoint Progress
CREATE TABLE checkpoint_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  checkpoint_id TEXT NOT NULL,
  completion FLOAT NOT NULL,
  accuracy FLOAT NOT NULL,
  time_taken INT NOT NULL,
  attempts INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES user_rankings(user_id)
);

-- Node Difficulty
CREATE TABLE node_difficulties (
  node_id TEXT PRIMARY KEY,
  difficulty NodeDifficulty NOT NULL,
  prerequisite_depth INT NOT NULL,
  math_complexity INT NOT NULL,
  conceptual_depth INT NOT NULL,
  implementation_complexity INT NOT NULL
);
``` 