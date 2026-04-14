import React from "react";
import Icon from "@/components/ui/icon";
import { COLS, ROWS, EMPTY, CELL_SIZE, GAP, BOARD_PAD, getBlockStyle, Grid, FlyingBlock, Explosion, ScorePopup, SlideAnim } from "./gameTypes";
import { FlyBlock, ExplosionEffect, ScorePopupEffect, BlockLabel, SlideBlock } from "./GameEffects";

// ---- Кнопка действия ----
export function ActionBtn({ onClick, disabled, title, children, small }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; small?: boolean;
}) {
  const sz = small ? 28 : 34;
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: sz, height: sz, borderRadius: 8, border: "none", background: disabled ? "#A0A0A0" : "#888", color: disabled ? "#C8C8C8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer", transition: "background 0.12s, transform 0.1s", fontFamily: "'Rubik', sans-serif" }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.88)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

// ---- Крупный текущий блок ----
export function BigCurrentBlock({ value }: { value: number }) {
  const s = getBlockStyle(value);
  return (
    <div key={value} style={{ width: 64, height: 64, borderRadius: 14, background: s.bg, border: `2px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 16px rgba(0,0,0,0.10)`, animation: "blockAppear 0.18s cubic-bezier(0.34,1.56,0.64,1)", flexShrink: 0 }}>
      <span style={{ fontSize: value >= 100 ? 22 : 32, fontWeight: 800, color: s.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ---- Маленький следующий блок ----
export function NextBlock({ value }: { value: number }) {
  const s = getBlockStyle(value);
  return (
    <div key={value} style={{ width: 26, height: 26, borderRadius: 7, background: s.bg, border: `1.5px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.55, animation: "blockAppear 0.18s cubic-bezier(0.34,1.56,0.64,1)", flexShrink: 0 }}>
      <span style={{ fontSize: value >= 1000 ? 8 : value >= 100 ? 10 : 13, fontWeight: 700, color: s.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ---- Шапка ----
export function GameHeader({ score, best, onRefresh, onUndo, canUndo, boardPx }: {
  score: number; best: number; onRefresh: () => void; onUndo: () => void; canUndo: boolean; boardPx: number;
}) {
  return (
    <div style={{ width: "100%", maxWidth: boardPx + BOARD_PAD * 2 + 16, padding: "10px 8px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, boxSizing: "border-box" }}>
      <div style={{ minWidth: 60 }}>
        <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", color: "#777", textTransform: "uppercase", marginBottom: 1 }}>Рекорд</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#222", lineHeight: 1 }}>{best.toLocaleString("ru")}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.12em", color: "#777", textTransform: "uppercase", marginBottom: 1 }}>Очки</div>
        <div key={score} style={{ fontSize: 20, fontWeight: 700, color: "#111", lineHeight: 1, animation: "scorePop 0.22s ease" }}>
          {score.toLocaleString("ru")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, minWidth: 60, justifyContent: "flex-end" }}>
        <ActionBtn onClick={onUndo} disabled={!canUndo} title="Отменить ход" small>
          <Icon name="Undo2" size={13} />
        </ActionBtn>
        <ActionBtn onClick={onRefresh} title="Обновить кэш" small>
          <Icon name="RefreshCcw" size={13} />
        </ActionBtn>
      </div>
    </div>
  );
}

// ---- Превью текущего и следующего ----
export function GamePreview({ current, next, boardPx, liveMerges, lastScore, lastMerges }: {
  current: number; next: number; boardPx: number; liveMerges: number; lastScore: number; lastMerges: number;
}) {
  // Что показывать: живой счётчик или результат предыдущего хода
  const isLive = liveMerges > 0;
  const n = isLive ? liveMerges : lastMerges;
  const result = n * n;
  const showFormula = n >= 2;
  const showPlus1 = n === 1;
  const show = isLive ? n >= 1 : lastScore > 0;

  const accentColor = isLive
    ? (n >= 7 ? "#FFD700" : n >= 5 ? "#FF8C00" : "#fff")
    : "rgba(255,255,255,0.55)";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 10, width: boardPx + BOARD_PAD * 2 }}>

      {/* Счёт слева */}
      <div style={{ minWidth: 80, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
        {show && showFormula && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", animation: isLive ? "blockAppear 0.15s ease" : undefined }}>
            {/* N × N = итог */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", margin: "0 2px" }}>×</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{n}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>=</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: accentColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{result}</span>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              объединений
            </span>
          </div>
        )}
        {show && showPlus1 && (
          <div style={{ animation: isLive ? "blockAppear 0.15s ease" : undefined }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: "-0.03em" }}>1</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>×</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: "-0.03em" }}>1</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>=</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: accentColor, letterSpacing: "-0.03em" }}>1</span>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginTop: 3, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", textAlign: "right" }}>
              объединений
            </span>
          </div>
        )}
      </div>

      {/* Блоки */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <BigCurrentBlock value={current} />
        <NextBlock value={next} />
      </div>

      {/* Пустое место справа для симметрии */}
      <div style={{ minWidth: 72 }} />
    </div>
  );
}

// ---- Игровое поле ----
export function GameBoard({ displayGrid, flyingBlocks, explosions, scorePopups, slideBlocks, hoverCol, gameOver, score, onDrop, onHoverCol, onRestart, onMouseLeave, onFlyDone }: {
  displayGrid: Grid;
  flyingBlocks: FlyingBlock[];
  explosions: Explosion[];
  scorePopups: ScorePopup[];
  slideBlocks: (SlideAnim & { id: number })[];
  hoverCol: number | null;
  gameOver: boolean;
  score: number;
  onDrop: (col: number) => void;
  onHoverCol: (col: number | null) => void;
  onRestart: () => void;
  onMouseLeave: () => void;
  onFlyDone: (id: number) => void;
}) {
  const boardPx = COLS * CELL_SIZE + (COLS - 1) * GAP;
  const boardH = ROWS * CELL_SIZE + (ROWS - 1) * GAP;

  return (
    <div
      style={{ marginTop: 14, padding: BOARD_PAD, background: "#B0B0B0", borderRadius: 16, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", position: "relative", overflow: "visible", width: boardPx + BOARD_PAD * 2, flexShrink: 0 }}
      onMouseLeave={onMouseLeave}
    >
      {/* Зоны клика */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, gap: GAP, position: "absolute", top: BOARD_PAD, left: BOARD_PAD, zIndex: 10 }}>
        {Array.from({ length: COLS }).map((_, c) => (
          <div key={c} style={{ width: CELL_SIZE, height: boardH, cursor: gameOver ? "default" : "pointer" }}
            onClick={() => onDrop(c)}
            onMouseEnter={() => onHoverCol(c)}
          />
        ))}
      </div>

      {/* Сетка ячеек */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`, gap: GAP, position: "relative", zIndex: 1 }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const val = displayGrid[r][c];
            const isHov = hoverCol === c;
            const isFlying = flyingBlocks.some((fb) => fb.col === c && fb.targetRow === r);
            const isSliding = slideBlocks.some((sl) => sl.fromCol === c && sl.fromRow === r);
            const st = (val !== EMPTY && !isFlying && !isSliding) ? getBlockStyle(val) : null;
            return (
              <div key={`${r}-${c}`} style={{
                width: CELL_SIZE, height: CELL_SIZE, borderRadius: 10,
                background: st ? st.bg : isHov ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)",
                border: st ? `1.5px solid ${st.border}` : "1.5px solid rgba(255,255,255,0.10)",
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
        <FlyBlock key={fb.id} fb={fb} onDone={onFlyDone} />
      ))}

      {/* Взрывы */}
      {explosions.map((exp) => <ExplosionEffect key={exp.id} exp={exp} />)}

      {/* Скользящие блоки (горизонтальная анимация слияния) */}
      {slideBlocks.map((sl) => <SlideBlock key={sl.id} sl={sl} id={sl.id} onDone={() => {}} />)}

      {/* Всплывающие очки */}
      {scorePopups.map((popup) => <ScorePopupEffect key={popup.id} popup={popup} />)}

      {/* Hover-полоска */}
      {hoverCol !== null && !gameOver && (
        <div style={{ position: "absolute", top: BOARD_PAD, left: BOARD_PAD + hoverCol * (CELL_SIZE + GAP), width: CELL_SIZE, height: boardH, borderRadius: 10, background: "rgba(255,255,255,0.07)", border: "2px solid rgba(255,255,255,0.20)", pointerEvents: "none", zIndex: 5 }} />
      )}

      {/* Game Over */}
      {gameOver && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(44,32,23,0.82)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 30 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>Поле заполнено</div>
          <div style={{ fontSize: 13, color: "#C8B8A8" }}>Счёт: {score.toLocaleString("ru")}</div>
          <button onClick={onRestart} style={{ padding: "9px 26px", borderRadius: 12, border: "none", background: "#F5F0EB", color: "#2C2017", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Rubik', sans-serif", marginTop: 4 }}>
            Новая игра
          </button>
        </div>
      )}
    </div>
  );
}