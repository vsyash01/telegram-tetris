let backend = "https://telegram-tetris-backend.vercel.app";
let uid = new URLSearchParams(window.location.search).get('uid');

let gameState = null;
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// Set canvas pixel dimensions (12 columns x 20 rows, 30px per block)
const blockSize = 30; // Size of each block in pixels
canvas.width = 12 * blockSize; // 12 columns * 30px = 360px
canvas.height = 20 * blockSize; // 20 rows * 30px = 600px

// Scale the context to match block size
context.scale(blockSize, blockSize);

// Tetris pieces (7 standard shapes)
const pieces = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[1, 1, 1], [0, 1, 0]], // T
  [[1, 1, 1], [1, 0, 0]], // L
  [[1, 1, 1], [0, 0, 1]], // J
  [[1, 1, 0], [0, 1, 1]], // S
  [[0, 1, 1], [1, 1, 0]] // Z
];

const colors = [
  null,
  '#00F0F0', // I: Cyan
  '#F0F000', // O: Yellow
  '#A000F0', // T: Purple
  '#F0A000', // L: Orange
  '#0000F0', // J: Blue
  '#00F000', // S: Green
  '#F00000' // Z: Red
];

// Game state
let arena = createMatrix(12, 20);
let player = {
  pos: { x: 5, y: 0 },
  matrix: null,
  score: 0
};

// Screen elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const highscoresList = document.getElementById('highscores');
const newGameButton = document.getElementById('new-game');
const continueGameButton = document.getElementById('continue-game');
const finalScore = document.getElementById('final-score');
const playerNameInput = document.getElementById('player-name');
const saveScoreButton = document.getElementById('save-score');
const cancelScoreButton = document.getElementById('cancel-score');

// Create empty matrix
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

// Create a new piece
function createPiece() {
  const index = Math.floor(Math.random() * pieces.length);
  const piece = pieces[index].map(row => row.slice());
  return piece;
}

// Rotate a matrix (90 degrees clockwise)
function rotateMatrix(matrix) {
  if (!matrix || !matrix.length || !matrix[0]) return matrix; // Guard against invalid matrix
  const n = matrix.length;
  const m = matrix[0].length;
  const result = [];
  for (let x = 0; x < m; x++) {
    result.push([]);
    for (let y = 0; y < n; y++) {
      result[x][n - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

// Check for collisions (including boundary checks)
function collide(arena, player) {
  if (!player.matrix || !player.pos) return true; // Guard against invalid state
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0) {
        // Check arena boundaries
        if (
          x + o.x < 0 || // Left boundary
          x + o.x >= arena[0].length || // Right boundary
          y + o.y >= arena.length || // Bottom boundary
          (arena[y + o.y] && arena[y + o.y][x + o.x] !== 0) // Collision with other blocks
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

// Merge player piece into arena
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Clear completed lines
function clearLines() {
  let linesCleared = 0;
  const rowsToRemove = [];

  // Identify all filled rows
  for (let y = arena.length - 1; y >= 0; y--) {
    let isFilled = true;
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        isFilled = false;
        break;
      }
    }
    if (isFilled) {
      rowsToRemove.push(y);
      linesCleared++;
    }
  }

  // Remove all filled rows and add empty rows at the top
  if (linesCleared > 0) {
    // Sort rows in descending order to remove from bottom to top
    rowsToRemove.sort((a, b) => b - a);
    for (const y of rowsToRemove) {
      arena.splice(y, 1);
    }
    // Add empty rows to the top
    for (let i = 0; i < linesCleared; i++) {
      arena.unshift(new Array(arena[0].length).fill(0));
    }
    player.score += linesCleared * 100;
    saveProgress();
  }
}

// Draw the game
function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, 12, 20); // Clear entire canvas (12x20 grid units)

  // Draw arena
  arena.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x, y, 1, 1); // Draw 1x1 grid unit
      }
    });
  });

  // Draw player piece
  if (player.matrix) {
    player.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          context.fillStyle = colors[value];
          context.fillRect(x + player.pos.x, y + player.pos.y, 1, 1);
        }
      });
    });
  }

  // Draw score
  context.fillStyle = '#FFF';
  context.font = `0.8px sans-serif`; // Adjusted font size for visibility
  context.fillText(`Score: ${player.score}`, 0.5, 1);
}

// Restore game state
function restoreGame(state) {
  console.log("Restoring state for uid=" + uid + ":", state);
  gameState = state;
  arena = state.board;
  player.score = state.score;
  player.matrix = state.currentPiece;
  player.pos = state.pos;
  draw();
}

