import { getGameState } from './gameState.js';
import { moveTetromino } from './tetrominoController.js';
import { updateBoardEfficient } from './board.js';
import { updateUI } from './uiManager.js';
import { COLORS } from '../constants/gameConstants.js';

let lastFrameTime = 0;
const TARGET_FRAMETIME = 1000 / 60; // 60 FPS
let fpsCounter = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

export function startGameLoop() {
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    const state = getGameState();
    if (state.gameState !== 'playing') return;

    updateFPS(timestamp);

    const deltaTime = timestamp - lastFrameTime;
    if (deltaTime < TARGET_FRAMETIME) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update game logic
    const dropDelta = timestamp - state.lastDropTime;
    if (dropDelta >= state.DROP_INTERVAL) {
        moveTetromino(0, 1);
        state.lastDropTime = timestamp;
    } else {
        state.currentOffset = dropDelta / state.DROP_INTERVAL;
    }

    // Use efficient board update
    updateBoardEfficient(
        state.board,
        state.currentTetromino,
        state.currentPosition,
        state.currentOffset,
        state.currentTetrominoType
    );

    lastFrameTime = timestamp;
    requestAnimationFrame(gameLoop);
}

function updateFPS(timestamp) {
    fpsCounter++;
    
    if (timestamp - lastFpsUpdate >= 1000) {
        currentFps = fpsCounter;
        console.log(`FPS: ${currentFps}, Level: ${getGameState().level}`);
        fpsCounter = 0;
        lastFpsUpdate = timestamp;
    }
}

export function stopGameLoop() {
    lastFrameTime = 0;
    fpsCounter = 0;
    lastFpsUpdate = 0;
}