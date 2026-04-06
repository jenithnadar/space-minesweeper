// Minesweeper Game
const DIFFICULTIES = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

let game = {
  board: [],
  rows: 0,
  cols: 0,
  mines: 0,
  minesLeft: 0,
  difficulty: 'easy',
  started: false,
  over: false,
  flagMode: false,
  timer: 0,
  timerInterval: null,
  revealedCount: 0,
  totalSafe: 0,
};

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const boardEl = document.getElementById('board');
const mineCountEl = document.getElementById('mine-count');
const timerEl = document.getElementById('timer');
const restartBtn = document.getElementById('restart-btn');
const flagToggle = document.getElementById('flag-toggle');
const winModal = document.getElementById('win-modal');
const loseModal = document.getElementById('lose-modal');
const winTimeEl = document.getElementById('win-time');
const scoreForm = document.getElementById('score-form');
const playerNameInput = document.getElementById('player-name');

// Screen navigation
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// Menu buttons
document.querySelectorAll('[data-difficulty]').forEach(btn => {
  btn.addEventListener('click', () => {
    game.difficulty = btn.dataset.difficulty;
    startGame(game.difficulty);
  });
});

document.getElementById('show-leaderboard').addEventListener('click', () => {
  showScreen(leaderboardScreen);
  loadLeaderboard('easy');
});

document.getElementById('back-from-leaderboard').addEventListener('click', () => {
  showScreen(menuScreen);
});

document.getElementById('back-to-menu').addEventListener('click', () => {
  stopTimer();
  showScreen(menuScreen);
});

restartBtn.addEventListener('click', () => {
  startGame(game.difficulty);
});

flagToggle.addEventListener('click', () => {
  game.flagMode = !game.flagMode;
  flagToggle.textContent = game.flagMode ? '🚩 Flag Mode: ON' : '🚩 Flag Mode: OFF';
  flagToggle.classList.toggle('active', game.flagMode);
});

document.getElementById('play-again').addEventListener('click', () => {
  winModal.classList.add('hidden');
  startGame(game.difficulty);
});

document.getElementById('try-again').addEventListener('click', () => {
  loseModal.classList.add('hidden');
  startGame(game.difficulty);
});

document.getElementById('lose-to-menu').addEventListener('click', () => {
  loseModal.classList.add('hidden');
  showScreen(menuScreen);
});

// Leaderboard tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadLeaderboard(tab.dataset.tab);
  });
});

// Score submission
scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) return;

  const submitBtn = scoreForm.querySelector('button');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    await fetch('/.netlify/functions/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        time: game.timer,
        difficulty: game.difficulty,
      }),
    });
    submitBtn.textContent = 'Submitted!';
    setTimeout(() => {
      winModal.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Score';
      playerNameInput.value = '';
    }, 1000);
  } catch {
    submitBtn.textContent = 'Error - Try Again';
    submitBtn.disabled = false;
  }
});

// Game Logic
function startGame(difficulty) {
  const config = DIFFICULTIES[difficulty];
  game = {
    ...game,
    rows: config.rows,
    cols: config.cols,
    mines: config.mines,
    minesLeft: config.mines,
    started: false,
    over: false,
    flagMode: false,
    timer: 0,
    revealedCount: 0,
    totalSafe: config.rows * config.cols - config.mines,
    board: [],
  };

  stopTimer();
  timerEl.textContent = '000';
  mineCountEl.textContent = game.minesLeft;
  restartBtn.textContent = '😀';
  flagToggle.textContent = '🚩 Flag Mode: OFF';
  flagToggle.classList.remove('active');
  winModal.classList.add('hidden');
  loseModal.classList.add('hidden');

  // Calculate cell size based on viewport
  const maxWidth = Math.min(window.innerWidth - 20, 580);
  const maxHeight = window.innerHeight - 180;
  const cellW = Math.floor((maxWidth - game.cols * 2 - 8) / game.cols);
  const cellH = Math.floor((maxHeight - game.rows * 2 - 8) / game.rows);
  const cellSize = Math.max(24, Math.min(40, cellW, cellH));
  const fontSize = Math.max(10, Math.floor(cellSize * 0.42));

  boardEl.style.gridTemplateColumns = `repeat(${game.cols}, var(--cell-size))`;
  boardEl.style.setProperty('--cell-size', `${cellSize}px`);
  boardEl.style.setProperty('--cell-font', `${fontSize}px`);

  // Initialize empty board
  game.board = [];
  for (let r = 0; r < game.rows; r++) {
    game.board[r] = [];
    for (let c = 0; c < game.cols; c++) {
      game.board[r][c] = {
        mine: false,
        revealed: false,
        flagged: false,
        count: 0,
      };
    }
  }

  renderBoard();
  showScreen(gameScreen);
}

function placeMines(excludeR, excludeC) {
  let placed = 0;
  while (placed < game.mines) {
    const r = Math.floor(Math.random() * game.rows);
    const c = Math.floor(Math.random() * game.cols);
    // Exclude first click and its neighbors
    if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
    if (game.board[r][c].mine) continue;
    game.board[r][c].mine = true;
    placed++;
  }

  // Calculate neighbor counts
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      if (game.board[r][c].mine) continue;
      let count = 0;
      forNeighbors(r, c, (nr, nc) => {
        if (game.board[nr][nc].mine) count++;
      });
      game.board[r][c].count = count;
    }
  }
}

