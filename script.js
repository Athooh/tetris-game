// Game Constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = {
  I: '#00F0F0', // Cyan
  O: '#F0F000', // Yellow
  T: '#A000F0', // Purple
  S: '#00F000', // Green
  Z: '#F00000', // Red
  J: '#0000F0', // Blue
  L: '#F0A000'  // Orange
};

// Additional Game Constants
const TETROMINOES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

// Game State
let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let score = 0;
let level = 1;
let lives = 3;
let startTime = null;
let gameInterval = null;
let gameState = 'start'; // start, playing, paused, gameover, highscores

// Additional Game State
let currentTetromino = null;
let currentTetrominoType = null;
let currentPosition = null;
let lastDropTime = 0;
let DROP_INTERVAL = 1000; // Initial drop interval
let animationId = null;
let nextTetrominoType = null;
let nextTetromino = null;
let currentOffset = 0; // Add this near other game state variables

// Add RAF timing variables
let lastFrameTime = 0;
const TARGET_FRAMETIME = 1000 / 60; // 60 FPS

// Add these variables at the top with other game constants
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// Add these variables to the game state section at the top
let linesForCurrentLevel = 0;  // Move from window object to proper game state

// DOM Elements
const gameBoard = document.getElementById('game-board');
const overlay = document.getElementById('game-overlay');
const startButton = document.getElementById('start-button');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const timeElement = document.getElementById('time');

// Add state management functions
function setGameState(newState) {
    gameState = newState;
}

function saveGameState(state) {
    localStorage.setItem('gameState', state);
}

function loadGameState() {
    return localStorage.getItem('gameState') || 'start';
}

function clearGameState() {
    localStorage.removeItem('gameState');
}

// Initialize Game Board
function initializeBoard() {
  gameBoard.innerHTML = `
    <svg class="grid-overlay" width="100%" height="100%"></svg>
  `;
  for (let i = 0; i < BOARD_HEIGHT; i++) {
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      gameBoard.appendChild(cell);
    }
  }
  createGridLines();
}

// Update Board Display
function updateBoard() {
  const cells = gameBoard.getElementsByClassName('cell');
  // Clear the board first
  for (let i = 0; i < BOARD_HEIGHT; i++) {
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const cell = cells[i * BOARD_WIDTH + j];
      const value = board[i][j];
      cell.style.backgroundColor = value ? COLORS[value] : 'transparent';
      cell.classList.remove('tetromino', 'placed');
      cell.style.transform = 'none';
      if (value) {
        cell.style.setProperty('--glow-color', COLORS[value]);
        cell.classList.add('tetromino', 'placed');
      }
    }
  }
  
  // Draw current tetromino without glow effect
  if (currentTetromino && currentPosition) {
    const offsetY = Math.round(currentOffset * 32); // Round the offset for pixel-perfect rendering
    for (let i = 0; i < currentTetromino.length; i++) {
      for (let j = 0; j < currentTetromino[i].length; j++) {
        if (currentTetromino[i][j]) {
          const y = currentPosition.y + i;
          const x = currentPosition.x + j;
          if (y >= 0) {
            const cell = cells[y * BOARD_WIDTH + x];
            cell.style.backgroundColor = COLORS[currentTetrominoType];
            cell.classList.add('tetromino');
            cell.style.transform = `translateY(${offsetY}px)`;
          }
        }
      }
    }
  }
  

}

// Update Lives Display
function updateLives() {
  livesElement.innerHTML = '★'.repeat(lives) + '☆'.repeat(3 - lives);
}

// Update Time Display
function updateTime() {
  if (!startTime || gameState !== 'playing') return;
  const now = new Date();
  const diff = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
  const seconds = (diff % 60).toString().padStart(2, '0');
  timeElement.textContent = `${minutes}:${seconds}`;
}

