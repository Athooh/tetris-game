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

// DOM Elements
const gameBoard = document.getElementById('game-board');
const overlay = document.getElementById('game-overlay');
const startButton = document.getElementById('start-button');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const timeElement = document.getElementById('time');

// Add this debug logging utility at the top of your file
const DEBUG = {
    log: function(message) {
        const timestamp = new Date().toISOString();
        const log = `${timestamp}: ${message}`;
        
        // Get existing logs
        let logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        logs.push(log);
        
        // Keep only last 50 logs
        if (logs.length > 50) {
            logs = logs.slice(-50);
        }
        
        // Save logs
        localStorage.setItem('debugLogs', JSON.stringify(logs));
        console.log(message);
    },
    
    clear: function() {
        localStorage.removeItem('debugLogs');
    },
    
    show: function() {
        const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        console.log('=== DEBUG LOGS ===');
        logs.forEach(log => console.log(log));
        console.log('================');
    }
};

// Add state management functions
function setGameState(newState) {
    DEBUG.log(`Setting gameState from '${gameState}' to '${newState}'`);
    gameState = newState;
}

function saveGameState(state) {
    DEBUG.log(`Saving game state: ${state}`);
    localStorage.setItem('gameState', state);
}

function loadGameState() {
    const state = localStorage.getItem('gameState') || 'start';
    DEBUG.log(`Loading game state: ${state}`);
    return state;
}

