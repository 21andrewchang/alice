import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Types and interfaces
export type UserBracket = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserProfile {
  eloRating: number;
  bracket: UserBracket;
  quizHistory: QuizAttempt[];
  visitedNodes: Set<string>;
  masteredNodes: Set<string>;
  learningStreak: number;
  lastActive: Date;
}

export interface QuizAttempt {
  nodeId: string;
  score: number;
  timestamp: Date;
  completionTime: number;
}

// Remove RecommendationReason, reason, reasonText, REASON_EXPLANATIONS from types and logic
// NodeRecommendation should only have: node, confidence, timestamp
export interface NodeRecommendation {
  node: any; // Graph node object
  confidence: number; // How confident the system is about this recommendation (0-1)
  timestamp: Date;
}

export interface SelectionConstraints {
  requireConnected: boolean;
  maxDifficulty: number;
  preferredDomain?: string;
  excludeNodeIds: Set<string>;
}

// Default values
export const DEFAULT_USER_PROFILE: UserProfile = {
  eloRating: 0,
  bracket: 'beginner',
  quizHistory: [],
  visitedNodes: new Set<string>(),
  masteredNodes: new Set<string>(),
  learningStreak: 0,
  lastActive: new Date()
};

// Constants
export const BRACKET_ELO_THRESHOLDS = {
  beginner: 0,
  intermediate: 1000,
  advanced: 2000,
  expert: 3000
};

// Enhanced stores
export const recommendedNodeStore: Writable<NodeRecommendation | null> = writable(null);
export const recommendationHistoryStore: Writable<NodeRecommendation[]> = writable([]);

// Add this at the top of the file
export const BRACKET_RECOMMENDATION_MAP: Record<UserBracket, string> = {
  beginner: 'matrix_multiplication',
  intermediate: 'neural_network',
  advanced: 'transformer',
  expert: 'attention_is_all_you_need'
};

// Update BRACKET_RECOMMENDATION_MAP to use labels, not ids
export const BRACKET_RECOMMENDATION_LABEL_MAP: Record<UserBracket, string> = {
  beginner: 'Matrix Multiplication',
  intermediate: 'Neural Networks',
  advanced: 'Transformer',
  expert: 'Attention Is All You Need'
};

// Use node IDs for bracket mapping
export const BRACKET_RECOMMENDATION_ID_MAP: Record<UserBracket, number> = {
  beginner: 31, // Matrix Multiplication
  intermediate: 1, // Neural Networks
  advanced: 10, // Transformer
  expert: 0 // Attention Is All You Need
};

// Helper functions
export function updateRecommendation(node: any, confidence: number, timestamp: Date): void {
  const recommendation: NodeRecommendation = {
    node,
    confidence,
    timestamp
  };
  
  // Update current recommendation
  recommendedNodeStore.set(recommendation);
  
  // Add to history
  const history = get(recommendationHistoryStore);
  recommendationHistoryStore.set([...history, recommendation]);
  
  // Save to localStorage
  saveRecommendationsToLocalStorage();
}

export function getRecommendationHistory(): NodeRecommendation[] {
  return get(recommendationHistoryStore);
}

export function clearRecommendationHistory(): void {
  recommendationHistoryStore.set([]);
  saveRecommendationsToLocalStorage();
}

// LocalStorage persistence
function saveRecommendationsToLocalStorage(): void {
  try {
    const currentRecommendation = get(recommendedNodeStore);
    const history = get(recommendationHistoryStore);
    
    if (typeof localStorage !== 'undefined') {
      // Save current recommendation
      if (currentRecommendation) {
        // Always wrap in { node, ... } structure
        localStorage.setItem('currentRecommendation', JSON.stringify({
          ...currentRecommendation,
          node: currentRecommendation.node,
          confidence: currentRecommendation.confidence,
          timestamp: currentRecommendation.timestamp.toISOString()
        }));
      }
      
      // Save history (limit to last 10 items)
      const limitedHistory = history.slice(-10);
      localStorage.setItem('recommendationHistory', JSON.stringify(limitedHistory.map(rec => ({
        ...rec,
        node: rec.node,
        confidence: rec.confidence,
        timestamp: rec.timestamp.toISOString()
      }))));
    }
  } catch (error) {
    console.error('Failed to save recommendations to localStorage:', error);
  }
}

