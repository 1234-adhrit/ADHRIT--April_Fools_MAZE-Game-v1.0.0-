const LEVELS = [
  { cols: 8, rows: 8 },
  { cols: 11, rows: 11 },
  { cols: 14, rows: 14 }
];

const REVERSED_CONTROLS = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
  w: [0, 1],
  s: [0, -1],
  a: [1, 0],
  d: [-1, 0]
};

const canvas = document.getElementById("mazeCanvas");
const ctx = canvas.getContext("2d");
const levelValue = document.getElementById("levelValue");
const moveValue = document.getElementById("moveValue");
const timeValue = document.getElementById("timeValue");
const hintText = document.getElementById("hintText");

const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const overlay = document.getElementById("messageOverlay");
const overlayCard = document.getElementById("overlayCard");
const overlayKicker = document.getElementById("overlayKicker");
const overlayTitle = document.getElementById("overlayTitle");
const overlayBody = document.getElementById("overlayBody");
const overlayButton = document.getElementById("overlayButton");

let currentLevel = 0;
let maze = [];
let player = { x: 0, y: 0 };
let exitCell = { x: 0, y: 0 };
let moves = 0;
let startedAt = null;
let timerId = null;
let gameStarted = false;
let canMove = false;
let audioContext = null;
let animationStarted = false;
let prizeTimeoutId = null;
let revealTimeoutId = null;

function createGrid(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
      visited: false
    }))
  );
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateMaze(cols, rows) {
  const grid = createGrid(cols, rows);
  carvePassages(0, 0, grid, cols, rows);
  return grid;
}

function carvePassages(x, y, grid, cols, rows) {
  grid[y][x].visited = true;

  const directions = shuffle([
    { dx: 0, dy: -1, wall: "top", opposite: "bottom" },
    { dx: 1, dy: 0, wall: "right", opposite: "left" },
    { dx: 0, dy: 1, wall: "bottom", opposite: "top" },
    { dx: -1, dy: 0, wall: "left", opposite: "right" }
  ]);

  directions.forEach(({ dx, dy, wall, opposite }) => {
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || grid[ny][nx].visited) {
      return;
    }

    grid[y][x][wall] = false;
    grid[ny][nx][opposite] = false;
    carvePassages(nx, ny, grid, cols, rows);
  });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const size = Math.min(rect.width, 720);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawFrame();
}

function drawFrame() {
  if (!maze.length) {
    return;
  }

  const cols = maze[0].length;
  const rows = maze.length;
  const displaySize = canvas.width / (window.devicePixelRatio || 1);
  const cellSize = displaySize / cols;

  ctx.clearRect(0, 0, displaySize, displaySize);

  const gradient = ctx.createLinearGradient(0, 0, displaySize, displaySize);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#0b1220");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, displaySize, displaySize);

  ctx.fillStyle = "rgba(134, 239, 172, 0.20)";
  ctx.fillRect(exitCell.x * cellSize + 6, exitCell.y * cellSize + 6, cellSize - 12, cellSize - 12);

  ctx.lineWidth = Math.max(2, cellSize * 0.08);
  ctx.strokeStyle = "#ffe8cf";
  ctx.lineCap = "round";

  maze.forEach((row, y) => {
    row.forEach((cell, x) => {
      const px = x * cellSize;
      const py = y * cellSize;

      if (cell.top) {
        line(px, py, px + cellSize, py);
      }
      if (cell.right) {
        line(px + cellSize, py, px + cellSize, py + cellSize);
      }
      if (cell.bottom) {
        line(px, py + cellSize, px + cellSize, py + cellSize);
      }
      if (cell.left) {
        line(px, py, px, py + cellSize);
      }
    });
  });

  const pulse = 0.78 + Math.sin(performance.now() / 140) * 0.1;
  const playerSize = cellSize * 0.56 * pulse;
  const playerX = player.x * cellSize + (cellSize - playerSize) / 2;
  const playerY = player.y * cellSize + (cellSize - playerSize) / 2;

  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.roundRect(playerX, playerY, playerSize, playerSize, cellSize * 0.18);
  ctx.fill();

  ctx.fillStyle = "#fff6db";
  ctx.beginPath();
  ctx.arc(
    player.x * cellSize + cellSize / 2,
    player.y * cellSize + cellSize / 2,
    cellSize * 0.11,
    0,
    Math.PI * 2
  );
  ctx.fill();

}

function startAnimationLoop() {
  if (animationStarted) {
    return;
  }

  animationStarted = true;

  function animate() {
    drawFrame();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function startLevel(levelIndex, resetStats = false) {
  currentLevel = levelIndex;
  const { cols, rows } = LEVELS[currentLevel];
  maze = generateMaze(cols, rows);
  player = { x: 0, y: 0 };
  exitCell = { x: cols - 1, y: rows - 1 };

  if (resetStats) {
    moves = 0;
    startedAt = Date.now();
    updateTimer();
  }

  canMove = true;
  levelValue.textContent = `${currentLevel + 1} / ${LEVELS.length}`;
  moveValue.textContent = String(moves);
  hintText.textContent =
    currentLevel === LEVELS.length - 1
      ? "Final maze. A mysterious reward is waiting at the exit."
      : "Reach the glowing square. The keyboard lies to you.";

  resizeCanvas();
}

function updateTimer() {
  if (!startedAt) {
    timeValue.textContent = "00:00";
    return;
  }

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  timeValue.textContent = `${minutes}:${seconds}`;
}

function beginGame() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audioContext && AudioContextClass) {
    audioContext = new AudioContextClass();
  }
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }

  clearPendingPrank();
  overlay.classList.add("overlay-hidden");
  overlayCard.classList.remove("prank-mode", "reveal-mode");
  overlayButton.textContent = "Play";
  overlayButton.disabled = false;
  document.body.classList.remove("flash-mode");

  gameStarted = true;
  canMove = true;

  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
  startLevel(0, true);
}

