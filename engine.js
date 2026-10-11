/**
 * Infinite-Dimensional Tic-Tac-Toe: exact, browser-only game engine.
 *
 * Coordinates are eventually periodic sequences of digits 1, 2 and 3.
 * A position is stored as a canonical (prefix, cycle) pair, so different
 * textual descriptions of the SAME infinite point are equal.
 *
 * All line and threat checks are mathematically exact. No finite cutoff
 * is used to approximate the infinite board: after the longest prefix,
 * one least-common-multiple repeat cycle proves the condition forever.
 *
 * This module deliberately does not know anything about HTML or browsers.
 */

export const MAX_SHARED_PERIOD = 300;

/** Parse keypad digits or comma-separated typed digits. */
export function parseDigits(input, required = false) {
  const text = String(input ?? "").replace(/[\s,]/g, "");
  if (!text) {
    if (required) throw new Error("Enter at least one repeating digit.");
    return "";
  }
  if (!/^[123]+$/.test(text)) throw new Error("Only digits 1, 2, and 3 are allowed.");
  return text;
}

/** Compute the smallest repeated unit of a FINITE cycle. */
export function shortestPeriod(cycle) {
  if (!cycle.length) throw new Error("A repeating pattern is required.");
  for (let n = 1; n <= cycle.length; n++) {
    if (cycle.length % n !== 0) continue;
    const unit = cycle.slice(0, n);
    if (unit.repeat(cycle.length / n) === cycle) return unit;
  }
  return cycle;
}

/**
 * Move the repeat boundary left when possible, rotating the cycle so
 * the INFINITE digit sequence does not change. This yields a unique
 * minimal prefix and primitive cycle for each eventually periodic word.
 */
export function canonicalPosition(prefixInput, cycleInput) {
  let prefix = parseDigits(prefixInput);
  let cycle = shortestPeriod(parseDigits(cycleInput, true));
  while (prefix.length && prefix.at(-1) === cycle.at(-1)) {
    prefix = prefix.slice(0, -1);
    cycle = cycle.at(-1) + cycle.slice(0, -1);
  }
  return { prefix, cycle, key: `${prefix}|${cycle}` };
}

/** Return the coordinate in dimension (zero-based) without expansion. */
export function digitAt(position, dimension) {
  if (!Number.isSafeInteger(dimension) || dimension < 0) throw new Error("Invalid dimension.");
  return dimension < position.prefix.length
    ? Number(position.prefix[dimension])
    : Number(position.cycle[(dimension - position.prefix.length) % position.cycle.length]);
}

const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
export const lcm = (a, b) => (a / gcd(a, b)) * b;

/** Shared prefix and shared period to display and test infinite positions. */
export function commonWidths(positions) {
  if (!positions.length) return { white: 0, yellow: 0 };
  return {
    white: Math.max(...positions.map(p => p.prefix.length)),
    yellow: positions.reduce((acc, p) => lcm(acc, p.cycle.length), 1)
  };
}

/** Construct exactly enough digits for the shared visible columns. */
export function synchronizedDigits(position, white, yellow) {
  const initial = [];
  const repeating = [];
  for (let i = 0; i < white; i++) initial.push(digitAt(position, i));
  for (let i = white; i < white + yellow; i++) repeating.push(digitAt(position, i));
  return { initial, repeating };
}

/** Is B the unique MIDPOINT between A and C in every dimension? */
export function lineWithMidpoint(a, b, c) {
  const { white, yellow } = commonWidths([a, b, c]);
  let changed = false;
  for (let i = 0; i < white + yellow; i++) {
    const x = digitAt(a, i), y = digitAt(b, i), z = digitAt(c, i);
    if (x === y && y === z) continue;
    if (!((x === 1 && y === 2 && z === 3) ||
          (x === 3 && y === 2 && z === 1))) return false;
    changed = true;
  }
  return changed;
}

/** Move order does NOT determine who is the midpoint. */
export function winningLine(a, b, c) {
  return lineWithMidpoint(a, b, c) ||
         lineWithMidpoint(b, a, c) ||
         lineWithMidpoint(a, c, b);
}

/**
 * Find all mathematical places that could complete two existing marks.
 *
 * Three possibilities, applied in the SAME role in EVERY dimension:
 *  A midpoint: C=2A-B; B midpoint: C=2B-A; C midpoint: C=(A+B)/2.
 * If any coordinate would be invalid, that entire proposed line fails.
 * These positions remain internal: warning-only assistance must never
 * reveal the completion coordinates to the players.
 */
export function missingLinePositions(a, b) {
  if (a.key === b.key) return [];
  const { white, yellow } = commonWidths([a, b]);
  const results = new Map();
  for (const role of ["a", "b", "missing"]) {
    let prefix = "", cycle = "", valid = true;
    for (let i = 0; i < white + yellow; i++) {
      const x = digitAt(a, i), y = digitAt(b, i);
      const candidate = role === "a" ? 2 * x - y
        : role === "b" ? 2 * y - x : (x + y) / 2;
      if (!Number.isInteger(candidate) || candidate < 1 || candidate > 3) {
        valid = false;
        break;
      }
      if (i < white) prefix += candidate;
      else cycle += candidate;
    }
    if (!valid) continue;
    const position = canonicalPosition(prefix, cycle);
    if (position.key !== a.key && position.key !== b.key) results.set(position.key, position);
  }
  return [...results.values()];
}

/**
 * State machine for two people playing on ONE screen. No server, account,
 * permanent storage or network requests. A page refresh starts a new game.
 */
export class Game {
  constructor() { this.reset(); }

  reset() {
    this.moves = [];               // {player, position}
    this.occupied = new Set();
    this.winner = null;
    this.winningIndices = [];
    this.threats = { X: new Map(), O: new Map() };
    this.threateningIndices = new Set();
  }

