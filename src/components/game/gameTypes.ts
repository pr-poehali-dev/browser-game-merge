export const SHOW_NUMBERS = true;

export const COLS = 5;
export const ROWS = 8;
export const EMPTY = 0;
export const MAX_VALUE = Infinity;
export const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
export const CELL_SIZE = 64;
export const GAP = 5;
export const BOARD_PAD = 6;

export const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  2:    { bg: "#E8F4F0", text: "#3A7A6A", border: "#C5E5DE", glow: "#7ADFC8" },
  4:    { bg: "#EAF0FB", text: "#3A5A9A", border: "#C5D5F0", glow: "#7AABF0" },
  8:    { bg: "#F5EAF8", text: "#7A3A9A", border: "#E0C5F0", glow: "#D07AF0" },
  16:   { bg: "#FDF0E8", text: "#9A5A2A", border: "#F0D5C0", glow: "#F0A06A" },
  32:   { bg: "#FEF0F0", text: "#9A3A3A", border: "#F0C5C5", glow: "#F08080" },
  64:   { bg: "#F0F8E8", text: "#4A7A2A", border: "#D0E8B8", glow: "#A0D870" },
  128:  { bg: "#FFFBE8", text: "#8A7020", border: "#EEE0A0", glow: "#F0D060" },
  256:  { bg: "#E8EFFA", text: "#2A4A8A", border: "#B0CAF0", glow: "#6090E0" },
  512:  { bg: "#FCE8F4", text: "#8A2A6A", border: "#F0B0D8", glow: "#E070C0" },
  1024: { bg: "#EDE8FB", text: "#4A2A9A", border: "#C8B8F0", glow: "#9070E0" },
  2048: { bg: "#E8F8EA", text: "#1A6A2A", border: "#A8E0B0", glow: "#50C060" },
  4096: { bg: "#FFF4E0", text: "#8A5000", border: "#F0D080", glow: "#E0A030" },
  8192: { bg: "#FFE8E0", text: "#8A2000", border: "#F0B090", glow: "#E05030" },
};

const DYNAMIC_PALETTE = [
  { bg: "#E8F4F0", text: "#3A7A6A", border: "#C5E5DE", glow: "#7ADFC8" },
  { bg: "#EAF0FB", text: "#3A5A9A", border: "#C5D5F0", glow: "#7AABF0" },
  { bg: "#F5EAF8", text: "#7A3A9A", border: "#E0C5F0", glow: "#D07AF0" },
  { bg: "#FDF0E8", text: "#9A5A2A", border: "#F0D5C0", glow: "#F0A06A" },
  { bg: "#FEF0F0", text: "#9A3A3A", border: "#F0C5C5", glow: "#F08080" },
  { bg: "#F0F8E8", text: "#4A7A2A", border: "#D0E8B8", glow: "#A0D870" },
  { bg: "#FFFBE8", text: "#8A7020", border: "#EEE0A0", glow: "#F0D060" },
  { bg: "#E8EFFA", text: "#2A4A8A", border: "#B0CAF0", glow: "#6090E0" },
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
