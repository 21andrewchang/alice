import { initializeSuggestionService, getSuggestionService, recommendedNodeStore } from './suggestionSystem';

/**
 * Initializes the suggestion system with the graph data
 * This should be called once when the application starts
 */
export async function initializeSuggestionSystem(): Promise<void> {
  try {
    // Remove all legacy/other keys
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('placementBracket');
      localStorage.removeItem('mostRecentRecommendation');
      localStorage.removeItem('recommendationHistory');
      // Do not remove userBracket or currentRecommendation
    }
    // Load graph data
    const graphData = await fetch('/merged_graph.json').then(r => r.json());
    initializeSuggestionService(graphData);
    const suggestionService = getSuggestionService();
    // Always load currentRecommendation from localStorage if present
    let rec: any = null;
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('currentRecommendation');
      if (saved) {
        rec = JSON.parse(saved);
        recommendedNodeStore.set(rec);
        console.log('[SuggestionInit] Loaded currentRecommendation from localStorage:', rec);
      }
    }
    if (!rec) {
      rec = suggestionService.generateRecommendation();
      if (rec && typeof localStorage !== 'undefined') {
        localStorage.setItem('currentRecommendation', JSON.stringify(rec));
        recommendedNodeStore.set(rec);
        console.log('[SuggestionInit] Generated and set currentRecommendation:', rec);
      }
    }
    console.log('[SuggestionInit] Suggestion system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize suggestion system:', error);
  }
}