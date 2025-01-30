import { getGameState, setGameState } from './gameState.js';
import { startGame, quitGame } from './gameController.js';

// Expose necessary functions to global scope
window.setStartLevel = (level) => {
    const state = getGameState();
    state.level = level;
    document.getElementById('level').textContent = level;
};

window.startGame = startGame;
window.quitGame = quitGame;
window.fetchAndShowHighScores = async () => {
    try {
        // Show loading state
        showHighScores(null);
        
        const response = await fetch('http://localhost:8080/api/scores');
        if (response.ok) {
            const scores = await response.json();
            showHighScores(scores);
        } else {
            throw new Error('Failed to fetch scores');
        }
    } catch (error) {
        console.error('Error fetching scores:', error);
        showHighScores('error');
    }
};

export function showStartOverlay() {
    const state = getGameState();
    if (state.gameState !== 'highscores' && state.gameState !== 'paused') {
        const overlay = document.getElementById('game-overlay');
        const startContent = `
            <div class="overlay-content">
                <h1 class="game-title">TETRIS</h1>
                <div class="level-select">
                    <h2>Starting Level</h2>
                    <div class="level-buttons">
                        ${Array.from({length: 10}, (_, i) => i + 1)
                            .map(num => `<button class="level-btn ${num === state.level ? 'selected' : ''}" 
                                        onclick="setStartLevel(${num})">${num}</button>`)
                            .join('')}
                    </div>
                </div>
                <button class="game-button" onclick="startGame()">Start Game</button>
                <button class="game-button" onclick="fetchAndShowHighScores()" 
                        style="margin-top: 1rem; background: var(--secondary);">High Scores</button>
            </div>
        `;
        
        overlay.innerHTML = startContent;
        overlay.style.display = 'flex';
    }
}

export function showPauseOverlay() {
    const overlay = document.getElementById('game-overlay');
    const pauseContent = `
        <div class="overlay-content">
            <h2 style="font-size: 2rem; margin-bottom: 1.5rem;">Game Paused</h2>
            <button class="game-button" id="continueButton">Continue</button>
            <button class="game-button" id="restartButton" style="margin: 1rem;">Restart</button>
            <button class="game-button" id="quitButton" style="background: var(--destructive);">Quit</button>
        </div>
    `;
    
    overlay.innerHTML = pauseContent;
    overlay.style.display = 'flex';

    document.getElementById('continueButton').addEventListener('click', resumeGame);
    document.getElementById('restartButton').addEventListener('click', () => {
        setGameState('start');
        startGame();
    });
    document.getElementById('quitButton').addEventListener('click', quitGame);
}

export function showLivesOverlay() {
    const state = getGameState();
    const overlay = document.getElementById('game-overlay');
    const livesContent = `
        <div class="overlay-content">
            <h2 style="font-size: 2rem; color: var(--destructive);">Oops!</h2>
            <p style="margin: 1rem 0;">You lost a life!</p>
            <p style="font-size: 1.5rem; color: var(--primary); margin-bottom: 1.5rem;">
                Lives remaining: ${state.lives}
            </p>
            <button class="game-button" onclick="continuePlaying()">Continue</button>
        </div>
    `;
    
    overlay.innerHTML = livesContent;
    overlay.style.display = 'flex';
}

export function updateNextTetrominoDisplay() {
    const state = getGameState();
    const nextPieceGrid = document.querySelector('.next-piece-grid');
    if (!nextPieceGrid) {
        createNextPieceGrid();
    }

    const cells = document.querySelectorAll('.next-piece-cell');
    cells.forEach(cell => {
        cell.style.backgroundColor = 'transparent';
        cell.classList.remove('tetromino');
    });

    if (!state.nextTetromino) return;

    const offsetX = Math.floor((4 - state.nextTetromino[0].length) / 2);
    const offsetY = Math.floor((4 - state.nextTetromino.length) / 2);

    for (let i = 0; i < state.nextTetromino.length; i++) {
        for (let j = 0; j < state.nextTetromino[i].length; j++) {
            if (state.nextTetromino[i][j]) {
                const index = (i + offsetY) * 4 + (j + offsetX);
                const cell = cells[index];
                if (cell) {
                    const color = COLORS[state.nextTetrominoType];
                    const rgb = hexToRgb(color);
                    cell.style.setProperty('--glow-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
                    cell.classList.add('tetromino');
                }
            }
        }
    }
}

export function updateUI() {
    const state = getGameState();
    document.getElementById('score').textContent = state.score.toString().padStart(6, '0');
    document.getElementById('level').textContent = state.level.toString();
    document.getElementById('lives').innerHTML = '★'.repeat(state.lives) + '☆'.repeat(3 - state.lives);
    updateTime();
}

function updateTime() {
    const state = getGameState();
    if (!state.startTime || state.gameState !== 'playing') return;
    const now = new Date();
    const diff = Math.floor((now - state.startTime) / 1000);
    const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    document.getElementById('time').textContent = `${minutes}:${seconds}`;
}

export function updateLives() {
    const state = getGameState();
    const livesContainer = document.getElementById('lives');
    if (livesContainer) {
        livesContainer.innerHTML = '★'.repeat(state.lives) + '☆'.repeat(3 - state.lives);
    }
}

export function showHighScores(scores) {
    const state = getGameState();
    const overlay = document.getElementById('game-overlay');
    
    if (!scores) {
        // Loading state
        overlay.innerHTML = `
            <div class="overlay-content high-scores">
                <h2>Loading High Scores...</h2>
                <div class="loading-spinner"></div>
            </div>
        `;
        overlay.style.display = 'flex';
        return;
    }
    
    if (scores === 'error') {
        // Error state
        overlay.innerHTML = `
            <div class="overlay-content high-scores">
                <h2>Error Loading Scores</h2>
                <p>Failed to load high scores. Please try again.</p>
                <div class="button-container">
                    <button class="game-button" onclick="fetchAndShowHighScores()">Retry</button>
                    <button class="game-button" onclick="quitGame()">Main Menu</button>
                </div>
            </div>
        `;
        overlay.style.display = 'flex';
        return;
    }
    
    // Success state with scores
    overlay.innerHTML = `
        <div class="overlay-content high-scores">
            <h2>High Scores</h2>
            <div class="scores-container">
                <div class="scores-header">
                    <span>Rank</span>
                    <span>Name</span>
                    <span>Score</span>
                    <span>Time</span>
                </div>
                <div class="scores-list">
                    ${scores.map((entry, index) => `
                        <div class="score-entry">
                            <span>#${index + 1}</span>
                            <span>${entry.name}</span>
                            <span>${entry.score}</span>
                            <span>${entry.time}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="button-container">
                <button class="game-button" onclick="quitGame()">Main Menu</button>
                <button class="game-button" onclick="startGame()">Play Again</button>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function createNextPieceGrid() {
    const gameStats = document.querySelector('.game-stats');
    const nextPieceSection = document.createElement('div');
    nextPieceSection.className = 'next-piece';
    nextPieceSection.innerHTML = `
        <h2>Next</h2>
        <div class="next-piece-grid">
            ${Array(16).fill('<div class="next-piece-cell"></div>').join('')}
        </div>
    `;
    gameStats.appendChild(nextPieceSection);
} 