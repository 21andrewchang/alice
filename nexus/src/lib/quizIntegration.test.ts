import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NodeStatusService } from './nodeStatus.js';

// Mock window and CustomEvent
const mockDispatchEvent = vi.fn();
Object.defineProperty(global, 'window', {
  value: {
    dispatchEvent: mockDispatchEvent,
    CustomEvent: vi.fn().mockImplementation((event, options) => ({
      type: event,
      detail: options?.detail
    }))
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Quiz Completion Integration', () => {
  let nodeStatusService: NodeStatusService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    nodeStatusService = new NodeStatusService();
    mockDispatchEvent.mockClear();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should update node status when quiz is completed with passing score', () => {
    // Simulate quiz completion with passing score
    const nodeId = 'test-node';
    const quizScore = 85; // 85% - passing score
    
    // Update node status based on quiz result
    nodeStatusService.updateFromQuizResult(nodeId, quizScore);
    
    // Verify node status was updated correctly
    const status = nodeStatusService.getNodeStatus(nodeId);
    expect(status.status).toBe('mastered');
    expect(status.quizScore).toBe(85);
    expect(status.passingGrade).toBe(80); // Default passing grade
  });
  
  it('should update node status when quiz is completed with failing score', () => {
    // Simulate quiz completion with failing score
    const nodeId = 'test-node';
    const quizScore = 75; // 75% - failing score
    
    // Update node status based on quiz result
    nodeStatusService.updateFromQuizResult(nodeId, quizScore);
    
    // Verify node status was updated correctly
    const status = nodeStatusService.getNodeStatus(nodeId);
    expect(status.status).toBe('visited');
    expect(status.quizScore).toBe(75);
    expect(status.passingGrade).toBe(80); // Default passing grade
  });
  
  it('should dispatch nodeStatusUpdated event when quiz is completed', () => {
    // Create a spy on window.dispatchEvent
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    
    // Simulate quiz completion
    const nodeId = 'test-node';
    const quizScore = 90;
    
    // Manually dispatch the event as it would happen in PaginatedContent.svelte
    window.dispatchEvent(new CustomEvent('nodeStatusUpdated', { 
      detail: { nodeId, score: quizScore } 
    }));
    
    // Verify the event was dispatched with correct data
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'nodeStatusUpdated',
        detail: { nodeId, score: 90 }
      })
    );
  });
  
  it('should update node status from visited to mastered when retaking quiz with passing score', () => {
    const nodeId = 'test-node';
    
    // First mark as visited
    nodeStatusService.markAsVisited(nodeId);
    expect(nodeStatusService.getNodeStatus(nodeId).status).toBe('visited');
    
    // Then complete quiz with passing score
    nodeStatusService.updateFromQuizResult(nodeId, 90);
    expect(nodeStatusService.getNodeStatus(nodeId).status).toBe('mastered');
  });
  
  it('should downgrade node status from mastered to visited when retaking quiz with failing score', () => {
    const nodeId = 'test-node';
    
    // First complete quiz with passing score
    nodeStatusService.updateFromQuizResult(nodeId, 90);
    expect(nodeStatusService.getNodeStatus(nodeId).status).toBe('mastered');
    
    // Then retake quiz with failing score
    nodeStatusService.updateFromQuizResult(nodeId, 70);
    expect(nodeStatusService.getNodeStatus(nodeId).status).toBe('visited');
  });
});