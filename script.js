// =========================
// Data
// =========================
const sumToPicture = {
  2: "mushroom",
  3: "frog",
  4: "pine_cone",
  5: "owl",
  6: "flowers",
  7: "fox",
  8: "brown_leaf",
  9: "snake",
  10: "green_leaves",
  11: "red_squirrel",
  12: "tree",
};

// Initial 9-item boards (3×3)
const boards = {
  mouse: [
    "frog",
    "pine_cone",
    "tree",
    "fox",
    "green_leaves",
    "flowers",
    "mushroom",
    "snake",
    "red_squirrel",
  ],
  fox: [
    "owl",
    "tree",
    "frog",
    "mushroom",
    "pine_cone",
    "green_leaves",
    "flowers",
    "brown_leaf",
    "red_squirrel",
  ],
};

const prettyNames = {
  mushroom: "🍄 Mushroom",
  frog: "🐸 Frog",
  pine_cone: "🌰 Pine Cone",
  owl: "🦉 Owl",
  flowers: "🌼 Flowers",
  fox: "🦊 Fox",
  brown_leaf: "🍁 Brown Leaf",
  snake: "🐍 Snake",
  green_leaves: "🍃 Green Leaves",
  red_squirrel: "🐿️ Red Squirrel",
  tree: "🌲 Tree",
};

// emoji-only version for on-screen cards
const prettyIcons = {
  mushroom: "🍄",
  frog: "🐸",
  pine_cone: "🌰",
  owl: "🦉",
  flowers: "🌼",
  fox: "🦊",
  brown_leaf: "🍁",
  snake: "🐍",
  green_leaves: "🍃",
  red_squirrel: "🐿️",
  tree: "🌲",
};

// picture → total
const pictureToTotal = {};
Object.entries(sumToPicture).forEach(([total, pic]) => {
  pictureToTotal[pic] = Number(total);
});

// =========================
// State
// =========================
let covered = {
  mouse: new Set(),
  fox: new Set(),
};

let lastCovered = { mouse: null, fox: null };

// Last roll info waiting for a decision (Pass or Cover-by-tap)
let pendingRoll = { mouse: null, fox: null };

// Which picture to highlight as "candidate to cover"
let pendingHighlight = { mouse: null, fox: null };

// Whether the player still has to Pass / Tap
let decisionPending = { mouse: false, fox: false };

let currentPlayer = "mouse";
let gameMode = "two"; // "two" or "one"
let humanSide = "mouse"; // "mouse" or "fox"
let gameOver = false;
let difficultyMode = "hard"; // "easy" or "hard"

let winner = null;

// Pool of all pictures for random boards
const allPicturesPool = [...new Set(Object.values(sumToPicture))];

// For "easy" mode, forbid certain sums (2, 12 → mushroom, tree)
const easyForbiddenSums = [2, 12];
const easyForbiddenPics = easyForbiddenSums
  .map((s) => sumToPicture[s])
  .filter((p) => !!p);

function getPicturePool() {
  if (difficultyMode === "easy") {
    // exclude forbidden pictures
    return allPicturesPool.filter((pic) => !easyForbiddenPics.includes(pic));
  }
  // hard mode → full pool
  return [...allPicturesPool];
}

// =========================
// DOM references
// =========================
const keyTable = document.getElementById("keyTable");
const resetBtn = document.getElementById("resetBtn");
const newBoardsBtn = document.getElementById("newBoardsBtn");
const printBtn = document.getElementById("printBtn");
const logDiv = document.getElementById("log");

const mouseBoardEl = document.getElementById("mouseBoard");
const foxBoardEl = document.getElementById("foxBoard");
const mouseItemsContainer = mouseBoardEl.querySelector(".items");
const foxItemsContainer = foxBoardEl.querySelector(".items");

const mouseBoardLogEl = document.getElementById("mouseBoardLog");
const foxBoardLogEl = document.getElementById("foxBoardLog");

const boardRollBtns = document.querySelectorAll(".boardRollBtn");
const passBtns = document.querySelectorAll(".passBtn");

