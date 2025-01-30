import { getGameState } from './gameState.js';

export function updateTime() {
    const state = getGameState();
    if (!state.startTime || state.gameState !== 'playing') return;
    
    const now = new Date();
    const diff = Math.floor((now - state.startTime) / 1000);
    const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    document.getElementById('time').textContent = `${minutes}:${seconds}`;
} 