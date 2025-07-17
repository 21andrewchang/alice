import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  NodeStatusService, 
  NodeStatus,
  getDomainColor,
  dimColor,
  calculateVisualState,
  getNodeVisualState,
  shouldEnhanceLink,
  calculateLinkVisualState,
  nodeStatusService
} from './nodeStatus.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window object for server-side testing
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

// Also mock localStorage directly for the service
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('NodeStatusService', () => {
  let service: NodeStatusService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = new NodeStatusService();
  });

  describe('getNodeStatus', () => {
    it('should return default status for new node', () => {
      const status = service.getNodeStatus('test-node');
      
      expect(status).toEqual({
        nodeId: 'test-node',
        status: 'not_visited',
        lastUpdated: expect.any(Date),
        passingGrade: 80
      });
    });

    it('should return existing status for known node', () => {
      service.updateNodeStatus('test-node', { status: 'visited' });
      const status = service.getNodeStatus('test-node');
      
      expect(status.status).toBe('visited');
      expect(status.nodeId).toBe('test-node');
    });
  });

  describe('updateNodeStatus', () => {
    it('should update node status and save to localStorage', () => {
      service.updateNodeStatus('test-node', { 
        status: 'visited',
        quizScore: 85 
      });

      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('visited');
      expect(status.quizScore).toBe(85);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('markAsVisited', () => {
    it('should mark not_visited node as visited', () => {
      service.markAsVisited('test-node');
      
      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('visited');
    });

    it('should not change already mastered node', () => {
      service.updateNodeStatus('test-node', { status: 'mastered' });
      service.markAsVisited('test-node');
      
      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('mastered');
    });
  });

  describe('calculateMasteryStatus', () => {
    it('should return mastered for passing score', () => {
      const result = service.calculateMasteryStatus(85, 80);
      expect(result).toBe('mastered');
    });

    it('should return visited for failing score', () => {
      const result = service.calculateMasteryStatus(75, 80);
      expect(result).toBe('visited');
    });

    it('should use default passing grade when not provided', () => {
      const result = service.calculateMasteryStatus(85);
      expect(result).toBe('mastered');
    });
  });

  describe('updateFromQuizResult', () => {
    it('should update status to mastered for passing score', () => {
      service.updateFromQuizResult('test-node', 90, 80);
      
      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('mastered');
      expect(status.quizScore).toBe(90);
      expect(status.passingGrade).toBe(80);
    });

    it('should update status to visited for failing score', () => {
      service.updateFromQuizResult('test-node', 70, 80);
      
      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('visited');
      expect(status.quizScore).toBe(70);
    });
  });

  describe('utility methods', () => {
    it('should correctly identify visited nodes', () => {
      expect(service.isVisited('new-node')).toBe(false);
      
      service.markAsVisited('visited-node');
      expect(service.isVisited('visited-node')).toBe(true);
      
      service.updateNodeStatus('mastered-node', { status: 'mastered' });
      expect(service.isVisited('mastered-node')).toBe(true);
    });

    it('should correctly identify mastered nodes', () => {
      expect(service.isMastered('new-node')).toBe(false);
      
      service.markAsVisited('visited-node');
      expect(service.isMastered('visited-node')).toBe(false);
      
      service.updateNodeStatus('mastered-node', { status: 'mastered' });
      expect(service.isMastered('mastered-node')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all statuses and localStorage', () => {
      service.updateNodeStatus('test-node', { status: 'visited' });
      service.clearAll();
      
      const status = service.getNodeStatus('test-node');
      expect(status.status).toBe('not_visited');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('persistentNodeStatus');
    });
  });

  describe('migration from legacy system', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should migrate from legacy localStorage array format', () => {
      // Mock legacy data in localStorage
      const legacyData = ['node1', 'node2', 'node3'];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'persistentNodeStatus') return null;
        if (key === 'persistentLearnedNodes') return JSON.stringify(legacyData);
        return null;
      });

      // Create new service instance to trigger migration
      const newService = new NodeStatusService();

      // Verify migration occurred
      expect(newService.isVisited('node1')).toBe(true);
      expect(newService.isVisited('node2')).toBe(true);
      expect(newService.isVisited('node3')).toBe(true);
      expect(newService.getNodeStatus('node1').status).toBe('visited');
      expect(newService.getNodeStatus('node2').status).toBe('visited');
      expect(newService.getNodeStatus('node3').status).toBe('visited');

      // Verify new format was saved
      expect(localStorageMock.setItem).toHaveBeenCalledWith('persistentNodeStatus', expect.any(String));
    });

    it('should migrate from legacy window.persistentLearnedNodes Set', () => {
      // Mock legacy Set in window object
      const legacySet = new Set(['node1', 'node2', 'node3']);
      (globalThis.window as any).persistentLearnedNodes = legacySet;

      localStorageMock.getItem.mockReturnValue(null);

      // Create new service instance to trigger migration
      const newService = new NodeStatusService();

      // Verify migration occurred
      expect(newService.isVisited('node1')).toBe(true);
      expect(newService.isVisited('node2')).toBe(true);
      expect(newService.isVisited('node3')).toBe(true);
      expect(newService.getNodeStatus('node1').status).toBe('visited');

      // Verify new format was saved
      expect(localStorageMock.setItem).toHaveBeenCalledWith('persistentNodeStatus', expect.any(String));

      // Clean up
      delete (globalThis.window as any).persistentLearnedNodes;
    });

    it('should handle empty legacy data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'persistentNodeStatus') return null;
        if (key === 'persistentLearnedNodes') return JSON.stringify([]);
        return null;
      });

      const newService = new NodeStatusService();
      
      // Should not crash and should work normally
      expect(newService.getNodeStatus('test-node').status).toBe('not_visited');
    });

    it('should handle corrupted legacy data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'persistentNodeStatus') return null;
        if (key === 'persistentLearnedNodes') return 'invalid-json';
        return null;
      });

      // Should not throw error
      expect(() => new NodeStatusService()).not.toThrow();
    });

    it('should prefer new format over legacy when both exist', () => {
      const newFormatData = [{
        nodeId: 'node1',
        status: 'mastered',
        lastUpdated: new Date().toISOString(),
        passingGrade: 80,
        quizScore: 95
      }];

      const legacyData = ['node1', 'node2'];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'persistentNodeStatus') return JSON.stringify(newFormatData);
        if (key === 'persistentLearnedNodes') return JSON.stringify(legacyData);
        return null;
      });

      const newService = new NodeStatusService();

      // Should use new format data (mastered) not legacy (visited)
      expect(newService.getNodeStatus('node1').status).toBe('mastered');
      expect(newService.getNodeStatus('node1').quizScore).toBe(95);
      
      // node2 should not exist since new format takes precedence
      expect(newService.getNodeStatus('node2').status).toBe('not_visited');
    });

    it('should maintain backward compatibility during transition', () => {
      // Start with legacy data
      const legacyData = ['node1', 'node2'];
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'persistentNodeStatus') return null;
        if (key === 'persistentLearnedNodes') return JSON.stringify(legacyData);
        return null;
      });

      const newService = new NodeStatusService();

      // Verify legacy nodes are accessible
      expect(newService.isVisited('node1')).toBe(true);
      expect(newService.isVisited('node2')).toBe(true);

      // Add new node using new system
      newService.updateFromQuizResult('node3', 90);

      // Verify both old and new nodes work
      expect(newService.isVisited('node1')).toBe(true);
      expect(newService.isVisited('node2')).toBe(true);
      expect(newService.isMastered('node3')).toBe(true);
    });
  });
});

