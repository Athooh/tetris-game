import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants/gameConstants.js';

let gameState = 'start';
let board = null;
let score = 0;
let level = 1;
let lives = 3;
let startTime = null;
let gameInterval = null;
let currentTetromino = null;
let currentTetrominoType = null;
let currentPosition = null;
let lastDropTime = 0;
let DROP_INTERVAL = 1000;
let nextTetrominoType = null;
let nextTetromino = null;
let currentOffset = 0;
let boardChanged = false;

export function initializeGameState() {
  board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
  score = 0;
  level = 1;
  lives = 3;
  startTime = new Date();
  window.linesForCurrentLevel = 0;
}

export function getGameState() {
  return {
    gameState,
    board,
    score,
    level,
    lives,
    startTime,
    currentTetromino,
    currentTetrominoType,
    currentPosition,
    nextTetrominoType,
    nextTetromino,
    currentOffset,
    DROP_INTERVAL
  };
}

export function setGameState(newState) {
  gameState = newState;
}

export function saveGameState() {
  localStorage.setItem('gameState', gameState);
}

export function loadGameState() {
  return localStorage.getItem('gameState') || 'start';
}

export function clearGameState() {
  gameState = 'start';
  board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
  score = 0;
  level = 1;
  lives = 3;
  startTime = null;
  gameInterval = null;
  currentTetromino = null;
  currentTetrominoType = null;
  currentPosition = null;
  lastDropTime = performance.now();
  DROP_INTERVAL = 1000;
  nextTetrominoType = null;
  nextTetromino = null;
  currentOffset = 0;
  boardChanged = true;
}

export function updateDropInterval() {
  DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
}

export function setBoardChanged(value) {
  boardChanged = value;
}

export function getBoardChanged() {
  return boardChanged;
}

export function gameOver() {
    const state = getGameState();
    state.gameState = 'over';
    if (state.gameInterval) {
        clearInterval(state.gameInterval);
    }
    showHighScores(null);
}

export function updateGameState(updates) {
  Object.entries(updates).forEach(([key, value]) => {
    if (key in getGameState()) {
      global[key] = value;
    }
  });
  boardChanged = true;
} 