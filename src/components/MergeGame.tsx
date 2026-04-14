import { useState, useCallback, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// ---- Constants ----
const COLS = 6;
const ROWS = 7;
const EMPTY = 0;
const MAX_VALUE = 512;
const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];

// Бледные, слабонасыщенные пастельные цвета для каждого номинала
const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  2:   { bg: "#E8F4F0", text: "#3A7A6A", border: "#C5E5DE" },
  4:   { bg: "#EAF0FB", text: "#3A5A9A", border: "#C5D5F0" },
  8:   { bg: "#F5EAF8", text: "#7A3A9A", border: "#E0C5F0" },
  16:  { bg: "#FDF0E8", text: "#9A5A2A", border: "#F0D5C0" },
  32:  { bg: "#FEF0F0", text: "#9A3A3A", border: "#F0C5C5" },
  64:  { bg: "#F0F8E8", text: "#4A7A2A", border: "#D0E8B8" },
  128: { bg: "#FFFBE8", text: "#8A7020", border: "#EEE0A0" },
  256: { bg: "#E8EFFA", text: "#2A4A8A", border: "#B0CAF0" },
  512: { bg: "#FCE8F4", text: "#8A2A6A", border: "#F0B0D8" },
};

function getBlockStyle(value: number) {
  return BLOCK_COLORS[value] ?? { bg: "#F0EDEA", text: "#555", border: "#DDD" };
}

type Grid = number[][];
type GameSnapshot = { grid: Grid; score: number; current: number; next: number };

// Анимирующийся блок (летит снизу вверх к целевой ячейке)
type FlyingBlock = {
  id: number;
  value: number;
  col: number;
  targetRow: number;
};

let flyId = 0;

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomValue(): number {
  return SPAWN_VALUES[Math.floor(Math.random() * SPAWN_VALUES.length)];
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => [...r]);
}

function dropBlock(
  grid: Grid,
  col: number,
  value: number
): { newGrid: Grid; scoreGained: number; placed: boolean; landRow: number } {
  const newGrid = cloneGrid(grid);
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (newGrid[r][col] === EMPTY) { row = r; break; }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false, landRow: -1 };

  newGrid[row][col] = value;

  let scoreGained = 0;
  let merging = true;
  while (merging) {
    merging = false;
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r > 0; r--) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r - 1][c]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            newGrid[r][c] = merged; newGrid[r - 1][c] = EMPTY;
            scoreGained += merged; merging = true;
          }
        }
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r][c + 1]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            newGrid[r][c] = merged; newGrid[r][c + 1] = EMPTY;
            scoreGained += merged; merging = true;
          }
        }
      }
    }
    if (merging) {
      for (let c = 0; c < COLS; c++) {
        const vals = newGrid.map((r) => r[c]).filter((v) => v !== EMPTY);
        const padded = Array(ROWS - vals.length).fill(EMPTY).concat(vals);
        for (let r = 0; r < ROWS; r++) newGrid[r][c] = padded[r];
      }
    }
  }

  return { newGrid, scoreGained, placed: true, landRow: row };
}

function isBoardFull(grid: Grid): boolean {
  return grid[0].every((v) => v !== EMPTY);
}