const modeControls = document.getElementById("modeControls");
const humanSideContainer = document.getElementById("humanSideContainer");
const modeRadios = document.querySelectorAll("input[name='gameMode']");
const humanSideRadios = document.querySelectorAll("input[name='humanSide']");
const hintRadios = document.querySelectorAll("input[name='showHints']");
const difficultyRadios = document.querySelectorAll("input[name='difficulty']");

// print elements
const mouseBoardPrintContainer = document.getElementById("mouseBoardPrint");
const foxBoardPrintContainer = document.getElementById("foxBoardPrint");
const keyTableMousePrint = document.getElementById("keyTableMousePrint");
const keyTableFoxPrint = document.getElementById("keyTableFoxPrint");

// =========================
// Helpers
// =========================
function sampleDistinct(arr, n) {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function log(message) {
  logDiv.textContent += message + "\n";
  logDiv.scrollTop = logDiv.scrollHeight;
}

function diceFace(num) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[num - 1] || "⚀";
}

function updateDiceIcons(player, d1, d2) {
  const selector = player === "mouse" ? ".mouseDice .die" : ".foxDice .die";
  const diceEls = document.querySelectorAll(selector);
  if (diceEls.length >= 2) {
    diceEls[0].textContent = diceFace(d1);
    diceEls[1].textContent = diceFace(d2);
  }
}

// show/hide board logs based on hint toggle
function updateHintVisibility() {
  const hintValue = [...hintRadios].find((r) => r.checked)?.value || "on";
  const show = hintValue === "on";
  mouseBoardLogEl.style.display = show ? "block" : "none";
  foxBoardLogEl.style.display = show ? "block" : "none";
}

// =========================
// Dice Key rendering
// =========================
function renderHorizontalKey(tableEl) {
  tableEl.innerHTML = "";
  const totals = Object.keys(sumToPicture)
    .map(Number)
    .sort((a, b) => a - b);

  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // corner cell
  totals.forEach((t) => {
    const th = document.createElement("th");
    th.textContent = t;
    headerRow.appendChild(th);
  });

  const picRow = document.createElement("tr");
  const labelCell = document.createElement("th");
  labelCell.textContent = "Picture";
  picRow.appendChild(labelCell);

  totals.forEach((t) => {
    const td = document.createElement("td");
    const picId = sumToPicture[t];
    td.textContent = prettyNames[picId] || picId;
    picRow.appendChild(td);
  });

  tableEl.appendChild(headerRow);
  tableEl.appendChild(picRow);
}

function renderKeyOnScreen() {
  renderHorizontalKey(keyTable);
}

function renderPrintKeys() {
  renderHorizontalKey(keyTableMousePrint);
  renderHorizontalKey(keyTableFoxPrint);
}

// =========================
// Boards – screen
// =========================
function renderBoards() {
  renderBoardWithState("mouse", mouseItemsContainer);
  renderBoardWithState("fox", foxItemsContainer);
}

function renderBoardWithState(playerKey, container) {
  container.innerHTML = "";

  boards[playerKey].forEach((pic) => {
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.player = playerKey;
    div.dataset.pic = pic;

    const total = pictureToTotal[pic] ?? "?";

    if (covered[playerKey].has(pic)) {
      div.classList.add("covered");
      if (lastCovered[playerKey] === pic) {
        div.classList.add("latest");
      }
    } else if (pendingHighlight[playerKey] === pic) {
      div.classList.add("pending");
    }

    // Show "number → emoji" only, no name
    const icon = prettyIcons[pic] || pic;
    div.textContent = `${total} → ${icon}`;

    container.appendChild(div);
  });
}

// =========================
// Boards – print
// =========================
function renderPrintBoards() {
  renderBoardPlain("mouse", mouseBoardPrintContainer);
  renderBoardPlain("fox", foxBoardPrintContainer);
}

function renderBoardPlain(playerKey, container) {
  container.innerHTML = "";
  boards[playerKey].forEach((pic) => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = prettyNames[pic] || pic;
    container.appendChild(div);
  });
}

