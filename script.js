// ----- Data -----
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
  12: "tree"
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
    "red_squirrel"
  ],
  gruffalo: [
    "owl",
    "tree",
    "frog",
    "mushroom",
    "pine_cone",
    "green_leaves",
    "flowers",
    "brown_leaf",
    "red_squirrel"
  ]
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
  tree: "🌲 Tree"
};

let covered = {
  mouse: new Set(),
  gruffalo: new Set()
};

let lastCovered = { mouse: null, gruffalo: null };

// game mode / players
let gameMode = "two";          // "two" or "one"
let humanPlayer = "mouse";     // used in 1-player mode
let computerPlayer = "gruffalo";
let currentPlayer = "mouse";   // whose turn it is
let gameOver = false;

// ----- DOM refs -----
const keyTable = document.getElementById("keyTable");
const currentPlayerLabel = document.getElementById("currentPlayerLabel");
const lastPlayerLabel = document.getElementById("lastPlayerLabel");
const resetBtn = document.getElementById("resetBtn");
const newBoardsBtn = document.getElementById("newBoardsBtn");
const printBtn = document.getElementById("printBtn");
const diceResult = document.getElementById("diceResult");
const sumResult = document.getElementById("sumResult");
const pictureResult = document.getElementById("pictureResult");
const logDiv = document.getElementById("log");

const modeControls = document.getElementById("modeControls");
const humanSideContainer = document.getElementById("humanSideContainer");
const modeRadios = document.querySelectorAll('input[name="gameMode"]');
const humanSideRadios = document.querySelectorAll('input[name="humanSide"]');
const boardRollButtons = document.querySelectorAll(".boardRollBtn");

// ----- Helpers -----
const allPicturesPool = [...new Set(Object.values(sumToPicture))];

function sampleDistinct(arr, n) {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// read mode + side from UI
function readModeFromUI() {
  const mode = [...modeRadios].find(r => r.checked)?.value || "two";
  gameMode = mode;

  if (mode === "one") {
    const side = [...humanSideRadios].find(r => r.checked)?.value || "mouse";
    humanPlayer = side;
    computerPlayer = side === "mouse" ? "gruffalo" : "mouse";
    modeControls.classList.add("one-player");      // show human side controls
  } else {
    gameMode = "two";
    humanPlayer = null;
    computerPlayer = null;
    modeControls.classList.remove("one-player");
  }
}

function resetBoardLogs() {
  const mouseLog = document.getElementById("mouseBoardLog");
  const gruffLog = document.getElementById("gruffaloBoardLog");
  if (mouseLog) mouseLog.textContent = "Roll the dice to begin!";
  if (gruffLog) gruffLog.textContent = "Roll the dice to begin!";
}


// highlight current player's board
function updateBoardHighlight() {
  const mouseBoard = document.getElementById("mouseBoard");
  const gruffaloBoard = document.getElementById("gruffaloBoard");

  mouseBoard.classList.toggle("current-turn", currentPlayer === "mouse");
  gruffaloBoard.classList.toggle("current-turn", currentPlayer === "gruffalo");
}


// adjust which buttons are enabled based on mode & gameOver
function updateRollButtonsEnabled() {
  boardRollButtons.forEach(btn => {
    const p = btn.dataset.player;

    if (gameOver) {
      btn.disabled = true;
      return;
    }

    if (gameMode === "one" && p === computerPlayer) {
      // computer's board cannot be clicked
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  });
}

// ----- Render Dice Key (horizontal, on-screen) -----
function renderKeyHorizontal() {
  const table = keyTable;
  table.innerHTML = "";

  const totals = Object.keys(sumToPicture).map(Number).sort((a, b) => a - b);

  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // empty corner
  totals.forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    headerRow.appendChild(th);
  });

  const pictureRow = document.createElement("tr");
  const labelCell = document.createElement("th");
  labelCell.textContent = "Picture";
  pictureRow.appendChild(labelCell);

  totals.forEach(t => {
    const td = document.createElement("td");
    td.textContent = prettyNames[sumToPicture[t]];
    pictureRow.appendChild(td);
  });

  table.appendChild(headerRow);
  table.appendChild(pictureRow);
}

function dieFace(n) {
  const faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  return faces[n - 1] || "🎲";
}


