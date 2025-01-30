import { getGameState, setGameState, clearGameState } from './gameState.js';
import { startGameLoop } from './gameLoop.js';
import { generateNextPiece } from './pieceGenerator.js';
import { showStartOverlay } from './uiManager.js';
import { updateLives } from './uiManager.js';
import { updateVisibility } from './scoreManager.js';
import { updateTime } from './timeManager.js';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants/gameConstants.js';
import { initializeBoard } from './board.js';
import { spawnTetromino } from './tetrominoController.js';

export function startGame() {
    clearGameState();
    const state = getGameState();
    
    if (state.gameState === 'highscores' || state.gameState === 'start' || state.gameState === 'over') {
        setGameState('playing');
        state.startTime = new Date();
        document.getElementById('game-overlay').style.display = 'none';
        
        // Reset game state but keep the selected level
        state.score = 0;
        state.lives = 3;
        state.board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
        
        // Initialize board and spawn first tetromino
        initializeBoard();
       
        spawnTetromino();
        
        // Update UI
        document.getElementById('score').textContent = '000000';
        document.getElementById('level').textContent = state.level.toString();
        updateLives();
        
        // Set drop interval based on current level
        state.DROP_INTERVAL = Math.max(100, 1000 - (state.level - 1) * 100);
        updateVisibility();
        
        // Reset lines counter when starting new game
        window.linesForCurrentLevel = 0;
        
        state.lastDropTime = performance.now();
        if (state.gameInterval) clearInterval(state.gameInterval);
        state.gameInterval = setInterval(updateTime, 1000);
        startGameLoop();
    }
}

export function pauseGame() {
    const state = getGameState();
    if (state.gameState === 'playing') {
        setGameState('paused');
        showPauseOverlay();
    }
}

export function resumeGame() {
    const state = getGameState();
    if (state.gameState === 'paused') {
        setGameState('playing');
        document.getElementById('game-overlay').style.display = 'none';
        state.lastDropTime = performance.now();
        startGameLoop();
    }
}

export function quitGame() {
    setGameState('start');
    showStartOverlay();
}

function showPauseOverlay() {
    const overlay = document.getElementById('game-overlay');
    const pauseContent = `
        <div class="overlay-content">
            <h2>Game Paused</h2>
            <button class="game-button" onclick="resumeGame()">Resume</button>
            <button class="game-button" onclick="quitGame()" 
                    style="margin-top: 1rem; background: var(--destructive);">Quit Game</button>
        </div>
    `;
    
    overlay.innerHTML = pauseContent;
    overlay.style.display = 'flex';
}

// Add this at the bottom of the file
window.resumeGame = resumeGame;