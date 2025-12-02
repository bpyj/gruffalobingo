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
  12: "tree"
};

// Build reverse lookup: picture → total
const pictureToTotal = {};
for (const [total, pic] of Object.entries(sumToPicture)) {
  pictureToTotal[pic] = Number(total);
}


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

// =========================
// State
// =========================
let covered = {
  mouse: new Set(),
  gruffalo: new Set()
};

let lastCovered = { mouse: null, gruffalo: null };

// Picture that the player must tap to cover (if any)
let pendingCover = { mouse: null, gruffalo: null };
// Roll info associated with that pending cover or pass
let pendingRoll = { mouse: null, gruffalo: null };
// Whether the player must press Pass (only when nothing to cover)
let passPending = { mouse: false, gruffalo: false };

let currentPlayer = "mouse";
let gameMode = "two";          // "two" or "one"
let humanSide = "mouse";       // when gameMode === "one"
let gameOver = false;

// pool of all pictures for random boards
const allPicturesPool = [...new Set(Object.values(sumToPicture))];

// =========================
// DOM references
// =========================
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

const mouseBoardEl = document.getElementById("mouseBoard");
const gruffaloBoardEl = document.getElementById("gruffaloBoard");
const mouseItemsContainer = mouseBoardEl.querySelector(".items");
const gruffaloItemsContainer = gruffaloBoardEl.querySelector(".items");

const mouseBoardLogEl = document.getElementById("mouseBoardLog");
const gruffaloBoardLogEl = document.getElementById("gruffaloBoardLog");

const boardRollBtns = document.querySelectorAll(".boardRollBtn");
const passBtns = document.querySelectorAll(".passBtn");

const modeControls = document.getElementById("modeControls");
const humanSideContainer = document.getElementById("humanSideContainer");
const modeRadios = document.querySelectorAll("input[name='gameMode']");
const humanSideRadios = document.querySelectorAll("input[name='humanSide']");

// print elements
const mouseBoardPrintContainer = document.getElementById("mouseBoardPrint");
const gruffaloBoardPrintContainer = document.getElementById("gruffaloBoardPrint");
const keyTableMousePrint = document.getElementById("keyTableMousePrint");
const keyTableGruffaloPrint = document.getElementById("keyTableGruffaloPrint");

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
  const selector =
    player === "mouse" ? ".mouseDice .die" : ".gruffaloDice .die";
  const diceEls = document.querySelectorAll(selector);
  if (diceEls.length >= 2) {
    diceEls[0].textContent = diceFace(d1);
    diceEls[1].textContent = diceFace(d2);
  }
}

// =========================
// Dice Key rendering
// =========================
function renderHorizontalKey(tableEl) {
  tableEl.innerHTML = "";
  const totals = Object.keys(sumToPicture).map(Number).sort((a, b) => a - b);

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
  renderHorizontalKey(keyTableGruffaloPrint);
}

// =========================
// Boards – screen
// =========================
function renderBoards() {
  renderBoardWithState("mouse", mouseItemsContainer);
  renderBoardWithState("gruffalo", gruffaloItemsContainer);
}

function renderBoardWithState(playerKey, container) {
  container.innerHTML = "";

  boards[playerKey].forEach((pic) => {
    const div = document.createElement("div");
    div.className = "item";
    div.dataset.player = playerKey;
    div.dataset.pic = pic;

    if (covered[playerKey].has(pic)) {
      div.classList.add("covered");
      if (lastCovered[playerKey] === pic) {
        div.classList.add("latest");
      }
    } else if (pendingCover[playerKey] === pic) {
      div.classList.add("pending"); // highlight the one to tap
    }

       // === New display format ===
    const total = pictureToTotal[pic] ?? "?";
    const pretty = prettyNames[pic] || pic;
    const icon = pretty.split(" ")[0];  // extract emoji
    div.textContent = `${total} → ${icon}`;
    
    container.appendChild(div);
  });
}

