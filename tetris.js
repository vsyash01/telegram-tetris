let backend = "https://telegram-tetris-backend.vercel.app";
let uid = new URLSearchParams(window.location.search).get('uid');

let gameState = null;
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// Set canvas pixel dimensions (12 columns x 20 rows, 30px per block)
const blockSize = 30;
canvas.width = 12 * blockSize;
canvas.height = 20 * blockSize;

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

let arena = createMatrix(12, 20);
let player = {
  pos: { x: 5, y: 0 },
  matrix: null,
  score: 0
};

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

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece() {
  const index = Math.floor(Math.random() * pieces.length);
  const piece = pieces[index].map(row => row.slice());
  return piece;
}

function rotateMatrix(matrix) {
  if (!matrix || !matrix.length || !matrix[0]) return matrix;
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

function collide(arena, player) {
  if (!player.matrix || !player.pos) return true;
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0) {
        if (
          x + o.x < 0 ||
          x + o.x >= arena[0].length ||
          y + o.y >= arena.length ||
          (arena[y + o.y] && arena[y + o.y][x + o.x] !== 0)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function clearLines() {
  let linesCleared = 0;
  const rowsToRemove = [];

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

  if (linesCleared > 0) {
    rowsToRemove.sort((a, b) => b - a);
    for (const y of rowsToRemove) {
      arena.splice(y, 1);
    }
    for (let i = 0; i < linesCleared; i++) {
      arena.unshift(new Array(arena[0].length).fill(0));
    }
    player.score += linesCleared * 100;
    saveProgress();
  }
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, 12, 20);

  arena.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x, y, 1, 1);
      }
    });
  });

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

  context.fillStyle = '#FFF';
  context.font = `0.8px sans-serif`;
  context.fillText(`Score: ${player.score}`, 0.5, 1);
}

function restoreGame(state) {
  console.log("Restoring state for uid=" + uid + ":", state);
  gameState = state;
  arena = state.board;
  player.score = state.score;
  player.matrix = state.currentPiece;
  player.pos = state.pos;
  draw();
}

function startNewGame() {
  console.log("Starting new game for uid=" + uid);
  gameState = {
    board: createMatrix(12, 20),
    currentPiece: createPiece(),
    pos: { x: 5, y: 0 },
    score: 0,
    gameOver: false
  };
  arena = gameState.board;
  player.matrix = gameState.currentPiece;
  player.pos = gameState.pos;
  player.score = gameState.score;
  draw();
  saveProgress();
}

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
    score: player.score,
    gameOver: gameScreen.style.display !== 'block' || collide(arena, { pos: player.pos, matrix: player.matrix })
  };
  console.log(`Preparing to save progress for uid=${uid}:`, gameState);
  await new Promise(resolve => setTimeout(resolve, 100));
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Save attempt ${attempt} for uid=${uid}: Sending request to ${backend}/api/save`);
      const response = await fetch(`${backend}/api/save`, {
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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.error("Failed to save progress for uid=" + uid + " after 3 attempts");
  alert("Failed to save progress. Please try again.");
}

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
      console.log(`Load attempt ${attempt} for uid=${uid}: Sending request to ${backend}/api/load?uid=${uid}`);
      const response = await fetch(`${backend}/api/load?uid=${uid}`);
      const data = await response.json();
      console.log(`Load attempt ${attempt} for uid=${uid}: status=${response.status}, data=`, data);
      if (response.ok && data.state) {
        // Check if the loaded state is a game-over state
        const tempPlayer = { pos: data.state.pos, matrix: data.state.currentPiece };
        const tempArena = data.state.board;
        if (collide(tempArena, tempPlayer) || data.state.gameOver) {
          console.log(`Game-over state detected for uid=${uid}, starting new game`);
          startNewGame();
        } else {
          restoreGame(data.state);
        }
        showGameScreen();
        return;
      } else {
        console.warn(`Load attempt ${attempt} for uid=${uid}: No state found, starting new game`);
        startNewGame();
        showGameScreen();
        return;
      }
    } catch (err) {
      console.error(`Load attempt ${attempt} error for uid=${uid}:`, err);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.error("Failed to load progress for uid=" + uid + " after 3 attempts, starting new game");
  alert("Failed to load progress. Starting new game.");
  startNewGame();
  showGameScreen();
}

async function saveScore(name, score) {
  if (!uid) {
    console.error("No UID found, cannot save score");
    alert("Error: No user ID found. Score cannot be saved.");
    return;
  }
  try {
    console.log(`Saving score for uid=${uid}, name=${name}, score=${score}`);
    const response = await fetch(`${backend}/api/save_score`, {
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
      alert("Failed to save score. Please try again.");
    }
  } catch (err) {
    console.error("Error saving score:", err);
    alert("Error saving score: " + err.message);
  }
}

async function loadHighscores() {
  try {
    console.log("Loading highscores");
    const response = await fetch(`${backend}/api/highscores`);
    const data = await response.json();
    console.log("Loaded highscores: status=", response.status, "data=", data);
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

function showStartScreen() {
  startScreen.style.display = 'block';
  gameScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  loadHighscores();
}

function showGameScreen() {
  startScreen.style.display = 'none';
  gameScreen.style.display = 'block';
  gameOverScreen.style.display = 'none';
  isRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(update);
}

function showGameOverScreen() {
  isRunning = false;
  startScreen.style.display = 'none';
  gameScreen.style.display = 'none';
  gameOverScreen.style.display = 'block';
  finalScore.textContent = player.score;
  playerNameInput.value = '';
  saveProgress(); // Save final state with gameOver flag
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isRunning = false;

function update(time = performance.now()) {
  if (!isRunning) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  console.log(`deltaTime: ${deltaTime}, dropCounter: ${dropCounter}`);

  if (deltaTime > 0 && player.matrix) {
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
          return;
        }
      }
      dropCounter = 0;
      saveProgress();
    }
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(update);
  } else {
    isRunning = false;
    saveProgress(); // Save state when tab is hidden
  }
});

document.addEventListener('keydown', event => {
  if (gameScreen.style.display !== 'block') return;
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

newGameButton.addEventListener('click', () => {
  startNewGame();
  showGameScreen();
});

continueGameButton.addEventListener('click', () => {
  loadProgress();
});

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

setupTouchControls();
showStartScreen();
