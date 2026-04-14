export const COLS = 5;
export const ROWS = 8;
export const EMPTY = 0;
export const MAX_VALUE = Infinity;
export const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
export const CELL_SIZE = 64;
export const GAP = 5;
export const BOARD_PAD = 6;

// Каждый номинал — уникальный насыщенный цвет для тренировки глаза колориста.
// Соседние значения из разных частей спектра, но между близкими есть тонкая разница.
export const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  2:    { bg: "#D6EAF8", text: "#1A5276", border: "#A9CCE3", glow: "#5DADE2" }, // холодный голубой
  4:    { bg: "#D1F2EB", text: "#0E6655", border: "#A2D9CE", glow: "#1ABC9C" }, // мятно-зелёный
  8:    { bg: "#D5F5E3", text: "#1E8449", border: "#A9DFBF", glow: "#27AE60" }, // ярко-зелёный
  16:   { bg: "#FDFDE7", text: "#7D6608", border: "#F9E79F", glow: "#F1C40F" }, // насыщенный жёлтый
  32:   { bg: "#FDEBD0", text: "#784212", border: "#FAD7A0", glow: "#E67E22" }, // тёплый оранжевый
  64:   { bg: "#FADBD8", text: "#7B241C", border: "#F5B7B1", glow: "#E74C3C" }, // красный
  128:  { bg: "#F9EBEA", text: "#922B21", border: "#F1948A", glow: "#C0392B" }, // тёмно-красный
  256:  { bg: "#F5EEF8", text: "#6C3483", border: "#D2B4DE", glow: "#9B59B6" }, // фиолетовый
  512:  { bg: "#EBF5FB", text: "#154360", border: "#AED6F1", glow: "#2980B9" }, // синий
  1024: { bg: "#E8F8F5", text: "#0B5345", border: "#A2D9CE", glow: "#16A085" }, // тёмный бирюзовый
  2048: { bg: "#FEF9E7", text: "#7E5109", border: "#FAD7A0", glow: "#D4AC0D" }, // золотой
  4096: { bg: "#FDEDEC", text: "#78281F", border: "#F5CBA7", glow: "#BA4A00" }, // терракота
  8192: { bg: "#EBF5FB", text: "#212F3D", border: "#85C1E9", glow: "#1F618D" }, // глубокий синий
};

// Палитра для значений выше известных — циклически по спектру
const DYNAMIC_PALETTE = [
  { bg: "#D6EAF8", text: "#1A5276", border: "#A9CCE3", glow: "#5DADE2" },
  { bg: "#D1F2EB", text: "#0E6655", border: "#A2D9CE", glow: "#1ABC9C" },
  { bg: "#F5EAF8", text: "#7A3A9A", border: "#E0C5F0", glow: "#D07AF0" },
  { bg: "#FDF0E8", text: "#9A5A2A", border: "#F0D5C0", glow: "#F0A06A" },
  { bg: "#FEF0F0", text: "#9A3A3A", border: "#F0C5C5", glow: "#F08080" },
  { bg: "#F0F8E8", text: "#4A7A2A", border: "#D0E8B8", glow: "#A0D870" },
  { bg: "#FFFBE8", text: "#8A7020", border: "#EEE0A0", glow: "#F0D060" },
  { bg: "#E8EFFA", text: "#2A4A8A", border: "#B0CAF0", glow: "#6090E0" },
];

export function getBlockStyle(v: number) {
  if (BLOCK_COLORS[v]) return BLOCK_COLORS[v];
  // Для любого значения выше известных — берём цвет по индексу степени двойки
  const level = Math.round(Math.log2(v));
  return DYNAMIC_PALETTE[level % DYNAMIC_PALETTE.length];
}

export type Grid = number[][];
export type FlyingBlock = { id: number; value: number; col: number; targetRow: number };
export type Explosion = { id: number; x: number; y: number; color: string };
export type ScorePopup = { id: number; x: number; y: number; points: number; multiplier: number; color: string };
export type MergeEvent = { row: number; col: number; resultValue: number; participants: number; points: number };

// Блок скользит из fromCol/fromRow → toCol/toRow
export type SlideAnim = { value: number; fromCol: number; fromRow: number; toCol: number; toRow: number };

// Один шаг анимации: состояние поля + событие слияния на этом шаге
export type MergeStep = {
  grid: Grid;
  mergeEvent: MergeEvent | null; // null = просто упал блок (без слияния)
  slides: SlideAnim[];           // какие блоки куда скользят на этом шаге
};

export type PendingResult = {
  newGrid: Grid;
  scoreGained: number;
  newScore: number;
  mergedPositions: [number, number][];
  mergeEvents: MergeEvent[];
  steps: MergeStep[]; // пошаговые снимки для анимации
};