// Start new game
function startNewGame() {
  console.log("Starting new game for uid=" + uid);
  gameState = {
    board: createMatrix(12, 20),
    currentPiece: createPiece(),
    pos: { x: 5, y: 0 },
    score: 0
  };
  arena = gameState.board;
  player.matrix = gameState.currentPiece;
  player.pos = gameState.pos;
  player.score = gameState.score;
  draw();
  saveProgress();
}

// Save progress to backend with retry and delay
async function saveProgress() {
  if (!uid) {
    console.error("No UID found, cannot save progress");
    alert("Error: No user ID found. Progress cannot be saved.");
    return;
  }
  gameState = {
    board: arena,
    currentPiece: player.matrix,
    pos: player.pos,
    score: player.score
  };
  console.log(`Preparing to save progress for uid=${uid}:`, gameState);
  await new Promise(resolve => setTimeout(resolve, 100)); // Delay for stability
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Save attempt ${attempt} for uid=${uid}: Sending request to ${backend}/save`);
      const response = await fetch(`${backend}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uid, state: gameState })
      });
      const result = await response.json();
      console.log(`Save attempt ${attempt} for uid=${uid}: status=${response.status}, result=`, result);
      if (response.ok) {
        console.log(`Progress saved successfully for uid=${uid}`);
        return;
      }
      console.error(`Save attempt ${attempt} failed: status=${response.status}, message=${result.message || 'Unknown error'}`);
    } catch (err) {
      console.error(`Save attempt ${attempt} error for uid=${uid}:`, err);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
  }
  console.error("Failed to save progress for uid=" + uid + " after 3 attempts");
  alert("Failed to save progress. Please try again.");
}

// Load progress from backend with retry
async function loadProgress() {
  if (!uid) {
    console.error("No UID found, starting new game");
    alert("Error: No user ID found. Starting new game.");
    startNewGame();
    showGameScreen();
    return;
  }
  console.log(`Loading progress for uid=${uid}`);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Load attempt ${attempt} for uid=${uid}: Sending request to ${backend}/load?uid=${uid}`);
      const response = await fetch(`${backend}/load?uid=${uid}`);
      const data = await response.json();
      console.log(`Load attempt ${attempt} for uid=${uid}: status=${response.status}, data=`, data);
      if (response.ok && data.state) {
        restoreGame(data.state);
        showGameScreen();
        return;
      } else {
        console.warn(`Load attempt ${attempt} for uid=${uid}: No state found or invalid response`);
      }
    } catch (err) {
      console.error(`Load attempt ${attempt} error for uid=${uid}:`, err);
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
  }
  console.error("Failed to load progress for uid=" + uid + " after 3 attempts, starting new game");
  alert("Failed to load progress. Starting new game.");
  startNewGame();
  showGameScreen();
}

// Load high scores from backend
async function loadHighscores() {
  try {
    const response = await fetch(`${backend}/highscores`);
    const data = await response.json();
    console.log("Loaded highscores:", data);
    if (response.ok && data.highscores) {
      highscoresList.innerHTML = data.highscores.map(
        (entry, index) => `<li>${index + 1}. ${entry.name}: ${entry.score}</li>`
      ).join('');
    } else {
      highscoresList.innerHTML = '<li>No high scores yet.</li>';
    }
  } catch (err) {
    console.error("Failed to load highscores:", err);
    highscoresList.innerHTML = '<li>Error loading high scores.</li>';
  }
}

// Save score to backend
async function saveScore(name, score) {
  if (!uid) {
    console.error("No UID found, cannot save score");
    return;
  }
  try {
    const response = await fetch(`${backend}/save_score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid, name: name, score: score })
    });
    const result = await response.json();
    console.log(`Save score for uid=${uid}: status=${response.status}, result=`, result);
    if (response.ok) {
      showStartScreen();
    } else {
      console.error("Failed to save score:", result.message);
    }
  } catch (err) {
    console.error("Error saving score:", err);
  }
}

// Show start screen
function showStartScreen() {
  startScreen.style.display = 'block';
  gameScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  loadHighscores();
}

// Show game screen
function showGameScreen() {
  startScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  gameOverScreen.style.display = 'none';
  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(update);
}

// Show game over screen
function showGameOverScreen() {
  isRunning = false;
  startScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  gameOverScreen.style.display = 'block';
  finalScore.textContent = player.score;
  playerNameInput.value = '';
}

// Game loop
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isRunning = false;

