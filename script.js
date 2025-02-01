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

      this.currentPiece = null;
      this.currentPiecePos = { x: 0, y: 0 };
      this.nextPiece = this.createPiece();

      this.initializeBoard();
      this.setupEventListeners();
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
          this.gameOver = true;
          this.handleGameOver();
      }

      this.renderNextPiece();
  }

  renderNextPiece() {
      this.nextPieceBoard.innerHTML = '';
      this.nextPiece.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value) {
                  const cell = document.createElement('div');
                  cell.className = 'cell';
                  cell.style.backgroundColor = this.nextPiece.color;
                  cell.style.left = `${x * this.CELL_SIZE + 30}px`;
                  cell.style.top = `${y * this.CELL_SIZE + 30}px`;
                  this.nextPieceBoard.appendChild(cell);
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
  }

  handleKeyDown(e) {
      if (this.paused || this.gameOver) return;

      switch (e.code) {
          case 'ArrowLeft':
              this.moveHorizontally(-1);
              break;
          case 'ArrowRight':
              this.moveHorizontally(1);
              break;
          case 'ArrowDown':
              this.moveDown();
              break;
          case 'ArrowUp':
              this.rotate();
              break;
          case 'Space':
              while (this.moveDown());
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
      this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
      this.score = 0;
      this.level = 1;
      this.lines = 0;
      this.gameTime = 0;
      this.dropInterval = 1000;
      this.gameOver = false;
      this.paused = false;
      this.pauseMenu.style.display = 'none';
      this.scoreboard.style.display = 'none';
      this.nextPiece = this.createPiece();
      this.spawnPiece();
      this.updateStats();
      this.lastTime = performance.now();
      requestAnimationFrame(time => this.update(time));
  }

  async handleGameOver() {
      const name = prompt('Game Over! Enter your name:');
      if (name) {
          const score = {
              name,
              score: this.score,
              time: this.timeElement.textContent,
              date: new Date().toISOString()
          };

          try {
              const response = await fetch('http://localhost:8080/api/scores', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(score)
              });

              if (response.ok) {
                  await this.showScoreboard();
              }
          } catch (error) {
              console.error('Error saving score:', error);
          }
      }
  }

  async showScoreboard() {
      try {
          const response = await fetch('http://localhost:8080/api/scores');
          const scores = await response.json();

          const tbody = document.querySelector('#scores-table tbody');
          tbody.innerHTML = '';

          scores.sort((a, b) => b.score - a.score)
              .forEach((score, index) => {
                  const row = document.createElement('tr');
                  row.innerHTML = `
                      <td>${index + 1}</td>
                      <td>${score.name}</td>
                      <td>${score.score}</td>
                      <td>${score.time}</td>
                      <td>${new Date(score.date).toLocaleDateString()}</td>
                  `;
                  tbody.appendChild(row);
              });

          this.scoreboard.style.display = 'block';
      } catch (error) {
          console.error('Error fetching scores:', error);
      }
  }

  render() {
      // Clear the game board
      this.gameBoard.innerHTML = '';

      // Render the fixed pieces
      this.board.forEach((row, y) => {
          row.forEach((color, x) => {
              if (color) {
                  const cell = document.createElement('div');
                  cell.className = 'cell';
                  cell.style.backgroundColor = color;
                  cell.style.left = `${x * this.CELL_SIZE}px`;
                  cell.style.top = `${y * this.CELL_SIZE}px`;
                  this.gameBoard.appendChild(cell);
              }
          });
      });

      // Render the current piece
      if (this.currentPiece) {
          this.currentPiece.shape.forEach((row, y) => {
              row.forEach((value, x) => {
                  if (value) {
                      const cell = document.createElement('div');
                      cell.className = 'cell';
                      cell.style.backgroundColor = this.currentPiece.color;
                      cell.style.left = `${(x + this.currentPiecePos.x) * this.CELL_SIZE}px`;
                      cell.style.top = `${(y + this.currentPiecePos.y) * this.CELL_SIZE}px`;
                      this.gameBoard.appendChild(cell);
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

      this.render();
      requestAnimationFrame(time => this.update(time));
  }
}

// Start the game
window.onload = () => {
  const game = new Tetris();
};