<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    getSuggestionService, 
    SuggestionService,
    type UserProfile, 
    type UserBracket, 
    BRACKET_ELO_THRESHOLDS 
  } from '$lib/suggestionSystem';
  
  // Use the reactive store for user profile
  const userProfileStore = SuggestionService.getUserProfileStore();
  let isExpanded = false;
  
  // Helper function to get bracket color
  function getBracketColor(bracket: UserBracket): string {
    switch (bracket) {
      case 'beginner': return '#8B5A2B'; // Bronze
      case 'intermediate': return '#C0C0C0'; // Silver  
      case 'advanced': return '#FFD700'; // Gold
      case 'expert': return '#E5E4E2'; // Platinum
      default: return '#8B5A2B';
    }
  }
  
  // Helper function to get next bracket info
  function getNextBracketInfo(currentElo: number, currentBracket: UserBracket) {
    const brackets = Object.entries(BRACKET_ELO_THRESHOLDS).sort((a, b) => a[1] - b[1]);
    const currentIndex = brackets.findIndex(([bracket]) => bracket === currentBracket);
    
    if (currentIndex < brackets.length - 1) {
      const [nextBracket, nextThreshold] = brackets[currentIndex + 1];
      const progress = Math.min(100, ((currentElo - BRACKET_ELO_THRESHOLDS[currentBracket]) / (nextThreshold - BRACKET_ELO_THRESHOLDS[currentBracket])) * 100);
      return { nextBracket, nextThreshold, progress };
    }
    
    return null; // Already at highest bracket
  }
  
  // Helper function to format date
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Helper function to get recent quiz average
  function getRecentQuizAverage(profile: UserProfile): number {
    if (!profile || profile.quizHistory.length === 0) return 0;
    
    const recentQuizzes = profile.quizHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
    
    const sum = recentQuizzes.reduce((acc, quiz) => acc + quiz.score, 0);
    return Math.round(sum / recentQuizzes.length);
  }
  
  // Get performance stats from the service
  function getPerformanceStats(): { 
    averageScore: number;
    recentAverageScore: number;
    completionRate: number;
    masteryRate: number;
    trend: 'improving' | 'stable' | 'declining' | 'unknown';
  } {
    const suggestionService = getSuggestionService();
    return suggestionService.getUserPerformanceStats();
  }
  
  // Function to reset user profile (for testing)
  function resetProfile(): void {
    const suggestionService = getSuggestionService();
    suggestionService.resetUserProfile();
  }
</script>

