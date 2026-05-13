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
  2:    { bg: "#B8F0E0", text: "#0A5C46", border: "#50D4A8", glow: "#00E5A0" },
  4:    { bg: "#B0D8FF", text: "#0A3A8A", border: "#4A9EF0", glow: "#2080FF" },
  8:    { bg: "#D8B0FF", text: "#4A0A8A", border: "#A040F0", glow: "#9020FF" },
  16:   { bg: "#FFD0A0", text: "#7A3000", border: "#F09030", glow: "#FF8000" },
  32:   { bg: "#FFB0B0", text: "#8A0A0A", border: "#F04040", glow: "#FF2020" },
  64:   { bg: "#B8F0A0", text: "#1A5A00", border: "#50D030", glow: "#30D000" },
  128:  { bg: "#FFF080", text: "#6A5000", border: "#E0C020", glow: "#FFD700" },
  256:  { bg: "#A0C8FF", text: "#00288A", border: "#3070E0", glow: "#0060FF" },
  512:  { bg: "#FFB0E8", text: "#8A0060", border: "#F030B0", glow: "#FF00A0" },
  1024: { bg: "#C8A0FF", text: "#380080", border: "#8030E0", glow: "#7000FF" },
  2048: { bg: "#90F0B0", text: "#005020", border: "#20C060", glow: "#00CC44" },
  4096: { bg: "#FFE080", text: "#604000", border: "#D09000", glow: "#FFA000" },
  8192: { bg: "#FF9090", text: "#700000", border: "#E02020", glow: "#FF0000" },
};

const DYNAMIC_PALETTE = [
  { bg: "#B8F0E0", text: "#0A5C46", border: "#50D4A8", glow: "#00E5A0" },
  { bg: "#B0D8FF", text: "#0A3A8A", border: "#4A9EF0", glow: "#2080FF" },
  { bg: "#D8B0FF", text: "#4A0A8A", border: "#A040F0", glow: "#9020FF" },
  { bg: "#FFD0A0", text: "#7A3000", border: "#F09030", glow: "#FF8000" },
  { bg: "#FFB0B0", text: "#8A0A0A", border: "#F04040", glow: "#FF2020" },
  { bg: "#B8F0A0", text: "#1A5A00", border: "#50D030", glow: "#30D000" },
  { bg: "#FFF080", text: "#6A5000", border: "#E0C020", glow: "#FFD700" },
  { bg: "#A0C8FF", text: "#00288A", border: "#3070E0", glow: "#0060FF" },
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