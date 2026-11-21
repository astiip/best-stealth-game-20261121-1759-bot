// The manor garden: three levels, tile collision, line of sight and pathfinding.
// Map legend: '#' hedge wall (solid, blocks sight) '.' grass ',' flowers
// 'B' bush (walkable cover: a still moth inside cannot be seen) 'C' crate
// (solid, blocks sight) 'o' lantern post (walkable, warm light) 'P' player start
// 'M' moon-moth 'L' the lantern letter 'X' the exit gate. Guard patrols are
// waypoint lists in tile coordinates, walked with grid pathfinding so a guard
// always finds a real route around the hedges.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export const LEVELS = [
  {
    name: 'Moonlit Lawn',
    par: 75,
    guards: [
      { waypoints: [[5, 2], [18, 2], [18, 5], [5, 5]], patrol: 55, chase: 132 },
      { waypoints: [[4, 10], [10, 10], [10, 12], [4, 12]], patrol: 52, chase: 128 },
    ],
    map: [
      '########################',
      '#P....,.......#....M...#',
      '#.....,...B...#........#',
      '#..##......#..#...##...#',
      '#..##..o...#......##...#',
      '#......B....#..B.......#',
      '#.####.....##.....#....#',
      '#....#.....##..M..#..L.#',
      '#....#..B.......#......#',
      '#.B.....#....#..#..B...#',
      '#....#..#....#.....#...#',
      '#.......#....#..##.....#',
      '#..B....#..M....#..o...#',
      '#.......#.......#....X.#',
      '########################',
    ],
  },
  {
    name: 'Rose Maze',
    par: 90,
    guards: [
      { waypoints: [[3, 2], [11, 2], [11, 6], [3, 6]], patrol: 62, chase: 142 },
      { waypoints: [[15, 2], [20, 2], [20, 8], [15, 8]], patrol: 60, chase: 140 },
      { waypoints: [[4, 10], [10, 10], [10, 13], [4, 13]], patrol: 58, chase: 138 },
    ],
    map: [
      '########################',
      '#P...B....#.....M......#',
      '#....#....#..##....B...#',
      '#.##.#.B..#..##..o.....#',
      '#.##....C....#.........#',
      '#....###.....#..B..##..#',
      '#.B......#...#.....##..#',
      '#..####..#...#..M..#..L#',
      '#.......B#...#....##...#',
      '#.##....#....#.....#...#',
      '#.##.B..#..C....B......#',
      '#....#.....##....#..#..#',
      '#.M..#..B..##..o.#..#..#',
      '#....#......#.....#..X##',
      '########################',
    ],
  },
  {
    name: 'Lantern Court',
    par: 105,
    guards: [
      { waypoints: [[2, 2], [10, 2], [10, 5], [3, 5]], patrol: 72, chase: 158 },
      { waypoints: [[13, 2], [21, 2], [21, 6], [13, 6]], patrol: 70, chase: 155 },
      { waypoints: [[2, 9], [10, 9], [10, 13], [3, 13]], patrol: 68, chase: 152 },
      { waypoints: [[14, 9], [20, 12], [15, 12], [20, 9]], patrol: 70, chase: 156 },
    ],
    map: [
      '########################',
      '#P..B...#...M....#..B..#',
      '#..##...#.......#......#',
      '#..##.B.#..##...#..o...#',
      '#......#.#..##..#......#',
      '#.C....#....#...#..B...#',
      '#..###..B...#...#......#',
      '#......#....#..M...#..L#',
      '#.B....#..C.#......#...#',
      '#..##..#....#..B...#...#',
      '#..##.....##....#......#',
      '#.o....B..##..#...##...#',
      '#..###.....#..#..M.#...#',
      '#......#...#.....#...#X#',
      '########################',
    ],
  },
];

/** Small deterministic random generator, so a staged scene always looks alike. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tileChar(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

export function isSolidChar(ch) {
  return ch === '#' || ch === 'C';
}

export function blocksSightChar(ch) {
  return ch === '#' || ch === 'C';
}

export function isWalkable(level, tx, ty) {
  return !isSolidChar(tileChar(level, tx, ty));
}

/** Read a level's map into spawn points, moths, the letter and the exit gate. */
export function parseLevel(def) {
  const found = { player: null, moths: [], letter: null, exit: null, lanterns: [] };
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const ch = def.map[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (ch === 'P') found.player = { x: cx, y: cy };
      else if (ch === 'M') found.moths.push({ x: cx, y: cy, taken: false, phase: (x * 7 + y * 13) % 10 });
      else if (ch === 'L') found.letter = { x: cx, y: cy, taken: false };
      else if (ch === 'X') found.exit = { x: cx, y: cy };
      else if (ch === 'o') found.lanterns.push({ x: cx, y: cy });
    }
  }
  return found;
}

/** Move a circle against solid tiles, axis by axis, so it slides along walls. */
export function moveCircle(level, x, y, dx, dy, radius) {
  let nx = x + dx;
  if (circleHitsWall(level, nx, y, radius)) nx = x;
  let ny = y + dy;
  if (circleHitsWall(level, nx, ny, radius)) ny = y;
  return { x: nx, y: ny };
}

export function circleHitsWall(level, x, y, radius) {
  const x0 = Math.floor((x - radius) / TILE);
  const x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE);
  const y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!isSolidChar(tileChar(level, tx, ty))) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

/** True when no hedge or crate stands between the two points. */
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const ch = tileChar(level, Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE));
    if (blocksSightChar(ch)) return false;
  }
  return true;
}

/**
 * Breadth-first path across walkable tiles, returned as a list of pixel
 * centres from the start tile to the goal tile (empty when unreachable).
 */
export function findPath(level, sx, sy, tx, ty) {
  const startX = Math.floor(sx / TILE);
  const startY = Math.floor(sy / TILE);
  const goalX = Math.floor(tx / TILE);
  const goalY = Math.floor(ty / TILE);
  if (!isWalkable(level, goalX, goalY) || !isWalkable(level, startX, startY)) return [];
  const key = (x, y) => y * COLS + x;
  const came = new Map([[key(startX, startY), -1]]);
  const queue = [[startX, startY]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === goalX && cy === goalY) break;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(level, nx, ny) || came.has(key(nx, ny))) continue;
      came.set(key(nx, ny), key(cx, cy));
      queue.push([nx, ny]);
    }
  }
  if (!came.has(key(goalX, goalY))) return [];
  const tiles = [];
  let cur = key(goalX, goalY);
  while (cur !== -1) {
    tiles.push([cur % COLS, Math.floor(cur / COLS)]);
    cur = came.get(cur);
  }
  tiles.reverse();
  tiles.shift();
  return tiles.map(([tx2, ty2]) => ({ x: tx2 * TILE + TILE / 2, y: ty2 * TILE + TILE / 2 }));
}
