import { useEffect, useRef, useState } from "react";

const MAX_ITER = 6;
const SQRT3_2  = Math.sqrt(3) / 2;

// Replace each segment with the 4 Koch sub-segments
function kochStep(segs) {
  const next = [];
  for (const [A, B] of segs) {
    const p1 = { x: A.x + (B.x - A.x) / 3,    y: A.y + (B.y - A.y) / 3 };
    const p2 = { x: A.x + (B.x - A.x) * 2 / 3, y: A.y + (B.y - A.y) * 2 / 3 };
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const peak = {
      x: p1.x + dx * 0.5 - dy * SQRT3_2,
      y: p1.y + dy * 0.5 + dx * SQRT3_2,
    };
    next.push([A, p1], [p1, peak], [peak, p2], [p2, B]);
  }
  return next;
}

// Initial equilateral triangle in normalised coords (radius 1, centred at origin)
const BASE_SEGS = (() => {
  const A = { x: 0,        y: -1   };
  const B = { x:  SQRT3_2, y:  0.5 };
  const C = { x: -SQRT3_2, y:  0.5 };
  return [[A, B], [B, C], [C, A]];
})();

// Pre-compute all iterations once at module load (deterministic, fast)
const ALL_ITERS = (() => {
  const a = [BASE_SEGS];
  for (let i = 1; i <= MAX_ITER; i++) a.push(kochStep(a[i - 1]));
  return a;
})();

// ─────────────────────────────────────────────────────────────────────────────

function KochVisualization({ hue = 200 }) {
  const canvasRef = useRef(null);
  const [iter, setIter]       = useState(0);
  const [running, setRunning] = useState(true);

  // Draw the current iteration onto the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    canvas.width  = w;
    canvas.height = h;

    const ctx   = canvas.getContext("2d");
    const segs  = ALL_ITERS[iter];
    const scale = Math.min(w, h) * 0.38;

    ctx.fillStyle = "#0c0a06";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Trace the connected snowflake path
    ctx.beginPath();
    ctx.moveTo(segs[0][0].x * scale, segs[0][0].y * scale);
    for (const [, B] of segs) {
      ctx.lineTo(B.x * scale, B.y * scale);
    }
    ctx.closePath();

    ctx.fillStyle   = `hsla(${hue}, 60%, 35%, 0.22)`;
    ctx.fill();

    ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
    ctx.lineWidth   = Math.max(0.4, 1.6 / (iter + 1));
    ctx.stroke();

    ctx.restore();
  }, [iter, hue]);

  // Auto-advance through iterations
  useEffect(() => {
    if (!running || iter >= MAX_ITER) return;
    const t = setTimeout(() => setIter(i => i + 1), 1200);
    return () => clearTimeout(t);
  }, [running, iter]);

  const overlayBtn = (disabled = false) => ({
    background: "none",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "white",
    padding: "4px 10px",
    fontSize: 11,
    letterSpacing: "1px",
    fontFamily: "var(--font)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
  });

  const segCount = 3 * Math.pow(4, iter);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Segment count — top left */}
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {segCount.toLocaleString()} segment{segCount !== 1 ? "s" : ""}
      </div>

      {/* Iteration controls — top right */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", alignItems: "center", gap: "10px",
        backgroundColor: "rgba(0,0,0,0.55)",
        padding: "8px 14px",
        borderRadius: "4px",
        color: "white", fontSize: 12, letterSpacing: "1px",
        fontFamily: "var(--font)",
        whiteSpace: "nowrap",
      }}>
        <span style={{ opacity: 0.65 }}>Iteration {iter} / {MAX_ITER}</span>

        <button
          style={overlayBtn(iter >= MAX_ITER)}
          disabled={iter >= MAX_ITER}
          onClick={() => setRunning(r => !r)}
        >
          {running && iter < MAX_ITER ? "Pause" : "Resume"}
        </button>

        <button
          style={overlayBtn(iter >= MAX_ITER)}
          disabled={iter >= MAX_ITER}
          onClick={() => { setRunning(false); setIter(i => Math.min(i + 1, MAX_ITER)); }}
        >
          + Step
        </button>

        <button
          style={overlayBtn()}
          onClick={() => { setIter(0); setRunning(true); }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default KochVisualization;
