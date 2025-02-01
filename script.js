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
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ]
};

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

// Add RAF timing variables
let frameId = null;
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

// 5. Cache DOM elements and calculations
const CACHED = {
  cells: null,
  colors: Object.freeze(COLORS),
  boardSize: BOARD_WIDTH * BOARD_HEIGHT,
  tetrominoes: Object.freeze(TETROMINOES)
};

function getCells() {
  if (!CACHED.cells) {
    CACHED.cells = Array.from(gameBoard.getElementsByClassName('cell'));
  }
  return CACHED.cells;
}

// Change from const to let for the rotation cache
let ROTATION_CACHE = {};

// Update initRotationCache function
function initRotationCache() {
    
    ROTATION_CACHE = {};
    
    Object.entries(TETROMINOES).forEach(([type, shape]) => {
        
        
        // Store all 4 rotations
        let rotations = [];
        let current = JSON.parse(JSON.stringify(shape)); // Deep copy initial shape
        
        // Add initial shape
        rotations.push(current);
        
        // Generate the other 3 rotations
        for (let i = 1; i < 4; i++) {
            // Create new rotation using the previous state
            let rotated = current[0].map((_, i) => 
                current.map(row => row[i]).reverse()
            );
            
            // Deep copy the rotated piece to prevent reference issues
            current = JSON.parse(JSON.stringify(rotated));
            rotations.push(current);
           
        }
        
        ROTATION_CACHE[type] = rotations;
    });
    
  
}

// Now let's modify rotateTetromino to use the cache
function rotateTetromino() {
    if (!currentTetromino) return;
    
    // Get next rotation from cache
    const nextIndex = (currentRotationIndex + 1) % 4;
    const nextRotation = ROTATION_CACHE[currentTetrominoType][nextIndex];
    
    if (!checkCollision(currentPosition.x, currentPosition.y, nextRotation)) {
        currentTetromino = JSON.parse(JSON.stringify(nextRotation));
        currentRotationIndex = nextIndex;
        dirtyPiece = true;
        updateBoard();
    }
}

// Wall kick data for I piece
const WALL_KICKS_I = [
  [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],  // 0->1
  [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],  // 1->2
  [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],  // 2->3
  [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]   // 3->0
];

