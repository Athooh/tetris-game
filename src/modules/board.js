import { BOARD_WIDTH, BOARD_HEIGHT, COLORS } from '../constants/gameConstants.js';
import { getBoardChanged, setBoardChanged } from './gameState.js';

export function initializeBoard() {
  const gameBoard = document.getElementById('game-board');
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

export function createGridLines() {
  const svg = document.querySelector('.grid-overlay');
  const cellSize = 32;
  const width = BOARD_WIDTH * cellSize;
  const height = BOARD_HEIGHT * cellSize;
  
  const svgContent = document.createElementNS('http://www.w3.org/2000/svg', 'g');
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
  svg.innerHTML = '';
  svg.appendChild(svgContent);
}

export function updateBoard(board, tetromino, position, offset, tetrominoType, colors) {
  console.log('UpdateBoard called with:', {
    tetrominoType,
    colors,
    position,
    tetromino
  });

  const cells = document.getElementById('game-board').getElementsByClassName('cell');
  
  // Clear the board first
  for (let i = 0; i < BOARD_HEIGHT; i++) {
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const cell = cells[i * BOARD_WIDTH + j];
      const value = board[i][j];
      const color = value ? colors[value] : 'transparent';
      console.log(`Cell (${i},${j}): value=${value}, color=${color}`);
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
  if (tetromino && position) {
    const offsetY = Math.round(offset * 32);
    for (let i = 0; i < tetromino.length; i++) {
      for (let j = 0; j < tetromino[i].length; j++) {
        if (tetromino[i][j]) {
          const y = position.y + i;
          const x = position.x + j;
          if (y >= 0) {
            const cell = cells[y * BOARD_WIDTH + x];
            const color = colors[tetrominoType];
            console.log(`Tetromino cell (${y},${x}): type=${tetrominoType}, color=${color}`);
            cell.style.backgroundColor = color;
            cell.classList.add('tetromino');
            cell.style.transform = `translateY(${offsetY}px)`;
          }
        }
      }
    }
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

export function updateBoardEfficient(board, currentTetromino, currentPosition, currentOffset, currentTetrominoType) {
    const cells = document.getElementById('game-board').getElementsByClassName('cell');
    
    // Use requestAnimationFrame for board updates
    requestAnimationFrame(() => {
        // Only update placed pieces if board changed
        if (getBoardChanged()) {
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
            
            setBoardChanged(false);
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