export function loadRecommendationsFromLocalStorage(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      // Load current recommendation
      const savedRecommendation = localStorage.getItem('currentRecommendation');
      if (savedRecommendation) {
        const parsed = JSON.parse(savedRecommendation);
        // If the structure is just a node, wrap it
        if (parsed && !parsed.node) {
          recommendedNodeStore.set({
            node: parsed,
            confidence: 0.8,
            timestamp: new Date()
          });
        } else {
          recommendedNodeStore.set({
            ...parsed,
            timestamp: new Date(parsed.timestamp)
          });
        }
      }
      
      // Load history
      const savedHistory = localStorage.getItem('recommendationHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        recommendationHistoryStore.set(parsed.map((rec: any) => ({
          ...rec,
          timestamp: new Date(rec.timestamp)
        })));
      }
    }
  } catch (error) {
    console.error('Failed to load recommendations from localStorage:', error);
  }
}

function getUserBracket(): UserBracket {
  if (typeof localStorage !== 'undefined') {
    const bracket = localStorage.getItem('userBracket');
    if (bracket === 'beginner' || bracket === 'intermediate' || bracket === 'advanced' || bracket === 'expert') {
      return bracket;
    }
  }
  return 'beginner';
}

// SuggestionService class
export class SuggestionService {
  private userProfile: UserProfile;
  private graph: any;
  
  constructor(graph: any) {
    this.graph = graph;
    this.userProfile = this.loadUserProfile();
  }

  public getUserProfile(): UserProfile {
    return this.userProfile;
  }
  
  // Get current recommendation
  getCurrentRecommendation(): NodeRecommendation | null {
    return get(recommendedNodeStore);
  }
  
