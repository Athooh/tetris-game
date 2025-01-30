import { SCORE_MULTIPLIERS } from '../constants/gameConstants.js';

export function calculateScore(lines, level) {
  if (lines === 0) return 0;
  const baseScore = SCORE_MULTIPLIERS[lines] || 0;
  return baseScore * level;
}

export function checkHighScore(currentScore, highScores) {
  if (!highScores || highScores.length === 0) return true;
  return currentScore > Math.min(...highScores.map(s => s.score));
} 