function clearGameState() {
    DEBUG.log('Clearing game state');
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
      cell.classList.remove('tetromino', 'ghost', 'placed');
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
  
  // Draw ghost piece last
  const ghostPos = getGhostPosition();
  if (ghostPos && currentTetromino) {
    for (let i = 0; i < currentTetromino.length; i++) {
      for (let j = 0; j < currentTetromino[i].length; j++) {
        if (currentTetromino[i][j]) {
          const y = ghostPos.y + i;
          const x = ghostPos.x + j;
          if (y >= 0) {
            const cell = cells[y * BOARD_WIDTH + x];
            cell.classList.add('ghost');
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
    DEBUG.log('Starting new game');
    clearGameState();
    if (gameState === 'highscores' || gameState === 'start' || gameState === 'over') {
        // Allow starting game from high scores screen, initial start, or after game over
        console.log('Game starting...');
        gameState = 'playing';
        startTime = new Date();
        overlay.style.display = 'none';
        
        // Reset game state but keep the selected level
        score = 0;
        lives = 3;
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
        
        // Reset lines counter when starting new game
        window.linesForCurrentLevel = 0;
        
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
      <button class="game-button" onclick="resumeGame()">Continue</button>
      <button class="game-button" onclick="startGame()" style="margin: 1rem;">Restart</button>
      <button class="game-button" onclick="quitGame()" style="background: var(--destructive);">Quit</button>
    </div>
  `;
  
  overlay.innerHTML = pauseContent;
  overlay.style.display = 'flex';
}

// Resume Game
function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  overlay.style.display = 'none';
  gameInterval = setInterval(updateTime, 1000);
}

// Quit Game
function quitGame() {
    DEBUG.log('Quitting game');
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
    DEBUG.log('Page loaded - Initializing game');
    DEBUG.show();
    
    const savedState = loadGameState();
    DEBUG.log(`Loaded saved state: ${savedState}`);
    
    setGameState('start'); // Explicitly set initial game state
    initializeBoard();
    updateLives();
    
    // Handle different states
    switch (savedState) {
        case 'highscores':
            DEBUG.log('Restoring high scores display');
            showHighScores(null); // This will load scores from localStorage
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
    const shapes = Object.keys(TETROMINOES);
    nextTetrominoType = shapes[Math.floor(Math.random() * shapes.length)];
    nextTetromino = TETROMINOES[nextTetrominoType];
  }
  
  currentTetrominoType = nextTetrominoType;
  currentTetromino = nextTetromino;
  
  const shapes = Object.keys(TETROMINOES);
  nextTetrominoType = shapes[Math.floor(Math.random() * shapes.length)];
  nextTetromino = TETROMINOES[nextTetrominoType];
  
  currentPosition = { 
    x: Math.floor(BOARD_WIDTH / 2) - 1, 
    y: 0 
  };
  
  updateNextTetrominoDisplay();
  
  if (checkCollision(currentPosition.x, currentPosition.y, currentTetromino)) {
    gameOver();
  }
}

function checkCollision(x, y, tetromino) {
  for (let row = 0; row < tetromino.length; row++) {
    for (let col = 0; col < tetromino[row].length; col++) {
      if (tetromino[row][col]) {
        const newX = x + col;
        const newY = y + row;
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || 
            (newY >= 0 && board[newY][newX])) {
          return true;
        }
      }
    }
  }
  return false;
}

function moveTetromino(dx, dy) {
  const newX = currentPosition.x + dx;
  const newY = currentPosition.y + dy;
  if (!checkCollision(newX, newY, currentTetromino)) {
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
    if (!clearLines()) {
      spawnTetromino();
    }
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

function placeTetromino() {
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
    
    // Add animation to clearing cells
    linesToClear.forEach(row => {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cell = cells[row * BOARD_WIDTH + col];
        cell.classList.add('clearing');
        // Clear the board immediately to prevent ghost pieces
        board[row][col] = 0;
      }
    });

    // Wait for animation to complete before updating board
    setTimeout(() => {
      linesToClear.forEach(row => {
        board.splice(row, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
      });
      
      // Update score and level
      score += linesCleared * 100;
      updateLevel(linesCleared);
      
      scoreElement.textContent = score.toString().padStart(6, '0');
      updateBoard();
    }, 300);

    return true;
  }
  return false;
}

// Add new function to handle level updates
function updateLevel(linesCleared) {
  if (level === 10 && linesCleared > 0) {
    gameState = 'completed';
    clearInterval(gameInterval);
    showScoreSubmission();
    return;
  }
  // Track total lines cleared for this level
  if (!window.linesForCurrentLevel) {
    window.linesForCurrentLevel = 0;
  }
  window.linesForCurrentLevel += linesCleared;

  if (level === 10 && linesCleared >= 10) {
    // Show congratulations message
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
    return;
  }

  // Level up after clearing 10 lines
  if (window.linesForCurrentLevel >= 10 && level < 10) {
    level = Math.min(10, level + 1);
    window.linesForCurrentLevel = 0; // Reset lines for next level
    levelElement.textContent = level.toString();
    // Update drop interval based on level
    DROP_INTERVAL = Math.max(100, 1000 - (level - 1) * 100);
    updateVisibility();
  }
}

// Add new function to handle visibility changes
function updateVisibility() {
  // Make elements completely invisible at level 10
  const ghostOpacity = level === 10 ? 0 : Math.max(0.1, 1 - (level - 1) * 0.12);
  const nextOpacity = level === 10 ? 0 : Math.max(0.1, 1 - (level - 1) * 0.12);
  
  document.documentElement.style.setProperty('--ghost-opacity', ghostOpacity.toString());
  document.documentElement.style.setProperty('--next-piece-opacity', nextOpacity.toString());
}

function gameLoop(timestamp) {
  if (gameState === 'playing') {
    const deltaTime = timestamp - lastDropTime;
    
    // Simple linear interpolation without any easing
    currentOffset = deltaTime / DROP_INTERVAL;
    
    if (deltaTime >= DROP_INTERVAL) {
      currentOffset = 0;
      moveTetromino(0, 1);
      lastDropTime = timestamp;
    }
    
    updateBoard();
    animationId = requestAnimationFrame(gameLoop);
  }
}

function createGridLines() {
  const svg = document.querySelector('.grid-overlay');
  const cellSize = 32; // 2rem = 32px
  const width = BOARD_WIDTH * cellSize;
  const height = BOARD_HEIGHT * cellSize;
  
  // Set SVG dimensions explicitly
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  
  // Create vertical lines
  for (let i = 0; i <= BOARD_WIDTH; i++) {
    const x = i * cellSize;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    line.setAttribute('stroke', '#1a1a1a');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }
  
  // Create horizontal lines
  for (let i = 0; i <= BOARD_HEIGHT; i++) {
    const y = i * cellSize;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#1a1a1a');
    line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  }
  
  // Add border rectangle
  const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  border.setAttribute('x', '0');
  border.setAttribute('y', '0');
  border.setAttribute('width', width);
  border.setAttribute('height', height);
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', '#1a1a1a');
  border.setAttribute('stroke-width', '1');
  svg.appendChild(border);
}

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

function getGhostPosition() {
  if (!currentTetromino) return null;
  
  let ghostY = currentPosition.y;
  while (!checkCollision(currentPosition.x, ghostY + 1, currentTetromino)) {
    ghostY++;
  }
  
  return {
    x: currentPosition.x,
    y: ghostY
  };
}

function hardDrop() {
  const ghostPos = getGhostPosition();
  if (ghostPos) {
    currentOffset = 0;
    currentPosition.y = ghostPos.y;
    placeTetromino();
    if (!clearLines()) {
      spawnTetromino();
    }
  }
}

// Add new function to set starting level
function setStartLevel(selectedLevel) {
  level = selectedLevel;
  window.linesForCurrentLevel = 0;  // Reset lines counter when changing level
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
    DEBUG.log('handleScoreSubmit: Starting');
    // Ensure we have the event object and prevent any form submission
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        DEBUG.log('Prevented all event propagation');
    }
    
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();
    
    DEBUG.log(`handleScoreSubmit: Name entered: ${name}`);
    
    if (name) {
        const submitBtn = document.getElementById('submitScoreBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        DEBUG.log('handleScoreSubmit: Removing submission overlay');
        const submissionOverlay = document.querySelector('.score-submission');
        if (submissionOverlay) {
            submissionOverlay.parentElement.remove();
        }
        
        DEBUG.log('handleScoreSubmit: Showing loading state');
        showHighScores(null);
        
        DEBUG.log('handleScoreSubmit: Submitting score');
        // Wrap the submitScore call in a try-catch to prevent any unhandled rejections
        try {
            submitScore(name, score, timeElement.textContent)
                .catch(error => {
                    DEBUG.log(`Score submission failed: ${error.message}`);
                });
        } catch (error) {
            DEBUG.log(`Error in score submission: ${error.message}`);
        }
    } else {
        DEBUG.log('handleScoreSubmit: No name entered');
        nameInput.classList.add('error');
        setTimeout(() => nameInput.classList.remove('error'), 1000);
    }
    
    // Return false and prevent default one more time
    if (event) {
        event.preventDefault();
    }
    return false;
}

async function submitScore(name, score, time) {
    DEBUG.log(`submitScore: Starting with: ${JSON.stringify({ name, score, time })}`);
    try {
        DEBUG.log('submitScore: Sending request to server');
        const response = await fetch('http://localhost:8080/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, score, time })
        });
        
        DEBUG.log(`submitScore: Server response status: ${response.status}`);
        
        if (response.ok) {
            const scores = await response.json();
            DEBUG.log('submitScore: Received scores from server');
            // Wrap the showHighScores call in a setTimeout to ensure it runs after current execution
            setTimeout(() => {
                showHighScores(scores);
                DEBUG.log('Score display updated');
            }, 0);
        } else {
            throw new Error('Failed to submit score');
        }
    } catch (error) {
        DEBUG.log(`submitScore: Error occurred: ${error.message}`);
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
    DEBUG.log(`showHighScores called with scores: ${JSON.stringify(scores)}`);
    
    // Save the scores if they exist
    if (scores && scores !== 'error') {
        localStorage.setItem('lastScores', JSON.stringify(scores));
    }
    
    // Load scores from localStorage if none provided
    if (!scores && localStorage.getItem('lastScores')) {
        scores = JSON.parse(localStorage.getItem('lastScores'));
    }
    
    saveGameState('highscores');
    
    // Loading state
    if (scores === null) {
        DEBUG.log('Showing loading state');
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
        DEBUG.log('Showing error state');
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
    DEBUG.log('Showing scores display');
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
    
    DEBUG.log(`Final gameState: ${gameState}`);
}

function showStartOverlay() {
    DEBUG.log(`showStartOverlay called with gameState: ${gameState}`);
    
    if (gameState !== 'highscores' && gameState !== 'paused') {
        DEBUG.log('Showing start overlay');
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
    } else {
        DEBUG.log(`Not showing start overlay because gameState is: ${gameState}`);
    }
}