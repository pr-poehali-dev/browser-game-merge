import { useState, useCallback, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// ---- Constants ----
const COLS = 4;
const ROWS = 8;
const EMPTY = 0;
const MAX_VALUE = 2048;

// Block values that can spawn
const SPAWN_VALUES = [2, 4, 8];

// Color palette per value
const BLOCK_COLORS: Record<number, { bg: string; text: string; shadow: string }> = {
  2:    { bg: "#F5F0EB", text: "#2C2C2C", shadow: "rgba(0,0,0,0.08)" },
  4:    { bg: "#E8DED2", text: "#2C2C2C", shadow: "rgba(0,0,0,0.10)" },
  8:    { bg: "#D4C4AF", text: "#2C2C2C", shadow: "rgba(0,0,0,0.12)" },
  16:   { bg: "#C0A882", text: "#2C2C2C", shadow: "rgba(0,0,0,0.14)" },
  32:   { bg: "#A88A5E", text: "#FFF8F0", shadow: "rgba(0,0,0,0.16)" },
  64:   { bg: "#8A6A3E", text: "#FFF8F0", shadow: "rgba(0,0,0,0.18)" },
  128:  { bg: "#6B4F2E", text: "#FFF8F0", shadow: "rgba(0,0,0,0.20)" },
  256:  { bg: "#4E3620", text: "#FFF8F0", shadow: "rgba(0,0,0,0.22)" },
  512:  { bg: "#322012", text: "#FFF8F0", shadow: "rgba(0,0,0,0.24)" },
  1024: { bg: "#1A0F07", text: "#FFE4B5", shadow: "rgba(0,0,0,0.30)" },
  2048: { bg: "#0A0602", text: "#FFD700", shadow: "rgba(255,215,0,0.30)" },
};

function getBlockStyle(value: number) {
  const c = BLOCK_COLORS[value] ?? { bg: "#E0D8D0", text: "#2C2C2C", shadow: "rgba(0,0,0,0.08)" };
  return c;
}

// ---- Game Types ----
type Grid = number[][];
type GameSnapshot = {
  grid: Grid;
  score: number;
  current: number;
  next: number;
  selectedCol: number | null;
};

// ---- Helpers ----
function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function randomValue(): number {
  return SPAWN_VALUES[Math.floor(Math.random() * SPAWN_VALUES.length)];
}

function cloneGrid(g: Grid): Grid {
  return g.map((r) => [...r]);
}

/**
 * Drop a value into column col.
 * Returns { newGrid, scoreGained, placed } — placed=false if column is full.
 */
function dropBlock(grid: Grid, col: number, value: number): { newGrid: Grid; scoreGained: number; placed: boolean } {
  const newGrid = cloneGrid(grid);
  // Find lowest empty row in column
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (newGrid[r][col] === EMPTY) {
      row = r;
      break;
    }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false };

  newGrid[row][col] = value;

  // Merge loop
  let scoreGained = 0;
  let merging = true;
  while (merging) {
    merging = false;
    // Vertical merge (same column)
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r > 0; r--) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r - 1][c]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            newGrid[r][c] = merged;
            newGrid[r - 1][c] = EMPTY;
            scoreGained += merged;
            merging = true;
          }
        }
      }
    }
    // Horizontal merge (same row)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r][c + 1]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            newGrid[r][c] = merged;
            newGrid[r][c + 1] = EMPTY;
            scoreGained += merged;
            merging = true;
          }
        }
      }
    }
    // Gravity after merges
    if (merging) {
      for (let c = 0; c < COLS; c++) {
        const col_vals = newGrid.map((r) => r[c]).filter((v) => v !== EMPTY);
        const padded = Array(ROWS - col_vals.length).fill(EMPTY).concat(col_vals);
        for (let r = 0; r < ROWS; r++) newGrid[r][c] = padded[r];
      }
    }
  }

  return { newGrid, scoreGained, placed: true };
}

function isBoardFull(grid: Grid): boolean {
  return grid[0].every((v) => v !== EMPTY);
}

