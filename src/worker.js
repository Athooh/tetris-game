import { calculateScore, checkHighScore } from './modules/scoreHandler';
import { generateNextPiece } from './modules/pieceGenerator';
import { optimizeGameCalculations } from './modules/gameOptimizer';

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch(type) {
    case 'calculateScore':
      const score = calculateScore(data.lines, data.level);
      self.postMessage({ type: 'scoreResult', score });
      break;
      
    case 'checkHighScore':
      const isHighScore = checkHighScore(data.score, data.scores);
      self.postMessage({ type: 'highScoreResult', isHighScore });
      break;
      
    case 'generateNextPiece':
      const nextPiece = generateNextPiece();
      self.postMessage({ type: 'nextPieceResult', nextPiece });
      break;
      
    case 'optimizeGame':
      const optimizedResult = optimizeGameCalculations(data);
      self.postMessage({ type: 'optimizationResult', data: optimizedResult });
      break;
  }
};

// Add error handling
self.onerror = function(error) {
  self.postMessage({
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack
    }
  });
}; 