// =========================
// Boards – print
// =========================
function renderPrintBoards() {
  renderBoardPlain("mouse", mouseBoardPrintContainer);
  renderBoardPlain("gruffalo", gruffaloBoardPrintContainer);
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
  const el = player === "mouse" ? mouseBoardLogEl : gruffaloBoardLogEl;

  if (!roll) {
    el.innerText = "Roll the dice to begin!";
    return;
  }

  const { d1, d2, total, picture } = roll;
  const picLabel = picture ? prettyNames[picture] || picture : "-";

  let actionText = "";
  switch (status) {
    case "no-picture":
      actionText = "Action: No picture for this total.\nPress Pass.";
      break;
    case "not-on-board":
      actionText = "Action: Picture not on this board.\nPress Pass.";
      break;
    case "already-covered":
      actionText = "Action: Picture already covered.\nPress Pass.";
      break;
    case "tap-to-cover":
      actionText = `Action: Tap ${picLabel} to cover it.`;
      break;
    case "covered":
      actionText = `Action: ${picLabel} covered.`;
      break;
    case "pass":
      actionText = "Action: Passed.";
      break;
    case "bingo":
      actionText = `Action: ${picLabel} covered.\n🎉 Gruffalo Bingo!`;
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

  // Must finish current action (tap cover or press Pass) before rolling again
  if (!isComputer && (pendingCover[player] || passPending[player])) {
    log(
      `${capitalize(
        player
      )} must finish this turn (cover or pass) before rolling again.`
    );
    return;
  }

  const d1 = rollDie();
  const d2 = rollDie();
  const total = d1 + d2;
  const picture = sumToPicture[total];

  lastPlayerLabel.textContent = capitalize(player);

  diceResult.textContent = `Dice: ${d1} + ${d2}`;
  sumResult.textContent = `Total: ${total}`;
  pictureResult.textContent = `Picture: ${prettyNames[picture] || "-"}`;
  updateDiceIcons(player, d1, d2);

  log(`\n${capitalize(player)} rolled ${d1} + ${d2} = ${total}.`);

  const boardPics = boards[player];

  let status;
  let canCover = false;

  if (!picture) {
    status = "no-picture";
  } else if (!boardPics.includes(picture)) {
    status = "not-on-board";
  } else if (covered[player].has(picture)) {
    status = "already-covered";
  } else {
    status = "tap-to-cover";
    canCover = true;
  }

  const rollInfo = { d1, d2, total, picture };
  pendingRoll[player] = rollInfo;
  pendingCover[player] = null;
  passPending[player] = false;

  if (canCover) {
    // ---- COVER CASE ----
    if (!isHumanPlayer(player) || isComputer) {
      // Computer auto-covers
      doCover(player, rollInfo, picture);
      return;
    }

    // Human: highlight tile & wait for tap
    pendingCover[player] = picture;
    updateBoardLog(player, rollInfo, "tap-to-cover");
    renderBoards();
    updateRollButtonsEnabled();
    updatePassButtonsEnabled();
    updateBoardHighlight();
  } else {
    // ---- PASS CASE ----
    if (!isHumanPlayer(player) || isComputer) {
      // Computer auto-passes
      doPass(player, rollInfo, status);
      return;
    }

    // Human: require Pass
    passPending[player] = true;
    updateBoardLog(player, rollInfo, status);
    renderBoards();
    updateRollButtonsEnabled();
    updatePassButtonsEnabled();
    updateBoardHighlight();
  }
}

function doCover(player, rollInfo, picture) {
  lastCovered[player] = picture;
  covered[player].add(picture);
  pendingCover[player] = null;
  pendingRoll[player] = null;
  passPending[player] = false;

  log(`${capitalize(player)} covers ${prettyNames[picture]}.`);

  renderBoards();

  if (hasWon(player)) {
    log(`\n*** ${capitalize(player)} shouts "Gruffalo Bingo!" ***`);
    updateBoardLog(player, { ...rollInfo, picture }, "bingo");
    gameOver = true;
    updateRollButtonsEnabled();
    updatePassButtonsEnabled();
    updateBoardHighlight();
    return;
  }

  updateBoardLog(player, { ...rollInfo, picture }, "covered");
  switchToNextPlayer(player);
  updateRollButtonsEnabled();
  updatePassButtonsEnabled();
  updateBoardHighlight();
  maybeRunComputerTurn();
}

function doPass(player, rollInfo, status) {
  // Only valid to pass when there is nothing to cover
  log(`${capitalize(player)} passes.`);
  updateBoardLog(player, rollInfo, "pass");

  pendingRoll[player] = null;
  pendingCover[player] = null;
  passPending[player] = false;

  switchToNextPlayer(player);
  updateRollButtonsEnabled();
  updatePassButtonsEnabled();
  updateBoardHighlight();
  maybeRunComputerTurn();
}

function hasWon(playerKey) {
  return covered[playerKey].size === boards[playerKey].length;
}

function switchToNextPlayer(playerJustPlayed) {
  currentPlayer = playerJustPlayed === "mouse" ? "gruffalo" : "mouse";
  currentPlayerLabel.textContent = capitalize(currentPlayer);
}

// =========================
// Board click – human taps a cell to cover
// =========================
function handleBoardClick(event) {
  const target = event.target.closest(".item");
  if (!target) return;

  const player = target.dataset.player;
  const pic = target.dataset.pic;
  if (!player || !pic) return;

  if (gameOver) return;
  if (player !== currentPlayer) return;
  if (!isHumanPlayer(player)) return;

  // Must have something pending to cover
  if (!pendingCover[player] || pendingCover[player] !== pic) return;

  const rollInfo = pendingRoll[player];
  if (!rollInfo) return;

  doCover(player, rollInfo, pic);
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

    // We do NOT grey out based on pendingCover/passPending,
    // logic is enforced inside takeTurn().
    btn.disabled = !enabled;
  });
}

