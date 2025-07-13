# Onboarding Flow – PRD (V1)

## Objective
Deliver an engaging first-time experience that guides guests from goal-setting to their first curated research-paper lesson—the initial “aha.”

## Flow Overview
1. **Goal Prompt** – Ask: “What do you want to master?” (free-text)
2. **Content Recommendation** – Algorithm selects a suitable research paper based on goal & difficulty.
3. **Paper Reader** – Display paper with inline highlights; unknown terms are clickable.
4. **Instant Lesson** – Clicking a term opens a Duolingo-style micro-lesson (concept, examples, 3-question quiz).
5. **XP & Streak Update** – On lesson completion, play success jingle + confetti, add XP, update local streak.
6. **Sign-Up Prompt** – Once the first lesson is completed, modal invites user to create an account to save progress.

## Game Mechanics
| Element | Rule |
|---------|------|
| XP | +10 per lesson, +25 for finishing first paper section |
| Level | XP thresholds: 0–99 → L1, 100–199 → L2, etc. |
| Streak | +1 day when ≥1 lesson completed UTC day |
| Rank | Hidden in V1; unlocked after Level 30 |

## Success Metrics
• ≥ 70 % of visitors finish the first micro-lesson.  
• ≥ 40 % of guest finishers sign up within the same session.  
• Average time-to-aha < 5 min.

## Non-Goals (MVP)
• Placement matches & rank reveal (see ranking PRD).  
• Achievement badges (future).  
• Friends & social feed.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Users skip sign-up despite progress | Second reminder after XP 100; soft paywall for advanced papers |
| Free-text goals too ambiguous | Offer autocomplete suggestions & fallback default path |

## Future Experiments
• A/B test paper-first vs. placement-first onboarding.  
• Gamified streak freeze tokens.

## Testing
- Automated unit tests for XP, level, and streak calculations.
- End-to-end playtests to ensure reward pacing feels engaging.
- Collect telemetry (added in V2 analytics) to validate assumptions on lesson completion rates.
