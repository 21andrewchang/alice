import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  recommendedNodeStore, 
  recommendationHistoryStore, 
  updateRecommendation, 
  getRecommendationHistory,
  clearRecommendationHistory,
  loadRecommendationsFromLocalStorage,
  SuggestionService
} from './suggestionSystem';
import { get } from 'svelte/store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    getAll: () => store
  };
})();

// Mock window and localStorage for Node.js environment
vi.stubGlobal('localStorage', localStorageMock);

// Mock window.persistentLearnedNodes
vi.stubGlobal('window', {
  persistentLearnedNodes: new Set()
});

describe('Suggestion System', () => {
  beforeEach(() => {
    // Clear stores and localStorage before each test
    recommendedNodeStore.set(null);
    recommendationHistoryStore.set([]);
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Store Functions', () => {
    it('should update recommendation and add to history', () => {
      const testNode = { id: 'test-node', label: 'Test Node' };
      
      // Update recommendation
      updateRecommendation(testNode, 'next_in_path');
      
      // Check current recommendation
      const currentRecommendation = get(recommendedNodeStore);
      expect(currentRecommendation).not.toBeNull();
      expect(currentRecommendation?.node).toEqual(testNode);
      expect(currentRecommendation?.reason).toBe('next_in_path');
      expect(currentRecommendation?.confidence).toBe(0.8);
      
      // Check history
      const history = getRecommendationHistory();
      expect(history.length).toBe(1);
      expect(history[0].node).toEqual(testNode);
    });

    it('should clear recommendation history', () => {
      // Add some recommendations
      updateRecommendation({ id: 'node1' }, 'next_in_path');
      updateRecommendation({ id: 'node2' }, 'challenge_progression');
      
      // Verify history has items
      expect(getRecommendationHistory().length).toBe(2);
      
      // Clear history
      clearRecommendationHistory();
      
      // Verify history is empty
      expect(getRecommendationHistory().length).toBe(0);
    });

    it('should save and load recommendations from localStorage', () => {
      // Add a recommendation
      const testNode = { id: 'test-node', label: 'Test Node' };
      updateRecommendation(testNode, 'next_in_path');
      
      // Clear the stores (but not localStorage)
      recommendedNodeStore.set(null);
      recommendationHistoryStore.set([]);
      
      // Load from localStorage
      loadRecommendationsFromLocalStorage();
      
      // Verify data was loaded
      const currentRecommendation = get(recommendedNodeStore);
      expect(currentRecommendation).not.toBeNull();
      expect(currentRecommendation?.node).toEqual(testNode);
      
      const history = getRecommendationHistory();
      expect(history.length).toBe(1);
    });
  });

  describe('SuggestionService', () => {
    it('should initialize with graph data', () => {
      const mockGraph = {
        nodes: [
          { id: 'node1', label: 'Node 1', difficulty: 1 },
          { id: 'node2', label: 'Node 2', difficulty: 2 }
        ],
        links: [
          { source: 'node1', target: 'node2', relation: 'prerequisite' }
        ]
      };
      
      const service = new SuggestionService(mockGraph);
      expect(service).toBeDefined();
    });

    it('should generate recommendations based on user profile and graph', () => {
      // Create a simple graph with two connected nodes
      const mockGraph = {
        nodes: [
          { id: 'node1', label: 'Node 1', difficulty: 1, foundational: true },
          { id: 'node2', label: 'Node 2', difficulty: 2 }
        ],
        links: [
          { source: 'node1', target: 'node2', relation: 'prerequisite' }
        ]
      };
      
      const service = new SuggestionService(mockGraph);
      
      // For a new user with no visited nodes, it should recommend foundational nodes
      const recommendation = service.generateRecommendation();
      
      expect(recommendation).not.toBeNull();
      expect(recommendation?.node.id).toBe('node1'); // Should recommend the foundational node
    });

    it('should update recommendation after quiz completion', () => {
      // Create a simple graph with two connected nodes
      const mockGraph = {
        nodes: [
          { id: 'node1', label: 'Node 1', difficulty: 1 },
          { id: 'node2', label: 'Node 2', difficulty: 2 }
        ],
        links: [
          { source: 'node1', target: 'node2', relation: 'prerequisite' }
        ]
      };
      
      const service = new SuggestionService(mockGraph);
      
      // Update after quiz completion
      service.updateAfterQuiz('node1', 85); // High score
      
      // Check that node1 is now marked as mastered
      const userProfile = (service as any).userProfile;
      expect(userProfile.masteredNodes.has('node1')).toBe(true);
      
      // Check that a recommendation was generated
      const recommendation = service.getCurrentRecommendation();
      expect(recommendation).not.toBeNull();
    });

    it('should update recommendation after node visit', () => {
      // Create a simple graph with two connected nodes
      const mockGraph = {
        nodes: [
          { id: 'node1', label: 'Node 1', difficulty: 1 },
          { id: 'node2', label: 'Node 2', difficulty: 2 }
        ],
        links: [
          { source: 'node1', target: 'node2', relation: 'prerequisite' }
        ]
      };
      
      const service = new SuggestionService(mockGraph);
      
      // Update after node visit
      service.updateAfterNodeVisit('node1');
      
      // Check that node1 is now marked as visited
      const userProfile = (service as any).userProfile;
      expect(userProfile.visitedNodes.has('node1')).toBe(true);
      
      // Check that a recommendation was generated
      const recommendation = service.getCurrentRecommendation();
      expect(recommendation).not.toBeNull();
    });
  });
});