function update(time = performance.now()) {
  if (!isRunning) return; // Stop loop if game is paused

  const deltaTime = time - lastTime;
  lastTime = time;

  // Debug timing
  console.log(`deltaTime: ${deltaTime}, dropCounter: ${dropCounter}`);

  if (deltaTime > 0 && player.matrix) { // Ensure valid timing and piece
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      player.pos.y++;
      if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        clearLines();
        player.matrix = createPiece();
        player.pos = { x: 5, y: 0 };
        if (collide(arena, player)) {
          console.log("Game Over: Cannot place new piece");
          showGameOverScreen();
          return; // Stop game loop
        }
      }
      dropCounter = 0;
      saveProgress();
    }
  }

  draw();
  requestAnimationFrame(update);
}

// Handle visibility changes to prevent loop stalling
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    isRunning = true;
    lastTime = performance.now(); // Reset timing
    requestAnimationFrame(update);
  } else {
    isRunning = false;
  }
});

// Keyboard controls
document.addEventListener('keydown', event => {
  if (gameScreen.style.display !== 'block') return; // Ignore keys if not in game
  if (event.key === 'ArrowLeft') {
    player.pos.x--;
    if (collide(arena, player)) {
      player.pos.x++;
    }
    saveProgress();
  } else if (event.key === 'ArrowRight') {
    player.pos.x++;
    if (collide(arena, player)) {
      player.pos.x--;
    } else {
      // Ensure piece stays within right boundary
      let maxX = arena[0].length - player.matrix[0].length;
      if (player.pos.x > maxX) {
        player.pos.x = maxX;
      }
    }
    saveProgress();
  } else if (event.key === 'ArrowDown') {
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--;
      merge(arena, player);
      clearLines();
      player.matrix = createPiece();
      player.pos = { x: 5, y: 0 };
      if (collide(arena, player)) {
        console.log("Game Over: Cannot place new piece");
        showGameOverScreen();
        return;
      }
    }
    saveProgress();
  } else if (event.key === 'ArrowUp') {
    if (player.matrix) {
      const originalMatrix = player.matrix;
      player.matrix = rotateMatrix(player.matrix);
      if (collide(arena, player)) {
        player.matrix = originalMatrix;
      } else {
        // Ensure rotated piece stays within boundaries
        let maxX = arena[0].length - player.matrix[0].length;
        if (player.pos.x > maxX) {
          player.pos.x = maxX;
        }
        if (player.pos.x < 0) {
          player.pos.x = 0;
        }
      }
      saveProgress();
    }
  }
  draw();
});

// Touch buttons for Android
function setupTouchControls() {
  const leftButton = document.getElementById('left-button');
  const rightButton = document.getElementById('right-button');
  const downButton = document.getElementById('down-button');
  const rotateButton = document.getElementById('rotate-button');

  leftButton.addEventListener('click', () => {
    if (gameScreen.style.display !== 'block') return;
    player.pos.x--;
    if (collide(arena, player)) {
      player.pos.x++;
    }
    draw();
    saveProgress();
  });

  rightButton.addEventListener('click', () => {
    if (gameScreen.style.display !== 'block') return;
    player.pos.x++;
    if (collide(arena, player)) {
      player.pos.x--;
    } else {
      // Ensure piece stays within right boundary
      let maxX = arena[0].length - player.matrix[0].length;
      if (player.pos.x > maxX) {
        player.pos.x = maxX;
      }
    }
    draw();
    saveProgress();
  });

  downButton.addEventListener('click', () => {
    if (gameScreen.style.display !== 'block') return;
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--;
      merge(arena, player);
      clearLines();
      player.matrix = createPiece();
      player.pos = { x: 5, y: 0 };
      if (collide(arena, player)) {
        console.log("Game Over: Cannot place new piece");
        showGameOverScreen();
        return;
      }
    }
    draw();
    saveProgress();
  });

  rotateButton.addEventListener('click', () => {
    if (gameScreen.style.display !== 'block') return;
    if (player.matrix) {
      const originalMatrix = player.matrix;
      player.matrix = rotateMatrix(player.matrix);
      if (collide(arena, player)) {
        player.matrix = originalMatrix;
      } else {
        // Ensure rotated piece stays within boundaries
        let maxX = arena[0].length - player.matrix[0].length;
        if (player.pos.x > maxX) {
          player.pos.x = maxX;
        }
        if (player.pos.x < 0) {
          player.pos.x = 0;
        }
      }
      draw();
      saveProgress();
    }
  });
}

// Start screen button handlers
newGameButton.addEventListener('click', () => {
  startNewGame();
  showGameScreen();
});

continueGameButton.addEventListener('click', () => {
  loadProgress();
});

// Game over screen button handlers
saveScoreButton.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (name) {
    saveScore(name, player.score);
  } else {
    console.log("No name entered, score not saved");
    showStartScreen();
  }
});

cancelScoreButton.addEventListener('click', () => {
  showStartScreen();
});

// Initialize touch controls and show start screen
setupTouchControls();
showStartScreen();
