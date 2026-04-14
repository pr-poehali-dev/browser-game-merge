export const COLS = 5;
export const ROWS = 8;
export const EMPTY = 0;
export const MAX_VALUE = 512;
export const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
export const CELL_SIZE = 52;
export const GAP = 5;
export const BOARD_PAD = 8;

export const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  2:   { bg: "#E8F4F0", text: "#3A7A6A", border: "#C5E5DE", glow: "#7ADFC8" },
  4:   { bg: "#EAF0FB", text: "#3A5A9A", border: "#C5D5F0", glow: "#7AABF0" },
  8:   { bg: "#F5EAF8", text: "#7A3A9A", border: "#E0C5F0", glow: "#D07AF0" },
  16:  { bg: "#FDF0E8", text: "#9A5A2A", border: "#F0D5C0", glow: "#F0A06A" },
  32:  { bg: "#FEF0F0", text: "#9A3A3A", border: "#F0C5C5", glow: "#F08080" },
  64:  { bg: "#F0F8E8", text: "#4A7A2A", border: "#D0E8B8", glow: "#A0D870" },
  128: { bg: "#FFFBE8", text: "#8A7020", border: "#EEE0A0", glow: "#F0D060" },
  256: { bg: "#E8EFFA", text: "#2A4A8A", border: "#B0CAF0", glow: "#6090E0" },
  512: { bg: "#FCE8F4", text: "#8A2A6A", border: "#F0B0D8", glow: "#E070C0" },
};

export function getBlockStyle(v: number) {
  return BLOCK_COLORS[v] ?? { bg: "#F0EDEA", text: "#555", border: "#DDD", glow: "#AAA" };
}

export type Grid = number[][];
export type FlyingBlock = { id: number; value: number; col: number; targetRow: number };
export type Explosion = { id: number; x: number; y: number; color: string };
export type ScorePopup = { id: number; x: number; y: number; points: number; multiplier: number; color: string };
export type MergeEvent = { row: number; col: number; resultValue: number; participants: number; points: number };

// Один шаг анимации: состояние поля + событие слияния на этом шаге
export type MergeStep = {
  grid: Grid;
  mergeEvent: MergeEvent | null; // null = просто упал блок (без слияния)
};

export type PendingResult = {
  newGrid: Grid;
  scoreGained: number;
  newScore: number;
  mergedPositions: [number, number][];
  mergeEvents: MergeEvent[];
  steps: MergeStep[]; // пошаговые снимки для анимации
};