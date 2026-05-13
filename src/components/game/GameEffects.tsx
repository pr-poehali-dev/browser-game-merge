import { useEffect, useRef } from "react";
import { CELL_SIZE, GAP, BOARD_PAD, ROWS, SHOW_NUMBERS, getBlockStyle, FlyingBlock, Explosion, ScorePopup, SlideAnim } from "./gameTypes";

// ---- Метка числа на блоке ----
export function BlockLabel({ value, color }: { value: number; color: string }) {
  if (!SHOW_NUMBERS) return null;
  return (
    <span style={{ fontSize: value >= 100 ? 15 : value >= 10 ? 20 : 24, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
      {value}
    </span>
  );
}

// ---- Летящий блок (снизу вверх) ----
export function FlyBlock({ fb, onDone }: { fb: FlyingBlock; onDone: (id: number) => void }) {
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
      <div style={{ width: "100%", height: "100%", borderRadius: 10, background: s.bg, border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 20px rgba(0,0,0,0.35)` }}>
        <BlockLabel value={fb.value} color={s.text} />
      </div>
    </div>
  );
}

// ---- Скользящий блок (горизонтально) ----
export function SlideBlock({ sl, id, onDone }: { sl: SlideAnim; id: number; onDone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = getBlockStyle(sl.value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fromX  = BOARD_PAD + sl.fromCol * (CELL_SIZE + GAP);
    const toX    = BOARD_PAD + sl.toCol   * (CELL_SIZE + GAP);
    const deltaX = toX - fromX;
    const fromY  = BOARD_PAD + sl.fromRow * (CELL_SIZE + GAP);
    const toY    = BOARD_PAD + sl.toRow   * (CELL_SIZE + GAP);
    const deltaY = toY - fromY;
    const anim = el.animate(
      [
        { transform: `translate(0px, 0px) scale(1.08)`,             opacity: "1"  },
        { transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.5}px) scale(1.12)`, opacity: "1", offset: 0.4 },
        { transform: `translate(${deltaX}px, ${deltaY}px) scale(1)`, opacity: "1"  },
      ],
      { duration: 420, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", fill: "forwards" }
    );
    anim.onfinish = () => onDone(id);
    return () => anim.cancel();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLeft = BOARD_PAD + sl.fromCol * (CELL_SIZE + GAP);
  const startTop  = BOARD_PAD + sl.fromRow * (CELL_SIZE + GAP);

  return (
    <div ref={ref} style={{ position: "absolute", left: startLeft, top: startTop, width: CELL_SIZE, height: CELL_SIZE, zIndex: 25, pointerEvents: "none" }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 10,
        background: s.bg,
        border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 22px 6px ${s.glow}aa, 0 4px 12px rgba(0,0,0,0.35)`,
      }}>
        <BlockLabel value={sl.value} color={s.text} />
      </div>
    </div>
  );
}

// ---- Взрыв частиц ----
const PARTICLE_COUNT = 10;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (360 / PARTICLE_COUNT) * i);

export function ExplosionEffect({ exp }: { exp: Explosion }) {
  return (
    <div style={{ position: "absolute", left: exp.x, top: exp.y, zIndex: 30, pointerEvents: "none" }}>
      {PARTICLE_ANGLES.map((_angle, i) => (
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

// ---- Всплывающий счёт ----
export function ScorePopupEffect({ popup }: { popup: ScorePopup }) {
  return (
    <div style={{
      position: "absolute",
      left: popup.x,
      top: popup.y,
      zIndex: 40,
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      animation: "scoreFloat 0.75s ease-out forwards",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
    }}>
      <span style={{
        fontSize: popup.multiplier >= 3 ? 18 : 15,
        fontWeight: 800,
        color: popup.color,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        textShadow: "0 1px 6px rgba(0,0,0,0.25)",
      }}>
        +{popup.points.toLocaleString("ru")}
      </span>
      {popup.multiplier >= 2 && (
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: popup.color,
          opacity: 0.85,
          letterSpacing: "0.02em",
          textShadow: "0 1px 4px rgba(0,0,0,0.20)",
        }}>
          ×{popup.multiplier}
        </span>
      )}
    </div>
  );
}