// =========================
// Board logs inside boards
// =========================
function updateBoardLog(player, roll, status) {
  const el = player === "mouse" ? mouseBoardLogEl : foxBoardLogEl;

  if (!roll) {
    el.innerText = "Roll the dice to begin!";
    return;
  }

  const { d1, d2, total, picture } = roll;
  const picLabel = picture ? prettyNames[picture] || picture : "-";

  let actionText = "";
  switch (status) {
    case "no-picture":
      actionText = "Action: No picture for this total.";
      break;
    case "not-on-board":
      actionText = "Action: Picture not on this board.";
      break;
    case "already-covered":
      actionText = "Action: Picture already covered.";
      break;
    case "can-cover":
      actionText = `Action: Tap ${picLabel} to cover it, or Pass.`;
      break;
    case "covered":
      actionText = `Action: ${picLabel} covered.`;
      break;
    case "pass":
      actionText = "Action: Passed.";
      break;
    case "bingo":
      actionText = `Action: ${picLabel} covered. 🎉 Forest Bingo!`;
      break;
    default:
      actionText = "";
  }

  el.innerText =
    `Dice: ${d1} + ${d2}\n` +
    `Total: ${total}\n` +
    `Picture: ${picLabel}\n` +
    actionText;
}

// =========================
// Game Logic
// =========================
function isHumanPlayer(player) {
  if (gameMode === "two") return true;
  return player === humanSide;
}

function takeTurn(player, isComputer = false) {
  if (gameOver) return;

  // Must decide (tap/pass) before rolling again
  if (!isComputer && decisionPending[player]) {
    log(
      `${capitalize(
        player
      )} must tap to cover or press Pass before rolling again.`
    );
    return;
  }

  const d1 = rollDie();
  const d2 = rollDie();
  const total = d1 + d2;
  const picture = sumToPicture[total];

  updateDiceIcons(player, d1, d2);
  log(`\n${capitalize(player)} rolled ${d1} + ${d2} = ${total}.`);

  let canCover = false;
  let reason = "";
  const boardPics = boards[player];

  if (!picture) {
    reason = "no-picture";
  } else if (!boardPics.includes(picture)) {
    reason = "not-on-board";
  } else if (covered[player].has(picture)) {
    reason = "already-covered";
  } else {
    canCover = true;
    reason = "can-cover";
  }

  const rollInfo = { d1, d2, total, picture, canCover, reason };
  pendingRoll[player] = rollInfo;
  decisionPending[player] = true;

  // Highlight the tile if it can be covered
  pendingHighlight[player] = canCover ? picture : null;
  renderBoards();

  // Computer turn → auto-decide
  if (!isHumanPlayer(player) || isComputer) {
    if (canCover) {
      applyCover(player, rollInfo);
    } else {
      completeTurnAsPass(player, rollInfo);
    }
    return;
  }

  // Human: show log and wait for tap or Pass
  updateBoardLog(player, rollInfo, reason);
  updateDecisionButtons();
  updateRollButtonsEnabled();
  updateBoardHighlight();
}

// -------------------------
// Confetti Helpers
// -------------------------
function triggerConfettiFor(player) {
  const boardEl = player === "mouse" ? mouseBoardEl : foxBoardEl;
  if (!boardEl) return;

  const container = boardEl.querySelector(".confetti-container");
  if (!container) return;

  // Clear any old confetti
  container.innerHTML = "";

  const colors = ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"];
  const pieceCount = 80;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";

    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    piece.style.backgroundColor = color;

    // Random horizontal position
    const left = Math.random() * 100;
    piece.style.left = left + "%";

    // Start slightly above the board
    piece.style.top = "-10px";

    // Random timing
    const delay = Math.random() * 0.5; // 0–0.5s
    const duration = 1 + Math.random(); // 1–2s
    piece.style.animationDelay = delay + "s";
    piece.style.animationDuration = duration + "s";

    container.appendChild(piece);
  }
}


function applyCover(player, rollInfo) {
  const { picture } = rollInfo;
  if (!picture) return;

  lastCovered[player] = picture;
  covered[player].add(picture);

  log(`${capitalize(player)} covers ${prettyNames[picture]}.`);

  renderBoards();

  if (hasWon(player)) {
    log(`*** ${capitalize(player)} shouts "Forest Bingo!" ***`);
    updateBoardLog(player, rollInfo, "bingo");

    gameOver = true;
    winner = player;

    // 🎉 Trigger confetti for the winning board
    triggerConfettiFor(player);

    updateRollButtonsEnabled();
    updateBoardHighlight(); // keep highlight on winner
    return;
  }

  updateBoardLog(player, rollInfo, "covered");
  decisionPending[player] = false;
  pendingRoll[player] = null;
  pendingHighlight[player] = null;

  switchToNextPlayer(player);
  updateDecisionButtons();
  updateRollButtonsEnabled();
  updateBoardHighlight();
  maybeRunComputerTurn();
}

