import { useState, useCallback, useEffect, useRef } from "react";
import { COLS, CELL_SIZE, GAP, BOARD_PAD, getBlockStyle, Grid, FlyingBlock, Explosion, ScorePopup, MergeEvent, SlideAnim } from "./game/gameTypes";
import { emptyGrid, randomValue, cloneGrid, dropBlock, isBoardFull, applyGravity } from "./game/gameLogic";
import { GameHeader, GamePreview, GameBoard } from "./game/GameUI";

type Snapshot = { grid: Grid; score: number; current: number; next: number };

const FLY_MS    = 320; // длительность полёта блока
const SLIDE_MS  = 420; // длительность скольжения блока к цели
const PAUSE_MS  = 250; // пауза после слияния перед следующим шагом

let flyId    = 0;
let explId   = 0;
let popupId  = 0;
let slideId  = 0;  

const SAVE_KEY = "merge_state_v4";

function loadSave(): { grid: Grid; score: number; current: number; next: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.grid) applyGravity(saved.grid);
    return saved;
  } catch (_) { return null; }
}

function saveState(grid: Grid, score: number, current: number, next: number) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, score, current, next }));
  } catch (_) { /* ignore */ }
}

export default function MergeGame() {
  const saved = loadSave();
  const [grid, setGrid]               = useState<Grid>(() => saved?.grid ?? emptyGrid());
  const [score, setScore]             = useState(() => saved?.score ?? 0);
  const [best, setBest]               = useState<number>(() =>
    parseInt(localStorage.getItem("merge_best") ?? "0", 10)
  );
  const [current, setCurrent]         = useState<number>(() => saved?.current ?? randomValue());
  const [next, setNext]               = useState<number>(() => saved?.next ?? randomValue());
  const [hoverCol, setHoverCol]       = useState<number | null>(null);
  const [history, setHistory]         = useState<Snapshot[]>([]);
  const [gameOver, setGameOver]       = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [explosions, setExplosions]   = useState<Explosion[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [slideBlocks, setSlideBlocks] = useState<(SlideAnim & { id: number })[]>([]);
  const [busy, setBusy]               = useState(false);
  const [liveMerges, setLiveMerges]   = useState(0); // живой счётчик объединений (во время хода)
  const [lastMerges, setLastMerges]   = useState(0); // объединений в завершённом ходе
  const [lastScore, setLastScore]     = useState(0); // очки завершённого хода
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set()); // "r-c" блоков только что слившихся

  const prevBest    = useRef(best);
  const stepsRef    = useRef<MergeStep[]>([]);    // очередь шагов анимации
  const totalScoreRef = useRef(0);                // накопленный счёт для финала
  const prevScoreRef  = useRef(0);                // счёт до начала хода
  const liveMergesRef = useRef(0);               // ref для доступа в колбэках
  const finalGridRef  = useRef<Grid | null>(null);
  const nextAfterDropRef = useRef<[number, number]>([current, next]); // [current, next] после броска
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boardPx = COLS * CELL_SIZE + (COLS - 1) * GAP;

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("merge_best", String(score));
      prevBest.current = score;
    }
  }, [score, best]);

  // Показать взрыв и попап для события слияния
  const showMergeEffects = useCallback((ev: MergeEvent) => {
    const n = liveMergesRef.current + 1;
    navigator.vibrate?.(n === 1 ? 25 : n === 2 ? 45 : n === 3 ? 70 : n >= 4 ? [60, 30, 80] : 25);

    const style = getBlockStyle(ev.resultValue);
    const x = BOARD_PAD + ev.col * (CELL_SIZE + GAP) + CELL_SIZE / 2;
    const y = BOARD_PAD + ev.row * (CELL_SIZE + GAP) + CELL_SIZE / 2;

    const expId = ++explId;
    setExplosions((prev) => [...prev, { id: expId, x, y, color: style.glow }]);
    setTimeout(() => setExplosions((prev) => prev.filter((e) => e.id !== expId)), 500);

    if (ev.points > 0) {
      const ppId = ++popupId;
      // multiplier = кол-во слияний за ход (N), points = N*N
      const n = Math.round(Math.sqrt(ev.points));
      setScorePopups((prev) => [...prev, { id: ppId, x, y, points: ev.points, multiplier: n, color: style.text }]);
      setTimeout(() => setScorePopups((prev) => prev.filter((p) => p.id !== ppId)), 800);
    }
  }, []);

  // Проигрываем следующий шаг из очереди
  const playNextStep = useCallback(() => {
    const step = stepsRef.current.shift();
    if (!step) {
      // Все шаги сыграны — финализируем
      const finalGrid = finalGridRef.current!;
      const finalScore = totalScoreRef.current;
      setGrid(finalGrid);
      setScore(finalScore);
      setSlideBlocks([]);
      // Сохраняем результат хода — формула остаётся видна до следующего броска
      const gained = finalScore - prevScoreRef.current;
      setLastScore(gained);
      setLastMerges(liveMergesRef.current); // сохраняем кол-во объединений
      liveMergesRef.current = 0;
      setLiveMerges(0);
      setBusy(false);
      // Сохраняем прогресс в localStorage
      saveState(finalGrid, finalScore, nextAfterDropRef.current[0], nextAfterDropRef.current[1]);

      if (isBoardFull(finalGrid)) {
        setGameOver(true);
        if (finalScore > prevBest.current) {
          setBest(finalScore);
          localStorage.setItem("merge_best", String(finalScore));
          prevBest.current = finalScore;
        }
      }
      return;
    }

    // Запускаем слайды (блоки летят к dropCol)
    if (step.slides && step.slides.length > 0) {
      const newSlides = step.slides.map(sl => ({ ...sl, id: ++slideId }));
      setSlideBlocks(newSlides);
      // Ждём завершения скольжения, потом показываем результат слияния
      timerRef.current = setTimeout(() => {
        setSlideBlocks([]);
        setGrid(step.grid);
        if (step.mergeEvent) {
          showMergeEffects(step.mergeEvent);
          liveMergesRef.current += 1;
          setLiveMerges(liveMergesRef.current);
          if (step.mergeEvent.points > 0) setScore((s) => s + step.mergeEvent!.points);
        }
        timerRef.current = setTimeout(playNextStep, PAUSE_MS);
      }, SLIDE_MS);
    } else {
      setGrid(step.grid);
      if (step.mergeEvent) {
        showMergeEffects(step.mergeEvent);
        liveMergesRef.current += 1;
        setLiveMerges(liveMergesRef.current);
        if (step.mergeEvent.points > 0) setScore((s) => s + step.mergeEvent!.points);
      }
      timerRef.current = setTimeout(playNextStep, PAUSE_MS);
    }
  }, [showMergeEffects]);

  // Когда летящий блок долетел
  const handleFlyDone = useCallback((id: number) => {
    setFlyingBlocks((prev) => prev.filter((b) => b.id !== id));
    // Запускаем цепочку шагов слияния
    playNextStep();
  }, [playNextStep]);

  const handleDrop = useCallback(
    (col: number) => {
      if (gameOver || busy) return;

      const { newGrid, scoreGained, placed, landRow, mergeEvents, steps } = dropBlock(grid, col, current);
      if (!placed) return;

      setBusy(true);
      setHistory((h) => [...h.slice(-19), { grid: cloneGrid(grid), score, current, next }]);

      // Сразу меняем current/next — игрок видит следующий блок
      const newNext = randomValue();
      setCurrent(next);
      setNext(newNext);
      nextAfterDropRef.current = [next, newNext];

      // Готовим очередь шагов (всё кроме шага 0 — он покажется после посадки)
      // steps[0] — состояние после посадки (без слияния), steps[1..] — каждое слияние
      stepsRef.current = steps.slice(1); // шаг 0 покажем сразу при посадке
      totalScoreRef.current = score + scoreGained;
      prevScoreRef.current = score; // запомним счёт до хода
      finalGridRef.current = newGrid;
      setLastScore(0); // сбрасываем предыдущий результат при новом броске
      setLastMerges(0);
      liveMergesRef.current = 0;

      // Показываем состояние "блок только упал" сразу (steps[0])
      if (steps.length > 0) setGrid(steps[0].grid);

      // Запускаем летящий блок
      const fid = ++flyId;
      setFlyingBlocks((prev) => [...prev, { id: fid, value: current, col, targetRow: landRow }]);

      // Если слияний не будет — финализируем сразу после полёта
      if (mergeEvents.length === 0) {
        stepsRef.current = [];
      }
    },
    [gameOver, busy, grid, score, current, next]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || busy) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    stepsRef.current = [];
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
    setSlideBlocks([]);
    setLiveMerges(0);
    setBusy(false);
    saveState(prev.grid, prev.score, prev.current, prev.next);
  }, [history, busy]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stepsRef.current = [];
    const newGrid = emptyGrid();
    const newCurrent = randomValue();
    const newNext = randomValue();
    setGrid(newGrid);
    setScore(0);
    setCurrent(newCurrent);
    setNext(newNext);
    setHistory([]);
    setGameOver(false);
    setFlyingBlocks([]);
    setExplosions([]);
    setScorePopups([]);
    setSlideBlocks([]);
    setLiveMerges(0);
    setBusy(false);
    localStorage.removeItem(SAVE_KEY);
  }, []);

  const handleHardRefresh = useCallback(() => {
    if ("caches" in window) {
      caches.keys().then((names) => { names.forEach((n) => caches.delete(n)); }).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "#2A2A2A", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Rubik', sans-serif", userSelect: "none", paddingBottom: 28, overflowX: "hidden", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E\")" }}>

      <GameHeader score={score} best={best} onRefresh={handleHardRefresh} onUndo={handleUndo} canUndo={history.length > 0 && !busy} boardPx={boardPx} />

      <GamePreview current={current} next={next} boardPx={boardPx} liveMerges={liveMerges} lastScore={lastScore} lastMerges={lastMerges} />

      <GameBoard
        displayGrid={grid}
        flyingBlocks={flyingBlocks}
        explosions={explosions}
        scorePopups={scorePopups}
        slideBlocks={slideBlocks}
        hoverCol={hoverCol}
        gameOver={gameOver}
        score={score}
        onDrop={handleDrop}
        onHoverCol={setHoverCol}
        onRestart={handleRestart}
        onMouseLeave={() => setHoverCol(null)}
        onFlyDone={handleFlyDone}
      />

      <p style={{ marginTop: 12, fontSize: 11, color: "#555", letterSpacing: "0.04em" }}>
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
        @keyframes mergePulse {
          0%   { transform: scale(0.5); opacity: 0; box-shadow: 0 0 0px 0px var(--glow-color); }
          35%  { transform: scale(1.28); opacity: 1; box-shadow: 0 0 28px 10px var(--glow-color); }
          60%  { transform: scale(0.93); box-shadow: 0 0 12px 4px var(--glow-color); }
          80%  { transform: scale(1.06); }
          100% { transform: scale(1); box-shadow: 0 0 0px 0px var(--glow-color); }
        }
        @keyframes scorePop {
          0%   { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes explosion-ring {
          0%   { transform: scale(0.1); opacity: 0.9; border-radius: 50%; }
          60%  { opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; border-radius: 50%; }
        }
        @keyframes explosion-ring2 {
          0%   { transform: scale(0.1); opacity: 0.6; border-radius: 12px; }
          100% { transform: scale(1.8); opacity: 0; border-radius: 12px; }
        }
        @keyframes particle-0 {
          0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
          100% { transform: translate(44px,-44px) scale(0); opacity: 0; }
        }
        @keyframes particle-1 {
          0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
          100% { transform: translate(-44px,-44px) scale(0); opacity: 0; }
        }
        @keyframes particle-2 {
          0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
          100% { transform: translate(44px,44px) scale(0); opacity: 0; }
        }
        @keyframes particle-3 {
          0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
          100% { transform: translate(-44px,44px) scale(0); opacity: 0; }
        }
        * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>
    </div>
  );
}