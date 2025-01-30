import { initializeGameState } from './modules/gameState.js';
import { initializeBoard } from './modules/board.js';
import { initializeEventListeners } from './modules/eventHandler.js';
import { showStartOverlay } from './modules/uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeGameState();
    initializeBoard();
    initializeEventListeners();
    showStartOverlay();
}); 