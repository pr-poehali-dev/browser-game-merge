import { useState, useCallback, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

// ---- Constants ----
const COLS = 6;
const ROWS = 8;
const EMPTY = 0;
const MAX_VALUE = 512;
const SPAWN_VALUES = [2, 4, 8, 16, 32, 64];
const CELL_SIZE = 52;
const GAP = 5;
const BOARD_PAD = 8;

const BLOCK_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
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

function getBlockStyle(v: number) {
  return BLOCK_COLORS[v] ?? { bg: "#F0EDEA", text: "#555", border: "#DDD", glow: "#AAA" };
}

type Grid = number[][];
type FlyingBlock = { id: number; value: number; col: number; targetRow: number };
type Explosion = { id: number; x: number; y: number; color: string };

let flyId = 0;
let explId = 0;

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
  grid: Grid, col: number, value: number
): { newGrid: Grid; scoreGained: number; placed: boolean; landRow: number; mergedPositions: [number,number][] } {
  const newGrid = cloneGrid(grid);

  let row = -1;
  for (let r = 0; r < ROWS; r++) {
    if (newGrid[r][col] === EMPTY) { row = r; break; }
  }
  if (row === -1) return { newGrid, scoreGained: 0, placed: false, landRow: -1, mergedPositions: [] };

  newGrid[row][col] = value;

  let scoreGained = 0;
  const mergedPositions: [number,number][] = [];
  let merging = true;
  while (merging) {
    merging = false;

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 1; r++) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r + 1][c]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            mergedPositions.push([r, c]);
            newGrid[r][c] = merged;
            newGrid[r + 1][c] = EMPTY;
            scoreGained += merged;
            merging = true;
          }
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        if (newGrid[r][c] !== EMPTY && newGrid[r][c] === newGrid[r][c + 1]) {
          const merged = newGrid[r][c] * 2;
          if (merged <= MAX_VALUE) {
            mergedPositions.push([r, c]);
            newGrid[r][c] = merged;
            newGrid[r][c + 1] = EMPTY;
            scoreGained += merged;
            merging = true;
          }
        }
      }
    }

    if (merging) {
      for (let c = 0; c < COLS; c++) {
        const vals = newGrid.map((r) => r[c]).filter((v) => v !== EMPTY);
        const padded = vals.concat(Array(ROWS - vals.length).fill(EMPTY));
        for (let r = 0; r < ROWS; r++) newGrid[r][c] = padded[r];
      }
    }
  }

  return { newGrid, scoreGained, placed: true, landRow: row, mergedPositions };
}

function isBoardFull(grid: Grid): boolean {
  return grid[ROWS - 1].every((v) => v !== EMPTY);
}

// ---- Летящий блок ----
function FlyBlock({ fb, onDone }: { fb: FlyingBlock; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = getBlockStyle(fb.value);
  const boardH = ROWS * (CELL_SIZE + GAP) - GAP;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finalTop = BOARD_PAD + fb.targetRow * (CELL_SIZE + GAP);
    const startTop = BOARD_PAD + boardH + CELL_SIZE + 10;
    const deltaY = finalTop - startTop;
    const anim = el.animate(
      [
        { transform: `translateY(0px)`, opacity: "0.5" },
        { transform: `translateY(${deltaY}px)`, opacity: "1" },
      ],
      { duration: 320, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" }
    );
    anim.onfinish = () => onDone(fb.id);
    return () => anim.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leftPos = BOARD_PAD + fb.col * (CELL_SIZE + GAP);
  const startTop = BOARD_PAD + (ROWS * (CELL_SIZE + GAP) - GAP) + CELL_SIZE + 10;

  return (
    <div ref={ref} style={{ position: "absolute", left: leftPos, top: startTop, width: CELL_SIZE, height: CELL_SIZE, zIndex: 20, pointerEvents: "none" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 10, background: s.bg, border: `1.5px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px rgba(0,0,0,0.18)` }}>
        <BlockLabel value={fb.value} color={s.text} />
      </div>
    </div>
  );
}

// ---- Взрыв частиц ----
const PARTICLE_COUNT = 10;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (360 / PARTICLE_COUNT) * i);

function ExplosionEffect({ exp }: { exp: Explosion }) {
  return (
    <div style={{ position: "absolute", left: exp.x, top: exp.y, zIndex: 30, pointerEvents: "none" }}>
      {PARTICLE_ANGLES.map((angle, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: exp.color,
            left: -3.5,
            top: -3.5,
            animation: `particle-${i % 4} 0.45s ease-out forwards`,
          }}
        />
      ))}
      {/* Вспышка-круг */}
      <div style={{
        position: "absolute",
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: "50%",
        background: exp.color,
        left: -CELL_SIZE / 2,
        top: -CELL_SIZE / 2,
        animation: "explosion-ring 0.35s ease-out forwards",
        opacity: 0.6,
      }} />
    </div>
  );
}

