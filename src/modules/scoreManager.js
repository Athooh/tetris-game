import { getGameState } from './gameState.js';
import { showHighScores } from './uiManager.js';

export function updateScore(linesCleared) {
  const state = getGameState();
  const scoreMultipliers = {
    1: 100,
    2: 300,
    3: 500,
    4: 800
  };
  
  state.score += (scoreMultipliers[linesCleared] || 0) * state.level;
  document.getElementById('score').textContent = state.score.toString().padStart(6, '0');
}

export function updateLevel(linesCleared) {
  const state = getGameState();
  if (!window.linesForCurrentLevel) {
    window.linesForCurrentLevel = 0;
  }
  window.linesForCurrentLevel += linesCleared;

  if (window.linesForCurrentLevel >= 10) {
    if (state.level === 10) {
      handleGameCompletion();
    } else {
      state.level = Math.min(10, state.level + 1);
      window.linesForCurrentLevel = 0;
      document.getElementById('level').textContent = state.level.toString();
      
      // Update drop interval and visibility
      DROP_INTERVAL = Math.max(100, 1000 - (state.level - 1) * 100);
      updateVisibility();
      
      // Force board update
      boardChanged = true;
    }
  }
}

function handleGameCompletion() {
  const state = getGameState();
  state.gameState = 'completed';
  clearInterval(state.gameInterval);
  showCompletionOverlay();
  showHighScores(null);
}

export function updateVisibility() {
  const state = getGameState();
  const nextOpacity = state.level === 10 ? 0 : Math.max(0.1, 1 - (state.level - 1) * 0.12);
  document.documentElement.style.setProperty('--next-piece-opacity', nextOpacity.toString());
} 