// ---- Component ----
export default function MergeGame() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => {
    return parseInt(localStorage.getItem("merge_best") ?? "0", 10);
  });
  const [current, setCurrent] = useState<number>(randomValue);
  const [next, setNext] = useState<number>(randomValue);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [mergeFlash, setMergeFlash] = useState<{ row: number; col: number } | null>(null);

  const prevBest = useRef(best);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("merge_best", String(score));
    }
  }, [score, best]);

  const saveSnapshot = useCallback((g: Grid, s: number, c: number, n: number, col: number | null) => {
    setHistory((h) => [...h.slice(-19), { grid: cloneGrid(g), score: s, current: c, next: n, selectedCol: col }]);
  }, []);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver) return;
      saveSnapshot(grid, score, current, next, col);
      const { newGrid, scoreGained, placed } = dropBlock(grid, col, current);
      if (!placed) return;

      const newScore = score + scoreGained;
      setGrid(newGrid);
      setScore(newScore);
      setCurrent(next);
      setNext(randomValue());

      if (scoreGained > 0) {
        setMergeFlash({ row: 0, col });
        setTimeout(() => setMergeFlash(null), 300);
      }

      if (isBoardFull(newGrid)) {
        setGameOver(true);
        if (newScore > prevBest.current) {
          setBest(newScore);
          localStorage.setItem("merge_best", String(newScore));
          prevBest.current = newScore;
        }
      }
    },
    [gameOver, grid, score, current, next, saveSnapshot]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGrid(prev.grid);
    setScore(prev.score);
    setCurrent(prev.current);
    setNext(prev.next);
    setGameOver(false);
  }, [history]);

  const handleRestart = useCallback(() => {
    setGrid(emptyGrid());
    setScore(0);
    setCurrent(randomValue());
    setNext(randomValue());
    setHistory([]);
    setGameOver(false);
  }, []);

  const CELL_SIZE = 72;
  const GAP = 6;
  const boardWidth = COLS * CELL_SIZE + (COLS - 1) * GAP;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F2EDE7",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "'Rubik', sans-serif",
        userSelect: "none",
        paddingBottom: 24,
      }}
    >
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: boardWidth + 48,
          padding: "20px 24px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Best score — left */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#9A8F84", textTransform: "uppercase" }}>
            Рекорд
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#4A3F35", lineHeight: 1.1 }}>
            {best.toLocaleString("ru")}
          </span>
        </div>

        {/* Current score — center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", color: "#9A8F84", textTransform: "uppercase" }}>
            Очки
          </span>
          <span
            key={score}
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#2C2017",
              lineHeight: 1.1,
              animation: "scorePop 0.25s ease",
            }}
          >
            {score.toLocaleString("ru")}
          </span>
        </div>

        {/* Undo + Restart — right */}
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Отменить ход"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: history.length > 0 ? "#E8DED2" : "#EDE8E4",
              color: history.length > 0 ? "#4A3F35" : "#C8BDB5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: history.length > 0 ? "pointer" : "default",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => history.length > 0 && ((e.currentTarget.style.transform = "scale(0.92)"))}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Icon name="Undo2" size={16} />
          </button>
          <button
            onClick={handleRestart}
            title="Новая игра"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "none",
              background: "#E8DED2",
              color: "#4A3F35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Icon name="RefreshCw" size={16} />
          </button>
        </div>
      </div>

      {/* Next block preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 16,
          padding: "10px 20px",
          background: "#EAE4DC",
          borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        {/* Current */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: "#9A8F84", textTransform: "uppercase" }}>
            Сейчас
          </span>
          <BlockTile value={current} size={52} />
        </div>

        {/* Arrow */}
        <Icon name="ArrowRight" size={14} style={{ color: "#B0A89E", marginTop: 14 }} />

        {/* Next */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: "#9A8F84", textTransform: "uppercase" }}>
            Следующий
          </span>
          <BlockTile value={next} size={40} dimmed />
        </div>
      </div>

      {/* Board */}
      <div
        style={{
          marginTop: 16,
          padding: 8,
          background: "#DDD6CE",
          borderRadius: 18,
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
            gap: GAP,
          }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const val = grid[r][c];
              const isHovered = hoverCol === c;
              const isFlash = mergeFlash?.col === c;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleDrop(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 12,
                    background: val !== EMPTY
                      ? getBlockStyle(val).bg
                      : isHovered
                      ? "rgba(255,255,255,0.30)"
                      : "rgba(255,255,255,0.12)",
                    boxShadow: val !== EMPTY
                      ? `0 3px 8px ${getBlockStyle(val).shadow}`
                      : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.12s, transform 0.1s",
                    transform: isHovered && val === EMPTY ? "scale(1.03)" : "scale(1)",
                    outline: isHovered ? "2px solid rgba(255,255,255,0.50)" : "none",
                    animation: isFlash && val !== EMPTY ? "mergeFlash 0.3s ease" : undefined,
                    position: "relative",
                  }}
                >
                  {val !== EMPTY && (
                    <span
                      style={{
                        fontSize: val >= 1024 ? 16 : val >= 128 ? 20 : val >= 16 ? 24 : 28,
                        fontWeight: 700,
                        color: getBlockStyle(val).text,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
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

        {/* Column hover indicator */}
        {hoverCol !== null && !gameOver && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8 + hoverCol * (CELL_SIZE + GAP),
              width: CELL_SIZE,
              height: ROWS * CELL_SIZE + (ROWS - 1) * GAP,
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              pointerEvents: "none",
              border: "2px solid rgba(255,255,255,0.18)",
              boxSizing: "border-box",
            }}
          />
        )}

        {/* Game Over overlay */}
        {gameOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              background: "rgba(44,32,23,0.82)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: "#F5F0EB", letterSpacing: "-0.01em" }}>
              Поле заполнено
            </span>
            <span style={{ fontSize: 14, color: "#C8B8A8" }}>
              Счёт: {score.toLocaleString("ru")}
            </span>
            <button
              onClick={handleRestart}
              style={{
                marginTop: 4,
                padding: "10px 28px",
                borderRadius: 12,
                border: "none",
                background: "#F5F0EB",
                color: "#2C2017",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Rubik', sans-serif",
              }}
            >
              Новая игра
            </button>
          </div>
        )}
      </div>

      {/* Hint */}
      <p
        style={{
          marginTop: 14,
          fontSize: 11,
          color: "#B0A89E",
          letterSpacing: "0.04em",
        }}
      >
        Нажми на колонку, чтобы бросить блок
      </p>

      {/* CSS animations */}
      <style>{`
        @keyframes scorePop {
          0%   { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes mergeFlash {
          0%   { filter: brightness(1.6); }
          100% { filter: brightness(1); }
        }
        * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>
    </div>
  );
}

// ---- BlockTile ----
function BlockTile({ value, size, dimmed }: { value: number; size: number; dimmed?: boolean }) {
  const c = getBlockStyle(value);
  const fontSize = size < 48 ? (value >= 100 ? 12 : 16) : value >= 1000 ? 16 : value >= 100 ? 20 : 26;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        background: c.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 3px 8px ${c.shadow}`,
        opacity: dimmed ? 0.7 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <span style={{ fontSize, fontWeight: 700, color: c.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}
