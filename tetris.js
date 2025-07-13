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

// Пример функций, которые тебе нужно реализовать или подставить из своей игры
function createEmptyBoard() {
    // например, массив 20x10
    return Array.from({ length: 20 }, () => Array(10).fill(0));
}

function getRandomPiece() {
    return { type: 'I', position: { x: 4, y: 0 } }; // пример
}

// Перерисовать игру (нарисовать доску, фигуры и т.д.)
function render() {
    // твоя логика отрисовки
}

// Теперь пример обработки события – перемещение фигуры влево
document.addEventListener('keydown', e => {
    switch (e.key) {
        case "ArrowLeft":
            movePiece(-1);
            break;
        case "ArrowRight":
            movePiece(1);
            break;
        case "ArrowDown":
            dropPiece();
            break;
        case "ArrowUp":
            rotatePiece();
            break;
    }
    saveProgress(); // сохраняем после каждого действия
});

// Примеры функций движения (упрощённо)
function movePiece(direction) {
    if (!gameState) return;
    gameState.currentPiece.position.x += direction;
    render();
}

function dropPiece() {
    if (!gameState) return;
    gameState.currentPiece.position.y += 1;
    render();
}

function rotatePiece() {
    if (!gameState) return;
    // Пример: gameState.currentPiece.rotation = (gameState.currentPiece.rotation + 1) % 4;
    render();
}
