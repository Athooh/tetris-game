// Constants needed for calculations
const SCORE_MULTIPLIERS = {
  1: 100,   // Single line
  2: 300,   // Double line
  3: 500,   // Triple line
  4: 800    // Tetris
};

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

// Score calculation function
function calculateScore(lines, level) {
  if (lines === 0) return 0;
  const baseScore = SCORE_MULTIPLIERS[lines] || 0;
  return baseScore * level;
}

// High score check function
function checkHighScore(currentScore, highScores) {
  if (!highScores || highScores.length === 0) return true;
  return currentScore > Math.min(...highScores.map(s => s.score));
}

// Next piece generation
function generateNextPiece() {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return pieces[Math.floor(Math.random() * pieces.length)];
}

// Add performance monitoring
let lastPerformanceReport = Date.now();
const PERFORMANCE_REPORT_INTERVAL = 5000; // 5 seconds

function reportPerformance(operation, startTime) {
  const now = Date.now();
  if (now - lastPerformanceReport > PERFORMANCE_REPORT_INTERVAL) {
    const operationTime = now - startTime;
    self.postMessage({
      type: 'performanceReport',
      data: {
        operation,
        time: operationTime,
        timestamp: now
      }
    });
    lastPerformanceReport = now;
  }
}

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

function optimizeGameCalculations(data) {
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