function resetGame() {
  clearPendingPrank();

  if (!gameStarted) {
    overlayButton.disabled = false;
    startIntro();
    return;
  }

  overlay.classList.add("overlay-hidden");
  overlayCard.classList.remove("prank-mode", "reveal-mode");
  overlayButton.disabled = false;
  document.body.classList.remove("flash-mode");
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
  startLevel(0, true);
}

function startIntro() {
  showOverlay({
    kicker: "Ready?",
    title: "Welcome to the maze.",
    body: "Use your backwards brain, survive three levels, and claim your definitely normal prize.",
    buttonText: "Play",
    mode: ""
  });
}

function showOverlay({ kicker, title, body, buttonText, mode }) {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayButton.textContent = buttonText;
  overlayButton.disabled = false;
  overlayCard.classList.remove("prank-mode", "reveal-mode");
  if (mode) {
    overlayCard.classList.add(mode);
  }
  overlay.classList.remove("overlay-hidden");
}

function tryMove(dx, dy) {
  if (!canMove || !maze.length) {
    return;
  }

  const cell = maze[player.y][player.x];
  let allowed = false;

  if (dx === 0 && dy === -1 && !cell.top) {
    allowed = true;
  } else if (dx === 1 && dy === 0 && !cell.right) {
    allowed = true;
  } else if (dx === 0 && dy === 1 && !cell.bottom) {
    allowed = true;
  } else if (dx === -1 && dy === 0 && !cell.left) {
    allowed = true;
  }

  if (!allowed) {
    hintText.textContent = "Bonk. The wall wins this round.";
    return;
  }

  player.x += dx;
  player.y += dy;
  moves += 1;
  moveValue.textContent = String(moves);
  hintText.textContent = "Keep going. Your muscle memory is your enemy.";

  if (player.x === exitCell.x && player.y === exitCell.y) {
    handleLevelComplete();
  }
}

function handleLevelComplete() {
  canMove = false;

  if (currentLevel < LEVELS.length - 1) {
    showOverlay({
      kicker: "Level Cleared",
      title: `Maze ${currentLevel + 1} complete`,
      body: "The prank is getting stronger. Ready for the next one?",
      buttonText: "Next Maze",
      mode: ""
    });
    overlayButton.onclick = () => {
      overlay.classList.add("overlay-hidden");
      startLevel(currentLevel + 1, false);
    };
    return;
  }

  clearInterval(timerId);
  showOverlay({
    kicker: "Congratulations",
    title: "Prize loading...",
    body: "Please wait while we prepare your totally wholesome reward package.",
    buttonText: "Preparing...",
    mode: ""
  });
  overlayButton.disabled = true;

  prizeTimeoutId = setTimeout(triggerPrank, 1700);
}

function triggerPrank() {
  prizeTimeoutId = null;
  document.body.classList.add("flash-mode");
  playPrankSound();
  showOverlay({
    kicker: "Surprise",
    title: "BOO!",
    body: "APRIL FOOLS. You beat the maze and unlocked the least trustworthy reward on the internet.",
    buttonText: "Okay, that was funny",
    mode: "prank-mode"
  });
  overlayButton.disabled = true;
  overlayButton.onclick = null;

  revealTimeoutId = setTimeout(() => {
    revealTimeoutId = null;
    overlayCard.classList.remove("prank-mode");
    overlayCard.classList.add("reveal-mode");
    overlayKicker.textContent = "April Fools";
    overlayTitle.textContent = "You survived the prank";
    overlayBody.textContent =
      `Finished in ${timeValue.textContent} with ${moves} moves. Screenshot this and ship it to GitHub.`;
    overlayButton.textContent = "Play Again";
    overlayButton.disabled = false;
    overlayButton.onclick = () => {
      document.body.classList.remove("flash-mode");
      resetGame();
    };
  }, 2000);
}

function playPrankSound() {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const master = audioContext.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
  master.connect(audioContext.destination);

  const osc1 = audioContext.createOscillator();
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(220, now);
  osc1.frequency.exponentialRampToValueAtTime(640, now + 0.18);
  osc1.frequency.exponentialRampToValueAtTime(120, now + 0.75);
  osc1.connect(master);

  const osc2 = audioContext.createOscillator();
  osc2.type = "square";
  osc2.frequency.setValueAtTime(180, now);
  osc2.frequency.exponentialRampToValueAtTime(420, now + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(90, now + 0.75);
  osc2.connect(master);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.8);
  osc2.stop(now + 0.8);
}

function handleKeydown(event) {
  if (!gameStarted) {
    return;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const move = REVERSED_CONTROLS[key];
  if (!move) {
    return;
  }

  event.preventDefault();
  tryMove(move[0], move[1]);
}

function clearPendingPrank() {
  if (prizeTimeoutId) {
    clearTimeout(prizeTimeoutId);
    prizeTimeoutId = null;
  }

  if (revealTimeoutId) {
    clearTimeout(revealTimeoutId);
    revealTimeoutId = null;
  }
}

startButton.addEventListener("click", () => {
  overlayButton.onclick = beginGame;
  beginGame();
});

resetButton.addEventListener("click", resetGame);

overlayButton.onclick = beginGame;
window.addEventListener("keydown", handleKeydown, { passive: false });
window.addEventListener("resize", resizeCanvas);

startIntro();
startLevel(0, true);
startAnimationLoop();
