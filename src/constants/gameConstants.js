export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const COLORS = {
  I: '#00F0F0', // Cyan
  O: '#F0F000', // Yellow
  T: '#A000F0', // Purple
  S: '#00F000', // Green
  Z: '#F00000', // Red
  J: '#0000F0', // Blue
  L: '#F0A000'  // Orange
};

export const TETROMINOES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

export const SCORE_MULTIPLIERS = {
  1: 100,   // Single line
  2: 300,   // Double line
  3: 500,   // Triple line
  4: 800    // Tetris
};

export const PERFORMANCE_REPORT_INTERVAL = 5000; // 5 seconds

export const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']; 