function updatePassButtonsEnabled() {
  passBtns.forEach((btn) => {
    const p = btn.dataset.player;
    let enabled =
      !gameOver &&
      passPending[p] &&
      p === currentPlayer &&
      isHumanPlayer(p);
    btn.disabled = !enabled;
  });
}

function updateBoardHighlight() {
  mouseBoardEl.classList.toggle(
    "current-turn",
    currentPlayer === "mouse" && !gameOver
  );
  gruffaloBoardEl.classList.toggle(
    "current-turn",
    currentPlayer === "gruffalo" && !gameOver
  );
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
    gruffalo: new Set()
  };
  lastCovered = { mouse: null, gruffalo: null };
  pendingCover = { mouse: null, gruffalo: null };
  pendingRoll = { mouse: null, gruffalo: null };
  passPending = { mouse: false, gruffalo: false };

  gameOver = false;
  currentPlayer = "mouse";
  currentPlayerLabel.textContent = "Mouse";
  lastPlayerLabel.textContent = "-";

  diceResult.textContent = "Dice: -";
  sumResult.textContent = "Total: -";
  pictureResult.textContent = "Picture: -";

  logDiv.textContent = "Game reset.";
  updateBoardLog("mouse", null);
  updateBoardLog("gruffalo", null);

  if (reRenderBoardsToo) {
    renderBoards();
    renderPrintBoards();
  }
  updateDiceIcons("mouse", 1, 1);
  updateDiceIcons("gruffalo", 1, 1);

  updateRollButtonsEnabled();
  updatePassButtonsEnabled();
  updateBoardHighlight();

  // if one-player and human is not Mouse, let computer start
  if (gameMode === "one" && humanSide !== "mouse") {
    currentPlayer = "mouse";
    currentPlayerLabel.textContent = "Mouse";
    updateBoardHighlight();
    maybeRunComputerTurn();
  }
}

function generateNewBoards() {
  boards.mouse = sampleDistinct(allPicturesPool, 9);
  boards.gruffalo = sampleDistinct(allPicturesPool, 9);
  log("Generating new random boards…");
  renderPrintBoards();
  resetGame(true);
}

// =========================
// Init
// =========================
function init() {
  updateDiceIcons("mouse", 1, 1);
  updateDiceIcons("gruffalo", 1, 1);
  renderBoards();
  renderPrintBoards();
  renderKeyOnScreen();
  renderPrintKeys();
  log("Game ready. Mouse starts.");

  updateBoardLog("mouse", null);
  updateBoardLog("gruffalo", null);
  updateRollButtonsEnabled();
  updatePassButtonsEnabled();
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
      if (!passPending[player]) return;
      const rollInfo = pendingRoll[player];
      if (!rollInfo) return;
      doPass(player, rollInfo, "pass");
    });
  });

  mouseBoardEl.addEventListener("click", handleBoardClick);
  gruffaloBoardEl.addEventListener("click", handleBoardClick);

  modeRadios.forEach((r) => r.addEventListener("change", handleModeChange));
  humanSideRadios.forEach((r) =>
    r.addEventListener("change", handleModeChange)
  );
}

init();