function completeTurnAsPass(player, rollInfo) {
  updateBoardLog(player, rollInfo, "pass");
  decisionPending[player] = false;
  pendingRoll[player] = null;
  pendingHighlight[player] = null;

  switchToNextPlayer(player);
  updateDecisionButtons();
  updateRollButtonsEnabled();
  updateBoardHighlight();
  maybeRunComputerTurn();
}

function hasWon(playerKey) {
  return covered[playerKey].size === boards[playerKey].length;
}

function switchToNextPlayer(playerJustPlayed) {
  currentPlayer = playerJustPlayed === "mouse" ? "fox" : "mouse";
}

// board click → human taps a cell to cover
function handleBoardClick(event) {
  const target = event.target.closest(".item");
  if (!target) return;

  const player = target.dataset.player;
  const pic = target.dataset.pic;
  if (!player || !pic) return;

  if (player !== currentPlayer || gameOver) return;
  if (!isHumanPlayer(player)) return;
  if (!decisionPending[player]) return;

  const rollInfo = pendingRoll[player];
  if (!rollInfo) return;
  if (!rollInfo.canCover || rollInfo.picture !== pic) return;

  // Now apply cover
  applyCover(player, rollInfo);
}

// =========================
// UI Helpers
// =========================
function updateRollButtonsEnabled() {
  boardRollBtns.forEach((btn) => {
    const player = btn.dataset.player;
    let enabled = !gameOver;

    if (gameMode === "two") {
      enabled = enabled && player === currentPlayer;
    } else {
      if (player !== humanSide) {
        enabled = false;
      } else {
        enabled = enabled && player === currentPlayer;
      }
    }

    // We do NOT disable based on decisionPending,
    // so the box never fades; logic is blocked in takeTurn().
    btn.disabled = !enabled;
  });
}

function updateDecisionButtons() {
  passBtns.forEach((btn) => {
    const p = btn.dataset.player;
    let enabled =
      !gameOver &&
      decisionPending[p] &&
      p === currentPlayer &&
      isHumanPlayer(p) &&
      // only allow Pass if there's nothing to cover
      (pendingRoll[p] && !pendingRoll[p].canCover);
    btn.disabled = !enabled;
  });
}

function updateBoardHighlight() {
  // If the game has ended and we have a winner
  if (gameOver && winner) {
    const mouseWin = winner === "mouse";
    const foxWin = winner === "fox";

    // Winner board stays highlighted AND pulses
    mouseBoardEl.classList.toggle("current-turn", mouseWin);
    mouseBoardEl.classList.toggle("winner", mouseWin);

    foxBoardEl.classList.toggle("current-turn", foxWin);
    foxBoardEl.classList.toggle("winner", foxWin);

    return;
  }

  // Normal gameplay (no winner yet)
  mouseBoardEl.classList.remove("winner");
  foxBoardEl.classList.remove("winner");

  mouseBoardEl.classList.toggle("current-turn", currentPlayer === "mouse");
  foxBoardEl.classList.toggle("current-turn", currentPlayer === "fox");
}

function handleModeChange() {
  const modeValue = [...modeRadios].find((r) => r.checked)?.value || "two";
  gameMode = modeValue;

  if (gameMode === "one") {
    modeControls.classList.add("one-player");
    humanSideContainer.style.display = "inline";
  } else {
    modeControls.classList.remove("one-player");
    humanSideContainer.style.display = "none";
  }

  const sideValue =
    [...humanSideRadios].find((r) => r.checked)?.value || "mouse";
  humanSide = sideValue;

  resetGame(false);
  updateRollButtonsEnabled();
  updateBoardHighlight();
}

