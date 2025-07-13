# Auth & Guest Flow – PRD (V1)

## Objective
Provide a friction-free authentication system that lets users experience Alice’s core value before committing to an account.

## Key Use Cases
1. Guest lands on the marketing page and begins onboarding without any sign-in.
2. After completing their first curated paper lesson (the initial “aha”), a sign-up prompt appears.
3. User creates an account via Google OAuth or Email magic-link; local guest progress is merged into their new profile.
4. Returning users are auto-signed in and resume exactly where they left off.

## MVP Scope (Public Release 1)
• Supported providers: Google OAuth, Email magic-link.  
• Guest progress stored in `localStorage`; merge into DB on sign-up.  
• Sign-up modal triggered after “aha”.  
• Session handling via Supabase JS client.

## Success Metrics
• Guest-to-signup conversion ≥ 40 %.  
• Auth-related error rate < 2 % of sessions.  
• Median time from page load to first lesson < 30 s.

## Non-Goals (MVP)
• Password auth, additional social providers, MFA.  
• Anonymous Supabase users.  
• Admin dashboard & role management (covered in later releases).

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Google OAuth quota limits | Users cannot sign-up | Enable Email fallback, monitor quota |
| LocalStorage cleared before sign-up | Progress lost | Inform users they can lose progress unless they sign-up; encourage early account creation |

## Future Considerations
• True anonymous sessions (Supabase edge function) for seamless multi-device guest play.  
• Add GitHub login once the product expands to open-source researchers.