<div class="user-profile-widget">
  <button 
    class="profile-toggle"
    on:click={() => isExpanded = !isExpanded}
    aria-label="Toggle user profile"
  >
    <div class="profile-summary">
      {#if $userProfileStore}
        <div class="bracket-indicator" style="background-color: {getBracketColor($userProfileStore.bracket)}">
          {$userProfileStore.bracket.charAt(0).toUpperCase()}
        </div>
        <div class="profile-stats">
          <div class="elo-rating">{$userProfileStore.eloRating}</div>
          <div class="bracket-name">{$userProfileStore.bracket}</div>
        </div>
      {:else}
        <div class="loading">Loading...</div>
      {/if}
      <div class="expand-icon" class:rotated={isExpanded}>▼</div>
    </div>
  </button>
  
  {#if isExpanded && $userProfileStore}
    <div class="profile-details">
      <!-- Progress to next bracket -->
      {#if getNextBracketInfo($userProfileStore.eloRating, $userProfileStore.bracket)}
        {@const nextInfo = getNextBracketInfo($userProfileStore.eloRating, $userProfileStore.bracket)}
        <div class="progress-section">
          <div class="progress-header">
            <span>Progress to {nextInfo.nextBracket}</span>
            <span class="progress-text">{Math.round(nextInfo.progress)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {nextInfo.progress}%"></div>
          </div>
        </div>
      {/if}
      
      <!-- Learning stats -->
      {@const stats = getPerformanceStats()}
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{$userProfileStore.visitedNodes.size}</div>
          <div class="stat-label">Nodes Visited</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{$userProfileStore.masteredNodes.size}</div>
          <div class="stat-label">Mastered</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{$userProfileStore.learningStreak}</div>
          <div class="stat-label">Streak</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{getRecentQuizAverage($userProfileStore)}%</div>
          <div class="stat-label">Avg Score</div>
        </div>
      </div>
      
      <!-- Performance stats -->
      <div class="performance-section">
        <h4>Performance</h4>
        <div class="performance-stats">
          <div class="performance-item">
            <span class="performance-label">Completion Rate:</span>
            <span class="performance-value">{stats.completionRate}%</span>
          </div>
          <div class="performance-item">
            <span class="performance-label">Mastery Rate:</span>
            <span class="performance-value">{stats.masteryRate}%</span>
          </div>
          <div class="performance-item">
            <span class="performance-label">Trend:</span>
            <span class="performance-value trend-{stats.trend}">{stats.trend}</span>
          </div>
        </div>
      </div>
      
      <!-- Recent activity -->
      {#if $userProfileStore.quizHistory.length > 0}
        <div class="recent-activity">
          <h4>Recent Quizzes</h4>
          <div class="quiz-list">
            {#each $userProfileStore.quizHistory.slice(-3).reverse() as quiz}
              <div class="quiz-item">
                <div class="quiz-node">{quiz.nodeId}</div>
                <div class="quiz-score" class:good-score={quiz.score >= 70} class:poor-score={quiz.score < 50}>
                  {quiz.score}%
                </div>
                <div class="quiz-date">{formatDate(quiz.timestamp)}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Last active -->
      <div class="last-active">
        Last active: {formatDate($userProfileStore.lastActive)}
      </div>
      
      <!-- Reset button (for testing) -->
      <button class="reset-button" on:click={resetProfile}>Reset Profile</button>
    </div>
  {/if}
</div>

<style>
  .user-profile-widget {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid #333;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    min-width: 200px;
    max-width: 300px;
  }
  
  .profile-toggle {
    width: 100%;
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .profile-toggle:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .profile-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  
  .bracket-indicator {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
    color: #000;
    flex-shrink: 0;
  }
  
  .profile-stats {
    flex: 1;
  }
  
  .elo-rating {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
  }
  
  .bracket-name {
    font-size: 12px;
    color: #aaa;
    text-transform: capitalize;
  }
  
  .expand-icon {
    font-size: 12px;
    color: #aaa;
    transition: transform 0.2s ease;
  }
  
  .expand-icon.rotated {
    transform: rotate(180deg);
  }
  
  .loading {
    color: #aaa;
    font-size: 14px;
  }
  
  .profile-details {
    padding: 0 16px 16px 16px;
    border-top: 1px solid #333;
  }
  
  .progress-section {
    margin: 16px 0;
  }
  
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    color: #ccc;
  }
  
  .progress-bar {
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 16px 0;
  }
  
  .stat-item {
    text-align: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }
  
  .stat-value {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
  }
  
  .stat-label {
    font-size: 10px;
    color: #aaa;
    margin-top: 2px;
  }
  
  .recent-activity {
    margin: 16px 0;
  }
  
  .recent-activity h4 {
    font-size: 12px;
    color: #ccc;
    margin: 0 0 8px 0;
    font-weight: 600;
  }
  
  .quiz-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .quiz-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    font-size: 11px;
  }
  
  .quiz-node {
    flex: 1;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .quiz-score {
    font-weight: bold;
    color: #fff;
  }
  
  .quiz-score.good-score {
    color: #4CAF50;
  }
  
  .quiz-score.poor-score {
    color: #f44336;
  }
  
  .quiz-date {
    color: #888;
    font-size: 10px;
  }
  
  .last-active {
    font-size: 10px;
    color: #888;
    text-align: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #333;
  }
  
  /* Performance section styles */
  .performance-section {
    margin: 16px 0;
  }
  
  .performance-section h4 {
    font-size: 12px;
    color: #ccc;
    margin: 0 0 8px 0;
    font-weight: 600;
  }
  
  .performance-stats {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 8px;
  }
  
  .performance-item {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }
  
  .performance-label {
    color: #aaa;
  }
  
  .performance-value {
    font-weight: bold;
    color: #fff;
  }
  
  .trend-improving {
    color: #4CAF50;
  }
  
  .trend-stable {
    color: #FFC107;
  }
  
  .trend-declining {
    color: #f44336;
  }
  
  .trend-unknown {
    color: #aaa;
  }
  
  /* Reset button */
  .reset-button {
    width: 100%;
    margin-top: 12px;
    padding: 6px;
    background: rgba(255, 0, 0, 0.2);
    border: 1px solid rgba(255, 0, 0, 0.3);
    border-radius: 4px;
    color: #ff6b6b;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .reset-button:hover {
    background: rgba(255, 0, 0, 0.3);
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .user-profile-widget {
      top: 10px;
      right: 10px;
      min-width: 180px;
      max-width: 250px;
    }
    
    .stats-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .stat-value {
      font-size: 14px;
    }
  }
</style>