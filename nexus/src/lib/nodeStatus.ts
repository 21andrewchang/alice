export interface NodeStatus {
  nodeId: string;
  status: 'not_visited' | 'visited' | 'mastered';
  lastUpdated: Date;
  quizScore?: number;
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


  getNodeStatus(nodeId: string): NodeStatus {
    const existing = this.nodeStatusMap.get(nodeId);
    if (existing) {
      return existing;
    }

    // Return default status
    return {
      nodeId,
      status: 'not_visited',
      lastUpdated: new Date(),
    };
  }

  /**
   * Update node status (visited/mastered)
   */
  updateNodeStatus(nodeId: string, updates: Partial<Omit<NodeStatus, 'nodeId'>>): void {
    const current = this.getNodeStatus(nodeId);

    const updated: NodeStatus = {
      ...current,
      ...updates,
      nodeId,
      lastUpdated: new Date()
    };

    this.nodeStatusMap.set(nodeId, updated);
  }

  /**
   * Mark a node as visited (when user clicks on it)
   */
  markAsVisited(nodeId: string): void {
    const current = this.getNodeStatus(nodeId);
    if (current.status === 'not_visited') {
      this.updateNodeStatus(nodeId, { status: 'visited' });
    }
  }


  /**
   * Get all node statuses
   */
  getAllStatuses(): Map<string, NodeStatus> {
    return new Map(this.nodeStatusMap);
  }

  /**
   * Check if a node has been visited
   */
  isVisited(nodeId: string): boolean {
    const status = this.getNodeStatus(nodeId);
    return status.status === 'visited' || status.status === 'mastered';
  }

  /**
   * Check if a node has been mastered
   */
  isMastered(nodeId: string): boolean {
    const status = this.getNodeStatus(nodeId);
    return status.status === 'mastered';
  }


}

/**
 * Get domain-specific colors
 */
export function getDomainColor(domain: string): string {
  const domainColors: Record<string, string> = {
    'ai': '#FF6B9D',           // Neon Pink
    'math': '#5B8DF2',         // Electric Pulse
    'tech': '#73DACA',         // Cyber Teal  
    'physics': '#FFD93D',      // Electric Yellow
    'biology': '#6BCF7F',      // Matrix Green
    'chemistry': '#FF8C42',    // Cyber Orange
    'default': '#73DACA'       // Default to tech color
  };

  return domainColors[domain] || domainColors.default;
}

/**
 * Dim a color by reducing its brightness
 */
export function dimColor(color: string): string {
  // Convert hex to RGB, reduce brightness, convert back
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Reduce brightness by 60%
  const dimmedR = Math.round(r * 0.4);
  const dimmedG = Math.round(g * 0.4);
  const dimmedB = Math.round(b * 0.4);

  return `#${dimmedR.toString(16).padStart(2, '0')}${dimmedG.toString(16).padStart(2, '0')}${dimmedB.toString(16).padStart(2, '0')}`;
}

/**
 * Calculate visual state properties based on NodeStatus
 */
export function calculateVisualState(nodeStatus: NodeStatus, domain: string = 'tech', nodeType: string = 'concept'): NodeVisualState {
  const baseColor = nodeType === 'paper' ? '#BFCAF3' : getDomainColor(domain);

  switch (nodeStatus.status) {
    case 'not_visited':
      return {
        baseColor: nodeType === 'paper' ? '#8A9BB8' : dimColor(baseColor),
        strokeColor: nodeType === 'paper' ? '#8A9BB8' : dimColor(baseColor),
        strokeWidth: 1.5,
        glowEffect: null,
        opacity: 1.0
      };

    case 'visited':
      return {
        baseColor: baseColor,
        strokeColor: baseColor,
        strokeWidth: 3,
        glowEffect: null,
        opacity: 1.0
      };

    case 'mastered':
      return {
        baseColor: baseColor,
        strokeColor: baseColor,
        strokeWidth: 3,
        glowEffect: `drop-shadow(0 0 6px ${baseColor})`,
        opacity: 1.0
      };

    default:
      // Fallback to not_visited
      return {
        baseColor: nodeType === 'paper' ? '#8A9BB8' : dimColor(baseColor),
        strokeColor: nodeType === 'paper' ? '#8A9BB8' : dimColor(baseColor),
        strokeWidth: 1.5,
        glowEffect: null,
        opacity: 1.0
      };
  }
}

/**
 * Get visual state for a specific node
 */
export function getNodeVisualState(nodeId: string, domain: string = 'tech', nodeType: string = 'concept'): NodeVisualState {
  const nodeStatus = nodeStatusService.getNodeStatus(nodeId);
  return calculateVisualState(nodeStatus, domain, nodeType);
}

/**
 * Determine if a link should have enhanced styling (when connected to mastered nodes)
 */
export function shouldEnhanceLink(sourceNodeId: string, targetNodeId: string, statusService: NodeStatusService = nodeStatusService): boolean {
  const sourceStatus = statusService.getNodeStatus(sourceNodeId);
  const targetStatus = statusService.getNodeStatus(targetNodeId);

  return sourceStatus.status === 'mastered' || targetStatus.status === 'mastered';
}

/**
 * Calculate link visual properties based on connected node states
 */
export function calculateLinkVisualState(sourceNodeId: string, targetNodeId: string, sourceDomain: string = 'tech', sourceType: string = 'concept', statusService: NodeStatusService = nodeStatusService): {
  strokeWidth: number;
  glowEffect: string | null;
} {
  const sourceStatus = statusService.getNodeStatus(sourceNodeId);
  const targetStatus = statusService.getNodeStatus(targetNodeId);

  // Enhanced styling if either node is mastered
  if (sourceStatus.status === 'mastered' || targetStatus.status === 'mastered') {
    const glowColor = sourceType === 'paper' ? '#BFCAF3' : getDomainColor(sourceDomain);

    return {
      strokeWidth: 2.5,
      glowEffect: `drop-shadow(0 0 3px ${glowColor})`
    };
  }

  // Default link styling
  return {
    strokeWidth: 1.5,
    glowEffect: null
  };
}

// Export singleton instance
export const nodeStatusService = new NodeStatusService();
