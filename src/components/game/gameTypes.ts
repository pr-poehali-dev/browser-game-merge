export const SHOW_NUMBERS = true;

export const COLS = 5;
export const ROWS = 7;
export const EMPTY = 0;
export const MAX_VALUE = Infinity;
export const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
export const CELL_SIZE = 64;
export const GAP = 5;
export const BOARD_PAD = 6;

// Цвета как на скрине: матовые насыщенные, без каёмки, текст белый
export const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  2:    { bg: "#C8A838", text: "#fff", border: "transparent", glow: "#C8A838" }, // жёлтый
  4:    { bg: "#C87030", text: "#fff", border: "transparent", glow: "#C87030" }, // оранжевый
  8:    { bg: "#A83030", text: "#fff", border: "transparent", glow: "#A83030" }, // красный
  16:   { bg: "#5C3A90", text: "#fff", border: "transparent", glow: "#5C3A90" }, // фиолетовый
  32:   { bg: "#2E5FA8", text: "#fff", border: "transparent", glow: "#2E5FA8" }, // синий
  64:   { bg: "#2E7A3C", text: "#fff", border: "transparent", glow: "#2E7A3C" }, // зелёный
  128:  { bg: "#A86820", text: "#fff", border: "transparent", glow: "#A86820" }, // янтарный
  256:  { bg: "#1E6E8A", text: "#fff", border: "transparent", glow: "#1E6E8A" }, // голубой
  512:  { bg: "#8A2060", text: "#fff", border: "transparent", glow: "#8A2060" }, // малиновый
  1024: { bg: "#3A3AA0", text: "#fff", border: "transparent", glow: "#3A3AA0" }, // индиго
  2048: { bg: "#1E8A4A", text: "#fff", border: "transparent", glow: "#1E8A4A" }, // изумрудный
  4096: { bg: "#B85018", text: "#fff", border: "transparent", glow: "#B85018" }, // терракота
  8192: { bg: "#8A1818", text: "#fff", border: "transparent", glow: "#8A1818" }, // тёмно-красный
};

const DYNAMIC_PALETTE = [
  { bg: "#C8A838", text: "#fff", border: "transparent", glow: "#C8A838" },
  { bg: "#C87030", text: "#fff", border: "transparent", glow: "#C87030" },
  { bg: "#A83030", text: "#fff", border: "transparent", glow: "#A83030" },
  { bg: "#5C3A90", text: "#fff", border: "transparent", glow: "#5C3A90" },
  { bg: "#2E5FA8", text: "#fff", border: "transparent", glow: "#2E5FA8" },
  { bg: "#2E7A3C", text: "#fff", border: "transparent", glow: "#2E7A3C" },
  { bg: "#A86820", text: "#fff", border: "transparent", glow: "#A86820" },
  { bg: "#1E6E8A", text: "#fff", border: "transparent", glow: "#1E6E8A" },
];

export function getBlockStyle(v: number) {
  if (BLOCK_COLORS[v]) return BLOCK_COLORS[v];
  const level = Math.round(Math.log2(v));
  return DYNAMIC_PALETTE[level % DYNAMIC_PALETTE.length];
}

export type Grid = number[][];
export type FlyingBlock = { id: number; value: number; col: number; targetRow: number };
export type Explosion = { id: number; x: number; y: number; color: string };
export type ScorePopup = { id: number; x: number; y: number; points: number; multiplier: number; color: string };
export type MergeEvent = { row: number; col: number; resultValue: number; participants: number; points: number };

export type SlideAnim = { value: number; fromCol: number; fromRow: number; toCol: number; toRow: number };

export type MergeStep = {
  grid: Grid;
  mergeEvent: MergeEvent | null;
  slides: SlideAnim[];
};

export type PendingResult = {
  newGrid: Grid;
  scoreGained: number;
  newScore: number;
  mergedPositions: [number, number][];
  mergeEvents: MergeEvent[];
  steps: MergeStep[];
};