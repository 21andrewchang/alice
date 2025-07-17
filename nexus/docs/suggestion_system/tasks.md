# Implementation Plan

- [x] 1. Fix initial recommendation logic
  - After onboarding, if beginner/intermediate, recommend 'Neural Networks' node
  - If advanced/expert, recommend 'Attention Is All You Need' paper
  - Remove any logic that causes 'mean' or other incorrect nodes to be suggested
  - Quiz performance is ignored for now; only ELO bracket and visited/mastered nodes are used
  - _Requirements: 1.1, 1.3, 3.1_

- [in_progress] 2. Implement ELO progression and user profile window
  - ELO/Bracket progression is now based only on the number of unique nodes visited (linear: every 5 nodes = rank up)
  - Add a UI window near the logout button to display user profile stats (ELO, bracket, nodes visited, nodes mastered, recent nodes)
  - Suggestion box should update immediately and glow when the recommendation changes
  - Recommendation after onboarding should be a node connected to the last visited node, filtered by bracket-appropriate difficulty
  - _Requirements: 1.3, 2.3, 3.1, 3.2_

- [ ] 3. Develop the suggestion service
  - [x] 3.1 Create SuggestionService class
    - Implement core service methods
    - Set up event listeners for recommendation triggers
    - Add service initialization logic
    - _Requirements: 1.1, 1.3, 2.1, 2.2_

  - [ ] 3.2 Implement user profile management
    - Create functions to build user profile from available data
    - Track ELO bracket and quiz performance
    - Maintain visited and mastered nodes lists
    - _Requirements: 1.3, 1.4, 2.3, 3.1, 3.2_

  - [ ] 3.3 Build node selection algorithm
    - Implement node scoring function
    - Create difficulty matching algorithm
    - Add prerequisite validation logic
    - Develop path relevance calculation
    - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2_

- [ ] 4. Implement recommendation triggers
  - [ ] 4.1 Add quiz completion trigger
    - Hook into quiz completion events
    - Update user profile with quiz results
    - Generate new recommendation based on performance
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [ ] 4.2 Add node visit trigger
    - Hook into node selection events
    - Update user profile with visited node
    - Generate new recommendation if needed
    - _Requirements: 1.3, 1.5, 2.1_

  - [ ] 4.3 Add application startup trigger
    - Initialize recommendation on app load
    - Handle first-time users with default recommendations
    - Restore previous recommendations for returning users
    - _Requirements: 1.4, 3.4_

- [ ] 5. Enhance the Next Step UI component
  - [ ] 5.1 Update the existing UI
    - Add recommendation reason display
    - Implement refresh button for alternative suggestions
    - Show node type/domain indicator
    - _Requirements: 1.1, 1.3, 2.4_

  - [ ] 5.2 Add tooltip with explanation
    - Create tooltip component for recommendation explanation
    - Generate human-readable explanations for recommendations
    - Style tooltip to match application design
    - _Requirements: 2.4, 3.3_

- [ ] 6. Implement knowledge graph analysis
  - Develop functions to analyze node connections
  - Create helper methods for finding related nodes
  - Implement prerequisite chain analysis
  - _Requirements: 1.1, 1.2, 2.1, 3.4_

- [ ] 7. Create fallback recommendation strategies
  - Implement popularity-based recommendations
  - Add domain exploration recommendations
  - Create review recommendations for previously visited nodes
  - _Requirements: 1.4, 2.1, 2.5_

- [ ] 8. Add comprehensive testing
  - [ ] 8.1 Write unit tests
    - Test node scoring algorithm
    - Test difficulty matching function
    - Test recommendation generation pipeline
    - _Requirements: All_

  - [ ] 8.2 Write integration tests
    - Test end-to-end recommendation flow
    - Test store updates and UI rendering
    - Test quiz completion → recommendation update flow
    - _Requirements: All_

- [ ] 9. Optimize performance and add error handling
  - Implement caching for expensive calculations
  - Add error handling for recommendation failures
  - Create graceful degradation for edge cases
  - _Requirements: All_

---

**CURSOR RULE:** Always check with Andrew before proceeding to the next step in tasks.md. Do not move to the next step without explicit confirmation.