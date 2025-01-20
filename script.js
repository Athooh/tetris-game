document.addEventListener('DOMContentLoaded', () => {
    const gridElement = document.getElementById('grid');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const pauseMenu = document.getElementById('pause-menu');
    const continueButton = document.getElementById('continue');
    const restartButton = document.getElementById('restart');
    const startButton = document.getElementById('start');
  
    const rows = 20;
    const cols = 10;
    let grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    let currentTetromino;
    let currentPosition;
    let score = 0;
    let isPaused = false;
    let gameInterval;
    let startTime;
    let timerInterval;
    let animationId;
    let lastDropTime = 0;
    const DROP_INTERVAL = 1000; // 1 second between drops
  
    const keyState = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowDown: false
    };
  
    // Define tetrominoes
    const tetrominoes = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]]
    };
  
    // Sound effects
    const sounds = {
        move: new Audio('./sounds/move.mp3'),
        rotate: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
        drop: new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'),
        clearLine: new Audio('https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3'),
        gameOver: new Audio('https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3')
    };
  
    // Set volume for all sounds
    let soundsLoaded = 0;
    const totalSounds = Object.keys(sounds).length;
  
    Object.values(sounds).forEach(sound => {
        sound.volume = 0.3;
        sound.addEventListener('canplaythrough', () => {
            soundsLoaded++;
            if (soundsLoaded === totalSounds) {
                startButton.classList.remove('loading');
                startButton.disabled = false;
            }
        });
        sound.addEventListener('error', (e) => {
            console.error('Error loading sound:', e);
            // Continue without sound rather than blocking game
            soundsLoaded++;
            if (soundsLoaded === totalSounds) {
                startButton.classList.remove('loading');
                startButton.disabled = false;
            }
        });
    });
  
    // Add after the initial variables
    const COLORS = {
        I: '#00f0f0',
        O: '#f0f000',
        T: '#a000f0',
        S: '#00f000',
        Z: '#f00000',
        J: '#0000f0',
        L: '#f0a000',
        empty: '#444444',
        ghost: '#666666'
    };
  
    let currentTetrominoType = null;
    const cellCache = new Map(); // Cache for cell states
  
    // Add this with the other initial variables (around line 21)
    let lives = 3;
  
    // Initialize the grid
    function initializeGrid() {
      const gridElement = document.getElementById('grid');
      gridElement.innerHTML = ''; // Clear the SVG grid
    
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', col * 30); // x position
          rect.setAttribute('y', row * 30); // y position
          rect.setAttribute('width', 30);   // width of each cell
          rect.setAttribute('height', 30);  // height of each cell
          rect.setAttribute('fill', COLORS.empty); // Default color
          rect.setAttribute('stroke', '#000'); // Border color
          rect.setAttribute('stroke-width', '1'); // Border width
          gridElement.appendChild(rect);
        }
      }
    }


     // Start the game
     function startGame() {
      console.log('Game started');
      if (lives === 3) {
          // Only reset score when starting a fresh game
          score = 0;
          scoreElement.textContent = `Score: ${score}`;
      }
      initializeGrid();
      lastDropTime = performance.now();
      startTime = new Date().getTime();
      timerInterval = setInterval(updateTimer, 1000);
      spawnTetromino();
      gameLoop(performance.now());
      startButton.style.display = 'none';
    }
  
    // Pause the game
    function pauseGame() {
      isPaused = true;
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      pauseMenu.style.display = 'block';
    }
  
    // Continue the game
    function continueGame() {
      isPaused = false;
      pauseMenu.style.display = 'none';
      timerInterval = setInterval(updateTimer, 1000);
      lastDropTime = performance.now();
      gameLoop(performance.now());
    }
  
    // Restart the game
    function restartGame() {
      // Clear all intervals and animation frames
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      
      // Reset game state
      grid = Array.from({ length: rows }, () => Array(cols).fill(0));
      score = 0;
      isPaused = false;
      currentTetromino = null;
      currentTetrominoType = null;
      cellCache.clear();

      // Reset keyState
      keyState.ArrowLeft = false;
      keyState.ArrowRight = false;
      keyState.ArrowDown = false;
      
      // Reset UI
      scoreElement.textContent = `Score: ${score}`;
      timerElement.textContent = 'Time: 00:00';
      pauseMenu.style.display = 'none';
      
      // Start fresh game
      startTime = new Date().getTime();
      lastDropTime = performance.now();
      
      // Initialize and start
      initializeGrid();
      spawnTetromino();
      gameLoop(performance.now());
    }
  
    // Event listeners
    document.addEventListener('keydown', (event) => {
        if (event.repeat) return; // Prevent key repeat
        
        switch(event.key) {
            case 'ArrowLeft':
                moveTetromino(-1, 0);
                break;
            case 'ArrowRight':
                moveTetromino(1, 0);
                break;
            case 'ArrowDown':
                keyState.ArrowDown = true;
                break;
            case 'ArrowUp':
                rotateTetromino();
                break;
            case ' ':
                pauseGame();
                break;
        }
    });
  
    document.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowDown') {
            keyState.ArrowDown = false;
        }
    });
  
    startButton.addEventListener('click', () => {
      console.log('Start button clicked'); // Debugging statement
      startGame();
    });
  
    continueButton.addEventListener('click', continueGame);
    restartButton.addEventListener('click', restartGame);
  
    function updateTimer() {
      if (!startTime || isPaused) return;
      
      const currentTime = new Date().getTime();
      const elapsedTime = new Date(currentTime - startTime);
      const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
      const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
      timerElement.textContent = `Time: ${minutes}:${seconds}`;
    }
  
    function playSound(soundName) {
        if (sounds[soundName]) {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(error => {
                console.log('Sound play failed:', error);
                // Continue game without sound
            });
        }
    }
  
    // Add ghost piece calculation
    function calculateGhostPosition() {
        if (!currentTetromino) return null;
        
        let ghostY = currentPosition.y;
        while (!checkCollision(currentPosition.x, ghostY + 1, currentTetromino)) {
            ghostY++;
        }
        
        return { x: currentPosition.x, y: ghostY };
    }
  
  
    // Spawn a new tetromino
    function spawnTetromino() {
      const shapes = Object.keys(tetrominoes);
      currentTetrominoType = shapes[Math.floor(Math.random() * shapes.length)];
      currentTetromino = tetrominoes[currentTetrominoType];
      currentPosition = { x: Math.floor(cols / 2) - 1, y: 0 };
      
      if (checkCollision(currentPosition.x, currentPosition.y, currentTetromino)) {
        gameOver();
      }
    }
  
    // Move tetromino
    function moveTetromino(dx, dy) {
      const newX = currentPosition.x + dx;
      const newY = currentPosition.y + dy;
      if (!checkCollision(newX, newY, currentTetromino)) {
        currentPosition.x = newX;
        currentPosition.y = newY;
        if (dx !== 0) playSound('move');
        render();
      } else if (dy === 1) {
        placeTetromino();
        playSound('drop');
        clearLines();
        spawnTetromino();
      }
    }
  
    // Rotate tetromino
    function rotateTetromino() {
      const rotated = currentTetromino[0].map((_, i) =>
        currentTetromino.map(row => row[i]).reverse()
      );
      if (!checkCollision(currentPosition.x, currentPosition.y, rotated)) {
        currentTetromino = rotated;
        playSound('rotate');
        render();
      }
    }
  
    // Check for collision
    function checkCollision(x, y, tetromino) {
      for (let row = 0; row < tetromino.length; row++) {
        for (let col = 0; col < tetromino[row].length; col++) {
          if (tetromino[row][col]) {
            const newX = x + col;
            const newY = y + row;
            if (newX < 0 || newX >= cols || newY >= rows || (newY >= 0 && grid[newY][newX])) {
              return true; // Collision detected
            }
          }
        }
      }
      return false; // No collision
    }
  
    // Place tetromino on the grid
    function placeTetromino() {
      for (let row = 0; row < currentTetromino.length; row++) {
        for (let col = 0; col < currentTetromino[row].length; col++) {
          if (currentTetromino[row][col]) {
            grid[currentPosition.y + row][currentPosition.x + col] = currentTetrominoType;
          }
        }
      }
    }
  
    // Clear completed lines
    function clearLines() {
      let linesCleared = 0;
    
      // Iterate from the bottom to the top
      for (let row = rows - 1; row >= 0; row--) {
        if (grid[row].every(cell => cell !== 0)) {
          // Remove the completed line
          grid.splice(row, 1);
          // Add a new empty line at the top
          grid.unshift(Array(cols).fill(0));
          linesCleared++;
          // Since we removed a row, we need to check the same row index again
          row++;
        }
      }
    
      if (linesCleared > 0) {
        // Update the score based on the number of lines cleared
        score += linesCleared * 10; // 10 points per line
        scoreElement.textContent = `Score: ${score}`;
        playSound('clearLine');
      }
    }
  
    // Render the grid
    function render() {
      const gridElement = document.getElementById('grid');
      const cells = gridElement.children;
      const ghostPosition = calculateGhostPosition();
    
      // Update only cells that changed
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cellIndex = row * cols + col;
          const cell = cells[cellIndex];
          const cacheKey = `${row}-${col}`;
    
          // Determine cell state
          let newColor = COLORS.empty;
    
          // Check if part of current tetromino
          if (currentTetromino &&
              row >= currentPosition.y &&
              row < currentPosition.y + currentTetromino.length &&
              col >= currentPosition.x &&
              col < currentPosition.x + currentTetromino[0].length &&
              currentTetromino[row - currentPosition.y][col - currentPosition.x]) {
            newColor = COLORS[currentTetrominoType];
          }
          // Check if part of ghost piece
          else if (ghostPosition &&
                   row >= ghostPosition.y &&
                   row < ghostPosition.y + currentTetromino.length &&
                   col >= ghostPosition.x &&
                   col < ghostPosition.x + currentTetromino[0].length &&
                   currentTetromino[row - ghostPosition.y][col - ghostPosition.x]) {
            newColor = COLORS.ghost;
          }
          // Check if part of placed pieces
          else if (grid[row][col] !== 0) {
            newColor = COLORS[grid[row][col]];
          }
    
          // Only update DOM if color changed
          if (cellCache.get(cacheKey) !== newColor) {
            cell.setAttribute('fill', newColor);
            cellCache.set(cacheKey, newColor);
          }
        }
      }
    }

    // Game over
    function gameOver() {
      clearInterval(gameInterval);
      clearInterval(timerInterval);
      cancelAnimationFrame(animationId);
      playSound('gameOver');
      
      lives--;
      document.getElementById('lives').textContent = `Lives: ${lives}`;
      
      if (lives <= 0) {
          alert(`Game Over! Final score: ${score}`);
          // Reset lives and start fresh
          lives = 3;
          document.getElementById('lives').textContent = `Lives: ${lives}`;
          resetGameState();
      } else {
          alert(`Life lost! ${lives} lives remaining. Score: ${score}`);
          resetGameState();
      }
    }
  
    // Add this new function to handle game state reset
    function resetGameState() {
        // Reset game state
        grid = Array.from({ length: rows }, () => Array(cols).fill(0));
        isPaused = false;
        currentTetromino = null;
        currentTetrominoType = null;
        cellCache.clear();
        lastDropTime = 0;
        startTime = null;

        // Reset keyState
        keyState.ArrowLeft = false;
        keyState.ArrowRight = false;
        keyState.ArrowDown = false;
            
        // Reset UI
        scoreElement.textContent = `Score: ${score}`; // Keep the score until all lives are lost
        timerElement.textContent = 'Time: 00:00';
        pauseMenu.style.display = 'none';
        startButton.style.display = 'block';
        
        // Clear the grid visually
        initializeGrid();
    }
  
    // Game loop with RequestAnimationFrame
    function gameLoop(timestamp) {
        if (!isPaused) {
            // Handle soft drop (fast fall)
            if (keyState.ArrowDown) {
                moveTetromino(0, 1);
            }
            
            // Auto-drop piece
            if (timestamp - lastDropTime > DROP_INTERVAL) {
                moveTetromino(0, 1);
                lastDropTime = timestamp;
            }
            
            render();
        }
        animationId = requestAnimationFrame(gameLoop);
    }
  
   
    // Update initial button state
    startButton.classList.add('loading');
    startButton.disabled = true;
  });