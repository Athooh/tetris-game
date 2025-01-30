import { calculateScore } from './scoreHandler.js';
import { generateNextPiece } from './pieceGenerator.js';
import { checkHighScore } from './scoreHandler.js';

export function optimizeGameCalculations(data) {
  const { board, piece, level } = data;
  
  // Skip calculations for level 10
  if (level === 10) {
    return { skip: true };
  }
  
  // Perform calculations
  const result = {
    score: calculateScore(data.lines, level),
    nextPiece: generateNextPiece(),
    isHighScore: checkHighScore(data.score, data.scores)
  };
  
  return result;
} 