// Start Game
function startGame() {
    clearGameState();
    if (gameState === 'highscores' || gameState === 'start' || gameState === 'over') {
        gameState = 'playing';
        startTime = new Date();
        overlay.style.display = 'none';
        
        // Reset game state but keep the selected level
        score = 0;
        lives = 3;
        linesForCurrentLevel = 0;  // Reset lines counter
        document.getElementById('lines-cleared').textContent = '0';
        board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        
        // Initialize board and spawn first tetromino
        initializeBoard();
        spawnTetromino();
        
        // Update UI
        scoreElement.textContent = '000000';
        levelElement.textContent = level.toString();
        updateLives();
        
        // Set drop interval based on current level
        DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
        updateVisibility();
        
        lastDropTime = performance.now();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(updateTime, 1000);
        gameLoop(performance.now());
    }
}

// Pause Game
function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  clearInterval(gameInterval);
  
  const pauseContent = `
    <div class="overlay-content">
      <h2 style="font-size: 2rem; margin-bottom: 1.5rem;">Game Paused</h2>
      <button class="game-button" id="continueButton">Continue</button>
      <button class="game-button" id="restartButton" style="margin: 1rem;">Restart</button>
      <button class="game-button" id="quitButton" style="background: var(--destructive);">Quit</button>
    </div>
  `;
  
  overlay.innerHTML = pauseContent;
  overlay.style.display = 'flex';

  // Add event listeners after creating the buttons
  document.getElementById('continueButton').addEventListener('click', resumeGame);
  document.getElementById('restartButton').addEventListener('click', () => {
    gameState = 'start'; // Reset game state before starting
    startGame();
  });
  document.getElementById('quitButton').addEventListener('click', quitGame);
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  overlay.style.display = 'none';
  gameInterval = setInterval(updateTime, 1000);
  lastDropTime = performance.now(); // Reset drop time to prevent immediate drop
  requestAnimationFrame(gameLoop); // Restart the game loop
}

// Quit Game
function quitGame() {
    clearGameState();
    gameState = 'start';
    clearInterval(gameInterval);
    startTime = null;
    timeElement.textContent = '00:00';
    
    const startContent = `
      <div class="overlay-content">
        <h1 class="game-title">TETRIS</h1>
        <div class="level-select">
          <h2>Starting Level</h2>
          <div class="level-buttons">
            ${Array.from({length: 10}, (_, i) => i + 1)
              .map(num => `<button class="level-btn" onclick="setStartLevel(${num})">${num}</button>`)
              .join('')}
          </div>
        </div>
        <button class="game-button" onclick="startGame()">Start Game</button>
      </div>
    `;
    
    overlay.innerHTML = startContent;
    overlay.style.display = 'flex';
}

// Game Over
function gameOver() {
  gameState = 'over';
  clearInterval(gameInterval);
  
  showScoreSubmission();
}

// Event Listeners
document.addEventListener('keydown', (e) => {
  if (gameState !== 'playing') return;
  
  switch(e.key) {
    case 'ArrowLeft':
      moveTetromino(-1, 0);
      break;
    case 'ArrowRight':
      moveTetromino(1, 0);
      break;
    case 'ArrowDown':
      hardDrop();
      break;
    case 'ArrowUp':
      rotateTetromino();
      break;
    case ' ':
      pauseGame();
      break;
    case 'Escape':
      pauseGame();
      break;
  }
});

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const savedState = loadGameState();
    setGameState('start');
    initializeBoard();
    updateLives();
    
    switch (savedState) {
        case 'highscores':
            showHighScores(null);
            break;
        case 'start':
        default:
            gameState = 'start';
            showStartOverlay();
            break;
    }
});

