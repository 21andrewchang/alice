import { writable } from 'svelte/store';

export interface UserProfile {
  bracket: string;
  recommendation: number | null;
}

export const userProfile = writable<UserProfile>({ bracket: '', recommendation: null });
