import { writable } from 'svelte/store';

// Store to track current page number for each node
export const currentPageStore = writable<Record<number, number>>({}); 