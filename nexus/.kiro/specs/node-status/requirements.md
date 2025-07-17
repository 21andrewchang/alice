# Requirements Document

## Introduction

The Node Status feature enhances the visual representation of nodes in the knowledge graph to clearly indicate user progress and mastery levels. The system will provide immediate visual feedback about which nodes have been visited, attempted, and mastered, creating a clear learning journey visualization.

## Requirements

### Requirement 1

**User Story:** As a learner, I want to see visual indicators of my progress on nodes, so that I can track my learning journey and accomplishments at a glance.

#### Acceptance Criteria

1. WHEN a node has not been visited THEN the system SHALL display it in a dull color
2. WHEN a node has been visited but quiz not completed THEN the system SHALL display it in a bright color
3. WHEN a user achieves a passing grade on a node's quiz THEN the system SHALL display the node with a glow effect
4. WHEN a user views the knowledge graph THEN the system SHALL maintain consistent visual status across all nodes

### Requirement 2

**User Story:** As a learner, I want the node status to accurately reflect my current progress, so that I can easily identify where I am in my learning journey.

#### Acceptance Criteria

1. WHEN a user clicks on a node THEN the system SHALL update its status to "visited"
2. WHEN a user completes a quiz with a passing grade THEN the system SHALL update the node status to "mastered"
3. WHEN node status changes THEN the system SHALL immediately update the visual representation
4. WHEN a user returns to the knowledge graph THEN the system SHALL persist all node status changes

### Requirement 3

**User Story:** As a learner, I want node status to be tied to my actual performance, so that the visual indicators accurately represent my mastery level.

#### Acceptance Criteria

1. WHEN determining mastery status THEN the system SHALL use a defined passing grade threshold
2. WHEN a user retakes a quiz and improves their score THEN the system SHALL update node status accordingly
3. WHEN calculating node status THEN the system SHALL consider the user's best quiz performance
4. IF future enhancements are added THEN the system SHALL support variable glow intensity based on proficiency level