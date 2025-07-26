// nodeStatusStore.ts
import { writable } from 'svelte/store';

/**
 * A Svelte store containing the current map of node statuses.
 */
export const nodeStatuses = writable<Map<string, NodeStatus>>(new Map());



export interface NodeStatus {
  nodeId: string;
  mastery: number | null;
  exp: number;
  lastUpdated: Date;
}

export interface NodeVisualState {
  baseColor: string;
  strokeColor: string;
  strokeWidth: number;
  glowEffect: string | null;
  opacity: number;
}

export class NodeStatusService {
  private nodeStatusMap: Map<string, NodeStatus> = new Map();

  /**
   * Push internal map snapshot into the Svelte store to trigger reactivity.
   */
  private pushToStore() {
    nodeStatuses.set(new Map(this.nodeStatusMap));
  }

  /**
   * Get status or default for untracked node.
   */
  getNodeStatus(nodeId: string): NodeStatus {
    const existing = this.nodeStatusMap.get(nodeId);
    if (existing) return existing;
    return { nodeId, mastery: null, exp: 0, lastUpdated: new Date() };
  }

  /**
   * Insert or update a node's status, then emit to store.
   */
  updateNodeStatus(
    nodeId: string,
    updates: Partial<Omit<NodeStatus, 'nodeId'>>
  ): void {
    const current = this.getNodeStatus(nodeId);
    const updated: NodeStatus = {
      ...current,
      ...updates,
      nodeId,
      lastUpdated: new Date()
    };
    this.nodeStatusMap.set(nodeId, updated);
    this.pushToStore();
  }

  /**
   * Mark a node as visited (only if first visit).
   */
  markAsVisited(payload: { nodeId: string; mastery: number; exp: number }) {
    const existing = this.getNodeStatus(payload.nodeId);
    if (existing.mastery === null) {
      this.updateNodeStatus(payload.nodeId, {
        mastery: payload.mastery,
        exp: payload.exp
      });
    }
  }

  /** Return a snapshot of all statuses. */
  getAllStatuses(): Map<string, NodeStatus> {
    return new Map(this.nodeStatusMap);
  }

  /** Returns true if visited (mastery != null). */
  isVisited(nodeId: string): boolean {
    return this.getNodeStatus(nodeId).mastery !== null;
  }

  /** Returns true if mastery >= 1. */
  isMastered(nodeId: string): boolean {
    return (this.getNodeStatus(nodeId).mastery || 0) >= 1;
  }
}

// Export singleton
export const nodeStatusService = new NodeStatusService();


// Color and visual state utilities

/** Map domain names to HEX colors. */
export function getDomainColor(domain: string): string {
  const domainColors: Record<string, string> = {
    ai: '#FF6B9D', math: '#5B8DF2', tech: '#73DACA',
    physics: '#FFD93D', biology: '#6BCF7F', chemistry: '#FF8C42',
    default: '#73DACA'
  };
  return domainColors[domain] || domainColors.default;
}

/** Dim a HEX color by 60%. */
export function dimColor(color: string): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const factor = 0.4;
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Compute visual style from status, domain, and type. */
export function calculateVisualState(
  status: NodeStatus,
  domain = 'tech',
  type: 'concept' | 'paper' = 'concept'
): NodeVisualState {
  const base = type === 'paper' ? '#BFCAF3' : getDomainColor(domain);
  if (status.mastery === null) {
    return { baseColor: dimColor(base), strokeColor: dimColor(base), strokeWidth: 1.5, glowEffect: null, opacity: 1 };
  }
  if (status.mastery >= 1) {
    return { baseColor: base, strokeColor: base, strokeWidth: 3, glowEffect: `drop-shadow(0 0 6px ${base})`, opacity: 1 };
  }
  return { baseColor: base, strokeColor: base, strokeWidth: 3, glowEffect: null, opacity: 1 };
}

/** Get visual state for a node by its ID. */
export function getNodeVisualState(
  nodeId: string,
  domain = 'tech',
  type: 'concept' | 'paper' = 'concept'
): NodeVisualState {
  const status = nodeStatusService.getNodeStatus(nodeId);
  return calculateVisualState(status, domain, type);
}

/** Should link glow if either end is mastered? */
export function shouldEnhanceLink(
  sourceId: string,
  targetId: string
): boolean {
  const s = nodeStatusService.getNodeStatus(sourceId);
  const t = nodeStatusService.getNodeStatus(targetId);
  return (s.mastery || 0) >= 1 || (t.mastery || 0) >= 1;
}

/** Calculate link style based on connected nodes. */
export function calculateLinkVisualState(
  sourceId: string,
  targetId: string,
  domain = 'tech',
  type: 'concept' | 'paper' = 'concept'
): { strokeWidth: number; glowEffect: string | null } {
  const glowColor = type === 'paper' ? '#BFCAF3' : getDomainColor(domain);
  if (shouldEnhanceLink(sourceId, targetId)) {
    return { strokeWidth: 2.5, glowEffect: `drop-shadow(0 0 3px ${glowColor})` };
  }
  return { strokeWidth: 1.5, glowEffect: null };
}