// ---- Component ----
export default function MergeGame() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() =>
    parseInt(localStorage.getItem("merge_best") ?? "0", 10)
  );
  const [current, setCurrent] = useState<number>(randomValue);
  const [next, setNext] = useState<number>(randomValue);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState(false);

  const prevBest = useRef(best);
  const CELL_SIZE = 62;
  const GAP = 6;

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("merge_best", String(score));
      prevBest.current = score;
    }
  }, [score, best]);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver || animating) return;

      const { newGrid, scoreGained, placed, landRow } = dropBlock(grid, col, current);
      if (!placed) return;

      // Сохраняем снимок
      setHistory((h) => [
        ...h.slice(-19),
        { grid: cloneGrid(grid), score, current, next },
      ]);

      // Запускаем летящий блок
      const fid = ++flyId;
      setFlyingBlocks((prev) => [...prev, { id: fid, value: current, col, targetRow: landRow }]);
      setAnimating(true);

      setTimeout(() => {
        // Убираем летящий блок, ставим сетку
        setFlyingBlocks((prev) => prev.filter((b) => b.id !== fid));
        setGrid(newGrid);

        if (scoreGained > 0) {
          // Подсвечиваем все ненулевые ячейки на мгновение
          const keys = new Set<string>();
          for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
              if (newGrid[r][c] !== EMPTY) keys.add(`${r}-${c}`);
          setMergedCells(keys);
          setTimeout(() => setMergedCells(new Set()), 320);
        }

        const newScore = score + scoreGained;
        setScore(newScore);
        setCurrent(next);
        setNext(randomValue());
        setAnimating(false);

        if (isBoardFull(newGrid)) {
          setGameOver(true);
          if (newScore > prevBest.current) {
            setBest(newScore);
            localStorage.setItem("merge_best", String(newScore));
            prevBest.current = newScore;
          }
        }
      }, 340);
    },
    [gameOver, animating, grid, score, current, next]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || animating) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev.grid);
    setScore(prev.score);
    setCurrent(prev.current);
    setNext(prev.next);
    setGameOver(false);
  }, [history, animating]);

  const handleRestart = useCallback(() => {
    setGrid(emptyGrid());
    setScore(0);
    setCurrent(randomValue());
    setNext(randomValue());
    setHistory([]);
    setGameOver(false);
    setFlyingBlocks([]);
    setAnimating(false);
  }, []);

  const boardPx = COLS * CELL_SIZE + (COLS - 1) * GAP;
  const boardH = ROWS * CELL_SIZE + (ROWS - 1) * GAP;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F3EFE9",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Rubik', sans-serif",
        userSelect: "none",
        paddingBottom: 28,
      }}
    >
      {/* ---- Header ---- */}
      <div
        style={{
          width: "100%",
          maxWidth: boardPx + 48,
          padding: "18px 20px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {/* Рекорд */}
        <div style={{ minWidth: 72 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: "#A89F96", textTransform: "uppercase", marginBottom: 2 }}>
            Рекорд
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#5A4E45", lineHeight: 1 }}>
            {best.toLocaleString("ru")}
          </div>
        </div>

        {/* Счёт */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: "#A89F96", textTransform: "uppercase", marginBottom: 2 }}>
            Очки
          </div>
          <div
            key={score}
            style={{ fontSize: 30, fontWeight: 700, color: "#2C2017", lineHeight: 1, animation: "scorePop 0.22s ease" }}
          >
            {score.toLocaleString("ru")}
          </div>
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", gap: 8, minWidth: 72, justifyContent: "flex-end" }}>
          <ActionBtn onClick={handleUndo} disabled={history.length === 0 || animating} title="Отменить">
            <Icon name="Undo2" size={15} />
          </ActionBtn>
          <ActionBtn onClick={handleRestart} title="Новая игра">
            <Icon name="RefreshCw" size={15} />
          </ActionBtn>
        </div>
      </div>

      {/* ---- Preview ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 14,
          padding: "8px 18px",
          background: "#EAE3DA",
          borderRadius: 14,
        }}
      >
        <PreviewBlock label="Сейчас" value={current} size={50} />
        <Icon name="ChevronRight" size={14} style={{ color: "#B5ADA5" }} />
        <PreviewBlock label="Следующий" value={next} size={38} dimmed />
      </div>

      {/* ---- Board ---- */}
      <div
        style={{
          marginTop: 14,
          padding: 8,
          background: "#DDD5CB",
          borderRadius: 20,
          boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {/* Колонки-зоны нажатия */}
        <div style={{ display: "flex", gap: GAP, position: "absolute", inset: 8, zIndex: 10 }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              style={{ flex: 1, height: "100%", cursor: animating || gameOver ? "default" : "pointer" }}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHoverCol(c)}
            />
          ))}
        </div>

        {/* Сетка ячеек */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
            gap: GAP,
            position: "relative",
            zIndex: 1,
          }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const val = grid[r][c];
              const isHov = hoverCol === c;
              const isMerged = mergedCells.has(`${r}-${c}`);
              const isFlying = flyingBlocks.some((fb) => fb.col === c && fb.targetRow === r);
              const style = (val !== EMPTY && !isFlying) ? getBlockStyle(val) : null;

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 11,
                    background: style ? style.bg : isHov ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
                    border: style ? `1.5px solid ${style.border}` : "1.5px solid transparent",
                    opacity: isFlying ? 0 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.12s",
                    animation: isMerged ? "mergeFlash 0.32s ease" : undefined,
                    outline: isHov && !style ? "2px solid rgba(255,255,255,0.40)" : "none",
                  }}
                >
                  {val !== EMPTY && (
                    <span
                      style={{
                        fontSize: val >= 100 ? 18 : 24,
                        fontWeight: 700,
                        color: style!.text,
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}
                    >
                      {val}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Летящие блоки */}
        {flyingBlocks.map((fb) => {
          const s = getBlockStyle(fb.value);
          // Финальная позиция (top) = padding(8) + targetRow * (cell+gap)
          const finalTop = 8 + fb.targetRow * (CELL_SIZE + GAP);
          // Стартовая позиция — за нижней границей доски
          const startTop = 8 + boardH + CELL_SIZE;
          const deltaY = finalTop - startTop; // отрицательное — летим вверх
          return (
            <div
              key={fb.id}
              style={{
                position: "absolute",
                left: 8 + fb.col * (CELL_SIZE + GAP),
                top: startTop,
                width: CELL_SIZE,
                height: CELL_SIZE,
                zIndex: 20,
                pointerEvents: "none",
                animation: `flyUp 0.36s cubic-bezier(0.22,1,0.36,1) forwards`,
                "--delta-y": `${deltaY}px`,
              } as React.CSSProperties}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 11,
                  background: s.bg,
                  border: `1.5px solid ${s.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 16px rgba(0,0,0,0.14)`,
                }}
              >
                <span style={{ fontSize: fb.value >= 100 ? 18 : 24, fontWeight: 700, color: s.text, letterSpacing: "-0.02em" }}>
                  {fb.value}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hover-подсветка колонки */}
        {hoverCol !== null && !gameOver && !animating && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8 + hoverCol * (CELL_SIZE + GAP),
              width: CELL_SIZE,
              height: boardH,
              borderRadius: 11,
              background: "rgba(255,255,255,0.07)",
              border: "2px solid rgba(255,255,255,0.22)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              background: "rgba(44,32,23,0.80)",
              backdropFilter: "blur(6px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              zIndex: 30,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Поле заполнено</div>
            <div style={{ fontSize: 13, color: "#C8B8A8" }}>Счёт: {score.toLocaleString("ru")}</div>
            <button
              onClick={handleRestart}
              style={{
                padding: "9px 26px",
                borderRadius: 12,
                border: "none",
                background: "#F5F0EB",
                color: "#2C2017",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Rubik', sans-serif",
                marginTop: 4,
              }}
            >
              Новая игра
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: "#B5ADA5", letterSpacing: "0.04em" }}>
        Нажми на колонку, чтобы бросить блок
      </p>

      {/* CSS */}
      <style>{`
        @keyframes flyUp {
          from { transform: translateY(0);                    opacity: 0.6; }
          to   { transform: translateY(var(--delta-y));       opacity: 1; }
        }
        @keyframes scorePop {
          0%   { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes mergeFlash {
          0%   { filter: brightness(1.5) saturate(1.4); transform: scale(1.08); }
          60%  { filter: brightness(1.2) saturate(1.2); transform: scale(1.04); }
          100% { filter: brightness(1)   saturate(1);   transform: scale(1); }
        }
        * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>
    </div>
  );
}

// ---- Sub-components ----
function PreviewBlock({ label, value, size, dimmed }: { label: string; value: number; size: number; dimmed?: boolean }) {
  const s = getBlockStyle(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", color: "#A89F96", textTransform: "uppercase" }}>
        {label}
      </span>
      <div
        style={{
          width: size, height: size,
          borderRadius: size * 0.18,
          background: s.bg,
          border: `1.5px solid ${s.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: dimmed ? 0.65 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <span style={{ fontSize: size < 44 ? (value >= 100 ? 12 : 15) : (value >= 100 ? 16 : 22), fontWeight: 700, color: s.text, letterSpacing: "-0.02em" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 34, height: 34,
        borderRadius: 10,
        border: "none",
        background: disabled ? "#EAE3DA" : "#E0D8CE",
        color: disabled ? "#C5BDB5" : "#4A3F35",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.12s, transform 0.1s",
        fontFamily: "'Rubik', sans-serif",
      }}
      onMouseDown={(e) => !disabled && ((e.currentTarget.style.transform = "scale(0.90)"))}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}