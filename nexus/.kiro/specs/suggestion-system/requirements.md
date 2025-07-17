# Requirements Document

## Introduction

The Suggestion System enhances the existing "Next Step" box by making it dynamic and responsive to user progress, quiz performance, and ELO bracket. The system will intelligently recommend the most appropriate next node from the knowledge graph to optimize user engagement and learning progression, similar to a League of Legends MMR system that keeps users challenged but not overwhelmed.

## Requirements

### Requirement 1

**User Story:** As a learner, I want the "Next Step" suggestion to update based on my progress and performance, so that I'm always guided to the most appropriate next learning step.

#### Acceptance Criteria

1. WHEN a user completes a quiz with a high score THEN the system SHALL suggest a more challenging connected node
2. WHEN a user struggles with quizzes (low scores) THEN the system SHALL suggest prerequisite nodes for review
3. WHEN a user's ELO bracket changes THEN the system SHALL update suggestions to match their skill level
4. IF a user is a beginner THEN the system SHALL prioritize foundational nodes even if they completed previous content
5. WHEN a user is on a winning streak THEN the system SHALL progressively suggest more challenging content

### Requirement 2

**User Story:** As a learner, I want the suggestion algorithm to keep me engaged and appropriately challenged, so that I maintain motivation and optimal learning flow.

#### Acceptance Criteria

1. WHEN a user is performing well THEN the system SHALL prioritize advancing them to more challenging topics
2. WHEN a user is struggling THEN the system SHALL suggest prerequisite nodes for reinforcement
3. WHEN determining suggestions THEN the system SHALL consider both user ELO bracket and recent quiz performance
4. WHEN multiple suitable nodes exist THEN the system SHALL select based on engagement optimization principles
5. IF a user reaches a learning plateau THEN the system SHALL have capability to suggest variety topics (future enhancement)

### Requirement 3

**User Story:** As a learner, I want suggestions to be personalized based on my learning profile, so that recommendations are relevant to my skill level and progress.

#### Acceptance Criteria

1. WHEN calculating suggestions THEN the system SHALL access user's ELO bracket (beginner/intermediate/advanced/expert)
2. WHEN calculating suggestions THEN the system SHALL consider historical quiz performance data
3. WHEN a user's performance changes THEN the system SHALL update suggestion logic accordingly
4. WHEN suggesting next steps THEN the system SHALL prioritize connected nodes in the knowledge graph