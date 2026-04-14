export const COLS = 5;
export const ROWS = 8;
export const EMPTY = 0;
export const MAX_VALUE = Infinity;
export const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
export const CELL_SIZE = 64;
export const GAP = 5;
export const BOARD_PAD = 6;

// ---- Цветовая система для тренировки колористов ----
//
// Логика: каждый номинал — уникальный hue по цветовому кругу (0-360°).
// Базовые значения (2-64) — чёткие, далеко разнесённые цвета (шаг ~60°).
// При каждом удвоении шаг между соседними hue уменьшается вдвое — цвета всё
// ближе друг к другу, тренируя глаз различать тонкие оттенки.
//
// Уровень n = log2(value): hue(n) = BASE_HUE + SUM(step/2^k) для k=1..n
// Насыщенность постоянная ~80%, светлота ~75% (пастельный фон блока).

// Базовые hue для первых 6 номиналов (цветовой круг)
// 2=жёлтый, 4=оранжевый, 8=красный, 16=фиолетовый, 32=синий, 64=зелёный
const BASE_HUES: Record<number, number> = {
  2:  52,   // жёлтый
  4:  28,   // оранжевый
  8:  0,    // красный
  16: 280,  // фиолетовый
  32: 220,  // синий
  64: 120,  // зелёный
};

// Для значений >= 128: интерполяция между предыдущими hue с уменьшающимся шагом
// Чем больше число — тем меньше разница в hue между соседями
function computeHue(v: number): number {
  if (BASE_HUES[v] !== undefined) return BASE_HUES[v];
  const level = Math.round(Math.log2(v)); // 7=128, 8=256, 9=512...
  // Начинаем от hue=64 (голубой) и делаем шаги всё меньше
  // Шаг между уровнями: начальный 30°, делится пополам каждые 2 уровня
  const baseHue = 120; // от зелёного
  const step = 30 / Math.pow(2, Math.floor((level - 7) / 2));
  const direction = (level % 2 === 0) ? 1 : -1;
  return (baseHue + direction * step * (level - 6) + 360) % 360;
}

function hslToStyle(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

export function getBlockStyle(v: number) {
  const hue = computeHue(v);
  // Насыщенность: базовые яркие (70%), при больших числах чуть снижается (сложнее!)
  const level = Math.round(Math.log2(v));
  const sat = Math.max(40, 72 - (level - 1) * 2); // от 70% до ~40% для огромных чисел
  // Фон — светлый (85%), бордер — средний (65%), текст — тёмный (25%), glow — насыщенный
  return {
    bg:     hslToStyle(hue, sat, 88),
    border: hslToStyle(hue, sat - 10, 72),
    text:   hslToStyle(hue, sat + 10, 22),
    glow:   hslToStyle(hue, sat + 5, 55),
  };
}

// Оставляем для совместимости (не используется напрямую)
export const BLOCK_COLORS: Record<number, ReturnType<typeof getBlockStyle>> = {};

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