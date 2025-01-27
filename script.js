document.addEventListener('DOMContentLoaded', () => {
  const gridElement = document.getElementById('grid');
  const scoreElement = document.getElementById('score');
  const timerElement = document.getElementById('timer');
  const pauseMenu = document.getElementById('pause-menu');
  const continueButton = document.getElementById('continue');
  const restartButton = document.getElementById('restart');
  const startButton = document.getElementById('start');
  const pauseButton = document.getElementById('pause');

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

  const tetrominoes = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]]
  };

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
  const cellCache = new Map();

  let lives = 3;

  function initializeGrid() {
      gridElement.innerHTML = '';
      for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', col * 30);
              rect.setAttribute('y', row * 30);
              rect.setAttribute('width', 30);
              rect.setAttribute('height', 30);
              rect.setAttribute('fill', COLORS.empty);
              rect.setAttribute('stroke', '#000');
              rect.setAttribute('stroke-width', '1');
              gridElement.appendChild(rect);
          }
      }
  }

  function startGame() {
      if (lives === 3) {
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
      pauseButton.style.display = 'inline-block';
  }

  function pauseGame() {
      isPaused = true;
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      pauseMenu.style.display = 'block';
  }

  function continueGame() {
      isPaused = false;
      pauseMenu.style.display = 'none';
      timerInterval = setInterval(updateTimer, 1000);
      lastDropTime = performance.now();
      gameLoop(performance.now());
  }

  function restartGame() {
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      grid = Array.from({ length: rows }, () => Array(cols).fill(0));
      score = 0;
      isPaused = false;
      currentTetromino = null;
      currentTetrominoType = null;
      cellCache.clear();
      keyState.ArrowLeft = false;
      keyState.ArrowRight = false;
      keyState.ArrowDown = false;
      scoreElement.textContent = `Score: ${score}`;
      timerElement.textContent = 'Time: 00:00';
      pauseMenu.style.display = 'none';
      startTime = new Date().getTime();
      lastDropTime = performance.now();
      initializeGrid();
      spawnTetromino();
      gameLoop(performance.now());
  }

  document.addEventListener('keydown', (event) => {
      if (event.repeat) return;
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

  startButton.addEventListener('click', startGame);
  continueButton.addEventListener('click', continueGame);
  restartButton.addEventListener('click', restartGame);
  pauseButton.addEventListener('click', pauseGame);

  function updateTimer() {
      if (!startTime || isPaused) return;
      const currentTime = new Date().getTime();
      const elapsedTime = new Date(currentTime - startTime);
      const minutes = elapsedTime.getMinutes().toString().padStart(2, '0');
      const seconds = elapsedTime.getSeconds().toString().padStart(2, '0');
      timerElement.textContent = `Time: ${minutes}:${seconds}`;
  }

  function spawnTetromino() {
      const shapes = Object.keys(tetrominoes);
      currentTetrominoType = shapes[Math.floor(Math.random() * shapes.length)];
      currentTetromino = tetrominoes[currentTetrominoType];
      currentPosition = { x: Math.floor(cols / 2) - 1, y: 0 };
      if (checkCollision(currentPosition.x, currentPosition.y, currentTetromino)) {
          gameOver();
      }
  }

  function moveTetromino(dx, dy) {
      const newX = currentPosition.x + dx;
      const newY = currentPosition.y + dy;
      if (!checkCollision(newX, newY, currentTetromino)) {
          currentPosition.x = newX;
          currentPosition.y = newY;
          render();
      } else if (dy === 1) {
          placeTetromino();
          clearLines();
          spawnTetromino();
      }
  }

  function rotateTetromino() {
      const rotated = currentTetromino[0].map((_, i) =>
          currentTetromino.map(row => row[i]).reverse()
      );
      if (!checkCollision(currentPosition.x, currentPosition.y, rotated)) {
          currentTetromino = rotated;
          render();
      }
  }

  function checkCollision(x, y, tetromino) {
      for (let row = 0; row < tetromino.length; row++) {
          for (let col = 0; col < tetromino[row].length; col++) {
              if (tetromino[row][col]) {
                  const newX = x + col;
                  const newY = y + row;
                  if (newX < 0 || newX >= cols || newY >= rows || (newY >= 0 && grid[newY][newX])) {
                      return true;
                  }
              }
          }
      }
      return false;
  }

  function placeTetromino() {
      for (let row = 0; row < currentTetromino.length; row++) {
          for (let col = 0; col < currentTetromino[row].length; col++) {
              if (currentTetromino[row][col]) {
                  grid[currentPosition.y + row][currentPosition.x + col] = currentTetrominoType;
              }
          }
      }
  }

  function clearLines() {
      let linesCleared = 0;
      for (let row = rows - 1; row >= 0; row--) {
          if (grid[row].every(cell => cell !== 0)) {
              grid.splice(row, 1);
              grid.unshift(Array(cols).fill(0));
              linesCleared++;
              row++;
          }
      }
      if (linesCleared > 0) {
          score += linesCleared * 10;
          scoreElement.textContent = `Score: ${score}`;
      }
  }

  function render() {
      const cells = gridElement.children;
      const ghostPosition = calculateGhostPosition();
      for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
              const cellIndex = row * cols + col;
              const cell = cells[cellIndex];
              const cacheKey = `${row}-${col}`;
              let newColor = COLORS.empty;
              if (currentTetromino &&
                  row >= currentPosition.y &&
                  row < currentPosition.y + currentTetromino.length &&
                  col >= currentPosition.x &&
                  col < currentPosition.x + currentTetromino[0].length &&
                  currentTetromino[row - currentPosition.y][col - currentPosition.x]) {
                  newColor = COLORS[currentTetrominoType];
              } else if (ghostPosition &&
                         row >= ghostPosition.y &&
                         row < ghostPosition.y + currentTetromino.length &&
                         col >= ghostPosition.x &&
                         col < ghostPosition.x + currentTetromino[0].length &&
                         currentTetromino[row - ghostPosition.y][col - ghostPosition.x]) {
                  newColor = COLORS.ghost;
              } else if (grid[row][col] !== 0) {
                  newColor = COLORS[grid[row][col]];
              }
              if (cellCache.get(cacheKey) !== newColor) {
                  cell.setAttribute('fill', newColor);
                  cellCache.set(cacheKey, newColor);
              }
          }
      }
  }

  function calculateGhostPosition() {
      if (!currentTetromino) return null;
      let ghostY = currentPosition.y;
      while (!checkCollision(currentPosition.x, ghostY + 1, currentTetromino)) {
          ghostY++;
      }
      return { x: currentPosition.x, y: ghostY };
  }

  function gameOver() {
      clearInterval(gameInterval);
      clearInterval(timerInterval);
      cancelAnimationFrame(animationId);
      lives--;
      document.getElementById('lives').textContent = `Lives: ${lives}`;
      if (lives <= 0) {
          alert(`Game Over! Final score: ${score}`);
          lives = 3;
          document.getElementById('lives').textContent = `Lives: ${lives}`;
          resetGameState();
      } else {
          alert(`Life lost! ${lives} lives remaining. Score: ${score}`);
          resetGameState();
      }
  }

  function resetGameState() {
      grid = Array.from({ length: rows }, () => Array(cols).fill(0));
      isPaused = false;
      currentTetromino = null;
      currentTetrominoType = null;
      cellCache.clear();
      lastDropTime = 0;
      startTime = null;
      keyState.ArrowLeft = false;
      keyState.ArrowRight = false;
      keyState.ArrowDown = false;
      scoreElement.textContent = `Score: ${score}`;
      timerElement.textContent = 'Time: 00:00';
      pauseMenu.style.display = 'none';
      startButton.style.display = 'block';
      pauseButton.style.display = 'none';
      initializeGrid();
  }

  function gameLoop(timestamp) {
      if (!isPaused) {
          if (keyState.ArrowDown) {
              moveTetromino(0, 1);
          }
          if (timestamp - lastDropTime > DROP_INTERVAL) {
              moveTetromino(0, 1);
              lastDropTime = timestamp;
          }
          render();
      }
      animationId = requestAnimationFrame(gameLoop);
  }

  startButton.disabled = false; // Ensure the start button is enabled
});
