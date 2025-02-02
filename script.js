class Tetris {
  constructor() {
      this.BOARD_WIDTH = 10;
      this.BOARD_HEIGHT = 20;
      this.CELL_SIZE = 30;
      this.COLORS = [
          '#00f0f0', // I - Cyan
          '#0000f0', // J - Blue
          '#f0a000', // L - Orange
          '#f0f000', // O - Yellow
          '#00f000', // S - Green
          '#a000f0', // T - Purple
          '#f00000'  // Z - Red
      ];
      this.SHAPES = [
          [[1, 1, 1, 1]],                         // I
          [[1, 0, 0], [1, 1, 1]],                // J
          [[0, 0, 1], [1, 1, 1]],                // L
          [[1, 1], [1, 1]],                      // O
          [[0, 1, 1], [1, 1, 0]],                // S
          [[0, 1, 0], [1, 1, 1]],                // T
          [[1, 1, 0], [0, 1, 1]]                 // Z
      ];

      this.gameBoard = document.getElementById('game-board');
      this.nextPieceBoard = document.getElementById('next-piece');
      this.scoreElement = document.getElementById('score');
      this.levelElement = document.getElementById('level');
      this.linesElement = document.getElementById('lines');
      this.timeElement = document.getElementById('time');
      this.pauseMenu = document.getElementById('pause-menu');
      this.scoreboard = document.getElementById('scoreboard');

      this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
      this.score = 0;
      this.level = 1;
      this.lines = 0;
      this.gameTime = 0;
      this.lastTime = 0;
      this.dropCounter = 0;
      this.dropInterval = 1000;
      this.paused = false;
      this.gameOver = false;
      this.lives = 3;
      this.maxLives = 3;

      this.currentPiece = null;
      this.currentPiecePos = { x: 0, y: 0 };
      
      // Initialize nextPiece before anything tries to use it
      this.nextPiece = this.createPiece();

      // Pre-create cell elements pool
      this.cellPool = Array(this.BOARD_WIDTH * this.BOARD_HEIGHT).fill().map(() => {
          const cell = document.createElement('div');
          cell.className = 'cell';
          return cell;
      });
      this.activeCells = new Set();

      // Pre-create next piece cell pool
      this.nextPieceCellPool = Array(4 * 4).fill().map(() => {
          const cell = document.createElement('div');
          cell.className = 'cell';
          return cell;
      });
      this.activeNextPieceCells = new Set();

      // Load saved game state if it exists
      const savedState = localStorage.getItem('tetrisGameState');
      if (savedState) {
          const state = JSON.parse(savedState);
          this.board = state.board;
          this.score = state.score;
          this.level = state.level;
          this.lines = state.lines;
          this.gameTime = state.gameTime;
          this.gameOver = state.gameOver;
          this.lives = state.lives || this.maxLives;
          
          if (this.gameOver) {
              this.showScoreboard();
          }
      }

      this.initializeBoard();
      this.setupEventListeners();
      this.drawGrid();
      
      // Make sure nextPiece is created before spawning the first piece
      if (!this.nextPiece) {
          this.nextPiece = this.createPiece();
      }
      this.spawnPiece();
      this.update();
  }

  initializeBoard() {
      this.gameBoard.style.width = `${this.BOARD_WIDTH * this.CELL_SIZE}px`;
      this.gameBoard.style.height = `${this.BOARD_HEIGHT * this.CELL_SIZE}px`;
  }

  setupEventListeners() {
      document.addEventListener('keydown', (e) => this.handleKeyDown(e));
      document.addEventListener('keyup', (e) => this.handleKeyUp(e));
      
      document.getElementById('pause-button').addEventListener('click', () => this.togglePause());
      document.getElementById('continue-button').addEventListener('click', () => this.togglePause());
      document.getElementById('restart-button').addEventListener('click', () => this.restart());
      document.getElementById('play-again-button').addEventListener('click', () => {
          this.scoreboard.style.display = 'none';
          this.restart();
      });
  }

  createPiece() {
      const pieceIndex = Math.floor(Math.random() * this.SHAPES.length);
      return {
          shape: this.SHAPES[pieceIndex],
          color: this.COLORS[pieceIndex]
      };
  }

  spawnPiece() {
      this.currentPiece = this.nextPiece;
      this.nextPiece = this.createPiece();
      this.currentPiecePos = {
          x: Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
          y: 0
      };

      if (this.checkCollision()) {
          this.lives--;
          if (this.lives <= 0) {
              this.gameOver = true;
              this.handleGameOver();
          } else {
              // Clear the entire board when losing a life
              this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
              // Show life lost message
              const message = `Life lost! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} remaining`;
              alert(message);
              // Try spawning again
              this.currentPiecePos.y = 0;
              if (this.checkCollision()) {
                  this.gameOver = true;
                  this.handleGameOver();
              }
          }
      }

      this.renderNextPiece();
      this.updateStats();
  }

  renderNextPiece() {
      // First, return all active cells to the pool
      this.activeNextPieceCells.forEach(cell => {
          this.nextPieceBoard.removeChild(cell);
          this.nextPieceCellPool.push(cell); // Make sure to return cells to pool
      });
      this.activeNextPieceCells.clear();

      this.nextPiece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value) {
                  // Check if pool is empty
                  if (this.nextPieceCellPool.length === 0) {
                      // Create new cell if pool is empty
                      const cell = document.createElement('div');
                      cell.className = 'cell';
                      this.nextPieceCellPool.push(cell);
                      console.warn('Next piece cell pool was empty, created new cell');
                  }
                  
                  const cell = this.nextPieceCellPool.pop();
                  cell.style.backgroundColor = this.nextPiece.color;
                  cell.style.left = `${x * this.CELL_SIZE + 30}px`;
                  cell.style.top = `${y * this.CELL_SIZE + 30}px`;
                  this.nextPieceBoard.appendChild(cell);
                  this.activeNextPieceCells.add(cell);
              }
          });
      });
  }

  checkCollision() {
      return this.currentPiece.shape.some((row, y) => {
          return row.some((value, x) => {
              if (!value) return false;
              const boardX = this.currentPiecePos.x + x;
              const boardY = this.currentPiecePos.y + y;
              return boardX < 0 || 
                     boardX >= this.BOARD_WIDTH ||
                     boardY >= this.BOARD_HEIGHT ||
                     (boardY >= 0 && this.board[boardY][boardX]);
          });
      });
  }

  rotate() {
      const originalShape = this.currentPiece.shape;
      const rows = originalShape.length;
      const cols = originalShape[0].length;
      
      const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
      
      for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
              rotated[x][rows - 1 - y] = originalShape[y][x];
          }
      }
      
      const originalPiece = this.currentPiece;
      this.currentPiece = { ...originalPiece, shape: rotated };
      
      if (this.checkCollision()) {
          this.currentPiece = originalPiece;
      }
  }

  moveDown() {
      this.currentPiecePos.y++;
      if (this.checkCollision()) {
          this.currentPiecePos.y--;
          this.merge();
          this.clearLines();
          this.spawnPiece();
          return false;
      }
      return true;
  }

  moveHorizontally(dir) {
      this.currentPiecePos.x += dir;
      if (this.checkCollision()) {
          this.currentPiecePos.x -= dir;
          return false;
      }
      return true;
  }

  merge() {
      this.currentPiece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value) {
                  const boardY = y + this.currentPiecePos.y;
                  const boardX = x + this.currentPiecePos.x;
                  if (boardY >= 0) {
                      this.board[boardY][boardX] = this.currentPiece.color;
                  }
              }
          });
      });
  }

  clearLines() {
      let linesCleared = 0;
      
      for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
          if (this.board[y].every(cell => cell !== 0)) {
              this.board.splice(y, 1);
              this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
              linesCleared++;
              y++; // Check the same row again
          }
      }

      if (linesCleared > 0) {
          this.lines += linesCleared;
          this.score += this.calculateScore(linesCleared);
          
          if (this.lines >= this.level * 10) {
              this.level++;
              this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
          }

          this.updateStats();
      }
  }

  calculateScore(linesCleared) {
      const basePoints = [40, 100, 300, 1200]; // Points for 1, 2, 3, 4 lines
      return basePoints[linesCleared - 1] * this.level;
  }

  updateStats() {
      this.scoreElement.textContent = this.score;
      this.levelElement.textContent = this.level;
      this.linesElement.textContent = this.lines;
      
      // Update lives display
      const livesElement = document.getElementById('lives');
      if (livesElement) {
          livesElement.textContent = `${this.lives}/${this.maxLives}`;
      }
  }

  handleKeyDown(e) {
      if (this.gameOver) return;

      switch (e.code) {
          case 'ArrowLeft':
              if (!this.paused) this.moveHorizontally(-1);
              break;
          case 'ArrowRight':
              if (!this.paused) this.moveHorizontally(1);
              break;
          case 'ArrowDown':
              if (!this.paused) this.moveDown();
              break;
          case 'ArrowUp':
              if (!this.paused) this.rotate();
              break;
          case 'Space':
              if (e.target === document.body) {
                  e.preventDefault(); // Prevent page scroll
                  if (!this.paused) {
                      // Hard drop
                      while (this.moveDown());
                  }
              }
              break;
          case 'ShiftLeft':
          case 'ShiftRight':
              this.togglePause();
              break;
      }
  }

  handleKeyUp(e) {
      // Handle key release events if needed
  }

  togglePause() {
      this.paused = !this.paused;
      this.pauseMenu.style.display = this.paused ? 'block' : 'none';
      if (!this.paused) {
          this.lastTime = performance.now();
          requestAnimationFrame(time => this.update(time));
      }
  }

  restart() {
      localStorage.removeItem('tetrisGameState');
      
      this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
      this.score = 0;
      this.level = 1;
      this.lines = 0;
      this.gameTime = 0;
      this.dropInterval = 1000;
      this.gameOver = false;
      this.paused = false;
      this.lives = this.maxLives; // Reset lives
      this.pauseMenu.style.display = 'none';
      this.scoreboard.style.display = 'none';
      this.nextPiece = this.createPiece();
      this.spawnPiece();
      this.updateStats();
      this.lastTime = performance.now();
      requestAnimationFrame(time => this.update(time));
  }

  async handleGameOver() {
      // Check if we already have a saved game state with a name
      const savedState = localStorage.getItem('tetrisGameState');
      if (savedState) {
          const state = JSON.parse(savedState);
          if (state.playerName) {
              // If we already have a name, just show the scoreboard
              await this.showScoreboard();
              return;
          }
      }

      const name = prompt('Game Over! Enter your name:');
      if (name) {
          const score = {
              name,
              score: this.score,
              time: this.timeElement.textContent,
              date: new Date().toISOString()
          };

          // Save game state with player name
          this.saveGameState(name);
          
          try {
              const response = await fetch('http://localhost:8080/api/scores', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(score)
              });
          } catch (error) {
              console.error('Error saving score:', error);
          }
          
          // Show scoreboard regardless of API result
          await this.showScoreboard();
      } else {
          // If user cancels name input, just show the final board state
          await this.showScoreboard();
      }
  }

  async showScoreboard() {
      const SCORES_PER_PAGE = 10;
      let currentPage = 1;
      let filteredScores = [];
      let allScores = [];
      
      // Rebuild the scoreboard HTML structure
      this.scoreboard.innerHTML = `
          <h2>High Scores</h2>
          <div class="scoreboard-controls">
              <input type="text" id="score-search" placeholder="Search by name...">
              <div class="pagination">
                  <button id="prev-page">←</button>
                  <span id="page-info">Page 1 of 1</span>
                  <button id="next-page">→</button>
              </div>
          </div>
          <div id="percentile-info" class="hidden">
              Your score is in the top <span id="percentile">0</span>% of all players!
          </div>
          <table id="scores-table">
              <thead>
                  <tr>
                      <th>Position</th>
                      <th>Name</th>
                      <th>Score</th>
                      <th>Time</th>
                  </tr>
              </thead>
              <tbody></tbody>
          </table>
          <button id="play-again-button">Play Again</button>
          <div id="loading-message">Loading scores...</div>
      `;
      
      this.scoreboard.style.display = 'block';

      try {
          const response = await fetch('http://localhost:8080/api/scores');
          allScores = await response.json();
          filteredScores = [...allScores];

          // Remove loading message
          const loadingMessage = document.getElementById('loading-message');
          if (loadingMessage) {
              loadingMessage.remove();
          }

          // Calculate percentile for current score
          if (this.gameOver) {
              const betterScores = allScores.filter(s => s.score > this.score).length;
              const percentile = Math.round((1 - betterScores / allScores.length) * 100);
              const percentileSpan = document.getElementById('percentile');
              if (percentileSpan) {
                  percentileSpan.textContent = percentile;
                  document.getElementById('percentile-info')?.classList.remove('hidden');
              }
          }

          const renderScores = (scores, page) => {
              const start = (page - 1) * SCORES_PER_PAGE;
              const end = start + SCORES_PER_PAGE;
              const pageScores = scores.slice(start, end);
              
              const tbody = document.querySelector('#scores-table tbody');
              tbody.innerHTML = '';
              
              pageScores.forEach((score, index) => {
                  const position = start + index + 1;
                  const row = document.createElement('tr');
                  if (this.gameOver && score.name === this.playerName && score.score === this.score) {
                      row.classList.add('current-score');
                  }
                  
                  const minutes = Math.floor(parseInt(score.time) / 60);
                  const seconds = parseInt(score.time) % 60;
                  const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  
                  row.innerHTML = `
                      <td>${position}</td>
                      <td>${score.name}</td>
                      <td>${score.score}</td>
                      <td>${timeFormatted}</td>
                  `;
                  tbody.appendChild(row);
              });

              // Update pagination info
              document.getElementById('page-info').textContent = 
                  `Page ${page} of ${Math.ceil(scores.length / SCORES_PER_PAGE)}`;
          };

          // Set up search functionality
          const searchInput = document.getElementById('score-search');
          searchInput.addEventListener('input', (e) => {
              const searchTerm = e.target.value.toLowerCase();
              filteredScores = allScores.filter(score => 
                  score.name.toLowerCase().includes(searchTerm)
              );
              currentPage = 1;
              renderScores(filteredScores, currentPage);
          });

          // Set up pagination
          document.getElementById('prev-page').addEventListener('click', () => {
              if (currentPage > 1) {
                  currentPage--;
                  renderScores(filteredScores, currentPage);
              }
          });

          document.getElementById('next-page').addEventListener('click', () => {
              if (currentPage < Math.ceil(filteredScores.length / SCORES_PER_PAGE)) {
                  currentPage++;
                  renderScores(filteredScores, currentPage);
              }
          });

          // Initial render
          renderScores(filteredScores, currentPage);

      } catch (error) {
          console.error('Error fetching scores:', error);
          this.scoreboard.innerHTML = `
              <div>Error loading scores</div>
              <button id="play-again-button">Play Again</button>
          `;
      }

      // Reattach play again button event listener
      document.getElementById('play-again-button')?.addEventListener('click', () => {
          this.scoreboard.style.display = 'none';
          this.restart();
      });
  }

  render() {
      // First, return all active cells to the pool
      this.activeCells.forEach(cell => {
          this.gameBoard.removeChild(cell);
          this.cellPool.push(cell); // Make sure to return cells to pool
      });
      this.activeCells.clear();

      // Render fixed pieces
      this.board.forEach((row, y) => {
          row.forEach((color, x) => {
              if (color) {
                  // Check if pool is empty
                  if (this.cellPool.length === 0) {
                      // Create new cell if pool is empty
                      const cell = document.createElement('div');
                      cell.className = 'cell';
                      this.cellPool.push(cell);
                      console.warn('Main cell pool was empty, created new cell');
                  }

                  const cell = this.cellPool.pop();
                  cell.style.backgroundColor = color;
                  cell.style.left = `${x * this.CELL_SIZE}px`;
                  cell.style.top = `${y * this.CELL_SIZE}px`;
                  this.gameBoard.appendChild(cell);
                  this.activeCells.add(cell);
              }
          });
      });

      // Render current piece
      if (this.currentPiece) {
          this.currentPiece.shape.forEach((row, y) => {
              row.forEach((value, x) => {
                  if (value) {
                      // Check if pool is empty
                      if (this.cellPool.length === 0) {
                          // Create new cell if pool is empty
                          const cell = document.createElement('div');
                          cell.className = 'cell';
                          this.cellPool.push(cell);
                          console.warn('Main cell pool was empty, created new cell');
                      }

                      const cell = this.cellPool.pop();
                      cell.style.backgroundColor = this.currentPiece.color;
                      cell.style.left = `${(x + this.currentPiecePos.x) * this.CELL_SIZE}px`;
                      cell.style.top = `${(y + this.currentPiecePos.y) * this.CELL_SIZE}px`;
                      this.gameBoard.appendChild(cell);
                      this.activeCells.add(cell);
                  }
              });
          });
      }
  }

  updateTime(deltaTime) {
      if (!this.paused && !this.gameOver) {
          this.gameTime += deltaTime;
          const seconds = Math.floor(this.gameTime / 1000);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          this.timeElement.textContent = 
              `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
  }

  update(time = 0) {
      if (this.gameOver || this.paused) return;

      const deltaTime = time - this.lastTime;
      this.lastTime = time;

      this.updateTime(deltaTime);
      this.dropCounter += deltaTime;

      if (this.dropCounter > this.dropInterval) {
          this.moveDown();
          this.dropCounter = 0;
      }

      // Use requestAnimationFrame more efficiently
      if (!this.animationFrameId) {
          this.animationFrameId = requestAnimationFrame(time => {
              this.animationFrameId = null;
              this.render();
              this.saveGameState();
              this.update(time);
          });
      }
  }

  saveGameState(playerName = null) {
      const gameState = {
          board: this.board,
          score: this.score,
          level: this.level,
          lines: this.lines,
          gameTime: this.gameTime,
          gameOver: this.gameOver,
          playerName: playerName,
          lives: this.lives // Save lives state
      };
      localStorage.setItem('tetrisGameState', JSON.stringify(gameState));
  }

  // Add cleanup method
  cleanup() {
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
      }
      this.cellPool = [];
      this.nextPieceCellPool = [];
      this.activeCells.clear();
      this.activeNextPieceCells.clear();
  }

  drawGrid() {
      const svg = this.gameBoard.querySelector('.grid-overlay');
      
      // Draw vertical lines
      for (let x = 0; x <= this.BOARD_WIDTH; x++) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x * this.CELL_SIZE);
          line.setAttribute('y1', 0);
          line.setAttribute('x2', x * this.CELL_SIZE);
          line.setAttribute('y2', this.BOARD_HEIGHT * this.CELL_SIZE);
          svg.appendChild(line);
      }
      
      // Draw horizontal lines
      for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', 0);
          line.setAttribute('y1', y * this.CELL_SIZE);
          line.setAttribute('x2', this.BOARD_WIDTH * this.CELL_SIZE);
          line.setAttribute('y2', y * this.CELL_SIZE);
          svg.appendChild(line);
      }
  }
}

// Replace the window.onload at the bottom of the file with this:
document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Tetris();
    } catch (error) {
        console.error('Error initializing game:', error);
    }
});