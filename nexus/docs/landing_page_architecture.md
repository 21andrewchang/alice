# Landing Page – Architecture (V1)

## Route Structure
`/+page.svelte` (root) will serve the marketing landing page. Authenticated users will be redirected to `/app` automatically via `+layout.server.ts`.

## Component Tree
```
Hero
├─ CTAButton (Start Learning)
FeaturesGrid
DemoAnimation (Lottie)
SocialProofBar
FAQAccordion
Footer
```

## Key Tech
• SvelteKit + SSR (for SEO)  
• TailwindCSS for styling  
• `IntersectionObserver` to lazy-load the demo animation  
• `<picture>` + responsive images for hero art

## Performance Targets
• LCP under 2.5 s (pre-render hero, defer heavy assets)  
• Main bundle < 100 KB gzipped (code-split onboarding/app chunks)

## Auth Handling
```ts
// +layout.server.ts
export const load = async ({ locals }) => {
  if (locals.session) {
    throw redirect(302, '/app');
  }
  return {};
};
```

## Analytics Placeholder
Include a `<script>` tag for Plausible commented out; enable in V2.
