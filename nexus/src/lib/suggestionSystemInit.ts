import { initializeSuggestionService, getSuggestionService } from './suggestionSystem';
import { recommendedNodeStore } from './suggestionSystem';

/**
 * Initializes the suggestion system with the graph data
 * This should be called once when the application starts
 */
export async function initializeSuggestionSystem(): Promise<void> {
  try {
    // Clear legacy/corrupt recommendation storage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('currentRecommendation');
      localStorage.removeItem('mostRecentRecommendation');
      localStorage.removeItem('recommendationHistory');
      console.log('[SuggestionInit] Cleared legacy/corrupt recommendation storage');
    }
    // Load graph data
    const graphData = await fetch('/merged_graph.json').then(r => r.json());
    console.log('[SuggestionInit] Loaded graphData:', graphData);
    // Initialize the suggestion service with the graph data
    initializeSuggestionService(graphData);
    console.log('[SuggestionInit] SuggestionService initialized');
    // Generate initial recommendation if needed
    const suggestionService = getSuggestionService();
    const currentRecommendation = suggestionService.getCurrentRecommendation();
    console.log('[SuggestionInit] Current recommendation before generation:', currentRecommendation);
    if (!currentRecommendation) {
      // No current recommendation, generate one and set it in the store
      const rec = suggestionService.generateRecommendation();
      console.log('[SuggestionInit] Generated recommendation:', rec);
      if (rec) recommendedNodeStore.set(rec);
      console.log('[SuggestionInit] Set recommendedNodeStore:', rec);
    }
    console.log('[SuggestionInit] Suggestion system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize suggestion system:', error);
  }
}