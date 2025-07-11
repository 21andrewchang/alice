# V0 Ranked System PRD

## Overview
The primary goal for V0 is to establish an initial ranking system that can effectively place users based on their first paper interaction. Key objectives:

1. **Initial Placement Assessment**
   - Track which concepts users engage with (basic vs advanced)
   - Monitor interaction patterns and comprehension
   - Place users in appropriate rank (defaulting to Bronze with variable MMR)
   - Use high volatility for rapid initial adjustment
   - Integrate natural checkpoints throughout paper content

2. **Core Mechanics**
   - Start users at Bronze with flexible hidden MMR
   - Higher volatility for new users enables faster rank adjustment
   - Engagement with basic concepts (e.g., basic math) may indicate lower initial placement
   - Engagement with advanced concepts may indicate higher initial placement
   - Final rank estimate given after completing first paper
   - Checkpoint system to validate understanding naturally

3. **Success Metrics**
   - Users feel accurately placed after first paper
   - Initial rank reflects demonstrated knowledge level
   - System can quickly adjust for misplacements
   - Clear path for progression visible to users
   - Checkpoint completion correlates with demonstrated understanding

## System Components

### 1. Ranking Tiers
- **Iron**: Foundational concepts, basic math
- **Bronze**: Basic calculus, introductory programming
- **Silver**: Linear algebra, basic ML concepts
- **Gold**: Proficient level, neural networks
- **Platinum**: Advanced architectures
- **Diamond**: Expert level, research papers
- **Master+**: Apex understanding, cutting-edge research
- Each tier has 4 divisions (e.g., Gold IV to Gold I)

### 2. MMR System
- Hidden MMR determines actual skill level
- More volatile for new users
- Affects visible rank changes
- Based on performance in checkpoints and engagement

### 3. Checkpoint System
1. **Concept Checks**
   - Follow concept introductions
   - Validate basic understanding
   - Interactive exercises

2. **Implementation Checks**
   - Technical understanding
   - Architecture comprehension
   - Practical application

3. **Synthesis Checks**
   - Connect multiple concepts
   - Cross-reference understanding
   - Higher-level thinking

4. **Application Checks**
   - Real-world applications
   - Practical insights
   - End-of-paper synthesis

### 4. Progression System
- Initial placement after first paper
- High volatility for quick adjustments
- Promotion series between tiers
- Demotion protection for new ranks

## V1 Considerations
1. **Beginner Experience**
   - Current difficulty curve may be too steep
   - Need more granular early tiers
   - Consider adding "beginner-friendly" designation
   - Early progression should feel more rewarding
   - Add placement matches system
   - Test with actual beginners
   - Refine checkpoint difficulty progression

2. **Progression System**
   - Current progression rules might be too restrictive
   - Consider more flexible prerequisites
   - Add "fast-track" options for clearly underranked users
   - Implement decay system for inactive users

## Implementation Timeline

### Phase 1: Core System (Week 1-2)
- Basic rank structure
- Initial MMR calculation
- Simple checkpoint integration

### Phase 2: Refinement (Week 3-4)
- Checkpoint system expansion
- MMR tuning
- User testing and calibration

### Phase 3: Polish (Week 5-6)
- UI/UX improvements
- System tuning based on feedback
- Documentation and launch prep 