function handleDifficultyChange() {
  const diffValue =
    [...difficultyRadios].find((r) => r.checked)?.value || "hard";
  difficultyMode = diffValue;
  // regenerate boards to respect the new difficulty
  generateNewBoards();
}

function handleHintChange() {
  updateHintVisibility();
}

function maybeRunComputerTurn() {
  if (gameMode !== "one" || gameOver) return;
  if (currentPlayer === humanSide) return;

  setTimeout(() => {
    if (!gameOver && currentPlayer !== humanSide) {
      takeTurn(currentPlayer, true);
    }
  }, 600);
}

// =========================
// Reset & New Boards
// =========================
function resetGame(reRenderBoardsToo = true) {
  covered = {
    mouse: new Set(),
    fox: new Set(),
  };
  lastCovered = { mouse: null, fox: null };
  pendingRoll = { mouse: null, fox: null };
  pendingHighlight = { mouse: null, fox: null };
  decisionPending = { mouse: false, fox: false };

  gameOver = false;
  currentPlayer = "mouse";
  winner = null;

  // 🔁 Clear confetti from both boards
  const mouseConfetti = mouseBoardEl.querySelector(".confetti-container");
  const foxConfetti = foxBoardEl.querySelector(".confetti-container");
  if (mouseConfetti) mouseConfetti.innerHTML = "";
  if (foxConfetti) foxConfetti.innerHTML = "";

  logDiv.textContent = "Game reset.";
  updateBoardLog("mouse", null);
  updateBoardLog("fox", null);

  if (reRenderBoardsToo) {
    renderBoards();
    renderPrintBoards();
  }
  updateDiceIcons("mouse", 1, 1);
  updateDiceIcons("fox", 1, 1);

  updateRollButtonsEnabled();
  updateDecisionButtons();
  updateBoardHighlight();

  if (gameMode === "one" && humanSide !== "mouse") {
    currentPlayer = "mouse";
    updateBoardHighlight();
    maybeRunComputerTurn();
  }
}

function generateNewBoards() {
  const pool = getPicturePool();
  // safety: make sure we have enough distinct pictures
  if (pool.length < 9) {
    console.warn(
      "Not enough pictures in pool for 3×3 boards with current difficulty."
    );
    return;
  }
  boards.mouse = sampleDistinct(pool, 9);
  boards.fox = sampleDistinct(pool, 9);
  log(
    "Generating new " +
      (difficultyMode === "easy" ? "EASY" : "HARD") +
      " boards…"
  );
  renderPrintBoards();
  resetGame(true);
}

// =========================
// Init
// =========================
function init() {
  updateDiceIcons("mouse", 1, 1);
  updateDiceIcons("fox", 1, 1);
  renderBoards();
  renderPrintBoards();
  renderKeyOnScreen();
  renderPrintKeys();
  log("Game ready. Mouse starts.");

  updateBoardLog("mouse", null);
  updateBoardLog("fox", null);
  updateHintVisibility();
  updateRollButtonsEnabled();
  updateDecisionButtons();
  updateBoardHighlight();

  resetBtn.addEventListener("click", () => resetGame(true));
  newBoardsBtn.addEventListener("click", generateNewBoards);
  printBtn.addEventListener("click", () => window.print());

  boardRollBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = btn.dataset.player;
      if (!player || gameOver) return;

      if (gameMode === "one" && player !== humanSide) return;
      if (player !== currentPlayer) return;

      takeTurn(player, false);
    });
  });

  passBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = btn.dataset.player;
      if (!player || gameOver) return;
      if (player !== currentPlayer) return;
      if (!isHumanPlayer(player)) return;
      const rollInfo = pendingRoll[player];
      if (!rollInfo || rollInfo.canCover) return;
      completeTurnAsPass(player, rollInfo);
    });
  });

  mouseBoardEl.addEventListener("click", handleBoardClick);
  foxBoardEl.addEventListener("click", handleBoardClick);

  modeRadios.forEach((r) => r.addEventListener("change", handleModeChange));
  humanSideRadios.forEach((r) =>
    r.addEventListener("change", handleModeChange)
  );
  difficultyRadios.forEach((r) =>
    r.addEventListener("change", handleDifficultyChange)
  );
  hintRadios.forEach((r) => r.addEventListener("change", handleHintChange));
}

init();