  // Generate a new recommendation based on user profile and graph
  generateRecommendation(): NodeRecommendation | null {
    const bracket = getUserBracket();
    const visitedIds = new Set(Array.from(this.userProfile.visitedNodes));
    const currentRec = this.getCurrentRecommendation();
    const currentId = currentRec?.node?.id;

    // Curated node ID groups by bracket
    const bracketNodeGroups: Record<UserBracket, number[]> = {
      beginner: [40, 33, 31, 32, 43], // Mean, Vector Ops, Matrix Mult, Dot Product, Weighted Sum, Softmax, Derivative
      intermediate: [1, 14, 16, 5, 19, 21, 22], // Neural Nets, Embedding, Convolution, RNN, Seq Modeling, Lang Modeling, Hidden States, Training, GPU, Batching, Variance
      advanced: [3, 4, 6, 7, 8, 9, 10], // Seq Transduction, Attention, Encoder, Decoder, Multi-Head, Self-Attn, Transformer, Positional, FFN, CNN, LSTM, GRU, Machine Translation, Auto-Regressive, Dependencies, ConvS2S, ByteNet, Gradient, Chain Rule, Partial Deriv, Trig, Linear Transform
      expert: [0] // Attention Is All You Need
    };

    // Try to recommend from the user's bracket, fallback to easier brackets
    const bracketOrder: UserBracket[] =
      bracket === 'expert' ? ['expert', 'advanced', 'intermediate', 'beginner'] :
      bracket === 'advanced' ? ['advanced', 'intermediate', 'beginner'] :
      bracket === 'intermediate' ? ['intermediate', 'beginner'] :
      ['beginner'];

    let candidates: any[] = [];
    for (const b of bracketOrder) {
      candidates = this.graph.nodes.filter((n: any) =>
        bracketNodeGroups[b].includes(n.id) &&
        !visitedIds.has(n.id) &&
        n.id !== currentId
      );
      if (candidates.length > 0) break;
    }
    // If still none, fallback to any unvisited node
    if (candidates.length === 0) {
      candidates = this.graph.nodes.filter((n: any) => !visitedIds.has(n.id) && n.id !== currentId);
    }
    // If still none, fallback to expert node
    if (candidates.length === 0) {
      candidates = [this.graph.nodes.find((n: any) => n.id === 0)];
    }
    // Pick random from candidates
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      const node = candidates[idx];
      const recommendation: NodeRecommendation = {
        node,
        confidence: 1.0,
        timestamp: new Date()
      };
      console.log('[DEBUG] generateRecommendation: bracketed candidate node:', node.id, node.label);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentRecommendation', JSON.stringify({
          ...recommendation,
          node: node,
          confidence: 1.0,
          timestamp: recommendation.timestamp.toISOString()
        }));
      }
      recommendedNodeStore.set(recommendation);
      return recommendation;
    }
    return null;
  }
  
  // Update recommendation after quiz completion
  updateAfterQuiz(nodeId: string, score: number): void {
    // Update user profile
    this.addQuizAttempt(nodeId, score);
    
    // Update node mastery status if score is high enough
    if (score >= 80) {
      this.userProfile.masteredNodes.add(nodeId);
    }
    
    // Generate new recommendation
    this.generateRecommendation();
  }
  
  // Update recommendation after node visit
  updateAfterNodeVisit(nodeId: string): void {
    // Add to visited nodes
    this.userProfile.visitedNodes.add(nodeId);

    // Bracket rank up logic based on visited nodes
    const visitedCount = this.userProfile.visitedNodes.size;
    let newBracket = this.userProfile.bracket;
    console.log(`[DEBUG] Visited nodes count: ${visitedCount}, current bracket: ${this.userProfile.bracket}`);
    if (visitedCount === 5 || visitedCount === 10 || visitedCount === 20) {
      console.log(`[DEBUG] Visited nodes reached threshold: ${visitedCount}`);
    }
    if (visitedCount >= 20) {
      newBracket = 'expert';
    } else if (visitedCount >= 10) {
      newBracket = 'advanced';
    } else if (visitedCount >= 5) {
      newBracket = 'intermediate';
    } else {
      newBracket = 'beginner';
    }
    if (newBracket !== this.userProfile.bracket) {
      console.log(`[DEBUG] Bracket changing from ${this.userProfile.bracket} to ${newBracket}`);
      this.userProfile.bracket = newBracket;
    }

    this.saveUserProfile();
    // Only generate new recommendation if current one is stale or for the visited node
    const currentRecommendation = this.getCurrentRecommendation();
    if (!currentRecommendation || currentRecommendation.node.id === nodeId) {
      this.generateRecommendation();
    }
  }
  
  // Get recommendation history
  getRecommendationHistory(): NodeRecommendation[] {
    return get(recommendationHistoryStore);
  }
  
  // Private helper methods
  
  private loadUserProfile(): UserProfile {
    try {
      if (typeof localStorage !== 'undefined') {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          return {
            ...parsed,
            visitedNodes: new Set(parsed.visitedNodes || []),
            masteredNodes: new Set(parsed.masteredNodes || []),
            lastActive: new Date(parsed.lastActive)
          };
        }
      }
    } catch (error) {
      console.error('Failed to load user profile from localStorage:', error);
    }
    
    // Initialize with default profile and any visited nodes from learnedNodes
    const defaultProfile = { ...DEFAULT_USER_PROFILE };
    
    // Import existing learnedNodes if available
    if (typeof window !== 'undefined' && (window as any).persistentLearnedNodes) {
      const learnedNodes = (window as any).persistentLearnedNodes;
      defaultProfile.visitedNodes = new Set(learnedNodes);
    }
    
    return defaultProfile;
  }
  
  private saveUserProfile(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('userProfile', JSON.stringify({
          ...this.userProfile,
          visitedNodes: Array.from(this.userProfile.visitedNodes),
          masteredNodes: Array.from(this.userProfile.masteredNodes),
          lastActive: this.userProfile.lastActive.toISOString()
        }));
      }
    } catch (error) {
      console.error('Failed to save user profile to localStorage:', error);
    }
  }
  
  private addQuizAttempt(nodeId: string, score: number): void {
    const attempt: QuizAttempt = {
      nodeId,
      score,
      timestamp: new Date(),
      completionTime: 0 // We don't track this yet
    };
    
    this.userProfile.quizHistory.push(attempt);
    this.userProfile.lastActive = new Date();
    
    // Update ELO rating based on quiz score
    this.updateEloRating(score);
    
    // Save updated profile
    this.saveUserProfile();
  }
  
  private updateEloRating(quizScore: number): void {
    // Simple ELO update based on quiz score
    // Score 0-100 maps to -50 to +50 ELO change
    const eloChange = Math.round((quizScore - 50) / 2);
    this.userProfile.eloRating = Math.max(0, this.userProfile.eloRating + eloChange);
    
    // Update learning streak
    this.updateLearningStreak(quizScore);
    
    // Update bracket based on new ELO
    this.updateBracket();
  }
  
  private updateLearningStreak(quizScore: number): void {
    // If score is good (above 70), increase streak
    if (quizScore >= 70) {
      this.userProfile.learningStreak += 1;
    } else {
      // Reset streak on poor performance
      this.userProfile.learningStreak = 0;
    }
  }
  
  private updateBracket(): void {
    const elo = this.userProfile.eloRating;
    
    if (elo >= BRACKET_ELO_THRESHOLDS.expert) {
      this.userProfile.bracket = 'expert';
    } else if (elo >= BRACKET_ELO_THRESHOLDS.advanced) {
      this.userProfile.bracket = 'advanced';
    } else if (elo >= BRACKET_ELO_THRESHOLDS.intermediate) {
      this.userProfile.bracket = 'intermediate';
    } else {
      this.userProfile.bracket = 'beginner';
    }
  }
  
  private getCandidateNodes(): any[] {
    const candidates: any[] = [];
    const visitedNodeIds = this.userProfile.visitedNodes;
    
    // First, check if user has visited any nodes
    if (visitedNodeIds.size === 0) {
      // For new users, recommend foundational nodes
      return this.getFoundationalNodes();
    }
    
    // Get nodes connected to recently visited nodes
    const recentlyVisitedNodes = this.getRecentlyVisitedNodes(5);
    
    for (const visitedNode of recentlyVisitedNodes) {
      // Find the node in the graph
      const graphNode = this.graph.nodes.find((n: any) => n.id === visitedNode);
      if (!graphNode) continue;
      
      // Find connected nodes
      const connectedNodes = this.getConnectedNodes(graphNode.id);
      
      // Add to candidates if not already visited
      for (const node of connectedNodes) {
        if (!visitedNodeIds.has(node.id) && !candidates.some(c => c.id === node.id)) {
          candidates.push(node);
        }
      }
    }
    
    // If no candidates found, try to find any unvisited node
    if (candidates.length === 0) {
      for (const node of this.graph.nodes) {
        if (!visitedNodeIds.has(node.id)) {
          candidates.push(node);
        }
      }
    }
    
    return candidates;
  }
  
  private getFoundationalNodes(): any[] {
    // Return nodes with low difficulty or marked as foundational
    return this.graph.nodes.filter((node: any) => {
      return (node.difficulty === 1 || node.foundational === true);
    });
  }
  
  private getRecentlyVisitedNodes(count: number): string[] {
    // Get most recently visited nodes based on quiz history
    const recentQuizzes = [...this.userProfile.quizHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count)
      .map(q => q.nodeId);
    
    // Add any other visited nodes if we don't have enough
    const visitedNodes = Array.from(this.userProfile.visitedNodes);
    for (const nodeId of visitedNodes) {
      if (recentQuizzes.length < count && !recentQuizzes.includes(nodeId)) {
        recentQuizzes.push(nodeId);
      }
    }
    
    return recentQuizzes;
  }
  
  private getConnectedNodes(nodeId: string): any[] {
    const connectedNodes: any[] = [];
    
    // Find links where this node is the source
    for (const link of this.graph.links) {
      if (link.source === nodeId || (link.source && link.source.id === nodeId)) {
        const targetId = link.target.id || link.target;
        const targetNode = this.graph.nodes.find((n: any) => n.id === targetId);
        if (targetNode) {
          connectedNodes.push(targetNode);
        }
      }
    }
    
    // Find links where this node is the target
    for (const link of this.graph.links) {
      if (link.target === nodeId || (link.target && link.target.id === nodeId)) {
        const sourceId = link.source.id || link.source;
        const sourceNode = this.graph.nodes.find((n: any) => n.id === sourceId);
        if (sourceNode) {
          connectedNodes.push(sourceNode);
        }
      }
    }
    
    return connectedNodes;
  }
  
  private scoreCandidateNodes(candidates: any[]): { node: any, score: number, factors: Record<string, number> }[] {
    return candidates.map(node => {
      // Calculate various scoring factors
      const difficultyMatch = this.calculateDifficultyMatch(node);
      const prerequisiteCompletion = this.calculatePrerequisiteCompletion(node);
      const pathRelevance = this.calculatePathRelevance(node);
      const domainDiversity = this.calculateDomainDiversity(node);
      
      // Weighted score calculation
      const score = (
        (difficultyMatch * 0.4) + 
        (pathRelevance * 0.3) + 
        (prerequisiteCompletion * 0.2) + 
        (domainDiversity * 0.1)
      ) * 100; // Scale to 0-100
      
      return {
        node,
        score,
        factors: {
          difficultyMatch,
          pathRelevance,
          prerequisiteCompletion,
          domainDiversity
        }
      };
    });
  }
  
  private calculateDifficultyMatch(node: any): number {
    // Get node difficulty (default to 1 if not specified)
    const nodeDifficulty = node.difficulty || 1;
    
    // Map user bracket to expected difficulty
    let expectedDifficulty;
    switch (this.userProfile.bracket) {
      case 'beginner': expectedDifficulty = 1; break;
      case 'intermediate': expectedDifficulty = 2; break;
      case 'advanced': expectedDifficulty = 3; break;
      case 'expert': expectedDifficulty = 4; break;
      default: expectedDifficulty = 1;
    }
    
    // Calculate match (1.0 = perfect match, 0.0 = furthest apart)
    const maxDifference = 3; // Maximum difficulty difference
    const actualDifference = Math.abs(nodeDifficulty - expectedDifficulty);
    return 1 - (actualDifference / maxDifference);
  }
  
  private calculatePrerequisiteCompletion(node: any): number {
    // Find prerequisites for this node
    const prerequisites = this.getPrerequisites(node.id);
    
    if (prerequisites.length === 0) {
      return 1.0; // No prerequisites means 100% completion
    }
    
    // Count how many prerequisites are visited/mastered
    let completedCount = 0;
    for (const prereq of prerequisites) {
      if (this.userProfile.visitedNodes.has(prereq.id)) {
        completedCount++;
      }
    }
    
    return completedCount / prerequisites.length;
  }
  
  private getPrerequisites(nodeId: string): any[] {
    const prerequisites: any[] = [];
    
    // Find links where this node is the target and relation is 'prerequisite'
    for (const link of this.graph.links) {
      const targetId = link.target.id || link.target;
      
      if (targetId === nodeId && link.relation === 'prerequisite') {
        const sourceId = link.source.id || link.source;
        const sourceNode = this.graph.nodes.find((n: any) => n.id === sourceId);
        if (sourceNode) {
          prerequisites.push(sourceNode);
        }
      }
    }
    
    return prerequisites;
  }
  
  private calculatePathRelevance(node: any): number {
    // Check if node is directly connected to recently visited nodes
    const recentlyVisited = this.getRecentlyVisitedNodes(3);
    
    for (const visitedId of recentlyVisited) {
      // Check if there's a direct link between this node and the visited node
      for (const link of this.graph.links) {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        
        if ((sourceId === visitedId && targetId === node.id) || 
            (sourceId === node.id && targetId === visitedId)) {
          return 1.0; // Directly connected to recent node
        }
      }
    }
    
    // Not directly connected, but still could be relevant
    return 0.5;
  }
  
  private calculateDomainDiversity(node: any): number {
    // Get domains of visited nodes
    const visitedDomains = new Set<string>();
    for (const nodeId of this.userProfile.visitedNodes) {
      const visitedNode = this.graph.nodes.find((n: any) => n.id === nodeId);
      if (visitedNode && visitedNode.domain) {
        visitedDomains.add(visitedNode.domain);
      }
    }
    
    // If user hasn't explored this domain yet, give it a boost
    if (node.domain && !visitedDomains.has(node.domain)) {
      return 1.0;
    }
    
    // Otherwise, neutral score
    return 0.5;
  }
  
  private determineRecommendationReason(scoredCandidate: { node: any, score: number, factors: Record<string, number> }): string {
    const { factors } = scoredCandidate;
    const { node } = scoredCandidate;
    
    // Consider user performance trends
    const performanceTrend = this.analyzePerformanceTrend();
    
    // If user is on a winning streak, prioritize challenge progression
    if (this.userProfile.learningStreak >= 3 && factors.difficultyMatch > 0.6) {
      return 'This will challenge you to advance your skills';
    }
    
    // If user is struggling, prioritize prerequisites or review
    if (performanceTrend === 'declining' && factors.prerequisiteCompletion < 0.7) {
      return 'You need to understand this concept before moving forward';
    }
    
    // If user is a beginner, prioritize foundational content
    if (this.userProfile.bracket === 'beginner' && (node.foundational || node.difficulty === 1)) {
      return 'This is the next logical step in your learning path';
    }
    
    // Standard logic as fallback
    if (factors.prerequisiteCompletion < 0.5) {
      return 'You need to understand this concept before moving forward';
    }
    
    if (factors.difficultyMatch > 0.8) {
      return 'This is the next logical step in your learning path';
    }
    
    if (factors.difficultyMatch > 0.6) {
      return 'This will challenge you to advance your skills';
    }
    
    if (factors.domainDiversity > 0.8) {
      return 'This will help fill a gap in your knowledge';
    }
    
    return 'Reviewing this will strengthen your understanding';
  }
  
  // Analyze recent performance trend to determine if user is improving or struggling
  private analyzePerformanceTrend(): 'improving' | 'stable' | 'declining' | 'unknown' {
    const recentQuizzes = [...this.userProfile.quizHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5); // Look at 5 most recent quizzes
    
    if (recentQuizzes.length < 3) {
      return 'unknown'; // Not enough data
    }
    
    // Calculate average scores for first and second half of recent quizzes
    const midpoint = Math.floor(recentQuizzes.length / 2);
    const recentAvg = recentQuizzes.slice(0, midpoint).reduce((sum, q) => sum + q.score, 0) / midpoint;
    const olderAvg = recentQuizzes.slice(midpoint).reduce((sum, q) => sum + q.score, 0) / (recentQuizzes.length - midpoint);
    
    // Determine trend
    const difference = recentAvg - olderAvg;
    if (difference > 10) {
      return 'improving';
    } else if (difference < -10) {
      return 'declining';
    } else {
      return 'stable';
    }
  }
  
  private generateReasonText(scoredCandidate: { node: any, score: number, factors: Record<string, number> }): string {
    const reason = this.determineRecommendationReason(scoredCandidate);
    return reason;
  }
}

// Global suggestion service instance
let globalSuggestionService: SuggestionService | null = null;

// Function to get or create the suggestion service
export function getSuggestionService(): SuggestionService {
  if (!globalSuggestionService) {
    // We need to load the graph data to initialize the service
    // For now, we'll create a placeholder that will be properly initialized later
    globalSuggestionService = new SuggestionService({ nodes: [], links: [] });
  }
  return globalSuggestionService;
}

// Function to initialize the suggestion service with graph data
export function initializeSuggestionService(graphData: any): void {
  globalSuggestionService = new SuggestionService(graphData);
}

// Initialize on import
loadRecommendationsFromLocalStorage();