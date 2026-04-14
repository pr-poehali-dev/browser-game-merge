import { COLS, ROWS, EMPTY, MAX_VALUE, SPAWN_VALUES, Grid, MergeEvent, MergeStep, SlideAnim } from "./gameTypes";

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

// Добавляет блок в столбец сверху и применяет гравитацию.
// Возвращает итоговую строку где оказался блок.
function placeInCol(grid: Grid, col: number, value: number): number {
  // Считаем сколько блоков уже есть в колонке
  const count = grid.filter(row => row[col] !== EMPTY).length;
  if (count >= ROWS) {
    // Столбец полон — кладём в строку 0 (будет вытолкнуто)
    grid[0][col] = value;
    applyGravity(grid);
    return 0;
  }
  // Новый блок падает сверху: кладём в строку 0, гравитация опустит его на место
  // Используем временную метку чтобы найти блок после гравитации
  // Кладём как EMPTY+1 временно — нет, просто считаем позицию
  // После гравитации блок будет на строке = count (0-indexed сверху)
  const targetRow = count; // блок займёт строку count (следующая свободная)
  grid[targetRow][col] = value;
  applyGravity(grid);
  // После гравитации найдём где блок (ищем снизу, берём первый = самый нижний свободный)
  // На самом деле после applyGravity он уже на targetRow т.к. гравитация стабилизирована
  return targetRow;
}

export function dropBlock(
  grid: Grid, col: number, value: number
): { newGrid: Grid; scoreGained: number; placed: boolean; landRow: number; mergedPositions: [number, number][]; mergeEvents: MergeEvent[]; steps: MergeStep[] } {
  const newGrid = cloneGrid(grid);

  let row = -1;
  for (let r = 0; r < ROWS; r++) {
    if (newGrid[r][col] === EMPTY) { row = r; break; }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false, landRow: -1, mergedPositions: [], mergeEvents: [], steps: [] };

  newGrid[row][col] = value;

  // Очки: кол-во слияний за ход = N, итог = N * N
  const counter = { merges: 0 };
  const mergedPositions: [number, number][] = [];
  const mergeEvents: MergeEvent[] = [];
  const steps: MergeStep[] = [];

  // dropCol — столбец броска.
  // Правило: если слияние включает dropCol → результат в dropCol.
  // Если слияние не включает dropCol → результат в ближайший к dropCol столбец пары.
  const dropCol = col;

  // Шаг 0: блок упал, слияний ещё нет
  steps.push({ grid: cloneGrid(newGrid), mergeEvent: null, slides: [] });

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

        // Собираем горизонтальных соседей из ОБЕИХ строк пары (r и r+1)
        const rowTop: number[] = [c];
        let lc = c - 1;
        while (lc >= 0 && newGrid[r][lc] === v) { rowTop.unshift(lc); lc--; }
        let rc = c + 1;
        while (rc < COLS && newGrid[r][rc] === v) { rowTop.push(rc); rc++; }

        const rowBot: number[] = [];
        let lc2 = c - 1;
        while (lc2 >= 0 && newGrid[r + 1][lc2] === v) { rowBot.unshift(lc2); lc2--; }
        let rc2 = c + 1;
        while (rc2 < COLS && newGrid[r + 1][rc2] === v) { rowBot.push(rc2); rc2++; }

        const participants = rowTop.length + 1 + rowBot.length;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) continue;

        // Определяем куда кладём результат:
        // - если пара включает dropCol → в dropCol
        // - иначе → в ближайший к dropCol столбец среди участников
        const pairInvolvesDropCol = rowTop.includes(dropCol) || c === dropCol || rowBot.includes(dropCol);
        const allParticipantCols = [...rowTop, ...rowBot]; // все горизонтальные столбцы пары
        const targetCol = pairInvolvesDropCol
          ? dropCol
          : allParticipantCols.reduce((best, pc) => Math.abs(pc - dropCol) < Math.abs(best - dropCol) ? pc : best, c);

        // Слайды: все участники летят к targetCol
        const slides1: SlideAnim[] = [];
        for (const sc of rowTop) if (sc !== targetCol) slides1.push({ value: v, fromCol: sc, fromRow: r, toCol: targetCol, toRow: r });
        if (c !== targetCol) slides1.push({ value: v, fromCol: c, fromRow: r + 1, toCol: targetCol, toRow: r });
        for (const sc of rowBot) if (sc !== targetCol) slides1.push({ value: v, fromCol: sc, fromRow: r + 1, toCol: targetCol, toRow: r });

        // Убираем всех участников
        for (const sc of rowTop) newGrid[r][sc] = EMPTY;
        newGrid[r + 1][c] = EMPTY;
        for (const sc of rowBot) newGrid[r + 1][sc] = EMPTY;

        const destRow = placeInCol(newGrid, targetCol, resultValue);

        counter.merges += 1;
        const ev1: MergeEvent = { row: destRow, col: targetCol, resultValue, participants, points: 0 };
        mergedPositions.push([destRow, targetCol]);
        mergeEvents.push(ev1);
        steps.push({ grid: cloneGrid(newGrid), mergeEvent: ev1, slides: slides1 });

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

        const group: number[] = [c];
        let rc2 = c + 1;
        while (rc2 < COLS && newGrid[r][rc2] === v) { group.push(rc2); rc2++; }

        const participants = group.length;
        const resultValue = v * Math.pow(2, participants - 1);
        if (resultValue > MAX_VALUE) { c = rc2 - 1; continue; }

        const groupInvolvesDropCol = group.includes(dropCol);
        // Результат — в dropCol если он в группе, иначе в ближайший к dropCol столбец группы
        const targetCol2 = groupInvolvesDropCol
          ? dropCol
          : group.reduce((best, gc) => Math.abs(gc - dropCol) < Math.abs(best - dropCol) ? gc : best, group[0]);

        const slides2: SlideAnim[] = group
          .filter(gc => gc !== targetCol2)
          .map(gc => ({ value: v, fromCol: gc, fromRow: r, toCol: targetCol2, toRow: r }));

        for (const gc of group) newGrid[r][gc] = EMPTY;
        const destRow2 = placeInCol(newGrid, targetCol2, resultValue);

        counter.merges += 1;
        const ev2: MergeEvent = { row: destRow2, col: targetCol2, resultValue, participants, points: 0 };
        mergedPositions.push([destRow2, targetCol2]);
        mergeEvents.push(ev2);
        steps.push({ grid: cloneGrid(newGrid), mergeEvent: ev2, slides: slides2 });

        changed = true;
        break outer2;
      }
    }
  }

  // Итоговые очки: N слияний = N * N
  const n = counter.merges;
  const totalScore = n * n;

  // Распределяем очки по событиям (для всплывающих попапов)
  mergeEvents.forEach((ev, i) => {
    // Последнее слияние показывает все очки с множителем, остальные — 0
    (ev as { points: number }).points = i === mergeEvents.length - 1 ? totalScore : 0;
  });

  return { newGrid, scoreGained: totalScore, placed: true, landRow: row, mergedPositions, mergeEvents, steps };
}

export function isBoardFull(grid: Grid): boolean {
  return grid[ROWS - 1].every((v) => v !== EMPTY);
}