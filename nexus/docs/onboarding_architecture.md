# Onboarding Flow – Architecture (V1)

## Route Map
```
/onboarding           (+page.svelte) – Goal prompt & intro
/onboarding/paper     (+page.svelte) – Embedded PaperReader
/onboarding/lesson/[id] (+page.svelte) – Micro-lesson quiz
```
All under unauthenticated layout; after sign-up success we redirect to `/app`.

## Components
• `GoalPrompt.svelte` – text input + suggestions.  
• `PaperReader.svelte` – renders PDF/text, highlights terms.  
• `ConceptPopover.svelte` – hover/click term preview.  
• `LessonQuiz.svelte` – 3-question multiple-choice, XP rewards.  
• `SuccessModal.svelte` – XP gain + sign-up CTA.

## State Management
```ts
// src/stores/onboarding.ts
export const progress = writable<GuestProgress>(initial);
export const currentXP = derived(progress, p => p.xp);
```
Persist to `localStorage` on every write.

## XP & Level Calculation
```ts
function levelFromXP(xp: number) {
  return Math.floor(xp / 100) + 1;
}
```

## PDF Rendering
Use `pdfjs-dist` + Svelte wrapper; map DOM range to concept IDs via JSON annotations.

## Sound & Animation
• Success jingle: load via `<audio>` & play on lesson finish.  
• Confetti: import `canvas-confetti`.

## Redirect to Sign-Up
```ts
if (!session && progress.paperCompleted) {
  openSignupModal();
}
```

## Testing Checklist
- [ ] Refresh mid-lesson preserves state.  
- [ ] XP & streak increment on completion.  
- [ ] Sign-up merges progress.  
- [ ] Mobile viewport friendly.
