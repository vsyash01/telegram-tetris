let backend = "https://telegram-tetris-backend.vercel.app"; // <-- твой бэкенд
let uid = new URLSearchParams(window.location.search).get('uid');

let gameState = null;

// Функция для восстановления состояния игры
function restoreGame(state) {
    console.log("Восстановленное состояние:", state);
    gameState = state;
    // Тут твоя логика, например:
    // drawBoard(state.board);
    // setCurrentPiece(state.currentPiece);
}

// Функция для старта новой игры
function startNewGame() {
    console.log("Начало новой игры");
    gameState = {
        board: createEmptyBoard(),
        currentPiece: getRandomPiece(),
        score: 0
    };
    render(); // нарисовать игру
}

// Сохранение прогресса
function saveProgress() {
    if (!uid) return; // если uid не передан
    fetch(`${backend}/save`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ uid: uid, state: gameState })
    }).then(() => {
        console.log("Прогресс сохранён");
    }).catch(err => {
        console.error("Ошибка при сохранении прогресса:", err);
    });
}

// Загрузка прогресса при старте
if (uid) {
    fetch(`${backend}/load?uid=${uid}`)
        .then(response => response.json())
        .then(data => {
            if (data.state) {
                restoreGame(data.state);
            } else {
                startNewGame();
            }
        }).catch(err => {
            console.error("Ошибка при загрузке прогресса:", err);
            startNewGame();
        });
} else {
    startNewGame();
}

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

// Простая фигура (квадрат)
const player = {
  pos: {x: 5, y: 0},
  matrix: [
    [1, 1],
    [1, 1],
  ],
};

const arena = createMatrix(12, 20);

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = 'red';
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
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

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] &&
           arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

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
      player.pos.y = 0;
    }
    dropCounter = 0;
  }

  draw();
  requestAnimationFrame(update);
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x:0, y:0});
  drawMatrix(player.matrix, player.pos);
}

// Управление
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
  }
});

update();
