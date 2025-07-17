# Implementation Plan (MVP)

## Core Goal
- [ ] 1. When a user clicks the recommended node, generate a new recommendation based on updated visited nodes and bracket.
    - If the user clicks any other node, the recommendation stays the same for now.

## User Placement & Bracket
- [x] 2. After onboarding, place user in a bracket (beginner, intermediate, advanced, expert) based on initial placement logic.
- [x] 3. ELO is strictly linear: user starts at bracket from placement, and ranks up by visiting nodes (every 5 nodes = rank up).
- [x] 4. Quiz performance is ignored for ELO/bracket progression and for all suggestion logic in this MVP.

## Recommendation Logic
- [x] 5. Initial recommendation logic (after onboarding, based on bracket) is fully implemented.
- [ ] 6. Always recommend the closest node (in the graph) that matches the user's current bracket difficulty.
- [ ] 7. If no perfect match, recommend the closest connected node of the next most appropriate difficulty.
- [x] 8. Users can be recommended nodes for which they have not completed all prerequisites.

## User Flow
- [ ] 9. After onboarding, user sees their first recommended node.
- [ ] 10. When user clicks the recommended node, they are taken to that node and a new recommendation is generated.
- [ ] 11. As user visits more nodes, recommendations update to reflect new data (only when clicking the recommended node).
- [ ] 12. When user ranks up (every 5 nodes visited), recommendations shift to higher-difficulty nodes.

## Fallbacks & Edge Cases
- [ ] 13. If no ideal recommendation, suggest the closest connected node.
- [x] 14. No alternative suggestions or refresh button in MVP.
- [x] 15. No recommendation reasoning/explanation required in MVP.

## Out of Scope for MVP
- [x] 16. No ML-based recommendations.
- [x] 17. No quiz-based ELO or performance-based suggestions.
- [x] 18. No UI for requesting alternative suggestions.
- [x] 19. No advanced fallback strategies.