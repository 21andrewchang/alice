# Suggestion System Requirements (MVP)

## 1. User Placement & Bracket
- After onboarding, user is placed into a bracket (beginner, intermediate, advanced, expert) based on initial placement logic.
- ELO is strictly linear: user starts at bracket from placement, and ranks up by visiting nodes (every 5 nodes = rank up).
- Quiz performance is ignored for ELO/bracket progression and for all suggestion logic in this MVP.

## 2. Recommendation Logic
- Always recommend the closest node (in the graph) that matches the user's current bracket difficulty.
- If no perfect match, recommend the closest connected node of the next most appropriate difficulty.
- Users can be recommended nodes for which they have not completed all prerequisites.
- After visiting a node, generate a new recommendation based on updated visited nodes and bracket.
- Recommendation logic can be hardcoded for the demo; no ML or advanced scoring required.

## 3. User Flow
- After onboarding, user sees their first recommended node.
- When user clicks a node, they are taken to that node and a new recommendation is generated.
- As user visits more nodes, recommendations update to reflect new data.
- When user ranks up (every 5 nodes visited), recommendations shift to higher-difficulty nodes.

## 4. Fallbacks & Edge Cases
- If no ideal recommendation, suggest the closest connected node.
- No alternative suggestions or refresh button in MVP.
- No recommendation reasoning/explanation required in MVP.

## 5. Out of Scope
- No ML-based recommendations.
- No quiz-based ELO or performance-based suggestions.
- No UI for requesting alternative suggestions.
- No advanced fallback strategies.
