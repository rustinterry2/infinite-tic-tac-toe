/**
 * Infinite-Dimensional Tic-Tac-Toe: browser UI.
 *
 * This reproduces the two-person, one-device Pyto experience using only
 * standard HTML, CSS and SVG. No libraries, online accounts, or server calls.
 * The exact game rules are imported from engine.js.
 */
import { Game, synchronizedDigits, radialGeometry } from "./engine.js";

const game = new Game();
let initialEntry = "";
let repeatingEntry = "";
let activeField = "yellow"; // White is optional. Start on required yellow.

const $ = (id) => document.getElementById(id);
const els = {
  history: $("historyTable"),
  historyScroller: $("historyScroller"),
  graph: $("radialSvg"),
  white: $("whiteSelect"), yellow: $("yellowSelect"),
  whiteValue: $("whiteValue"), yellowValue: $("yellowValue"),
  go: $("goButton"), delete: $("deleteBtn"),
  status: $("turnStatus"), threats: $("threatStatus"), error: $("errorStatus"),
  reset: $("newGameBtn"), upperScroll: $("upperScroll")
};

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function selectField(which) {
  activeField = which;
  updateEntries();
}

function updateEntries() {
  els.white.classList.toggle("selected", activeField === "white");
  els.yellow.classList.toggle("selected", activeField === "yellow");
  els.white.setAttribute("aria-pressed", String(activeField === "white"));
  els.yellow.setAttribute("aria-pressed", String(activeField === "yellow"));
  els.whiteValue.textContent = initialEntry ? initialEntry.split("").join(",") : "Tap to enter";
  els.yellowValue.textContent = repeatingEntry ? repeatingEntry.split("").join(",") : "Tap to enter";
  // No native text inputs: pressing the keypad NEVER opens a phone keyboard.
  els.go.disabled = Boolean(game.winner);
  els.delete.disabled = Boolean(game.winner);
  document.querySelectorAll("[data-digit]").forEach(button => { button.disabled = Boolean(game.winner); });
}

function showError(message = "") {
  els.error.textContent = message;
}

function addDigit(digit) {
  if (game.winner) return;
  if (activeField === "white") initialEntry += digit;
  else repeatingEntry += digit;
  showError();
  updateEntries();
}

function deleteDigit() {
  if (game.winner) return;
  if (activeField === "white") initialEntry = initialEntry.slice(0, -1);
  else repeatingEntry = repeatingEntry.slice(0, -1);
  showError();
  updateEntries();
}

function submit() {
  try {
    game.play(initialEntry, repeatingEntry);
    initialEntry = "";
    repeatingEntry = "";
    activeField = "yellow";
    showError();
    renderAll({ scrollLatest: true });
  } catch (error) {
    // An invalid submission does not change turns or move history.
    showError(error.message);
  }
}

function resetGame() {
  game.reset();
  initialEntry = "";
  repeatingEntry = "";
  activeField = "yellow";
  showError();
  renderAll();
  els.historyScroller.scrollLeft = 0;
  els.historyScroller.scrollTop = 0;
  els.upperScroll.scrollTop = 0;
}

/**
 * A common CSS grid makes the infinite dimensions comparable vertically.
 * Each numbered coordinate is an INDIVIDUAL fixed-width cell, with cool
 * initial cells and warm repeating cells. The columns realign whenever a
 * new move increases the shared prefix or repeating period.
 */
function renderHistory(scrollLatest = false) {
  const scrollLeft = els.historyScroller.scrollLeft;
  const scrollTop = els.historyScroller.scrollTop;
  els.history.replaceChildren();

  if (!game.moves.length) {
    els.history.append(make("div", "empty-history", "No moves yet. Enter repeating digits to begin."));
    return;
  }

  const { white, yellow } = game.widths;
  const template = `29px 34px ${Array(white + yellow).fill("28px").join(" ")}`.trim();
  const makeRow = (className) => {
    const row = make("div", `history-grid-row ${className}`);
    row.style.setProperty("--grid-cols", template);
    els.history.append(row);
    return row;
  };

  // Keep the column headings precise. When a range is only 1–2 cells wide,
  // use a compact abbreviation rather than letting long text overlap.
  const header = makeRow("heading");
  header.append(make("div", "smallheading", "#"));
  header.append(make("div", "smallheading", "X/O"));
  if (white) {
    const full = `Dimensions 1–${white}`;
    const h = make("div", "range white", white < 4 ? `D1–${white}` : full);
    h.style.gridColumn = `3 / span ${white}`;
    h.title = full;
    header.append(h);
  }
  const yellowTitle = `Dimensions ${white + 1}–∞`;
  const repeatHeading = make("div", "range yellow", yellow < 5 ? `D${white + 1}–∞` : yellowTitle);
  repeatHeading.title = `${yellowTitle}, period ${yellow}`;
  repeatHeading.style.gridColumn = `${3 + white} / span ${yellow}`;
  header.append(repeatHeading);

  for (const [i, move] of game.moves.entries()) {
    const classes = game.winningIndices.includes(i) ? "winning" :
      game.threateningIndices.has(i) ? `threat-${move.player.toLowerCase()}` : "";
    const row = makeRow(classes);
    row.setAttribute("aria-label", `Move ${i + 1}, ${move.player}${classes ? ", " + classes : ""}`);
    row.append(make("div", "move-number", `${i + 1}.`));
    row.append(make("div", `move-player ${move.player.toLowerCase()}`, move.player));
    const digits = synchronizedDigits(move.position, white, yellow);
    digits.initial.forEach(digit => row.append(make("div", "coord", String(digit))));
    digits.repeating.forEach((digit, j) => row.append(make("div", `coord repeating${j === 0 ? " first-repeat" : ""}`, String(digit))));
  }

  // Preserve the user's horizontal view when a row is appended. Scroll to
  // the latest row if a move was just played, but not on ordinary refresh.
  els.historyScroller.scrollLeft = scrollLeft;
  els.historyScroller.scrollTop = scrollLatest ? els.historyScroller.scrollHeight : scrollTop;
}

