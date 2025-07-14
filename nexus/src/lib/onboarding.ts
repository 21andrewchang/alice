import { writable } from 'svelte/store';

function init() {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('onboardingComplete') === 'true';
  }
  return false;
}

export const onboardingComplete = writable<boolean>(init());

onboardingComplete.subscribe((val) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('onboardingComplete', val ? 'true' : 'false');
  }
});
