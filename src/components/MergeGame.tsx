import { useState, useCallback, useEffect, useRef } from "react";
import { COLS, ROWS, CELL_SIZE, GAP, BOARD_PAD, getBlockStyle, Grid, FlyingBlock, Explosion, ScorePopup, PendingResult } from "./game/gameTypes";
import { emptyGrid, randomValue, cloneGrid, dropBlock, isBoardFull } from "./game/gameLogic";
import { GameHeader, GamePreview, GameBoard } from "./game/GameUI";

type Snapshot = { grid: Grid; score: number; current: number; next: number };

let flyId = 0;
let explId = 0;
let popupId = 0;

export default function MergeGame() {
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() =>
    parseInt(localStorage.getItem("merge_best") ?? "0", 10)
  );
  const [current, setCurrent] = useState<number>(randomValue);
  const [next, setNext] = useState<number>(randomValue);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);

  const pendingRef = useRef<PendingResult | null>(null);
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

      const newPopups: ScorePopup[] = p.mergeEvents.map((ev) => {
        const style = getBlockStyle(ev.resultValue);
        return {
          id: ++popupId,
          x: BOARD_PAD + ev.col * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          y: BOARD_PAD + ev.row * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          points: ev.points,
          multiplier: ev.participants,
          color: style.text,
        };
      });
      setScorePopups((prev) => [...prev, ...newPopups]);
      setTimeout(() => {
        setScorePopups((prev) => prev.filter((sp) => !newPopups.find((n) => n.id === sp.id)));
      }, 800);
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
    setExplosions([]);
    setScorePopups([]);
    animCountRef.current = 0;
    pendingRef.current = null;
  }, [history]);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver) return;
      const { newGrid, scoreGained, placed, landRow, mergedPositions, mergeEvents } = dropBlock(grid, col, current);
      if (!placed) return;

      setHistory((h) => [...h.slice(-19), { grid: cloneGrid(grid), score, current, next }]);

      setCurrent(next);
      setNext(randomValue());

      pendingRef.current = { newGrid, scoreGained, newScore: score + scoreGained, mergedPositions, mergeEvents };

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
    setHistory([]);
    setGameOver(false);
    setFlyingBlocks([]);
    setExplosions([]);
    setScorePopups([]);
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

      <GameHeader score={score} best={best} onRefresh={handleHardRefresh} onUndo={handleUndo} canUndo={history.length > 0} boardPx={boardPx} />

      <GamePreview current={current} next={next} boardPx={boardPx} />

      <GameBoard
        displayGrid={displayGrid}
        flyingBlocks={flyingBlocks}
        explosions={explosions}
        scorePopups={scorePopups}
        hoverCol={hoverCol}
        gameOver={gameOver}
        score={score}
        onDrop={handleDrop}
        onHoverCol={setHoverCol}
        onRestart={handleRestart}
        onMouseLeave={() => setHoverCol(null)}
        onFlyDone={handleFlyDone}
      />

      <p style={{ marginTop: 12, fontSize: 11, color: "#B5ADA5", letterSpacing: "0.04em" }}>
        Нажми на колонку, чтобы бросить блок
      </p>

      <style>{`
        @keyframes scoreFloat {
          0%   { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
          20%  { transform: translate(-50%, -60%) scale(1.15); opacity: 1; }
          70%  { transform: translate(-50%, -110%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -140%) scale(0.9); opacity: 0; }
        }
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