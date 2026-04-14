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

// Кладёт значение в первую свободную строку столбца col (сверху стека).
// Возвращает строку куда положили. Если столбец полон — кладёт в строку 0 (крайний случай).
function placeInCol(grid: Grid, col: number, value: number): number {
  for (let r = 0; r < ROWS; r++) {
    if (grid[r][col] === EMPTY) {
      grid[r][col] = value;
      return r;
    }
  }
  // Нет свободного места — сдвигаем всё вниз и кладём сверху
  for (let r = ROWS - 1; r > 0; r--) grid[r][col] = grid[r - 1][col];
  grid[0][col] = value;
  return 0;
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

  // dropCol — столбец броска, результат всегда остаётся в нём
  const dropCol = col;

  let changed = true;
  while (changed) {
    changed = false;

    // Сканируем всё поле на вертикальные пары
    outer:
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = newGrid[r][c];
        if (v === EMPTY) continue;
        if (newGrid[r + 1][c] !== v) continue;

        // Собираем горизонтальных соседей с тем же значением в строке r
        const sameRow: number[] = [c];
        let lc = c - 1;
        while (lc >= 0 && newGrid[r][lc] === v) { sameRow.unshift(lc); lc--; }
        let rc = c + 1;
        while (rc < COLS && newGrid[r][rc] === v) { sameRow.push(rc); rc++; }

        const participants = sameRow.length + 1;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) continue;

        // Убираем всех участников из строки r и нижний блок
        for (const sc of sameRow) newGrid[r][sc] = EMPTY;
        newGrid[r + 1][c] = EMPTY;

        // Применяем гравитацию — теперь в dropCol появится свободное место сверху
        applyGravity(newGrid);

        // Кладём результат на первую свободную строку в dropCol (сверху стека)
        const destRow = placeInCol(newGrid, dropCol, resultValue);

        const pts = resultValue * participants;
        scoreGained += pts;
        mergedPositions.push([destRow, dropCol]);
        mergeEvents.push({ row: destRow, col: dropCol, resultValue, participants, points: pts });

        changed = true;
        break outer;
      }
    }

    if (changed) continue;

    // Сканируем всё поле на горизонтальные пары
    outer2:
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const v = newGrid[r][c];
        if (v === EMPTY) continue;
        if (newGrid[r][c + 1] !== v) continue;

        // Горизонтальная группа начиная с c
        const group: number[] = [c];
        let rc2 = c + 1;
        while (rc2 < COLS && newGrid[r][rc2] === v) { group.push(rc2); rc2++; }

        const participants = group.length;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) { c = rc2 - 1; continue; }

        // Убираем всю группу
        for (const gc of group) newGrid[r][gc] = EMPTY;

        // Применяем гравитацию — освобождаем место
        applyGravity(newGrid);

        // Кладём результат на первую свободную строку в dropCol
        const destRow2 = placeInCol(newGrid, dropCol, resultValue);

        const pts2 = resultValue * participants;
        scoreGained += pts2;
        mergedPositions.push([destRow2, dropCol]);
        mergeEvents.push({ row: destRow2, col: dropCol, resultValue, participants, points: pts2 });

        changed = true;
        break outer2;
      }
    }
  }

  return { newGrid, scoreGained, placed: true, landRow: row, mergedPositions, mergeEvents };
}

export function isBoardFull(grid: Grid): boolean {
  return grid[ROWS - 1].every((v) => v !== EMPTY);
}