function BlockLabel({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ fontSize: value >= 100 ? 15 : value >= 10 ? 20 : 24, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
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
  const [current, setCurrent] = useState<number>(randomValue);
  const [next, setNext] = useState<number>(randomValue);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);

  const pendingRef = useRef<{ newGrid: Grid; scoreGained: number; newScore: number; mergedPositions: [number,number][] } | null>(null);
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

    // Взрывы в позициях слияния
    if (p.scoreGained > 0 && p.mergedPositions.length > 0) {
      const newExplosions: Explosion[] = p.mergedPositions.map(([r, c]) => {
        const val = p.newGrid[r][c];
        const style = getBlockStyle(val);
        return {
          id: ++explId,
          x: BOARD_PAD + c * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          y: BOARD_PAD + r * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          color: style.glow,
        };
      });
      setExplosions((prev) => [...prev, ...newExplosions]);
      setTimeout(() => {
        setExplosions((prev) => prev.filter((e) => !newExplosions.find((n) => n.id === e.id)));
      }, 500);
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
      const { newGrid, scoreGained, placed, landRow, mergedPositions } = dropBlock(grid, col, current);
      if (!placed) return;

      setCurrent(next);
      setNext(randomValue());

      pendingRef.current = { newGrid, scoreGained, newScore: score + scoreGained, mergedPositions };

      const fid = ++flyId;
      animCountRef.current += 1;
      setFlyingBlocks((prev) => [...prev, { id: fid, value: current, col, targetRow: landRow }]);
    },
    [gameOver, grid, score, current, next]
  );

  const handleRestart = useCallback(() => {
    setGrid(emptyGrid());
    setScore(0);
    setCurrent(randomValue());
    setNext(randomValue());
    setGameOver(false);
    setFlyingBlocks([]);
    setExplosions([]);
    animCountRef.current = 0;
    pendingRef.current = null;
  }, []);

  const handleHardRefresh = useCallback(() => {
    if ("caches" in window) {
      caches.keys().then((names) => { names.forEach((n) => caches.delete(n)); }).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }, []);

  const displayGrid = pendingRef.current ? pendingRef.current.newGrid : grid;

  return (
    <div style={{ minHeight: "100dvh", background: "#F3EFE9", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Rubik', sans-serif", userSelect: "none", paddingBottom: 28, overflowX: "hidden" }}>

      {/* ---- Header ---- */}
      <div style={{ width: "100%", maxWidth: boardPx + BOARD_PAD * 2 + 16, padding: "10px 8px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, boxSizing: "border-box" }}>
        <div style={{ minWidth: 60 }}>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", color: "#B5ADA5", textTransform: "uppercase", marginBottom: 1 }}>Рекорд</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#7A6E65", lineHeight: 1 }}>{best.toLocaleString("ru")}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", color: "#B5ADA5", textTransform: "uppercase", marginBottom: 1 }}>Очки</div>
          <div key={score} style={{ fontSize: 20, fontWeight: 700, color: "#2C2017", lineHeight: 1, animation: "scorePop 0.22s ease" }}>
            {score.toLocaleString("ru")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, minWidth: 60, justifyContent: "flex-end" }}>
          <ActionBtn onClick={handleHardRefresh} title="Обновить кэш" small>
            <Icon name="RefreshCcw" size={13} />
          </ActionBtn>
        </div>
      </div>

      {/* ---- Preview ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10, width: boardPx + BOARD_PAD * 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BigCurrentBlock value={current} />
          <NextBlock value={next} />
        </div>
      </div>

      {/* ---- Board ---- */}
      <div
        style={{ marginTop: 14, padding: BOARD_PAD, background: "#DDD5CB", borderRadius: 20, boxShadow: "0 6px 24px rgba(0,0,0,0.10)", position: "relative", overflow: "visible", width: boardPx + BOARD_PAD * 2, flexShrink: 0 }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {/* Зоны клика */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, gap: GAP, position: "absolute", top: BOARD_PAD, left: BOARD_PAD, zIndex: 10 }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div key={c} style={{ width: CELL_SIZE, height: ROWS * CELL_SIZE + (ROWS - 1) * GAP, cursor: gameOver ? "default" : "pointer" }}
              onClick={() => handleDrop(c)}
              onMouseEnter={() => setHoverCol(c)}
            />
          ))}
        </div>

        {/* Сетка */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`, gap: GAP, position: "relative", zIndex: 1 }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const val = displayGrid[r][c];
              const isHov = hoverCol === c;
              const isFlying = flyingBlocks.some((fb) => fb.col === c && fb.targetRow === r);
              const st = (val !== EMPTY && !isFlying) ? getBlockStyle(val) : null;

              return (
                <div key={`${r}-${c}`} style={{
                  width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10,
                  background: st ? st.bg : isHov ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
                  border: st ? `1.5px solid ${st.border}` : "1.5px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.1s",
                  outline: isHov && !st ? "2px solid rgba(255,255,255,0.35)" : "none",
                }}>
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

        {/* Взрывы */}
        {explosions.map((exp) => (
          <ExplosionEffect key={exp.id} exp={exp} />
        ))}

        {/* Hover-полоска */}
        {hoverCol !== null && !gameOver && (
          <div style={{ position: "absolute", top: BOARD_PAD, left: BOARD_PAD + hoverCol * (CELL_SIZE + GAP), width: CELL_SIZE, height: ROWS * CELL_SIZE + (ROWS - 1) * GAP, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.20)", pointerEvents: "none", zIndex: 5 }} />
        )}

        {/* Game Over */}
        {gameOver && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(44,32,23,0.82)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 30 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Поле заполнено</div>
            <div style={{ fontSize: 13, color: "#C8B8A8" }}>Счёт: {score.toLocaleString("ru")}</div>
            <button onClick={handleRestart} style={{ padding: "9px 26px", borderRadius: 12, border: "none", background: "#F5F0EB", color: "#2C2017", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif", marginTop: 4 }}>
              Новая игра
            </button>
          </div>
        )}
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: "#B5ADA5", letterSpacing: "0.04em" }}>
        Нажми на колонку, чтобы бросить блок
      </p>

      <style>{`
        @keyframes blockAppear {
          0%   { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes scorePop {
          0%   { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes explosion-ring {
          0%   { transform: scale(0.2); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        /* 4 направления частиц */
        @keyframes particle-0 {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(28px,-28px) scale(0); opacity: 0; }
        }
        @keyframes particle-1 {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(-28px,-28px) scale(0); opacity: 0; }
        }
        @keyframes particle-2 {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(28px,28px) scale(0); opacity: 0; }
        }
        @keyframes particle-3 {
          0%   { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(-28px,28px) scale(0); opacity: 0; }
        }
        * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>
    </div>
  );
}

// ---- Sub-components ----
function BigCurrentBlock({ value }: { value: number }) {
  const s = getBlockStyle(value);
  return (
    <div key={value} style={{ width: 64, height: 64, borderRadius: 14, background: s.bg, border: `2px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px rgba(0,0,0,0.10)`, animation: "blockAppear 0.18s cubic-bezier(0.34,1.56,0.64,1)", flexShrink: 0 }}>
      <span style={{ fontSize: value >= 100 ? 22 : 32, fontWeight: 800, color: s.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function NextBlock({ value }: { value: number }) {
  const s = getBlockStyle(value);
  return (
    <div key={value} style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, border: `1.5px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.45, animation: "blockAppear 0.18s cubic-bezier(0.34,1.56,0.64,1)", flexShrink: 0 }}>
      <span style={{ fontSize: value >= 100 ? 11 : 16, fontWeight: 700, color: s.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function ActionBtn({ onClick, disabled, title, children, small }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; small?: boolean;
}) {
  const sz = small ? 28 : 34;
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: sz, height: sz, borderRadius: 8, border: "none", background: disabled ? "#EAE3DA" : "#E0D8CE", color: disabled ? "#C5BDB5" : "#4A3F35", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "background 0.12s, transform 0.1s", fontFamily: "'Rubik', sans-serif" }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.88)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}