  get nextPlayer() { return this.moves.length % 2 ? "O" : "X"; }
  get widths() { return commonWidths(this.moves.map(m => m.position)); }
  get threatCounts() { return { X: this.threats.X.size, O: this.threats.O.size }; }

  play(white, yellow) {
    if (this.winner) throw new Error("Game over. Start a new game to play again.");
    const position = canonicalPosition(white, yellow);
    if (this.occupied.has(position.key)) throw new Error("This infinite position is already occupied.");

    // Keep the exact original limit: the LCM of ALL shared periods <= 300.
    const nextPeriod = lcm(this.widths.yellow || 1, position.cycle.length);
    if (nextPeriod > MAX_SHARED_PERIOD) {
      throw new Error(`This move requires ${nextPeriod} shared repeating digits (maximum 300).`);
    }

    const player = this.nextPlayer;
    const newIndex = this.moves.length;
    const oldSamePlayer = [];
    this.moves.forEach((move, i) => { if (move.player === player) oldSamePlayer.push(i); });
    this.moves.push({ player, position });
    this.occupied.add(position.key);

    // A new win must contain the latest move; check same-player pairs.
    outer: for (let i = 0; i < oldSamePlayer.length; i++) {
      for (let j = i + 1; j < oldSamePlayer.length; j++) {
        const a = oldSamePlayer[i], b = oldSamePlayer[j];
        if (winningLine(this.moves[a].position, this.moves[b].position, position)) {
          this.winner = player;
          this.winningIndices = [a, b, newIndex];
          break outer;
        }
      }
    }

    if (this.winner) {
      this.threats = { X: new Map(), O: new Map() };
      this.threateningIndices.clear();
    } else this.recalculateThreats();
    return newIndex;
  }

  /** Count DISTINCT empty winning squares for each player, not pairs. */
  recalculateThreats() {
    const threats = { X: new Map(), O: new Map() };
    const rows = new Set();
    for (const player of ["X", "O"]) {
      const indices = this.moves.flatMap((m, i) => m.player === player ? [i] : []);
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const first = indices[i], second = indices[j];
          for (const missing of missingLinePositions(
            this.moves[first].position, this.moves[second].position)) {
            if (this.occupied.has(missing.key)) continue;
            if (!threats[player].has(missing.key)) threats[player].set(missing.key, new Set());
            threats[player].get(missing.key).add(first);
            threats[player].get(missing.key).add(second);
            rows.add(first);
            rows.add(second);
          }
        }
      }
    }
    this.threats = threats;
    this.threateningIndices = rows;
  }
}

/**
 * Visual-only radial position. The cycle's average sets the radius;
 * proportions of 1,2,3 give a composition direction.
 * The small stable hash jitter is deliberately cosmetic, not a game rule.
 */
const anchors = { 1: 210, 2: 330, 3: 90 };
const rad = degrees => degrees * Math.PI / 180;
function stableHash01(text) {
  // FNV-1a, stable across page reloads and browsers (not a security hash).
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function radialSignature(position) {
  const cycle = position.cycle;
  const counts = [1, 2, 3].map(digit => [...cycle].filter(x => Number(x) === digit).length);
  const proportions = counts.map(c => c / cycle.length);
  const average = [...cycle].reduce((s, d) => s + Number(d), 0) / cycle.length;
  const x = [1, 2, 3].reduce((s, d, i) => s + proportions[i] * Math.cos(rad(anchors[d])), 0);
  const y = [1, 2, 3].reduce((s, d, i) => s + proportions[i] * Math.sin(rad(anchors[d])), 0);
  const fraction = stableHash01(cycle);
  const baseAngle = Math.hypot(x, y) < 1e-11 ? 360 * fraction : Math.atan2(y, x) * 180 / Math.PI;
  return {
    angle: (baseAngle + 10 * (2 * fraction - 1) + 360) % 360,
    radiusFraction: (average - 1) / 2,
    average,
    proportions
  };
}

/** Arrange markers, with very small cosmetic nudges to avoid collisions. */
export function radialGeometry(moves, radius = 83) {
  const points = [];
  const xy = (a, r) => ({ x: r * Math.cos(rad(a)), y: -r * Math.sin(rad(a)) });
  for (const [index, move] of moves.entries()) {
    const signature = radialSignature(move.position);
    let angle = signature.angle, distance = signature.radiusFraction * radius;
    if (distance < .01 && points.some(p => p.displayDistance < 10)) {
      angle = (angle + index * 137.507764) % 360;
      distance = Math.min(8, radius * .045);
    }
    const gap = (pt) => Math.min(1e8, ...points.map(p => Math.hypot(pt.x - p.x, pt.y - p.y)));
    let point = xy(angle, distance);
    if (gap(point) < 17) {
      const candidates = [];
      for (const da of [0, 3, -3, 6, -6, 9, -9]) {
        for (const dr of [0, 3, -3, 6, -6]) {
          const r = Math.max(0, Math.min(radius, distance + dr));
          const a = angle + da;
          const pt = xy(a, r);
          candidates.push({ a, r, pt, gap: gap(pt), cost: Math.abs(da) + Math.abs(dr) * 1.5 });
        }
      }
      // Collision-free first; otherwise maximum clearance; then smallest nudge.
      candidates.sort((a, b) =>
        Number(b.gap >= 17) - Number(a.gap >= 17) ||
        b.gap - a.gap || a.cost - b.cost
      );
      angle = candidates[0].a;
      distance = candidates[0].r;
      point = candidates[0].pt;
    }
    const endpoint = xy(angle, radius);
    points.push({ index, player: move.player, ...point, endpoint, angle,
      displayDistance: distance, ...signature });
  }
  return points;
}