// ----- Render Boards (screen) -----
function renderBoards() {
  renderBoardWithCovered("mouse", document.querySelector("#mouseBoard .items"));
  renderBoardWithCovered("gruffalo", document.querySelector("#gruffaloBoard .items"));
}

function renderBoardWithCovered(playerKey, container) {
  container.innerHTML = "";
  boards[playerKey].forEach(pic => {
    const div = document.createElement("div");
    div.className = "item";

    if (covered[playerKey].has(pic)) {
      div.classList.add("covered");
      if (lastCovered[playerKey] === pic) {
        div.classList.add("latest");
      }
    }

    div.textContent = prettyNames[pic] || pic;
    container.appendChild(div);
  });
}

// ----- Render PRINT boards (no covered marks) -----
function renderPrintBoards() {
  renderBoardPlain("mouse", document.getElementById("mouseBoardPrint"));
  renderBoardPlain("gruffalo", document.getElementById("gruffaloBoardPrint"));
}

function renderBoardPlain(playerKey, container) {
  container.innerHTML = "";
  boards[playerKey].forEach(pic => {
    const div = document.createElement("div");
    div.className = "item";
    div.textContent = prettyNames[pic] || pic;
    container.appendChild(div);
  });
}

// ----- Render horizontal dice keys for print -----
function renderHorizontalKey(tableEl) {
  tableEl.innerHTML = "";
  const totals = Object.keys(sumToPicture).map(Number).sort((a, b) => a - b);

  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // empty corner
  totals.forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    headerRow.appendChild(th);
  });

  const picRow = document.createElement("tr");
  const labelCell = document.createElement("th");
  labelCell.textContent = "Picture";
  picRow.appendChild(labelCell);

  totals.forEach(t => {
    const td = document.createElement("td");
    const picId = sumToPicture[t];
    td.textContent = prettyNames[picId] || picId;
    picRow.appendChild(td);
  });

  tableEl.appendChild(headerRow);
  tableEl.appendChild(picRow);
}

function renderPrintKeys() {
  renderHorizontalKey(document.getElementById("keyTableMousePrint"));
  renderHorizontalKey(document.getElementById("keyTableGruffaloPrint"));
}

// ----- Game Logic -----
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

// display current player's log
function updateBoardLog(player, d1, d2, total, pictureId, actionText) {
  const el = document.getElementById(player + "BoardLog");
  if (!el) return;

  const pictureLabel = pictureId
    ? (prettyNames[pictureId] || pictureId)
    : "-";

  el.innerText =
    `Dice: ${d1} + ${d2}\n` +
    `Total: ${total}\n` +
    `Picture: ${pictureLabel}\n` +
    `Action: ${actionText}`;
}

function takeTurn(player) {
  if (gameOver) return;

  const actualPlayer = player;
  lastPlayerLabel.textContent = capitalize(actualPlayer);

  const d1 = rollDie();
  const d2 = rollDie();
  const total = d1 + d2;
  const picture = sumToPicture[total];

  // Update the button for this player to show dice icons
  const btn = document.querySelector(`.boardRollBtn[data-player="${actualPlayer}"]`);
  if (btn) {
    btn.innerHTML = `
      <span class="die-face">${dieFace(d1)}</span>
      <span class="die-face">${dieFace(d2)}</span>
    `;
  }

  log(`\n${capitalize(actualPlayer)} rolled ${d1} + ${d2} = ${total}.`);

  diceResult.textContent = `Dice: ${d1} + ${d2}`;
  sumResult.textContent = `Total: ${total}`;
  pictureResult.textContent = `Picture: ${prettyNames[picture] || "-"}`;

  if (!picture) {
    log("No picture for this total.");
    updateBoardLog(actualPlayer, d1, d2, total, null, "No picture for this total");
    switchToNextPlayer(actualPlayer);
    return;
  }

  const boardPics = boards[actualPlayer];

  if (!boardPics.includes(picture)) {
    log(`${prettyNames[picture]} is NOT on ${actualPlayer}'s board.`);
    updateBoardLog(actualPlayer, d1, d2, total, picture, "Not on board");
    switchToNextPlayer(actualPlayer);
    return;
  }

  if (covered[actualPlayer].has(picture)) {
    log(`${prettyNames[picture]} is ALREADY covered.`);
    updateBoardLog(actualPlayer, d1, d2, total, picture, "Already covered");
    switchToNextPlayer(actualPlayer);
    return;
  }

  // mark latest cover
  lastCovered[actualPlayer] = picture;
  covered[actualPlayer].add(picture);

  log(`${capitalize(actualPlayer)} covers ${prettyNames[picture]}.`);
  updateBoardLog(actualPlayer, d1, d2, total, picture, `${prettyNames[picture]} covered`);

  renderBoards();

  if (hasWon(actualPlayer)) {
    log(`\n*** ${capitalize(actualPlayer)} shouts "Gruffalo Bingo!" ***`);
    updateBoardLog(actualPlayer, d1, d2, total, picture, "🎉 Gruffalo Bingo!");
    gameOver = true;
    updateRollButtonsEnabled();
    updateBoardHighlight();
    return;
  }

  switchToNextPlayer(actualPlayer);
}




