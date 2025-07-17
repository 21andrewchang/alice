import { initializeSuggestionService, getSuggestionService } from './suggestionSystem';

/**
 * Initializes the suggestion system with the graph data
 * This should be called once when the application starts
 */
export async function initializeSuggestionSystem(): Promise<void> {
  try {
    // Load graph data
    const graphData = await fetch('/merged_graph.json').then(r => r.json());
    
    // Initialize the suggestion service with the graph data
    initializeSuggestionService(graphData);
    
    // Generate initial recommendation if needed
    const suggestionService = getSuggestionService();
    const currentRecommendation = suggestionService.getCurrentRecommendation();
    
    if (!currentRecommendation) {
      // No current recommendation, generate one
      suggestionService.generateRecommendation();
    }
    
    console.log('Suggestion system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize suggestion system:', error);
  }
}