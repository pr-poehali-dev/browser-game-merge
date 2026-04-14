import { useState, useCallback, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// ---- Constants ----
const COLS = 6;
const ROWS = 7;
const EMPTY = 0;
const MAX_VALUE = 512;
const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
const CELL_SIZE = 52;
const GAP = 5;
const BOARD_PAD = 8;

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

function getBlockStyle(v: number) {
  return BLOCK_COLORS[v] ?? { bg: "#F0EDEA", text: "#555", border: "#DDD" };
}

type Grid = number[][];
type GameSnapshot = { grid: Grid; score: number; current: number; next: number };
type FlyingBlock = { id: number; value: number; col: number; targetRow: number };

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

/**
 * Блоки падают СВЕРХУ — заполнение идёт от row=0 вниз.
 * landRow — первая свободная строка сверху в колонке.
 */
function dropBlock(
  grid: Grid, col: number, value: number
): { newGrid: Grid; scoreGained: number; placed: boolean; landRow: number } {
  const newGrid = cloneGrid(grid);

  // Найти первую свободную строку сверху
  let row = -1;
  for (let r = 0; r < ROWS; r++) {
    if (newGrid[r][col] === EMPTY) { row = r; break; }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false, landRow: -1 };

  newGrid[row][col] = value;

  // Слияние + гравитация (блоки тянутся вверх)
  let scoreGained = 0;
  let merging = true;
  while (merging) {
    merging = false;

    // Вертикальное слияние
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 1; r++) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r + 1][c]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            newGrid[r][c] = merged;
            newGrid[r + 1][c] = EMPTY;
            scoreGained += merged;
            merging = true;
          }
        }
      }
    }

    // Горизонтальное слияние
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

    // Гравитация — блоки всплывают вверх (заполняют с row=0)
    if (merging) {
      for (let c = 0; c < COLS; c++) {
        const vals = newGrid.map((r) => r[c]).filter((v) => v !== EMPTY);
        // Заполняем сверху, пустое снизу
        const padded = vals.concat(Array(ROWS - vals.length).fill(EMPTY));
        for (let r = 0; r < ROWS; r++) newGrid[r][c] = padded[r];
      }
    }
  }

  return { newGrid, scoreGained, placed: true, landRow: row };
}

function isBoardFull(grid: Grid): boolean {
  return grid[ROWS - 1].every((v) => v !== EMPTY);
}

