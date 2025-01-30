import { getGameState, setGameState } from './gameState.js';
import { showHighScores } from './uiManager.js';

export async function submitScore(name, score, time) {
    try {
        console.log('submitScore: Sending request to server');
        const response = await fetch('http://localhost:8080/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, score, time })
        });
        
        if (response.ok) {
            const scores = await response.json();
            setTimeout(() => {
                showHighScores(scores);
            }, 0);
        } else {
            throw new Error('Failed to submit score');
        }
    } catch (error) {
        console.error('Error occurred:', error);
        showHighScores('error');
        throw error;
    }
}

export async function fetchHighScores() {
    try {
        showHighScores(null); // Show loading state
        
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
}

export function showScoreSubmission() {
    const state = getGameState();
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay';
    
    const content = document.createElement('div');
    content.className = 'overlay-content score-submission';
    content.innerHTML = `
        <h2>Game Over!</h2>
        <p>Your Score: ${state.score}</p>
        <p>Time: ${document.getElementById('time').textContent}</p>
        <div class="score-input">
            <input type="text" id="playerName" placeholder="Enter your name" maxlength="10">
            <button id="submitScoreBtn" class="game-button">Submit Score</button>
        </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    const submitBtn = document.getElementById('submitScoreBtn');
    const nameInput = document.getElementById('playerName');
    
    submitBtn.addEventListener('click', handleScoreSubmit);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScoreSubmit(e);
        }
    });
}

function handleScoreSubmit(event) {
    event?.preventDefault();
    
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();
    
    if (name) {
        const submitBtn = document.getElementById('submitScoreBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }
        
        const submissionOverlay = document.querySelector('.score-submission');
        if (submissionOverlay) {
            submissionOverlay.parentElement.remove();
        }
        
        const state = getGameState();
        submitScore(name, state.score, document.getElementById('time').textContent)
            .catch(error => console.error('Score submission failed:', error));
    } else {
        nameInput.classList.add('error');
        setTimeout(() => nameInput.classList.remove('error'), 1000);
    }
} 