function spawnTetromino() {
  if (!nextTetrominoType) {
    nextTetrominoType = Object.keys(TETROMINOES)[Math.floor(Math.random() * Object.keys(TETROMINOES).length)];
    nextTetromino = TETROMINOES[nextTetrominoType];
  }

  currentTetrominoType = nextTetrominoType;
  currentTetromino = nextTetromino;

  nextTetrominoType = Object.keys(TETROMINOES)[Math.floor(Math.random() * Object.keys(TETROMINOES).length)];
  nextTetromino = TETROMINOES[nextTetrominoType];

  currentPosition = { 
    x: Math.floor(BOARD_WIDTH / 2) - 1, 
    y: 0 
  };

  updateNextTetrominoDisplay();

  if (checkCollision(currentPosition.x, currentPosition.y, currentTetromino)) {
    lives--;
    updateLives();

    if (lives <= 0) {
      gameOver();
    } else {
      showLivesOverlay();
    }
    return false;
  }
  return true;
}

function checkCollision(x, y, tetromino, offset = 0) {
  // Convert offset to actual position change and ensure it's not fractional
  const effectiveY = Math.floor(y + offset);
  
  // Check if the effective position would cause any overlap
  for (let row = 0; row < tetromino.length; row++) {
    for (let col = 0; col < tetromino[row].length; col++) {
      if (tetromino[row][col]) {
        const newX = x + col;
        const newY = effectiveY + row;
        
        // Check boundaries
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true;
        }
        
        // Check collision with placed pieces
        // Include an additional check for the cell above if there's an offset
        if (newY >= 0) {
          if (board[newY][newX]) {
            return true;
          }
          // If we have an offset, also check the cell above to prevent overlap during animation
          if (offset > 0 && newY > 0 && board[newY - 1][newX]) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function moveTetromino(dx, dy) {
  const newX = currentPosition.x + dx;
  const newY = currentPosition.y + dy;
  
  // Calculate potential new offset for downward movement
  const potentialOffset = dy === 1 ? currentOffset : 0;
  
  if (!checkCollision(newX, newY, currentTetromino, potentialOffset)) {
    currentPosition.x = newX;
    currentPosition.y = newY;
    if (dy > 0) {
      currentOffset = 0;
      lastDropTime = performance.now();
    }
    updateBoard();
  } else if (dy === 1) {
    currentOffset = 0;
    placeTetromino();
    
    requestAnimationFrame(() => {
      if (clearLines()) {
        setTimeout(() => {
          spawnTetromino();
        }, 300);
      } else {
        spawnTetromino();
      }
    });
  }
}

function rotateTetromino() {
  const rotated = currentTetromino[0].map((_, i) =>
    currentTetromino.map(row => row[i]).reverse()
  );
  if (!checkCollision(currentPosition.x, currentPosition.y, rotated)) {
    currentTetromino = rotated;
    updateBoard();
  }
}

// Add board change tracking
let boardChanged = false;

// Update placeTetromino to track changes
function placeTetromino() {
  boardChanged = true;
  for (let row = 0; row < currentTetromino.length; row++) {
    for (let col = 0; col < currentTetromino[row].length; col++) {
      if (currentTetromino[row][col]) {
        const boardY = currentPosition.y + row;
        const boardX = currentPosition.x + col;
        board[boardY][boardX] = currentTetrominoType;
      }
    }
  }
}

function clearLines() {
  let linesCleared = 0;
  const linesToClear = [];
  
  // First pass: identify lines to clear
  for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
    if (board[row].every(cell => cell !== 0)) {
      linesToClear.push(row);
      linesCleared++;
    }
  }

  if (linesCleared > 0) {
    const cells = gameBoard.getElementsByClassName('cell');

   
      // Remove the lines from the board array
      for (let i = linesToClear.length - 1; i >= 0; i--) {
        const row = linesToClear[i];
        board.splice(row, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
      }

      // Update score
      score += linesCleared * 100;
      scoreElement.textContent = score.toString().padStart(6, '0');
      
      // Update level and lines count
      linesForCurrentLevel += linesCleared;
      document.getElementById('lines-cleared').textContent = linesForCurrentLevel;
      
      // Check for level up only after updating lines
      if (linesForCurrentLevel >= 10) {
        if (level < 10) {
          level++;
          linesForCurrentLevel = 0;
          document.getElementById('lines-cleared').textContent = '0';
          levelElement.textContent = level.toString();
          DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
          updateVisibility();
        } else if (level === 10) {
          handleLevelTenCompletion();
        }
      }
      
      // Force a complete board redraw
      boardChanged = true;
      updateBoardEfficient();
     // Match this with your CSS animation duration

    return true;
  }
  return false;
}
// Add new function to handle level 10 completion
function handleLevelTenCompletion() {
  gameState = 'completed';
  clearInterval(gameInterval);
  
  const completionContent = `
    <div class="overlay-content">
      <h2 style="font-size: 2rem; color: var(--primary);">Congratulations! 🎉</h2>
      <p style="margin: 1rem 0;">You've mastered level 10!</p>
      <p style="font-size: 3rem; color: var(--primary); font-family: monospace; margin-bottom: 1.5rem;">
        ${score.toString().padStart(6, '0')}
      </p>
      <button class="game-button" onclick="startGame()">Play Again</button>
      <button class="game-button" onclick="quitGame()" style="margin-top: 1rem; background: var(--secondary);">
        Quit
      </button>
    </div>
  `;
  
  overlay.innerHTML = completionContent;
  overlay.style.display = 'flex';
  showScoreSubmission();
}

// Add new function to handle visibility changes
function updateVisibility() {

  const nextOpacity = level === 10 ? 0 : Math.max(0.1, 1 - (level - 1) * 0.12);
  
  
  document.documentElement.style.setProperty('--next-piece-opacity', nextOpacity.toString());
}

// Add this function to display FPS
function updateFPS(timestamp) {
  fpsCounter++;
  
  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = fpsCounter;
    console.log(`FPS: ${currentFps}, Level: ${level}`);
    // You can also add this to the UI if you want
    fpsCounter = 0;
    lastFpsUpdate = timestamp;
  }
}

// Update gameLoop to be more strict with collision checks
function gameLoop(timestamp) {
  if (gameState !== 'playing') return;

  updateFPS(timestamp);

  const deltaTime = timestamp - lastFrameTime;
  if (deltaTime < TARGET_FRAMETIME) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Update game logic
  const dropDelta = timestamp - lastDropTime;
  if (dropDelta >= DROP_INTERVAL) {
    moveTetromino(0, 1);
    lastDropTime = timestamp;
  } else {
    // Calculate new offset and check for collision before applying
    const newOffset = dropDelta / DROP_INTERVAL;
    // Add a small buffer to prevent any possibility of overlap
    if (!checkCollision(currentPosition.x, currentPosition.y, currentTetromino, newOffset + 0.01)) {
      currentOffset = newOffset;
    } else {
      // If collision would occur, force piece to place
      currentOffset = 0;
      moveTetromino(0, 1);
    }
  }

  updateBoardEfficient();
  lastFrameTime = timestamp;
  requestAnimationFrame(gameLoop);
}
// Optimized board update function
function updateBoardEfficient() {
  const cells = gameBoard.getElementsByClassName('cell');
  
  // Use requestAnimationFrame for board updates
  requestAnimationFrame(() => {
    // Only update placed pieces if board changed
    if (boardChanged) {
      const fragment = document.createDocumentFragment();
      
      for (let i = 0; i < BOARD_HEIGHT; i++) {
        for (let j = 0; j < BOARD_WIDTH; j++) {
          const cell = cells[i * BOARD_WIDTH + j];
          const value = board[i][j];
          
          if (value) {
            cell.style.transform = 'translate3d(0,0,0)';
            cell.style.backgroundColor = COLORS[value];
            if (!cell.classList.contains('tetromino')) {
              cell.classList.add('tetromino', 'placed');
            }
            cell.style.setProperty('--glow-color', COLORS[value]);
          } else if (cell.classList.contains('placed')) {
            cell.style.backgroundColor = 'transparent';
            cell.classList.remove('tetromino', 'placed');
            cell.style.transform = 'none';
          }
        }
      }
      
      boardChanged = false;
    }
    
    // Update current piece with optimized rendering
    if (currentTetromino && currentPosition) {
      const offsetY = Math.round(currentOffset * 32);
      const currentPieceCells = new Set();
      
      for (let i = 0; i < currentTetromino.length; i++) {
        for (let j = 0; j < currentTetromino[i].length; j++) {
          if (currentTetromino[i][j]) {
            const y = currentPosition.y + i;
            const x = currentPosition.x + j;
            if (y >= 0) {
              const index = y * BOARD_WIDTH + x;
              currentPieceCells.add(index);
              const cell = cells[index];
              cell.style.transform = `translate3d(0,${offsetY}px,0)`;
              cell.style.backgroundColor = COLORS[currentTetrominoType];
              if (!cell.classList.contains('tetromino')) {
                cell.classList.add('tetromino', 'current-piece');
              }
            }
          }
        }
      }
      
      // Clear only cells that are no longer part of the current piece
      document.querySelectorAll('.current-piece').forEach(cell => {
        const index = Array.from(cells).indexOf(cell);
        if (!currentPieceCells.has(index)) {
          cell.classList.remove('current-piece', 'tetromino');
          cell.style.backgroundColor = 'transparent';
          cell.style.transform = 'none';
        }
      });
    }
  });
}

function createGridLines() {
  const svg = document.querySelector('.grid-overlay');
  const cellSize = 32;
  const width = BOARD_WIDTH * cellSize;
  const height = BOARD_HEIGHT * cellSize;
  
  // Create SVG content in memory
  const svgContent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Create lines using a single path element
  const pathData = [];
  
  // Vertical lines
  for (let i = 0; i <= BOARD_WIDTH; i++) {
    const x = i * cellSize;
    pathData.push(`M ${x} 0 L ${x} ${height}`);
  }
  
  // Horizontal lines
  for (let i = 0; i <= BOARD_HEIGHT; i++) {
    const y = i * cellSize;
    pathData.push(`M 0 ${y} L ${width} ${y}`);
  }
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData.join(' '));
  path.setAttribute('stroke', '#1a1a1a');
  path.setAttribute('stroke-width', '1');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  
  svgContent.appendChild(path);
  
  // Clear and update SVG
  svg.innerHTML = '';
  svg.appendChild(svgContent);
}

// Add CSS will-change hints
document.head.insertAdjacentHTML('beforeend', `
  <style>
    @keyframes clearLine {
      0% {
        transform: translate3d(0,0,0);
        opacity: 1;
      }
      50% {
        transform: translate3d(0,0,5px);
        opacity: 0.5;
        filter: brightness(2);
      }
      100% {
        transform: translate3d(0,0,-10px);
        opacity: 0;
      }
    }
    
    .cell {
      will-change: transform, background-color;
      transform: translate3d(0,0,0);
      backface-visibility: hidden;
    }
    
    .tetromino {
      will-change: transform;
    }
    
    .clearing {
      animation: clearLine 0.3s ease-out forwards;
      z-index: 2;
    }
  </style>
`);

function updateNextTetrominoDisplay() {
  const nextPieceGrid = document.querySelector('.next-piece-grid');
  if (!nextPieceGrid) {
    // Create the next piece section if it doesn't exist
    const gameStats = document.querySelector('.game-stats');
    const nextPieceSection = document.createElement('div');
    nextPieceSection.className = 'next-piece';
    nextPieceSection.innerHTML = `
      <h2>Next</h2>
      <div class="next-piece-grid">
        ${Array(16).fill('<div class="next-piece-cell"></div>').join('')}
      </div>
    `;
    gameStats.appendChild(nextPieceSection);
  }

  // Clear all cells
  const cells = document.querySelectorAll('.next-piece-cell');
  cells.forEach(cell => {
    cell.style.backgroundColor = 'transparent';
    cell.classList.remove('tetromino');
  });

  if (!nextTetromino) return;

  // Calculate centering offsets
  const offsetX = Math.floor((4 - nextTetromino[0].length) / 2);
  const offsetY = Math.floor((4 - nextTetromino.length) / 2);

  // Draw the next tetromino with opacity based on level
  for (let i = 0; i < nextTetromino.length; i++) {
    for (let j = 0; j < nextTetromino[i].length; j++) {
      if (nextTetromino[i][j]) {
        const index = (i + offsetY) * 4 + (j + offsetX);
        const cell = cells[index];
        if (cell) {
          const color = COLORS[nextTetrominoType];
          // Convert hex to rgb for opacity support
          const rgb = hexToRgb(color);
          cell.style.setProperty('--glow-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
          cell.classList.add('tetromino');
        }
      }
    }
  }
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}


function hardDrop() {
  while (!checkCollision(currentPosition.x, currentPosition.y + 1, currentTetromino)) {
    currentPosition.y++;
  }
  currentOffset = 0;
  placeTetromino();
  
  // Wait for the piece to be placed before checking lines
  requestAnimationFrame(() => {
    if (clearLines()) {
      // Only spawn new tetromino after lines are cleared
      setTimeout(() => {
        spawnTetromino();
      }, 300); // Match this with line clearing animation duration
    } else {
      spawnTetromino();
    }
  });
}

// Add new function to set starting level
function setStartLevel(selectedLevel) {
  level = selectedLevel;
  linesForCurrentLevel = 0;  // Reset lines counter when changing level
  DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
  updateVisibility();
  levelElement.textContent = level.toString();
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (parseInt(btn.textContent) === level) {
      btn.classList.add('selected');
    }
  });
}

function showScoreSubmission() {
    console.log('showScoreSubmission: Starting');
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay';
    
    const content = document.createElement('div');
    content.className = 'overlay-content score-submission';
    content.innerHTML = `
        <h2>Game Over!</h2>
        <p>Your Score: ${score}</p>
        <p>Time: ${timeElement.textContent}</p>
        <div class="score-input">
            <input type="text" id="playerName" placeholder="Enter your name" maxlength="10">
            <button id="submitScoreBtn" class="game-button">Submit Score</button>
        </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Add event listener after DOM elements are created
    console.log('showScoreSubmission: Adding event listener');
    const submitBtn = document.getElementById('submitScoreBtn');
    submitBtn.addEventListener('click', (e) => {
        console.log('Submit button clicked');
        e.preventDefault();
        e.stopPropagation();
        handleScoreSubmit(e);
    });
    
    // Prevent form submission if user presses enter
    const nameInput = document.getElementById('playerName');
    nameInput.addEventListener('keypress', (e) => {
        console.log('Key pressed in input:', e.key);
        if (e.key === 'Enter') {
            console.log('Enter key pressed - preventing default');
            e.preventDefault();
            e.stopPropagation();
            handleScoreSubmit(e);
        }
    });
    
    console.log('showScoreSubmission: Setup complete');
}

function handleScoreSubmit(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();
    
    if (name) {
        const submitBtn = document.getElementById('submitScoreBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        const submissionOverlay = document.querySelector('.score-submission');
        if (submissionOverlay) {
            submissionOverlay.parentElement.remove();
        }
        
        showHighScores(null);
        
        try {
            submitScore(name, score, timeElement.textContent)
                .catch(error => console.error('Score submission failed:', error));
        } catch (error) {
            console.error('Error in score submission:', error);
        }
    } else {
        nameInput.classList.add('error');
        setTimeout(() => nameInput.classList.remove('error'), 1000);
    }
    
    if (event) {
        event.preventDefault();
    }
    return false;
}

async function submitScore(name, score, time) {
    try {
        console.log('submitScore: Sending request to server');
        const response = await fetch('http://localhost:8080/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, score, time })
        });
        
        console.log(`submitScore: Server response status: ${response.status}`);
        
        if (response.ok) {
            const scores = await response.json();
            console.log('submitScore: Received scores from server');
            // Wrap the showHighScores call in a setTimeout to ensure it runs after current execution
            setTimeout(() => {
                showHighScores(scores);
            }, 0);
        } else {
            throw new Error('Failed to submit score');
        }
    } catch (error) {
        console.error('Error occurred:', error);
        showHighScores('error');
        throw error;
    }
    
    return false;
}

// Add new function to fetch and display high scores from the main menu
async function fetchAndShowHighScores() {
    try {
        // Show loading state
        showHighScores(null);
        
        const response = await fetch('http://localhost:8080/api/scores');
        if (response.ok) {
            const scores = await response.json();
            showHighScores(scores);
        } else {
            throw new Error('Failed to fetch scores');
        }
    } catch (error) {
        console.error('Error fetching scores:', error);
        showHighScores('error');
    }
}

// Update showHighScores to handle the high scores display from main menu
function showHighScores(scores) {
    if (scores && scores !== 'error') {
        localStorage.setItem('lastScores', JSON.stringify(scores));
    }
    
    if (!scores && localStorage.getItem('lastScores')) {
        scores = JSON.parse(localStorage.getItem('lastScores'));
    }
    
    saveGameState('highscores');
    
    // Loading state
    if (scores === null) {
        overlay.innerHTML = `
            <div class="overlay-content high-scores">
                <h2>High Scores</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading scores...</p>
                    <button class="game-button" onclick="quitGame()">Cancel</button>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
        return;
    }
    
    // Error state
    if (scores === 'error') {
        overlay.innerHTML = `
            <div class="overlay-content high-scores">
                <h2>Error Loading Scores</h2>
                <p>Failed to load high scores. Please try again.</p>
                <div class="button-container">
                    <button class="game-button" onclick="fetchAndShowHighScores()">Retry</button>
                    <button class="game-button" onclick="quitGame()">Main Menu</button>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
        return;
    }
    
    // Success state with scores
    overlay.innerHTML = `
        <div class="overlay-content high-scores">
            <h2>High Scores</h2>
            <div class="search-container">
                <input type="text" 
                    id="scoreSearch" 
                    placeholder="Search by player name..."
                    class="score-search-input"
                >
            </div>
            <div class="scores-wrapper">
                <div class="scores-container">
                    <div class="scores-header">
                        <span>Rank</span>
                        <span>Name</span>
                        <span>Score</span>
                        <span>Time</span>
                    </div>
                    <div class="scores-list" id="scoresList">
                        ${scores.map((entry, index) => `
                            <div class="score-entry ${entry.name === document.getElementById('playerName')?.value ? 'highlight' : ''}"
                                 data-player-name="${entry.name.toLowerCase()}">
                                <span class="rank">#${entry.rank}</span>
                                <span class="name">${entry.name}</span>
                                <span class="score">${entry.score}</span>
                                <span class="time">${entry.time}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="button-container">
                <button class="game-button" onclick="quitGame()">Main Menu</button>
                <button class="game-button" onclick="startGame()">Play Again</button>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
    
    // Add search functionality
    const searchInput = document.getElementById('scoreSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const scoreEntries = document.querySelectorAll('.score-entry');
            
            scoreEntries.forEach(entry => {
                const playerName = entry.getAttribute('data-player-name');
                if (playerName.includes(searchTerm)) {
                    entry.style.display = 'grid';
                } else {
                    entry.style.display = 'none';
                }
            });
            
            // Show "no results" message if no matches
            const noResults = document.getElementById('noResults');
            const hasVisibleEntries = Array.from(scoreEntries).some(entry => entry.style.display !== 'none');
            
            if (!hasVisibleEntries) {
                if (!noResults) {
                    const scoresList = document.getElementById('scoresList');
                    const noResultsDiv = document.createElement('div');
                    noResultsDiv.id = 'noResults';
                    noResultsDiv.className = 'no-results';
                    noResultsDiv.textContent = 'No players found';
                    scoresList.appendChild(noResultsDiv);
                }
            } else if (noResults) {
                noResults.remove();
            }
        });
    }
}

function showStartOverlay() {
    if (gameState !== 'highscores' && gameState !== 'paused') {
        const startContent = `
            <div class="overlay-content">
                <h1 class="game-title">TETRIS</h1>
                <div class="level-select">
                    <h2>Starting Level</h2>
                    <div class="level-buttons">
                        ${Array.from({length: 10}, (_, i) => i + 1)
                            .map(num => `<button class="level-btn ${num === level ? 'selected' : ''}" onclick="setStartLevel(${num})">${num}</button>`)
                            .join('')}
                    </div>
                </div>
                <button class="game-button" onclick="startGame()">Start Game</button>
                <button class="game-button" onclick="fetchAndShowHighScores()" style="margin-top: 1rem; background: var(--secondary);">High Scores</button>
            </div>
        `;
        
        overlay.innerHTML = startContent;
        overlay.style.display = 'flex';
    }
}

// Initialize worker
let gameWorker;
try {
  gameWorker = new Worker('worker.js');
  
  gameWorker.onmessage = function(e) {
    const { type, data } = e.data;
    switch(type) {
      case 'scoreResult':
        updateScore(data.score);
        break;
      case 'highScoreResult':
        handleHighScore(data.isHighScore);
        break;
      case 'nextPieceResult':
        handleNextPiece(data.nextPiece);
        break;
      case 'performanceReport':
        console.debug('Worker Performance:', data);
        break;
      case 'error':
        console.error('Worker Error:', data.error);
        break;
    }
  };
  
  gameWorker.onerror = function(error) {
    console.error('Worker Error:', error);
    // Fallback to main thread processing if worker fails
    gameWorker = null;
  };
  
} catch (error) {
  console.error('Worker initialization failed:', error);
  gameWorker = null;
}

// Example usage in your game functions
function calculateScore(lines) {
  if (gameWorker) {
    gameWorker.postMessage({
      type: 'calculateScore',
      data: { lines, level }
    });
  } else {
    // Fallback to main thread processing
    const score = lines * 100 * level;
    updateScore(score);
  }
}

function generateNextPiece() {
  if (gameWorker) {
    gameWorker.postMessage({
      type: 'generateNextPiece'
    });
  } else {
    // Fallback to main thread processing
    const piece = generateNextPieceSync();
    handleNextPiece(piece);
  }
}

function updateNonCriticalUI() {
  requestIdleCallback(() => {
    updateNextTetrominoDisplay();
    updateTime();
    updateLives();
  }, { timeout: 100 });
}

function showLivesOverlay() {
  gameState = 'paused';
  clearInterval(gameInterval);
  
  const livesContent = `
    <div class="overlay-content">
      <h2 style="font-size: 2rem; color: var(--destructive);">Oops!</h2>
      <p style="margin: 1rem 0;">You lost a life!</p>
      <p style="font-size: 1.5rem; color: var(--primary); margin-bottom: 1.5rem;">
        Lives remaining: ${lives}
      </p>
      <button class="game-button" onclick="continuePlaying()">Continue</button>
    </div>
  `;
  
  overlay.innerHTML = livesContent;
  overlay.style.display = 'flex';
}

function continuePlaying() {
  gameState = 'playing';
  overlay.style.display = 'none';
  
  // Clear the entire board
  board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
  
  // Reset piece position and update board
  currentPosition = { 
    x: Math.floor(BOARD_WIDTH / 2) - 1, 
    y: 0 
  };
  
  boardChanged = true;
  updateBoardEfficient();
  
  // Restart game interval and loop
  gameInterval = setInterval(updateTime, 1000);
  lastDropTime = performance.now();
  requestAnimationFrame(gameLoop);
}