// ---- Летящий блок (снизу вверх к targetRow) ----
function FlyBlock({
  fb, onDone,
}: {
  fb: FlyingBlock;
  onDone: (id: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const s = getBlockStyle(fb.value);
  const boardH = ROWS * (CELL_SIZE + GAP) - GAP;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Стартует снизу доски (за пределами), финиш — targetRow сверху
    const finalTop = BOARD_PAD + fb.targetRow * (CELL_SIZE + GAP);
    const startTop = BOARD_PAD + boardH + CELL_SIZE + 10;
    const deltaY = finalTop - startTop; // отрицательное

    const anim = el.animate(
      [
        { transform: `translateY(0px)`, opacity: "0.6" },
        { transform: `translateY(${deltaY}px)`, opacity: "1" },
      ],
      { duration: 340, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    );

    anim.onfinish = () => onDone(fb.id);
    return () => anim.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boardH2 = ROWS * (CELL_SIZE + GAP) - GAP;
  const leftPos = BOARD_PAD + fb.col * (CELL_SIZE + GAP);
  const startTop = BOARD_PAD + boardH2 + CELL_SIZE + 10;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: leftPos,
        top: startTop,
        width: CELL_SIZE,
        height: CELL_SIZE,
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <div style={{
        width: "100%", height: "100%",
        borderRadius: 10,
        background: s.bg,
        border: `1.5px solid ${s.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      }}>
        <BlockLabel value={fb.value} color={s.text} />
      </div>
    </div>
  );
}

function BlockLabel({ value, color }: { value: number; color: string }) {
  return (
    <span style={{
      fontSize: value >= 100 ? 15 : value >= 10 ? 20 : 24,
      fontWeight: 700,
      color,
      letterSpacing: "-0.02em",
      lineHeight: 1,
    }}>
      {value}
    </span>
  );
}

// ---- Main ----
export default function MergeGame() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() =>
    parseInt(localStorage.getItem("merge_best") ?? "0", 10)
  );
  // current — блок в руке, next — следующий
  const [current, setCurrent] = useState<number>(randomValue);
  const [next, setNext] = useState<number>(randomValue);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());

  // Очередь pending результатов пока летит блок
  const pendingRef = useRef<{
    newGrid: Grid; scoreGained: number; newScore: number;
  } | null>(null);
  const animCountRef = useRef(0);

  const prevBest = useRef(best);
  const boardPx = COLS * CELL_SIZE + (COLS - 1) * GAP;

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("merge_best", String(score));
      prevBest.current = score;
    }
  }, [score, best]);

  const applyPending = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;

    setGrid(p.newGrid);
    setScore(p.newScore);

    if (p.scoreGained > 0) {
      const keys = new Set<string>();
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (p.newGrid[r][c] !== EMPTY) keys.add(`${r}-${c}`);
      setMergedCells(keys);
      setTimeout(() => setMergedCells(new Set()), 360);
    }

    if (isBoardFull(p.newGrid)) {
      setGameOver(true);
      if (p.newScore > prevBest.current) {
        setBest(p.newScore);
        localStorage.setItem("merge_best", String(p.newScore));
        prevBest.current = p.newScore;
      }
    }
  }, []);

  const handleFlyDone = useCallback((id: number) => {
    setFlyingBlocks((prev) => prev.filter((b) => b.id !== id));
    animCountRef.current -= 1;
    if (animCountRef.current <= 0) {
      animCountRef.current = 0;
      applyPending();
    }
  }, [applyPending]);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver) return;

      // Используем актуальный current из замыкания
      const { newGrid, scoreGained, placed, landRow } = dropBlock(grid, col, current);
      if (!placed) return;

      setHistory((h) => [...h.slice(-19), { grid: cloneGrid(grid), score, current, next }]);

      // СРАЗУ обновляем current/next — игрок видит новые кубики мгновенно
      const newNextValue = randomValue();
      setCurrent(next);
      setNext(newNextValue);

      // Сохраняем результат для применения после анимации
      pendingRef.current = { newGrid, scoreGained, newScore: score + scoreGained };

      // Запускаем летящий блок
      const fid = ++flyId;
      animCountRef.current += 1;
      setFlyingBlocks((prev) => [...prev, { id: fid, value: current, col, targetRow: landRow }]);
    },
    [gameOver, grid, score, current, next]
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
    setFlyingBlocks([]);
    animCountRef.current = 0;
    pendingRef.current = null;
  }, [history]);

  const handleRestart = useCallback(() => {
    setGrid(emptyGrid());
    setScore(0);
    setCurrent(randomValue());
    setNext(randomValue());
    setHistory([]);
    setGameOver(false);
    setFlyingBlocks([]);
    animCountRef.current = 0;
    pendingRef.current = null;
  }, []);

  const handleHardRefresh = useCallback(() => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((n) => caches.delete(n));
      }).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }, []);

  // Текущий grid для отображения: если летит блок — показываем pending grid
  const displayGrid = pendingRef.current ? pendingRef.current.newGrid : grid;

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
        overflowX: "hidden",
      }}
    >
      {/* ---- Header ---- */}
      <div style={{
        width: "100%",
        maxWidth: boardPx + BOARD_PAD * 2 + 16,
        padding: "18px 8px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        boxSizing: "border-box",
      }}>
        <div style={{ minWidth: 70 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: "#A89F96", textTransform: "uppercase", marginBottom: 2 }}>
            Рекорд
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#5A4E45", lineHeight: 1 }}>
            {best.toLocaleString("ru")}
          </div>
        </div>

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

        <div style={{ display: "flex", gap: 8, minWidth: 70, justifyContent: "flex-end" }}>
          <ActionBtn onClick={handleUndo} disabled={history.length === 0} title="Отменить ход">
            <Icon name="Undo2" size={15} />
          </ActionBtn>
          <ActionBtn onClick={handleHardRefresh} title="Обновить кэш">
            <Icon name="RefreshCcw" size={15} />
          </ActionBtn>
        </div>
      </div>

      {/* ---- Preview: Сейчас → Следующий ---- */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 14,
        padding: "8px 18px",
        background: "#EAE3DA",
        borderRadius: 14,
      }}>
        <PreviewBlock label="Сейчас" value={current} size={50} />
        <Icon name="ChevronRight" size={14} style={{ color: "#B5ADA5" }} />
        <PreviewBlock label="Следующий" value={next} size={38} dimmed />
      </div>

      {/* ---- Board ---- */}
      <div
        style={{
          marginTop: 14,
          padding: BOARD_PAD,
          background: "#DDD5CB",
          borderRadius: 20,
          boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
          position: "relative",
          overflow: "visible",
          width: boardPx + BOARD_PAD * 2,
          flexShrink: 0,
        }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {/* Зоны клика по колонкам */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gap: GAP,
          position: "absolute",
          top: BOARD_PAD, left: BOARD_PAD,
          zIndex: 10,
        }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              style={{
                width: CELL_SIZE,
                height: ROWS * CELL_SIZE + (ROWS - 1) * GAP,
                cursor: gameOver ? "default" : "pointer",
              }}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHoverCol(c)}
            />
          ))}
        </div>

        {/* Сетка */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: GAP,
          position: "relative",
          zIndex: 1,
        }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const val = displayGrid[r][c];
              const isHov = hoverCol === c;
              const isMerged = mergedCells.has(`${r}-${c}`);
              // Скрыть ячейку если туда прямо сейчас летит блок
              const isFlying = flyingBlocks.some((fb) => fb.col === c && fb.targetRow === r);
              const st = (val !== EMPTY && !isFlying) ? getBlockStyle(val) : null;

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    borderRadius: 10,
                    background: st ? st.bg : isHov ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
                    border: st ? `1.5px solid ${st.border}` : "1.5px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.1s",
                    animation: isMerged && !isFlying ? "mergeFlash 0.35s ease" : undefined,
                    outline: isHov && !st ? "2px solid rgba(255,255,255,0.35)" : "none",
                  }}
                >
                  {st && <BlockLabel value={val} color={st.text} />}
                </div>
              );
            })
          )}
        </div>

        {/* Летящие блоки */}
        {flyingBlocks.map((fb) => (
          <FlyBlock key={fb.id} fb={fb} onDone={handleFlyDone} />
        ))}

        {/* Hover-полоска колонки */}
        {hoverCol !== null && !gameOver && (
          <div style={{
            position: "absolute",
            top: BOARD_PAD,
            left: BOARD_PAD + hoverCol * (CELL_SIZE + GAP),
            width: CELL_SIZE,
            height: ROWS * CELL_SIZE + (ROWS - 1) * GAP,
            borderRadius: 10,
            background: "rgba(255,255,255,0.07)",
            border: "2px solid rgba(255,255,255,0.20)",
            pointerEvents: "none",
            zIndex: 5,
          }} />
        )}

        {/* Game Over */}
        {gameOver && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 20,
            background: "rgba(44,32,23,0.82)", backdropFilter: "blur(6px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 14, zIndex: 30,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Поле заполнено</div>
            <div style={{ fontSize: 13, color: "#C8B8A8" }}>Счёт: {score.toLocaleString("ru")}</div>
            <button
              onClick={handleRestart}
              style={{
                padding: "9px 26px", borderRadius: 12, border: "none",
                background: "#F5F0EB", color: "#2C2017", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Rubik', sans-serif", marginTop: 4,
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

      <style>{`
        @keyframes scorePop {
          0%   { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes mergeFlash {
          0%   { filter: brightness(1.5) saturate(1.4); transform: scale(1.08); }
          60%  { filter: brightness(1.2) saturate(1.2); transform: scale(1.03); }
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
      <div style={{
        width: size, height: size, borderRadius: size * 0.18,
        background: s.bg, border: `1.5px solid ${s.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: dimmed ? 0.65 : 1, transition: "all 0.15s",
      }}>
        <span style={{
          fontSize: size < 44 ? (value >= 100 ? 11 : 14) : (value >= 100 ? 15 : 22),
          fontWeight: 700, color: s.text, letterSpacing: "-0.02em",
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        width: 34, height: 34, borderRadius: 10, border: "none",
        background: disabled ? "#EAE3DA" : "#E0D8CE",
        color: disabled ? "#C5BDB5" : "#4A3F35",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        transition: "background 0.12s, transform 0.1s",
        fontFamily: "'Rubik', sans-serif",
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.90)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}
