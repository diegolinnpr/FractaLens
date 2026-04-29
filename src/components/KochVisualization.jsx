import { useEffect, useRef, useState } from "react";

const MAX_ITER = 100;
const SQRT3_2  = Math.sqrt(3) / 2;

// Recursive Koch segment draw — stops when the segment is sub-pixel so
// depth=100 runs just as fast as depth=10 on any real canvas.
function drawKochSegment(ctx, ax, ay, bx, by, depth, minLenSq) {
  const dx = bx - ax, dy = by - ay;
  if (depth <= 0 || dx * dx + dy * dy <= minLenSq) {
    ctx.lineTo(bx, by);
    return;
  }
  const p1x = ax + dx / 3,     p1y = ay + dy / 3;
  const p2x = ax + 2 * dx / 3, p2y = ay + 2 * dy / 3;
  const pdx = p2x - p1x,       pdy = p2y - p1y;
  const px  = p1x + pdx * 0.5 - pdy * SQRT3_2;
  const py  = p1y + pdy * 0.5 + pdx * SQRT3_2;
  drawKochSegment(ctx, ax,  ay,  p1x, p1y, depth - 1, minLenSq);
  drawKochSegment(ctx, p1x, p1y, px,  py,  depth - 1, minLenSq);
  drawKochSegment(ctx, px,  py,  p2x, p2y, depth - 1, minLenSq);
  drawKochSegment(ctx, p2x, p2y, bx,  by,  depth - 1, minLenSq);
}

// Segment count = 3 × 4^iter — use log-based formatting above ~iter 24
// where the integer overflows Number.MAX_SAFE_INTEGER.
function fmtSegCount(iter) {
  if (iter === 0) return "3";
  if (iter <= 24) return (3 * Math.pow(4, iter)).toLocaleString();
  const log10 = Math.log10(3) + iter * Math.log10(4);
  const exp   = Math.floor(log10);
  const mant  = Math.pow(10, log10 - exp);
  return `${mant.toFixed(1)}×10^${exp}`;
}

// ─────────────────────────────────────────────────────────────────────────────

function KochVisualization({ hue = 200, captureRef }) {
  const canvasRef           = useRef(null);
  const [iter,    setIter]  = useState(0);
  const [running, setRunning] = useState(true);
  const [speed,   setSpeed] = useState(1200); // ms between auto-advance steps

  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      return { dataUrl, width: canvas.width, height: canvas.height };
    };
  });

  // Redraw whenever iter or hue changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    canvas.width  = w;
    canvas.height = h;

    const ctx      = canvas.getContext("2d");
    const scale    = Math.min(w, h) * 0.38;
    const minLenSq = 0.25; // stop recursing at 0.5 px

    ctx.fillStyle = "#0c0a06";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Base equilateral triangle vertices (radius 1 in canvas coords)
    const ax =  0,            ay = -scale;
    const bx =  SQRT3_2 * scale, by = 0.5 * scale;
    const cx = -SQRT3_2 * scale, cy = 0.5 * scale;

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    drawKochSegment(ctx, ax, ay, bx, by, iter, minLenSq);
    drawKochSegment(ctx, bx, by, cx, cy, iter, minLenSq);
    drawKochSegment(ctx, cx, cy, ax, ay, iter, minLenSq);
    ctx.closePath();

    ctx.fillStyle   = `hsla(${hue}, 60%, 35%, 0.22)`;
    ctx.fill();
    ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
    ctx.lineWidth   = Math.max(0.4, 1.6 / (iter + 1));
    ctx.stroke();

    ctx.restore();
  }, [iter, hue]);

  // Auto-advance through iterations at the chosen speed
  useEffect(() => {
    if (!running || iter >= MAX_ITER) return;
    const t = setTimeout(() => setIter(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [running, iter, speed]);

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

  const row  = { display: "flex", justifyContent: "space-between", marginBottom: 2 };
  const lbl  = { fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "1px", textTransform: "uppercase" };
  const val  = { fontSize: 10, color: "rgba(255,255,255,0.85)" };
  const sldr = { width: "100%", accentColor: "#7eb8ff", cursor: "pointer" };

  const speedLabel = speed < 1000
    ? `${speed} ms`
    : `${(speed / 1000).toFixed(1)} s`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      {/* Segment count — top left */}
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {fmtSegCount(iter)} segment{iter === 0 ? "" : "s"}
      </div>

      {/* Controls — top right */}
      <div style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", flexDirection: "column", gap: 12,
        backgroundColor: "rgba(0,0,0,0.65)",
        padding: "12px 16px", borderRadius: 4,
        color: "white", fontSize: 12, letterSpacing: "1px",
        fontFamily: "var(--font)", minWidth: 210,
      }}>
        {/* Iteration label + buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ opacity: 0.65, whiteSpace: "nowrap" }}>
            Iteration {iter} / {MAX_ITER}
          </span>
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
          <button style={overlayBtn()} onClick={() => { setIter(0); setRunning(true); }}>
            Reset
          </button>
        </div>

        {/* Speed slider */}
        <div>
          <div style={row}>
            <span style={lbl}>Auto Speed</span>
            <span style={val}>{speedLabel} / step</span>
          </div>
          <input
            type="range" min={100} max={3000} step={100}
            value={speed} onChange={e => setSpeed(+e.target.value)}
            style={sldr}
          />
        </div>
      </div>
    </div>
  );
}

export default KochVisualization;