/** SVG drawing helpers. SVG gives crisp circles/rays on phones and desktops. */
const svgNS = "http://www.w3.org/2000/svg";
function svgNode(name, attrs = {}) {
  const node = document.createElementNS(svgNS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

/**
 * This is an abstract artistic summary, NOT an exact board projection.
 * The repeating cycle's mean sets the mark's distance, and 1/2/3 digit
 * composition sets the ray angle. A deterministic ±10° jitter and tiny
 * nudges distinguish otherwise overlapping marks.
 *
 * Never draw ghost winning squares: the selected help mode is warning-only.
 */
function renderRadial() {
  const svg = els.graph;
  svg.replaceChildren();
  const cx = 180, cy = 96, radius = 81;

  for (const r of [radius / 3, radius * 2 / 3, radius]) {
    svg.append(svgNode("circle", { cx, cy, r, class: "radial-ring" }));
  }
  svg.append(svgNode("line", { x1: cx - radius, y1: cy, x2: cx + radius, y2: cy, class: "radial-cross" }));
  svg.append(svgNode("line", { x1: cx, y1: cy - radius, x2: cx, y2: cy + radius, class: "radial-cross" }));

  const marks = radialGeometry(game.moves, radius);
  marks.forEach((m, i) => {
    const x = cx + m.x, y = cy + m.y;
    const endx = cx + m.endpoint.x, endy = cy + m.endpoint.y;
    const color = m.player === "X" ? "#236bd8" : "#d7394d";
    const newest = i === game.moves.length - 1;
    const winning = game.winningIndices.includes(i);
    if (winning) {
      svg.append(svgNode("line", { x1: cx, y1: cy, x2: endx, y2: endy, class: "ray winning-glow" }));
      svg.append(svgNode("line", { x1: cx, y1: cy, x2: endx, y2: endy, class: "ray winning" }));
    }
    svg.append(svgNode("line", { x1: cx, y1: cy, x2: endx, y2: endy, stroke: color,
      class: `ray${newest ? " newest" : ""}` }));
    svg.append(svgNode("circle", { cx: endx, cy: endy, r: newest ? 3 : 2, fill: color, class: "ray-end" }));

    if (winning) svg.append(svgNode("circle", { cx: x, cy: y, r: 13, fill: "#e5faeb",
      stroke: "#30aa68", "stroke-width": 2, opacity: .95 }));
    else if (newest) svg.append(svgNode("circle", { cx: x, cy: y, r: 12, fill: "white", opacity: .8 }));

    const text = svgNode("text", { x, y: y + .3, fill: color, class: `move-marker${newest ? " newest" : ""}` });
    text.textContent = m.player;
    svg.append(text);
  });
}

function renderStatus() {
  const player = game.nextPlayer;
  if (game.winner) {
    els.status.textContent = `${game.winner} wins! Moves ${game.winningIndices.map(i => i + 1).join(", ")}.`;
    els.status.className = "turn-status win";
    els.threats.textContent = "";
  } else {
    els.status.textContent = `${player} to move`;
    els.status.className = `turn-status ${player.toLowerCase()}`;
    const counts = game.threatCounts;
    const warnings = ["X", "O"].filter(p => counts[p] > 0).map(p => {
      const count = counts[p];
      return `${p}: ${count} threat${count === 1 ? "" : "s"}${count > 1 ? " (fork)" : ""}`;
    });
    els.threats.textContent = warnings.join(" · ");
  }
}

function renderAll({ scrollLatest = false } = {}) {
  renderHistory(scrollLatest);
  renderRadial();
  renderStatus();
  updateEntries();
}

// Clicking a display chooses the digit destination, but never opens a keyboard.
els.white.addEventListener("click", () => selectField("white"));
els.yellow.addEventListener("click", () => selectField("yellow"));
document.querySelectorAll("[data-digit]").forEach(button =>
  button.addEventListener("click", () => addDigit(button.dataset.digit)));
els.delete.addEventListener("click", deleteDigit);
els.go.addEventListener("click", submit);
els.reset.addEventListener("click", resetGame);

// Desktop players can optionally use 1/2/3, Backspace and Enter as shortcuts.
// This is additive; touch controls remain the primary iPhone interface.
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest("button")) return;
  if (["1", "2", "3"].includes(event.key)) addDigit(event.key);
  else if (event.key === "Backspace") { event.preventDefault(); deleteDigit(); }
  else if (event.key === "Enter") submit();
});

renderAll();
