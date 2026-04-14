import { COLS, ROWS, EMPTY, MAX_VALUE, SPAWN_VALUES, Grid, MergeEvent } from "./gameTypes";

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

export function randomValue(): number {
  return SPAWN_VALUES[Math.floor(Math.random() * SPAWN_VALUES.length)];
}

export function cloneGrid(g: Grid): Grid {
  return g.map((r) => [...r]);
}

export function applyGravity(grid: Grid) {
  for (let c = 0; c < COLS; c++) {
    const vals = grid.map((r) => r[c]).filter((v) => v !== EMPTY);
    const padded = vals.concat(Array(ROWS - vals.length).fill(EMPTY));
    for (let r = 0; r < ROWS; r++) grid[r][c] = padded[r];
  }
}

export function dropBlock(
  grid: Grid, col: number, value: number
): { newGrid: Grid; scoreGained: number; placed: boolean; landRow: number; mergedPositions: [number, number][]; mergeEvents: MergeEvent[] } {
  const newGrid = cloneGrid(grid);

  let row = -1;
  for (let r = 0; r < ROWS; r++) {
    if (newGrid[r][col] === EMPTY) { row = r; break; }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false, landRow: -1, mergedPositions: [], mergeEvents: [] };

  newGrid[row][col] = value;

  let scoreGained = 0;
  const mergedPositions: [number, number][] = [];
  const mergeEvents: MergeEvent[] = [];

  let changed = true;
  while (changed) {
    changed = false;

    // Вертикальные пары
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = newGrid[r][c];
        if (v === EMPTY) continue;
        if (newGrid[r + 1][c] !== v) continue;

        const sameRow: number[] = [c];
        let lc = c - 1;
        while (lc >= 0 && newGrid[r][lc] === v) { sameRow.unshift(lc); lc--; }
        let rc = c + 1;
        while (rc < COLS && newGrid[r][rc] === v) { sameRow.push(rc); rc++; }

        const participants = sameRow.length + 1;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) continue;

        for (const sc of sameRow) newGrid[r][sc] = EMPTY;
        newGrid[r + 1][c] = EMPTY;

        const targetCol = sameRow[0];
        newGrid[r][targetCol] = resultValue;

        const pts = resultValue * participants;
        scoreGained += pts;
        mergedPositions.push([r, targetCol]);
        mergeEvents.push({ row: r, col: targetCol, resultValue, participants, points: pts });

        applyGravity(newGrid);
        changed = true;
        break;
      }
      if (changed) break;
    }

    if (changed) continue;

    // Горизонтальные пары
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const v = newGrid[r][c];
        if (v === EMPTY) continue;
        if (newGrid[r][c + 1] !== v) continue;

        const group: number[] = [c];
        let rc2 = c + 1;
        while (rc2 < COLS && newGrid[r][rc2] === v) { group.push(rc2); rc2++; }

        const participants = group.length;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) { c = rc2 - 1; continue; }

        for (const gc of group) newGrid[r][gc] = EMPTY;
        newGrid[r][group[0]] = resultValue;

        const pts2 = resultValue * participants;
        scoreGained += pts2;
        mergedPositions.push([r, group[0]]);
        mergeEvents.push({ row: r, col: group[0], resultValue, participants, points: pts2 });

        applyGravity(newGrid);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return { newGrid, scoreGained, placed: true, landRow: row, mergedPositions, mergeEvents };
}

export function isBoardFull(grid: Grid): boolean {
  return grid[ROWS - 1].every((v) => v !== EMPTY);
}
