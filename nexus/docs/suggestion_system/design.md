# Suggestion System Design (MVP)

## Overview
The Suggestion System provides node recommendations to users based on their bracket (beginner, intermediate, advanced, expert) and nodes they have visited. The system is designed for a simple, hardcoded demo flow, with no ML or advanced logic.

## Data Model
- **UserProfile**: Tracks visited nodes, mastered nodes, ELO, and bracket. Quizzes and quiz history are ignored completely in the MVP (not tracked or used for any logic).
- **Graph**: Contains nodes (with id, label, difficulty, etc.) and links (prerequisites, connections).

## Recommendation Algorithm
> **Note:** The initial recommendation logic (after onboarding, based on bracket) is already fully implemented in the current codebase.
1. **Initial Recommendation**
   - After onboarding, recommend a node based on bracket (e.g., beginner → foundational node, advanced → research paper).
2. **On Node Visit**
   - When a user visits a node, add it to visitedNodes.
   - Generate a new recommendation:
     - Find the closest node (by graph connection) that matches the user's bracket difficulty.
     - If no perfect match, recommend the closest connected node of next-closest difficulty.
     - Users can be recommended nodes for which they have not completed all prerequisites.
3. **Bracket Progression**
   - Every 5 nodes visited, user ranks up a bracket.
   - Recommendations shift to higher-difficulty nodes as bracket increases.

## UI Flow
- After onboarding, show the recommended node.
- When user clicks a node, navigate to that node and update the recommendation.
- As user explores, recommendations update based on visited nodes and bracket.
- No reasoning/explanation or alternative suggestions in MVP.

## Fallback
- If no ideal recommendation, suggest the closest connected node.

## Out of Scope
- No ML, no quiz-based ELO, no alternative suggestions, no advanced fallback, no explanation UI.