function switchToNextPlayer(playerJustPlayed) {
  if (gameOver) return;

  currentPlayer = playerJustPlayed === "mouse" ? "gruffalo" : "mouse";
  currentPlayerLabel.textContent = capitalize(currentPlayer);
  updateBoardHighlight();

  // In 1-player mode, auto-roll for computer
  if (gameMode === "one" && currentPlayer === computerPlayer) {
    setTimeout(() => {
      if (!gameOver && currentPlayer === computerPlayer) {
        takeTurn(computerPlayer);
      }
    }, 600);
  }
}

function hasWon(playerKey) {
  return covered[playerKey].size === boards[playerKey].length;
}

function resetGame() {
  covered = {
    mouse: new Set(),
    gruffalo: new Set()
  };
  lastCovered = { mouse: null, gruffalo: null };
  gameOver = false;

  if (gameMode === "one" && humanPlayer) {
    currentPlayer = humanPlayer;
  } else {
    currentPlayer = "mouse";
  }

  currentPlayerLabel.textContent = capitalize(currentPlayer);
  lastPlayerLabel.textContent = "-";
  diceResult.textContent = "Dice: -";
  sumResult.textContent = "Total: -";
  pictureResult.textContent = "Picture: -";
  logDiv.textContent = "Game reset.";

  resetBoardLogs();

  // Reset the buttons back to "Roll Dice"
  document.querySelectorAll(".boardRollBtn").forEach(btn => {
    btn.textContent = "Roll Dice";
  });

  renderBoards();
  renderPrintBoards();
  updateBoardHighlight();
  updateRollButtonsEnabled();

  if (gameMode === "one" && currentPlayer === computerPlayer) {
    setTimeout(() => {
      if (!gameOver && currentPlayer === computerPlayer) {
        takeTurn(computerPlayer);
      }
    }, 600);
  }
}


// ----- New Boards -----
function generateNewBoards() {
  boards.mouse = sampleDistinct(allPicturesPool, 9);
  boards.gruffalo = sampleDistinct(allPicturesPool, 9);
  log("Generating new random boards…");
  resetGame();
}

function log(message) {
  logDiv.textContent += message + "\n";
  logDiv.scrollTop = logDiv.scrollHeight;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----- Init -----
renderBoards();        // initial (will be overwritten by reset)
renderKeyHorizontal();
renderPrintBoards();
renderPrintKeys();

// read initial mode from UI + apply
readModeFromUI();
resetGame();
log(
  gameMode === "two"
    ? "2-player mode. Mouse starts."
    : `1-player mode. You play ${capitalize(humanPlayer)}.`
);

// Board-specific Roll buttons
boardRollButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const player = btn.dataset.player;

    if (gameOver) {
      log("Game is over. Please reset.");
      return;
    }

    if (gameMode === "one" && player !== humanPlayer) {
      log("In 1-player mode only your board can be used.");
      return;
    }

    if (player !== currentPlayer) {
      log(`It's ${capitalize(currentPlayer)}'s turn.`);
      return;
    }

    takeTurn(player);
  });
});

// Mode change handlers
modeRadios.forEach(r => {
  r.addEventListener("change", () => {
    readModeFromUI();
    resetGame();
  });
});

humanSideRadios.forEach(r => {
  r.addEventListener("change", () => {
    readModeFromUI();
    resetGame();
  });
});

resetBtn.addEventListener("click", resetGame);
newBoardsBtn.addEventListener("click", generateNewBoards);
printBtn.addEventListener("click", () => window.print());
