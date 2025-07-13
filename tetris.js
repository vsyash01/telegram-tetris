let backend = "https://telegram-tetris-backend.vercel.app";
let uid = new URLSearchParams(window.location.search).get('uid');

let gameState = null;
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// Scale canvas for mobile devices
const scale = window.devicePixelRatio > 1 ? 20 : 15; // Smaller scale for high-DPI devices
context.scale(scale, scale);
canvas.width = 12 * scale;
canvas.height = 20 * scale;

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
  return pieces[index].map(row => row.slice());
}

// Rotate a matrix (90 degrees clockwise)
function rotateMatrix(matrix) {
  const n = matrix.length;
  const m = matrix[0].length;
  const result = createMatrix(m, n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < m; x++) {
      result[x][n - 1 - y] = matrix[y][x];
    }
  }
  return result;
}

// Check for collisions
function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
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
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    arena.splice(y, 1);
    arena.unshift(new Array(arena[0].length).fill(0));
    linesCleared++;
  }
  if (linesCleared > 0) {
    player.score += linesCleared * 100;
    saveProgress();
  }
}

// Draw the game
function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

  // Draw arena
  arena.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x, y, 1, 1);
      }
    });
  });

  // Draw player piece
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + player.pos.x, y + player.pos.y, 1, 1);
      }
    });
  });

  // Draw score
  context.fillStyle = '#FFF';
  context.font = `${1 / scale}em sans-serif`;
  context.fillText(`Score: ${player.score}`, 0.5, 1);
}

// Restore game state
function restoreGame(state) {
  console.log("Restoring state:", state);
  gameState = state;
  arena = state.board;
  player.score = state.score;
  player.matrix = state.currentPiece;
  player.pos = state.pos;
  draw();
}

// Start new game
function startNewGame() {
  console.log("Starting new game");
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
}

// Save progress to backend
function saveProgress() {
  if (!uid) return;
  gameState = {
    board: arena,
    currentPiece: player.matrix,
    pos: player.pos,
    score: player.score
  };
  fetch(`${backend}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: uid, state: gameState })
  })
    .then(() => console.log("Progress saved"))
    .catch(err => console.error("Error saving progress:", err));
}

// Load progress from backend
if (uid) {
  fetch(`${backend}/load?uid=${uid}`)
    .then(response => response.json())
    .then(data => {
      if (data.state) {
        restoreGame(data.state);
      } else {
        startNewGame();
      }
    })
    .catch(err => {
      console.error("Error loading progress:", err);
      startNewGame();
    });
} else {
  startNewGame();
}

// Game loop
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
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
        arena = createMatrix(12, 20);
        player.score = 0;
        saveProgress();
      }
    }
    dropCounter = 0;
    saveProgress();
  }

  draw();
  requestAnimationFrame(update);
}

// Keyboard controls
document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    player.pos.x--;
    if (collide(arena, player)) {
      player.pos.x++;
    }
  } else if (event.key === 'ArrowRight') {
    player.pos.x++;
    if (collide(arena, player)) {
      player.pos.x--;
    }
  } else if (event.key === 'ArrowDown') {
    player.pos.y++;
    if (collide(arena, player)) {
      player.pos.y--;
    }
  } else if (event.key === 'ArrowUp') {
    const originalMatrix = player.matrix;
    player.matrix = rotateMatrix(player.matrix);
    if (collide(arena, player)) {
      player.matrix = originalMatrix;
    }
  }
});

// Touch controls for Android
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

canvas.addEventListener('touchend', event => {
  event.preventDefault();
  const touchEndX = event.changedTouches[0].clientX;
  const touchEndY = event.changedTouches[0].clientY;
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    if (deltaX > 50) {
      player.pos.x++;
      if (collide(arena, player)) {
        player.pos.x--;
      }
    } else if (deltaX < -50) {
      player.pos.x--;
      if (collide(arena, player)) {
        player.pos.x++;
      }
    }
  } else {
    // Vertical swipe or tap
    if (deltaY > 50) {
      player.pos.y++;
      if (collide(arena, player)) {
        player.pos.y--;
      }
    } else if (Math.abs(deltaY) < 20 && Math.abs(deltaX) < 20) {
      // Tap to rotate
      const originalMatrix = player.matrix;
      player.matrix = rotateMatrix(player.matrix);
      if (collide(arena, player)) {
        player.matrix = originalMatrix;
      }
    }
  }
});

update();
