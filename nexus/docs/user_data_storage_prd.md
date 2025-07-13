# User Data & Progress – PRD (V1)

## Objective
Persist everything needed for a personalised, game-like learning journey: profile, XP, streaks, completed papers & lessons.

## Core Entities
| Table | Purpose |
|-------|---------|
| `users` | Profile, levels, XP, streak count |
| `papers` | Research paper metadata from `merged_graph.json` |
| `lessons` | Bite-sized concept lessons referenced from papers |
| `user_progress` | Mapping of which paper/lesson each user has completed, XP earned, timestamps |
| `streak_log` | Daily rows recording whether the user engaged, used to compute current streak |

## MVP Functionality
1. Update `user_progress` when a lesson is finished.  
2. Recalculate XP/level and store on `users`.  
3. Streak increments when at least one lesson completed in a UTC day.  
4. Guest progress stored client-side and merged on sign-up.

## Success Metrics
• Data integrity: <1 % write failures.  
• Streak accuracy: automated test proves 100 % correct rollovers.

## Out of Scope (V1)
• Rank placement system (gated until Level 30; separate doc).  
• Achievements & badges (note for future).  
• Friends/social graph.

## Future Notes
• Add `achievements` table; drive confetti & badge unlocks.  
• `friends` / `follow` table for social learning.
