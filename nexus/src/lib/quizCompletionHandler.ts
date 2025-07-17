import { getSuggestionService } from './suggestionSystem';

/**
 * Handle quiz completion events and update recommendations
 * @param nodeId The ID of the node for which the quiz was completed
 * @param score The score achieved on the quiz (0-100)
 */
export function handleQuizCompletion(nodeId: string, score: number): void {
  try {
    // Get the suggestion service
    const suggestionService = getSuggestionService();
    
    // Update recommendation based on quiz result
    suggestionService.updateAfterQuiz(nodeId, score);
    
    console.log(`Quiz completion handled for node ${nodeId} with score ${score}`);
  } catch (error) {
    console.error('Failed to handle quiz completion:', error);
    // Don't throw - just log the error to prevent UI disruption
  }
}

/**
 * Initialize quiz completion event listeners
 * This should be called once during application startup
 */
export function initQuizCompletionListeners(): void {
  if (typeof window !== 'undefined') {
    try {
      // Create a custom event for quiz completion
      window.addEventListener('quizCompleted', ((event: CustomEvent) => {
        try {
          const { nodeId, score } = event.detail;
          handleQuizCompletion(nodeId, score);
        } catch (error) {
          console.error('Error handling quiz completion event:', error);
        }
      }) as EventListener);
      
      console.log('Quiz completion listeners initialized');
    } catch (error) {
      console.error('Failed to initialize quiz completion listeners:', error);
    }
  }
}

/**
 * Dispatch a quiz completion event
 * This should be called when a user completes a quiz
 */
export function dispatchQuizCompletionEvent(nodeId: string, score: number): void {
  if (typeof window !== 'undefined') {
    try {
      const event = new CustomEvent('quizCompleted', {
        detail: { nodeId, score }
      });
      
      window.dispatchEvent(event);
      console.log(`Quiz completion event dispatched for node ${nodeId}`);
    } catch (error) {
      console.error('Failed to dispatch quiz completion event:', error);
    }
  }
}