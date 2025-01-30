import { getGameState } from './gameState.js';
import { updateBoard } from './board.js';
import { BOARD_WIDTH, BOARD_HEIGHT, COLORS } from '../constants/gameConstants.js';
import { generateNextPiece } from './pieceGenerator.js';
import { updateLives } from './uiManager.js';
import { gameOver } from './gameState.js';
import { showLivesOverlay } from './uiManager.js';
import { setBoardChanged } from './gameState.js';
import { TETROMINOES } from '../constants/gameConstants.js';
import { updateNextTetrominoDisplay } from './uiManager.js';

export function moveTetromino(dx, dy) {
  const state = getGameState();
  
  // Add guard clause to prevent null access
  if (!state || !state.currentPosition || !state.currentTetromino) {
    return;
  }
  
  const newX = state.currentPosition.x + dx;
  const newY = state.currentPosition.y + dy;
  
  if (!checkCollision(newX, newY, state.currentTetromino)) {
    state.currentPosition.x = newX;
    state.currentPosition.y = newY;
    if (dy > 0) {
      state.currentOffset = 0;
      state.lastDropTime = performance.now();
    }
    updateBoard(state.board, state.currentTetromino, state.currentPosition, 
                state.currentOffset, state.currentTetrominoType, COLORS);
  } else if (dy === 1) {
    state.currentOffset = 0;
    placeTetromino();
    if (!clearLines()) {
      spawnTetromino();
    }
  }
}

export function rotateTetromino() {
  const state = getGameState();
  const rotated = state.currentTetromino[0].map((_, i) =>
    state.currentTetromino.map(row => row[i]).reverse()
  );
  
  if (!checkCollision(state.currentPosition.x, state.currentPosition.y, rotated)) {
    state.currentTetromino = rotated;
    updateBoard(state.board, state.currentTetromino, state.currentPosition, 
                state.currentOffset, state.currentTetrominoType, COLORS);
  }
}

export function hardDrop() {
  const state = getGameState();
  
  // Add guard clause
  if (!state || !state.currentPosition || !state.currentTetromino) {
    return;
  }
  
  while (!checkCollision(state.currentPosition.x, state.currentPosition.y + 1, state.currentTetromino)) {
    state.currentPosition.y++;
  }
  state.currentOffset = 0;
  placeTetromino();
  if (!clearLines()) {
    spawnTetromino();
  }
}

export function spawnTetromino() {
  const state = getGameState();
  console.log('Spawning new tetromino...');
  console.log('Current game state:', state);
    
  // Initialize nextTetrominoType if it doesn't exist
  if (!state.nextTetrominoType) {
    console.log('No next tetromino type, generating first piece');
    state.nextTetrominoType = generateNextPiece();
    state.nextTetromino = TETROMINOES[state.nextTetrominoType];
    console.log('Generated first piece:', state.nextTetrominoType);
  }

  // Set current tetromino from next
  state.currentTetrominoType = state.nextTetrominoType;
  state.currentTetromino = TETROMINOES[state.currentTetrominoType];
  console.log('Setting current tetromino:', {
    type: state.currentTetrominoType,
    shape: state.currentTetromino
  });

  // Generate new next tetromino
  state.nextTetrominoType = generateNextPiece();
  state.nextTetromino = TETROMINOES[state.nextTetrominoType];
  console.log('Generated next tetromino:', state.nextTetrominoType);

  // Set initial position
  state.currentPosition = {
    x: Math.floor(BOARD_WIDTH / 2) - 1,
    y: 0
  };
  console.log('Initial position:', state.currentPosition);

  // Update the next piece display
  updateNextTetrominoDisplay();
  console.log('Updated next piece display');

  // Check for collision
  if (checkCollision(state.currentPosition.x, state.currentPosition.y, state.currentTetromino)) {
    console.log('Collision detected on spawn!');
    state.lives--;
    updateLives();
    console.log('Lives remaining:', state.lives);

    if (state.lives <= 0) {
      console.log('Game over - no lives remaining');
      gameOver();
    } else {
      console.log('Showing lives overlay');
      showLivesOverlay();
    }
    return false;
  }
  console.log('Successfully spawned tetromino');
  return true;
}

function checkCollision(x, y, tetromino) {
  const state = getGameState();
  console.log('Checking collision at position:', {x, y});
  console.log('Tetromino shape:', tetromino);
  
  for (let row = 0; row < tetromino.length; row++) {
    for (let col = 0; col < tetromino[row].length; col++) {
      if (tetromino[row][col]) {
        const newX = x + col;
        const newY = y + row;
        console.log('Checking cell:', {
          row, 
          col,
          newX,
          newY,
          outOfBounds: newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT,
          occupied: newY >= 0 && state.board[newY][newX]
        });
        
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || 
            (newY >= 0 && state.board[newY][newX])) {
          console.log('Collision detected!');
          return true;
        }
      }
    }
  }
  console.log('No collision detected');
  return false;
}

export function placeTetromino() {
  const state = getGameState();
  setBoardChanged(true);
  for (let row = 0; row < state.currentTetromino.length; row++) {
    for (let col = 0; col < state.currentTetromino[row].length; col++) {
      if (state.currentTetromino[row][col]) {
        const boardY = state.currentPosition.y + row;
        const boardX = state.currentPosition.x + col;
        state.board[boardY][boardX] = state.currentTetrominoType;
      }
    }
  }
} 