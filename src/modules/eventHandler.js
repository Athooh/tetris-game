import { getGameState, setGameState } from './gameState.js';
import { moveTetromino, rotateTetromino, hardDrop } from './tetrominoController.js';
import { pauseGame } from './gameController.js';

export function initializeEventListeners() {
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('blur', handleWindowBlur);
}

function handleKeyPress(e) {
    const state = getGameState();
    if (state.gameState !== 'playing') return;
    
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
        case 'Escape':
            pauseGame();
            break;
    }
}

function handleWindowBlur() {
    const state = getGameState();
    if (state.gameState === 'playing') {
        pauseGame();
    }
}

export function removeEventListeners() {
    document.removeEventListener('keydown', handleKeyPress);
    window.removeEventListener('blur', handleWindowBlur);
} 