function forNeighbors(r, c, cb) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) {
        cb(nr, nc);
      }
    }
  }
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener('click', () => handleCellClick(r, c));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(r, c);
      });

      // Long press for flagging on mobile
      let pressTimer;
      cell.addEventListener('touchstart', (e) => {
        if (game.flagMode) return;
        pressTimer = setTimeout(() => {
          e.preventDefault();
          toggleFlag(r, c);
          pressTimer = -1;
        }, 400);
      }, { passive: false });

      cell.addEventListener('touchend', () => {
        if (pressTimer === -1) {
          // Long press already handled the flag
        }
        clearTimeout(pressTimer);
      });

      cell.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
      });

      boardEl.appendChild(cell);
    }
  }
}

function handleCellClick(r, c) {
  if (game.over) return;
  const cell = game.board[r][c];

  if (cell.revealed) return;

  if (game.flagMode) {
    toggleFlag(r, c);
    return;
  }

  if (cell.flagged) return;

  if (!game.started) {
    game.started = true;
    placeMines(r, c);
    startTimer();
  }

  if (cell.mine) {
    gameOver(r, c);
    return;
  }

  reveal(r, c);
  checkWin();
}

function toggleFlag(r, c) {
  if (game.over) return;
  const cell = game.board[r][c];
  if (cell.revealed) return;

  cell.flagged = !cell.flagged;
  game.minesLeft += cell.flagged ? -1 : 1;
  mineCountEl.textContent = game.minesLeft;
  updateCell(r, c);
}

function reveal(r, c) {
  const cell = game.board[r][c];
  if (cell.revealed || cell.flagged || cell.mine) return;

  cell.revealed = true;
  game.revealedCount++;
  updateCell(r, c);

  if (cell.count === 0) {
    forNeighbors(r, c, (nr, nc) => reveal(nr, nc));
  }
}

function updateCell(r, c) {
  const cell = game.board[r][c];
  const el = boardEl.children[r * game.cols + c];

  if (cell.flagged) {
    el.className = 'cell flagged';
    el.textContent = '🚩';
    return;
  }

  if (!cell.revealed) {
    el.className = 'cell';
    el.textContent = '';
    return;
  }

  el.classList.add('revealed');
  if (cell.count > 0) {
    el.textContent = cell.count;
    el.dataset.count = cell.count;
  } else {
    el.textContent = '';
  }
}

function checkWin() {
  if (game.revealedCount === game.totalSafe) {
    game.over = true;
    stopTimer();
    restartBtn.textContent = '😎';

    // Auto-flag remaining mines
    for (let r = 0; r < game.rows; r++) {
      for (let c = 0; c < game.cols; c++) {
        const cell = game.board[r][c];
        if (cell.mine && !cell.flagged) {
          cell.flagged = true;
          const el = boardEl.children[r * game.cols + c];
          el.className = 'cell flagged';
          el.textContent = '🚩';
        }
      }
    }
    mineCountEl.textContent = 0;

    winTimeEl.textContent = game.timer;
    setTimeout(() => winModal.classList.remove('hidden'), 300);
  }
}

function gameOver(hitR, hitC) {
  game.over = true;
  stopTimer();
  restartBtn.textContent = '😵';

  // Reveal all mines
  for (let r = 0; r < game.rows; r++) {
    for (let c = 0; c < game.cols; c++) {
      const cell = game.board[r][c];
      const el = boardEl.children[r * game.cols + c];

      if (cell.mine) {
        if (r === hitR && c === hitC) {
          el.className = 'cell revealed mine-hit';
          el.textContent = '💣';
        } else if (!cell.flagged) {
          el.className = 'cell revealed mine-show';
          el.textContent = '💣';
        }
      } else if (cell.flagged) {
        el.className = 'cell revealed';
        el.textContent = '❌';
      }
    }
  }

  setTimeout(() => loseModal.classList.remove('hidden'), 500);
}

// Timer
function startTimer() {
  game.timer = 0;
  timerEl.textContent = '000';
  game.timerInterval = setInterval(() => {
    game.timer++;
    timerEl.textContent = String(game.timer).padStart(3, '0');
    if (game.timer >= 999) stopTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(game.timerInterval);
  game.timerInterval = null;
}

// Leaderboard
async function loadLeaderboard(difficulty) {
  const listEl = document.getElementById('leaderboard-list');
  listEl.innerHTML = '<p class="loading">Loading...</p>';

  try {
    const res = await fetch(`/api/scores?difficulty=${difficulty}`);
    const scores = await res.json();

    if (!scores.length) {
      listEl.innerHTML = '<p class="empty-msg">No scores yet. Be the first!</p>';
      return;
    }

    listEl.innerHTML = scores.map((s, i) => {
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      return `
        <div class="score-row">
          <span class="score-rank ${rankClass}">#${i + 1}</span>
          <span class="score-name">${escapeHtml(s.name)}</span>
          <span class="score-time">${s.time}s</span>
        </div>
      `;
    }).join('');
  } catch {
    listEl.innerHTML = '<p class="empty-msg">Could not load scores.</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
