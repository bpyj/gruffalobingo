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

// who will roll next
let currentPlayer = "mouse";

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

// ----- Render Dice Key (vertical, on-screen) -----
function renderKeyHorizontal() {
  const table = document.getElementById("keyTable");
  table.innerHTML = "";

  const totals = Object.keys(sumToPicture).map(Number).sort((a,b)=>a-b);

  // Header row (totals)
  const headerRow = document.createElement("tr");
  headerRow.appendChild(document.createElement("th")); // empty corner
  totals.forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    headerRow.appendChild(th);
  });

  // Picture row
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

function takeTurn(player) {
  const actualPlayer = player;
  lastPlayerLabel.textContent = capitalize(actualPlayer);

  const d1 = rollDie();
  const d2 = rollDie();
  const total = d1 + d2;
  const picture = sumToPicture[total];

  diceResult.textContent = `Dice: ${d1} + ${d2}`;
  sumResult.textContent = `Total: ${total}`;
  pictureResult.textContent = `Picture: ${prettyNames[picture] || "-"}`;

  log(`\n${capitalize(actualPlayer)} rolled ${d1} + ${d2} = ${total}.`);

  if (!picture) {
    log("No picture for this total.");
    switchToNextPlayer(actualPlayer);
    return;
  }

  const boardPics = boards[actualPlayer];

  if (!boardPics.includes(picture)) {
    log(`${prettyNames[picture]} is NOT on ${actualPlayer}'s board.`);
    switchToNextPlayer(actualPlayer);
    return;
  }

  if (covered[actualPlayer].has(picture)) {
    log(`${prettyNames[picture]} is ALREADY covered.`);
    switchToNextPlayer(actualPlayer);
    return;
  }

  // mark this as the most recently covered picture
  lastCovered[actualPlayer] = picture;

  // cover it
  covered[actualPlayer].add(picture);
  log(`${capitalize(actualPlayer)} covers ${prettyNames[picture]}.`);
  renderBoards(); // apply .covered and .latest

  if (hasWon(actualPlayer)) {
    log(`\n*** ${capitalize(actualPlayer)} shouts "Gruffalo Bingo!" ***`);
    currentPlayerLabel.textContent = "Game over";
    // disable both board roll buttons
    document.querySelectorAll(".boardRollBtn").forEach(b => (b.disabled = true));
    return;
  }

  switchToNextPlayer(actualPlayer);
}

function switchToNextPlayer(playerJustPlayed) {
  currentPlayer = playerJustPlayed === "mouse" ? "gruffalo" : "mouse";
  currentPlayerLabel.textContent = capitalize(currentPlayer);
  updateBoardHighlight();
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

  currentPlayer = "mouse";
  currentPlayerLabel.textContent = "Mouse";
  lastPlayerLabel.textContent = "-";
  diceResult.textContent = "Dice: -";
  sumResult.textContent = "Total: -";
  pictureResult.textContent = "Picture: -";
  logDiv.textContent = "Game reset.";

  updateBoardHighlight();

  // re-enable board roll buttons
  document.querySelectorAll(".boardRollBtn").forEach(b => (b.disabled = false));

  renderBoards();
  renderPrintBoards();
}

// ----- New Boards -----
function generateNewBoards() {
  // Each board: 9 distinct pictures, drawn from the full pool.
  boards.mouse = sampleDistinct(allPicturesPool, 9);
  boards.gruffalo = sampleDistinct(allPicturesPool, 9);
  log("Generating new random boards…");
  resetGame(); // also re-renders screen & print boards
}

function log(message) {
  logDiv.textContent += message + "\n";
  logDiv.scrollTop = logDiv.scrollHeight;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function updateBoardHighlight() {
  document.getElementById("mouseBoard").classList.remove("current-turn");
  document.getElementById("gruffaloBoard").classList.remove("current-turn");

  document
    .getElementById(currentPlayer + "Board")
    .classList.add("current-turn");
}


// ----- Init -----
renderBoards();
renderKeyHorizontal();
renderPrintBoards();
renderPrintKeys();
updateBoardHighlight();      // ★ add this line
log("Game ready. Mouse starts.");

// Board-specific Roll buttons
document.querySelectorAll(".boardRollBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const player = btn.dataset.player;
    if (player !== currentPlayer) {
      log(`It's ${capitalize(currentPlayer)}'s turn.`);
      return;
    }
    takeTurn(player);
  });
});

resetBtn.addEventListener("click", resetGame);
newBoardsBtn.addEventListener("click", generateNewBoards);
printBtn.addEventListener("click", () => window.print());