describe('Visual State Calculation Functions', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getDomainColor', () => {
    it('should return correct colors for known domains', () => {
      expect(getDomainColor('ai')).toBe('#FF6B9D');
      expect(getDomainColor('math')).toBe('#5B8DF2');
      expect(getDomainColor('tech')).toBe('#73DACA');
      expect(getDomainColor('physics')).toBe('#FFD93D');
      expect(getDomainColor('biology')).toBe('#6BCF7F');
      expect(getDomainColor('chemistry')).toBe('#FF8C42');
    });

    it('should return default color for unknown domains', () => {
      expect(getDomainColor('unknown')).toBe('#73DACA');
      expect(getDomainColor('')).toBe('#73DACA');
    });
  });

  describe('dimColor', () => {
    it('should dim colors correctly', () => {
      expect(dimColor('#FF6B9D')).toBe('#662b3f');
      expect(dimColor('#73DACA')).toBe('#2e5751');
      expect(dimColor('#FFFFFF')).toBe('#666666');
      expect(dimColor('#000000')).toBe('#000000');
    });
  });

  describe('calculateVisualState', () => {
    it('should return correct state for not_visited nodes', () => {
      const nodeStatus: NodeStatus = {
        nodeId: 'test-node',
        status: 'not_visited',
        lastUpdated: new Date(),
        passingGrade: 80
      };

      const visualState = calculateVisualState(nodeStatus, 'tech', 'concept');
      
      expect(visualState.baseColor).toBe('#2e5751'); // dimmed tech color
      expect(visualState.strokeColor).toBe('#2e5751');
      expect(visualState.strokeWidth).toBe(1.5);
      expect(visualState.glowEffect).toBeNull();
      expect(visualState.opacity).toBe(1.0);
    });

    it('should return correct state for visited nodes', () => {
      const nodeStatus: NodeStatus = {
        nodeId: 'test-node',
        status: 'visited',
        lastUpdated: new Date(),
        passingGrade: 80
      };

      const visualState = calculateVisualState(nodeStatus, 'tech', 'concept');
      
      expect(visualState.baseColor).toBe('#73DACA'); // bright tech color
      expect(visualState.strokeColor).toBe('#73DACA');
      expect(visualState.strokeWidth).toBe(3);
      expect(visualState.glowEffect).toBeNull();
      expect(visualState.opacity).toBe(1.0);
    });

    it('should return correct state for mastered nodes', () => {
      const nodeStatus: NodeStatus = {
        nodeId: 'test-node',
        status: 'mastered',
        lastUpdated: new Date(),
        passingGrade: 80
      };

      const visualState = calculateVisualState(nodeStatus, 'tech', 'concept');
      
      expect(visualState.baseColor).toBe('#73DACA'); // bright tech color
      expect(visualState.strokeColor).toBe('#73DACA');
      expect(visualState.strokeWidth).toBe(3);
      expect(visualState.glowEffect).toBe('drop-shadow(0 0 6px #73DACA)');
      expect(visualState.opacity).toBe(1.0);
    });

    it('should handle paper nodes correctly', () => {
      const nodeStatus: NodeStatus = {
        nodeId: 'test-paper',
        status: 'not_visited',
        lastUpdated: new Date(),
        passingGrade: 80
      };

      const visualState = calculateVisualState(nodeStatus, 'tech', 'paper');
      
      expect(visualState.baseColor).toBe('#8A9BB8'); // dimmed paper color
      expect(visualState.strokeColor).toBe('#8A9BB8');
    });

    it('should handle mastered paper nodes correctly', () => {
      const nodeStatus: NodeStatus = {
        nodeId: 'test-paper',
        status: 'mastered',
        lastUpdated: new Date(),
        passingGrade: 80
      };

      const visualState = calculateVisualState(nodeStatus, 'tech', 'paper');
      
      expect(visualState.baseColor).toBe('#BFCAF3'); // bright paper color
      expect(visualState.glowEffect).toBe('drop-shadow(0 0 6px #BFCAF3)');
    });
  });

  describe('getNodeVisualState', () => {
    it('should integrate with NodeStatusService correctly', () => {
      // This test uses the singleton service, so we need to clear it first
      nodeStatusService.clearAll();
      nodeStatusService.markAsVisited('test-node');
      
      const visualState = getNodeVisualState('test-node', 'math', 'concept');
      
      expect(visualState.baseColor).toBe('#5B8DF2'); // bright math color (since it's visited)
      expect(visualState.strokeWidth).toBe(3); // visited nodes have stroke width 3
      expect(visualState.glowEffect).toBeNull();
    });
  });

  describe('shouldEnhanceLink', () => {
    it('should return true when source node is mastered', () => {
      const service = new NodeStatusService();
      service.updateFromQuizResult('source-node', 85, 80);
      
      expect(shouldEnhanceLink('source-node', 'target-node', service)).toBe(true);
    });

    it('should return true when target node is mastered', () => {
      const service = new NodeStatusService();
      service.updateFromQuizResult('target-node', 90, 80);
      
      expect(shouldEnhanceLink('source-node', 'target-node', service)).toBe(true);
    });

    it('should return false when neither node is mastered', () => {
      const service = new NodeStatusService();
      service.markAsVisited('source-node');
      service.markAsVisited('target-node');
      
      expect(shouldEnhanceLink('source-node', 'target-node', service)).toBe(false);
    });
  });

  describe('calculateLinkVisualState', () => {
    it('should return enhanced styling for mastered node links', () => {
      const service = new NodeStatusService();
      service.updateFromQuizResult('source-node', 85, 80);
      
      const linkState = calculateLinkVisualState('source-node', 'target-node', 'tech', 'concept', service);
      
      expect(linkState.strokeWidth).toBe(2.5);
      expect(linkState.glowEffect).toBe('drop-shadow(0 0 3px #73DACA)');
    });

    it('should return default styling for non-mastered node links', () => {
      const service = new NodeStatusService();
      service.markAsVisited('source-node');
      service.markAsVisited('target-node');
      
      const linkState = calculateLinkVisualState('source-node', 'target-node', 'tech', 'concept', service);
      
      expect(linkState.strokeWidth).toBe(1.5);
      expect(linkState.glowEffect).toBeNull();
    });

    it('should handle paper node links correctly', () => {
      const service = new NodeStatusService();
      service.updateFromQuizResult('paper-node', 85, 80);
      
      const linkState = calculateLinkVisualState('paper-node', 'target-node', 'tech', 'paper', service);
      
      expect(linkState.strokeWidth).toBe(2.5);
      expect(linkState.glowEffect).toBe('drop-shadow(0 0 3px #BFCAF3)');
    });
  });
});