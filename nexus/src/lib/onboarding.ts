import { writable, derived } from 'svelte/store';
import { supabase } from './supabaseClient';

// Dev mode - set to true to bypass onboarding localStorage check
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEV_ONBOARDING === 'true';

// Guest progress tracking
export interface GuestProgress {
  xp: number;
  streak: number;
  papersCompleted: number;
  goal?: string;
  currentPaper?: string;
  lessonsCompleted: number;
}

// Onboarding step tracking
export type OnboardingStep = 'goal' | 'paper' | 'lesson' | 'complete';

// Initialize guest progress
function initGuestProgress(): GuestProgress {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('guestProgress');
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return {
    xp: 0,
    streak: 0,
    papersCompleted: 0,
    lessonsCompleted: 0
  };
}

// Initialize onboarding completion
function initOnboardingComplete(): boolean {
  if (DEV_MODE) {
    console.log('🔧 DEV MODE: Onboarding bypassed');
    return false; // Always show onboarding in dev mode
  }
  
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('onboardingComplete') === 'true';
  }
  return false;
}

// Stores
export const guestProgress = writable<GuestProgress>(initGuestProgress());
export const onboardingComplete = writable<boolean>(initOnboardingComplete());
export const currentOnboardingStep = writable<OnboardingStep>('goal');

// Derived stores
export const currentLevel = derived(guestProgress, ($progress) => {
  return Math.floor($progress.xp / 100) + 1;
});

// Helper to check if user is logged in
export async function isUserLoggedIn() {
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

export const shouldShowOnboarding = derived(
  [onboardingComplete, currentOnboardingStep],
  ([$complete, $step], set: (value: boolean | null) => void) => {
    set(null);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        set(false);
      } else {
        set(!($complete));
      }
    });
  },
  null
);

// Persist guest progress to localStorage
guestProgress.subscribe((progress) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('guestProgress', JSON.stringify(progress));
  }
});

// Persist onboarding completion
onboardingComplete.subscribe((val) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('onboardingComplete', val ? 'true' : 'false');
  }
});

// XP and progress functions
export function addXP(amount: number) {
  guestProgress.update(progress => ({
    ...progress,
    xp: progress.xp + amount
  }));
}

export function completeLesson() {
  guestProgress.update(progress => ({
    ...progress,
    lessonsCompleted: progress.lessonsCompleted + 1
  }));
  addXP(10);
}

export function completePaper() {
  guestProgress.update(progress => ({
    ...progress,
    papersCompleted: progress.papersCompleted + 1
  }));
  addXP(25);
}

export function setGoal(goal: string) {
  guestProgress.update(progress => ({
    ...progress,
    goal
  }));
}

export function setCurrentPaper(paperId: string) {
  guestProgress.update(progress => ({
    ...progress,
    currentPaper: paperId
  }));
}

// Dev mode utilities
export function resetOnboarding() {
  if (DEV_MODE) {
    localStorage.removeItem('onboardingComplete');
    localStorage.removeItem('guestProgress');
    onboardingComplete.set(false);
    guestProgress.set({
      xp: 0,
      streak: 0,
      papersCompleted: 0,
      lessonsCompleted: 0
    });
    currentOnboardingStep.set('goal');
    console.log('🔧 DEV MODE: Onboarding reset');
  }
}

export function skipToStep(step: OnboardingStep) {
  if (DEV_MODE) {
    currentOnboardingStep.set(step);
    console.log(`🔧 DEV MODE: Skipped to step: ${step}`);
  }
}