// Wall kick data for all other pieces
const WALL_KICKS_JLSTZ = [
  [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 0->1
  [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     // 1->2
  [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],    // 2->3
  [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]   // 3->0
];

function getWallKicks(type, fromIndex, toIndex) {
  const kicks = type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
  return kicks[fromIndex] || [];
}

// Keep track of current rotation state
let currentRotationIndex = 0;

// Add state management functions
function setGameState(newState) {
    gameState = newState;
}

function saveGameState(state) {
    const gameData = {
        state: state,
        score: score,
        level: level,
        lives: lives,
        time: timeElement.textContent,
        board: board,
        currentTetromino: currentTetromino,
        currentTetrominoType: currentTetrominoType,
        currentPosition: currentPosition,
        nextTetrominoType: nextTetrominoType,
        nextTetromino: nextTetromino
    };
    localStorage.setItem('gameState', JSON.stringify(gameData));
}

function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (!savedState) return 'start';
    
    try {
        const gameData = JSON.parse(savedState);
        
        // Restore game variables if they exist
        if (gameData.score !== undefined) score = gameData.score;
        if (gameData.level !== undefined) level = gameData.level;
        if (gameData.lives !== undefined) lives = gameData.lives;
        if (gameData.board) board = gameData.board;
        if (gameData.currentTetromino) currentTetromino = gameData.currentTetromino;
        if (gameData.currentTetrominoType) currentTetrominoType = gameData.currentTetrominoType;
        if (gameData.currentPosition) currentPosition = gameData.currentPosition;
        if (gameData.nextTetrominoType) nextTetrominoType = gameData.nextTetrominoType;
        if (gameData.nextTetromino) nextTetromino = gameData.nextTetromino;
        
        // Update UI elements
        if (gameData.time) timeElement.textContent = gameData.time;
        scoreElement.textContent = score.toString().padStart(6, '0');
        levelElement.textContent = level.toString();
        updateLives();
        
        return gameData.state;
    } catch (error) {
        console.error('Error loading game state:', error);
        return 'start';
    }
}

function clearGameState() {
    localStorage.removeItem('gameState');
}

// Initialize Game Board
function initializeBoard() {
  const fragment = document.createDocumentFragment();
  const template = document.createElement('template');
  
  template.innerHTML = Array(BOARD_HEIGHT)
    .fill()
    .map(() => Array(BOARD_WIDTH)
      .fill('<div class="cell"></div>')
      .join('')
    ).join('');
    
  fragment.appendChild(template.content);
  gameBoard.innerHTML = '';
  gameBoard.appendChild(fragment);
  
  // Cache cells after creation
  CACHED.cells = Array.from(gameBoard.getElementsByClassName('cell'));
}

// Update Board Display
function updateBoard() {
  const cells = gameBoard.getElementsByClassName('cell');
  
  // Clear the board first
  for (let i = 0; i < BOARD_HEIGHT; i++) {
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const cell = cells[i * BOARD_WIDTH + j];
      const value = board[i][j];
      const color = value ? COLORS[value] : 'transparent';
      cell.style.backgroundColor = color;
      cell.classList.remove('tetromino', 'placed');
      cell.style.transform = 'none';
      if (value) {
        cell.style.setProperty('--piece-color', color);
        cell.style.setProperty('--glow-color-rgb', hexToRgb(color).r + ',' + hexToRgb(color).g + ',' + hexToRgb(color).b);
        cell.classList.add('tetromino', 'placed');
      }
    }
  }
  
  // Draw current tetromino
  if (currentTetromino && currentPosition) {
    const offsetY = Math.round(currentPosition.y * 32);
    for (let i = 0; i < currentTetromino.length; i++) {
      for (let j = 0; j < currentTetromino[i].length; j++) {
        if (currentTetromino[i][j]) {
          const y = currentPosition.y + i;
          const x = currentPosition.x + j;
          if (y >= 0) {
            const cell = cells[y * BOARD_WIDTH + x];
            const color = COLORS[currentTetrominoType];
            cell.style.backgroundColor = color;
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
        
        // Reset game state
        score = 0;
        lives = 3;
        linesForCurrentLevel = 0;
        document.getElementById('lines-cleared').textContent = '0';
        
        // Reinitialize board (now works because board is let, not const)
        board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        
        // Initialize board and spawn first tetromino
        initializeBoard();
        createGridLines();
        spawnTetromino();
        
        // Update UI
        scoreElement.textContent = '000000';
        levelElement.textContent = level.toString();
        updateLives();
        
        DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
        updateVisibility();
        
        lastDropTime = performance.now();
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(updateTime, 1000);
        requestAnimationFrame(gameLoop);
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
    
    // Reset all game variables
    score = 0;
    level = 1;
    lives = 3;
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    currentTetromino = null;
    currentTetrominoType = null;
    currentPosition = null;
    nextTetrominoType = null;
    nextTetromino = null;
    
    // Force a complete board redraw
    dirtyBoard = true;
    dirtyPiece = true;
    updateBoardEfficient();
    
    showStartOverlay();
}

// Game Over
function gameOver() {
  gameState = 'over';
  clearInterval(gameInterval);
  
  showScoreSubmission();
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing game...');
    initRotationCache();
    initializeGame(); // Critical init
    
    // Defer non-critical init
    deferredInit().then(() => {
        const savedState = loadGameState();
        setGameState(savedState);
        
        // Show appropriate overlay based on game state
        if (gameState === 'start') {
            showStartOverlay();
        } else if (gameState === 'highscores') {
            // If we're in highscores state, show the high scores
            const savedScores = localStorage.getItem('lastScores');
            if (savedScores) {
                showHighScores(JSON.parse(savedScores));
            } else {
                fetchAndShowHighScores();
            }
        }
    });
});

// 1. Move initialization code to a separate function
function initializeGame() {
  // Initialize only critical game components first
  initializeBoard();
  
  // Create next piece preview area if it doesn't exist
  if (!document.querySelector('.next-piece-container')) {
    const nextPieceContainer = document.createElement('div');
    nextPieceContainer.className = 'next-piece-container';
    nextPieceContainer.innerHTML = `
      <h2>Next</h2>
      <div class="next-piece-grid">
        ${Array(16).fill('<div class="next-piece-cell"></div>').join('')}
      </div>
    `;
    document.querySelector('.game-stats').appendChild(nextPieceContainer);
  }
  
  setupEventListeners();
  createGridLines();
}

// 2. Defer non-critical initializations
function deferredInit() {
  return new Promise(resolve => {
    requestIdleCallback(() => {
      // Initialize non-critical components
      if (typeof initializeWorker === 'function') {
        initializeWorker();
      }
      setupHighScores();
      if (typeof createGridLines === 'function') {
        createGridLines();
      }
      resolve();
    });
  });
}

// 4. Lazy load worker
let gameWorker = null;
function initializeWorker() {
  if (!gameWorker) {
    gameWorker = new Worker('worker.js');
    gameWorker.onmessage = handleWorkerMessage;
    gameWorker.onerror = handleWorkerError;
  }
  return gameWorker;
}

function handleWorkerMessage(e) {
  const { type, data } = e.data;
  
  if (!data) {
    console.error('Invalid worker message:', e);
    return;
  }

  switch(type) {
    case 'scoreResult':
      if (data.score !== undefined) {
        updateScore(data.score);
      }
      break;
    case 'optimizationResult':
      requestAnimationFrame(() => {
        if (data.score !== undefined) {
          score = data.score;
          scoreElement.textContent = score.toString().padStart(6, '0');
        }
        
        if (data.shouldLevelUp) {
          level = Math.min(10, level + 1);
          linesForCurrentLevel = 0;
          document.getElementById('lines-cleared').textContent = '0';
          levelElement.textContent = level.toString();
          DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
          updateVisibility();
        }
      });
      break;
    case 'nextPieceResult':
      if (data.nextPiece) {
        nextTetrominoType = data.nextPiece;
        nextTetromino = JSON.parse(JSON.stringify(TETROMINOES[data.nextPiece])); // Deep copy
        requestAnimationFrame(() => {
          updateNextTetrominoDisplay();
        });
      }
      break;
    case 'error':
      console.error('Worker error:', data.message);
      break;
  }
}

function handleWorkerError(error) {
  console.error('Worker error:', error);
  gameWorker = null;
  // Attempt to reconnect after error
  setTimeout(() => {
    gameWorker = initializeWorker();
  }, 1000);
}

// Update clearLines to use worker and update lines count
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
        // Update lines count immediately for visual feedback
        linesForCurrentLevel += linesCleared;
        document.getElementById('lines-cleared').textContent = linesForCurrentLevel.toString();
        
        // Offload calculations to worker
        if (gameWorker) {
            gameWorker.postMessage({
                type: 'optimizeGame',
                data: {
                    lines: linesCleared,
                    linesForLevel: linesForCurrentLevel,
                    level,
                    board: board,
                    score: score
                }
            });
        }

        // Handle visual updates
        requestAnimationFrame(() => {
            // Remove lines and update board
            for (let i = linesToClear.length - 1; i >= 0; i--) {
                const row = linesToClear[i];
                board.splice(row, 1);
                board.unshift(Array(BOARD_WIDTH).fill(0));
            }
            
            boardChanged = true;
            updateBoardEfficient();
        });

        return true;
    }
    return false;
}

// Update spawnTetromino to ensure proper piece initialization
function spawnTetromino() {
  if (!nextTetrominoType) {
    if (gameWorker) {
      gameWorker.postMessage({ type: 'generateNextPiece' });
      // Set a default piece while waiting for worker response
      nextTetrominoType = 'I';
      nextTetromino = TETROMINOES['I'];
    } else {
      nextTetrominoType = Object.keys(TETROMINOES)[Math.floor(Math.random() * Object.keys(TETROMINOES).length)];
      nextTetromino = TETROMINOES[nextTetrominoType];
    }
  }

  currentTetrominoType = nextTetrominoType;
  currentTetromino = JSON.parse(JSON.stringify(TETROMINOES[currentTetrominoType])); // Deep copy to prevent reference issues

  // Request next piece immediately
  if (gameWorker) {
    gameWorker.postMessage({ type: 'generateNextPiece' });
  }

  // Set initial position
  currentPosition = {
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(currentTetromino[0].length / 2),
    y: 0
  };

  currentRotationIndex = 0; // Reset rotation index for new piece

  // Check for game over condition immediately after spawning
  if (checkCollision(currentPosition.x, currentPosition.y, currentTetromino)) {
    lives--;
    updateLives();

    if (lives <= 0) {
      gameOver();
      return false;
    } else {
      showLivesOverlay();
      return false;
    }
  }

  // Use requestAnimationFrame for visual updates
  requestAnimationFrame(() => {
    updateBoard(); // Update main board immediately
    updateNextTetrominoDisplay();
  });
  
  return true;
}

// 1. Optimize board updates by using a dirty flag system
let dirtyBoard = false;
let dirtyPiece = false;

// 2. Optimize the game loop
function gameLoop(timestamp) {
  if (gameState !== 'playing') return;
  
  const delta = timestamp - lastFrameTime;
  
  // Skip frame if too soon
  if (delta < 16.66) { // 60 FPS target
    frameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  // Process game logic
  if (timestamp - lastDropTime >= DROP_INTERVAL) {
    moveTetromino(0, 1);
    lastDropTime = timestamp;
  }
  
  // Only update visuals if needed
  if (dirtyBoard || dirtyPiece) {
    updateBoardEfficient();
  }
  
  lastFrameTime = timestamp;
  frameId = requestAnimationFrame(gameLoop);
}

// Clean up when game ends
function cleanupGame() {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

// 3. Update moveTetromino to use dirty flags
function moveTetromino(dx, dy) {
  const newX = currentPosition.x + dx;
  const newY = currentPosition.y + dy;
  
  if (!checkCollision(newX, newY, currentTetromino)) {
    currentPosition.x = newX;
    currentPosition.y = newY;
    if (dy > 0) {
      lastDropTime = performance.now();
    }
    dirtyPiece = true;
  } else if (dy === 1) {
    placeTetromino();
    dirtyBoard = true;
    
    if (clearLines()) {
      setTimeout(() => {
        spawnTetromino();
      }, 300);
    } else {
      spawnTetromino();
    }
  }
}

// 4. Update placeTetromino
function placeTetromino() {
  for (let row = 0; row < currentTetromino.length; row++) {
    for (let col = 0; col < currentTetromino[row].length; col++) {
      if (currentTetromino[row][col]) {
        const boardY = currentPosition.y + row;
        const boardX = currentPosition.x + col;
        
        // Check if piece is placed at or above the top of the board
        if (boardY <= 0) {
          lives--;
          updateLives();
          
          if (lives <= 0) {
            gameOver();
          } else {
            showLivesOverlay();
          }
          return;
        }
        
        board[boardY][boardX] = currentTetrominoType;
      }
    }
  }
  dirtyBoard = true;
}

// Handle optimization results from worker
function handleOptimizationResult(data) {
  if (data.skip) return;

  // Update score
  if (data.score) {
    score += data.score;
    scoreElement.textContent = score.toString().padStart(6, '0');
  }

  // Update level if needed
  if (data.shouldLevelUp) {
    level = Math.min(10, level + 1);
    linesForCurrentLevel = 0;
    document.getElementById('lines-cleared').textContent = '0';
    levelElement.textContent = level.toString();
    DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
    updateVisibility();
  }
}

function checkCollision(x, y, tetromino) {
  for (let row = 0; row < tetromino.length; row++) {
    for (let col = 0; col < tetromino[row].length; col++) {
      if (tetromino[row][col]) {
        const newX = x + col;
        const newY = y + row;
        
        // Check boundaries
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true;
        }
        
        // Check collision with placed pieces
        if (newY >= 0 && board[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
}

// Add board change tracking
let boardChanged = false;

// Add new function to handle visibility changes
function updateVisibility() {

  const nextOpacity = level === 10 ? 0 : Math.max(0.1, 1 - (level - 1) * 0.12);
  
  
  document.documentElement.style.setProperty('--next-piece-opacity', nextOpacity.toString());
}



// 1. Batch DOM updates using requestAnimationFrame
function updateBoardEfficient() {
  const cells = Array.from(gameBoard.getElementsByClassName('cell'));
  
  requestAnimationFrame(() => {
    if (dirtyBoard) {
      for (let i = 0; i < BOARD_HEIGHT; i++) {
        for (let j = 0; j < BOARD_WIDTH; j++) {
          const cell = cells[i * BOARD_WIDTH + j];
          const value = board[i][j];
          
          if (value) {
            cell.style.backgroundColor = COLORS[value];
            if (!cell.classList.contains('placed')) {
              cell.classList.add('tetromino', 'placed');
            }
          } else {
            cell.style.backgroundColor = 'transparent';
            cell.classList.remove('tetromino', 'placed');
          }
        }
      }
      dirtyBoard = false;
    }
    
    if (dirtyPiece && currentTetromino && currentPosition) {
      // Clear previous piece positions
      cells.forEach(cell => {
        if (cell.classList.contains('tetromino') && !cell.classList.contains('placed')) {
          cell.style.backgroundColor = 'transparent';
          cell.classList.remove('tetromino');
        }
      });
      
      // Draw current piece
      for (let i = 0; i < currentTetromino.length; i++) {
        for (let j = 0; j < currentTetromino[i].length; j++) {
          if (currentTetromino[i][j]) {
            const y = currentPosition.y + i;
            const x = currentPosition.x + j;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
              const cell = cells[y * BOARD_WIDTH + x];
              cell.style.backgroundColor = COLORS[currentTetrominoType];
              cell.classList.add('tetromino');
            }
          }
        }
      }
      dirtyPiece = false;
    }
  });
}

// 2. Use CSS classes instead of inline styles
const PIECE_STYLES = Object.entries(COLORS).reduce((styles, [piece, color]) => {
  const style = document.createElement('style');
  style.textContent = `
    .tetromino-${piece} {
      background-color: ${color};
    }
  `;
  document.head.appendChild(style);
  return { ...styles, [piece]: `tetromino-${piece}` };
}, {});

function createGridLines() {
    let svg = gameBoard.querySelector('.grid-overlay');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('grid-overlay');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        gameBoard.appendChild(svg);
    }
    
    svg.innerHTML = '';
    
    // Get all cells and their positions
    const cells = Array.from(document.querySelectorAll('.cell'));
    if (cells.length === 0) return;
    
    // Get the position of the first cell in each row/column
    const cellPositions = [];
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        const rowCells = [];
        for (let j = 0; j < BOARD_WIDTH; j++) {
            const cell = cells[i * BOARD_WIDTH + j];
            const rect = cell.getBoundingClientRect();
            const boardRect = gameBoard.getBoundingClientRect();
            rowCells.push({
                x: rect.left - boardRect.left,
                y: rect.top - boardRect.top,
                width: rect.width,
                height: rect.height
            });
        }
        cellPositions.push(rowCells);
    }
    
    // Create vertical lines at the start of each column (excluding edges)
    for (let j = 1; j < BOARD_WIDTH; j++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const x = cellPositions[0][j].x;
        
        line.setAttribute('x1', x);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', x);
        line.setAttribute('y2', '100%');
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)'); // Reduced opacity
        line.setAttribute('stroke-width', '1');
        line.setAttribute('shape-rendering', 'crispEdges');
        svg.appendChild(line);
    }
    
    // Create horizontal lines at the start of each row (excluding edges)
    for (let i = 1; i < BOARD_HEIGHT; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const y = cellPositions[i][0].y;
        
        line.setAttribute('x1', 0);
        line.setAttribute('y1', y);
        line.setAttribute('x2', '100%');
        line.setAttribute('y2', y);
        line.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)'); // Reduced opacity
        line.setAttribute('stroke-width', '1');
        line.setAttribute('shape-rendering', 'crispEdges');
        svg.appendChild(line);
    }
    
    // Add single border
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', 0);
    border.setAttribute('y', 0);
    border.setAttribute('width', '100%');
    border.setAttribute('height', '100%');
    border.setAttribute('fill', 'none');
    border.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    border.setAttribute('stroke-width', '1');
    border.setAttribute('shape-rendering', 'crispEdges');
    svg.appendChild(border);
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

// Update updateNextTetrominoDisplay for better debugging
function updateNextTetrominoDisplay() {
    const nextPieceGrid = document.querySelector('.next-piece-grid');
    if (!nextPieceGrid) return;

    const cells = nextPieceGrid.querySelectorAll('.next-piece-cell');
    cells.forEach(cell => {
        cell.style.backgroundColor = 'transparent';
        cell.classList.remove('tetromino');
    });

    if (!nextTetromino || !nextTetrominoType) return;

    const gridSize = 4;
    const offsetX = Math.floor((gridSize - nextTetromino[0].length) / 2);
    const offsetY = Math.floor((gridSize - nextTetromino.length) / 2);

    for (let i = 0; i < nextTetromino.length; i++) {
        for (let j = 0; j < nextTetromino[i].length; j++) {
            if (nextTetromino[i][j]) {
                const index = (i + offsetY) * gridSize + (j + offsetX);
                const cell = cells[index];
                if (cell) {
                    cell.style.backgroundColor = COLORS[nextTetrominoType];
                    cell.classList.add('tetromino');
                }
            }
        }
    }
}

function hardDrop() {
  while (!checkCollision(currentPosition.x, currentPosition.y + 1, currentTetromino)) {
    currentPosition.y++;
  }
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
       
        if (e.key === 'Enter') {
            console.log('Enter key pressed - preventing default');
            e.preventDefault();
            e.stopPropagation();
            handleScoreSubmit(e);
        }
    });
    
 
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
    gameState = 'highscores';
    saveGameState('highscores');
    
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

// Update showHighScores to maintain visibility
function showHighScores(scores) {
    if (scores && scores !== 'error') {
        localStorage.setItem('lastScores', JSON.stringify(scores));
    }
    
    if (!scores && localStorage.getItem('lastScores')) {
        scores = JSON.parse(localStorage.getItem('lastScores'));
    }
    
    // Save the current game state as 'highscores'
    gameState = 'highscores';
    saveGameState('highscores');
    
    // Loading state
    if (scores === null) {
        overlay.innerHTML = `
            <div class="overlay-content high-scores">
                <h2>High Scores</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading scores...</p>
                    <button class="game-button" onclick="quitGame()">Back to Menu</button>
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
                    <button class="game-button" onclick="quitGame()">Back to Menu</button>
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
  
  // Reset piece position and spawn new piece
  currentPosition = { 
    x: Math.floor(BOARD_WIDTH / 2) - 1, 
    y: 0 
  };
  
  // Force a complete board redraw
  dirtyBoard = true;
  dirtyPiece = true;
  updateBoardEfficient();
  
  // Spawn a new piece
  spawnTetromino();
  
  // Save current game state
  saveGameState('playing');
  
  // Restart game interval and loop
  gameInterval = setInterval(updateTime, 1000);
  lastDropTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// 4. Use a virtual board for calculations
const virtualBoard = {
  cells: new Array(BOARD_HEIGHT * BOARD_WIDTH),
  update(x, y, value) {
    const index = y * BOARD_WIDTH + x;
    if (this.cells[index] !== value) {
      this.cells[index] = value;
      return true;
    }
    return false;
  }
};

// 8. Use constants for piece types
const PIECE_TYPES = Object.freeze({
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7
});

// 9. Pre-calculate collision checks
const COLLISION_MAPS = {};
Object.entries(TETROMINOES).forEach(([type, shape]) => {
  COLLISION_MAPS[type] = shape.flatMap((row, y) => 
    row.map((cell, x) => cell ? {x, y} : null)
  ).filter(Boolean);
});

// 10. Use event delegation and throttle/debounce
function setupEventListeners() {
  const keyHandlers = {
    ArrowLeft: () => moveTetromino(-1, 0),
    ArrowRight: () => moveTetromino(1, 0),
    ArrowDown: () => hardDrop(),
    ArrowUp: () => rotateTetromino(),
    ' ': () => pauseGame(),
    Escape: () => pauseGame()
  };

  const throttledKeyHandler = throttle((e) => {
    if (gameState !== 'playing') return;
    const handler = keyHandlers[e.key];
    if (handler) handler();
  }, 16); // ~60fps

  document.addEventListener('keydown', throttledKeyHandler);
}

// 11. Throttle helper
function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = performance.now();
    if (now - lastCall >= delay) {
      fn.apply(this, args);
      lastCall = now;
    }
  };
}

// Add the missing setupHighScores function
function setupHighScores() {
    // Initialize high scores if needed
    if (!localStorage.getItem('highScores')) {
        localStorage.setItem('highScores', JSON.stringify([]));
    }
}
