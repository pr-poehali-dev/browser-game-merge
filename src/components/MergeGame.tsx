import { useState, useCallback, useEffect, useRef } from "react";
import { COLS, CELL_SIZE, GAP, BOARD_PAD, getBlockStyle, Grid, FlyingBlock, Explosion, ScorePopup, MergeEvent, SlideAnim } from "./game/gameTypes";
import { emptyGrid, randomValue, cloneGrid, dropBlock, isBoardFull } from "./game/gameLogic";
import { GameHeader, GamePreview, GameBoard } from "./game/GameUI";

type Snapshot = { grid: Grid; score: number; current: number; next: number };

const FLY_MS    = 320; // длительность полёта блока
const SLIDE_MS  = 420; // длительность скольжения блока к цели
const PAUSE_MS  = 250; // пауза после слияния перед следующим шагом

let flyId    = 0;
let explId   = 0;
let popupId  = 0;
let slideId  = 0;  

export default function MergeGame() {
  const [grid, setGrid]               = useState<Grid>(emptyGrid);
  const [score, setScore]             = useState(0);
  const [best, setBest]               = useState<number>(() =>
    parseInt(localStorage.getItem("merge_best") ?? "0", 10)
  );
  const [current, setCurrent]         = useState<number>(randomValue);
  const [next, setNext]               = useState<number>(randomValue);
  const [hoverCol, setHoverCol]       = useState<number | null>(null);
  const [history, setHistory]         = useState<Snapshot[]>([]);
  const [gameOver, setGameOver]       = useState(false);
  const [flyingBlocks, setFlyingBlocks] = useState<FlyingBlock[]>([]);
  const [explosions, setExplosions]   = useState<Explosion[]>([]);
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [slideBlocks, setSlideBlocks] = useState<(SlideAnim & { id: number })[]>([]);
  const [busy, setBusy]               = useState(false);
  const [liveMerges, setLiveMerges]   = useState(0); // живой счётчик объединений за ход
  const [lastScore, setLastScore]     = useState(0); // очки последнего завершённого хода

  const prevBest    = useRef(best);
  const stepsRef    = useRef<MergeStep[]>([]);    // очередь шагов анимации
  const totalScoreRef = useRef(0);                // накопленный счёт для финала
  const prevScoreRef  = useRef(0);                // счёт до начала хода
  const finalGridRef  = useRef<Grid | null>(null);
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
      // Сохраняем очки хода и сбрасываем счётчик
      setLastScore(finalScore - prevScoreRef.current); // очки добавленные за этот ход
      setLiveMerges(0);
      setBusy(false);

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
          setLiveMerges((prev) => prev + 1);
          if (step.mergeEvent.points > 0) setScore((s) => s + step.mergeEvent!.points);
        }
        timerRef.current = setTimeout(playNextStep, PAUSE_MS);
      }, SLIDE_MS);
    } else {
      setGrid(step.grid);
      if (step.mergeEvent) {
        showMergeEffects(step.mergeEvent);
        setLiveMerges((prev) => prev + 1);
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
      setCurrent(next);
      setNext(randomValue());

      // Готовим очередь шагов (всё кроме шага 0 — он покажется после посадки)
      // steps[0] — состояние после посадки (без слияния), steps[1..] — каждое слияние
      stepsRef.current = steps.slice(1); // шаг 0 покажем сразу при посадке
      totalScoreRef.current = score + scoreGained;
      prevScoreRef.current = score; // запомним счёт до хода
      finalGridRef.current = newGrid;
      setLastScore(0); // сбрасываем предыдущий результат при новом броске

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
  }, [history, busy]);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stepsRef.current = [];
    setGrid(emptyGrid());
    setScore(0);
    setCurrent(randomValue());
    setNext(randomValue());
    setHistory([]);
    setGameOver(false);
    setFlyingBlocks([]);
    setExplosions([]);
    setScorePopups([]);
    setSlideBlocks([]);
    setLiveMerges(0);
    setBusy(false);
  }, []);

  const handleHardRefresh = useCallback(() => {
    if ("caches" in window) {
      caches.keys().then((names) => { names.forEach((n) => caches.delete(n)); }).finally(() => window.location.reload());
    } else {
      window.location.reload();
    }
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "#B8B8B8", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Rubik', sans-serif", userSelect: "none", paddingBottom: 28, overflowX: "hidden" }}>

      <GameHeader score={score} best={best} onRefresh={handleHardRefresh} onUndo={handleUndo} canUndo={history.length > 0 && !busy} boardPx={boardPx} />

      <GamePreview current={current} next={next} boardPx={boardPx} liveMerges={liveMerges} lastScore={lastScore} />

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