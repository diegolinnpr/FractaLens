import { useEffect, useRef, useState } from "react";

const MAX_ITER = 16;
const SQRT3_2  = Math.sqrt(3) / 2;

// Recursive Koch draw with two optimisations:
//   1. Sub-pixel pruning  — stop when the segment is < 0.5 screen-pixels wide.
//      minLenSq is expressed in canvas-pixel² BEFORE the zoom transform is applied,
//      so it equals (0.5 / zoom)² — a canvas pixel that maps to 0.5 screen pixels.
//   2. Frustum culling    — skip segments whose Koch extent is entirely off-screen.
//      The Koch bump for a segment of length L stays within L of its AABB, so we
//      expand the AABB by L and reject against the visible canvas region (vBounds).
//      Off-screen segments are skipped with ctx.moveTo so the path stays connected.
function drawKochSegment(ctx, ax, ay, bx, by, depth, minLenSq, vBounds) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (depth <= 0 || lenSq <= minLenSq) {
    ctx.lineTo(bx, by);
    return;
  }

  const len = Math.sqrt(lenSq);
  if (
    Math.max(ax, bx) + len < vBounds.minX ||
    Math.min(ax, bx) - len > vBounds.maxX ||
    Math.max(ay, by) + len < vBounds.minY ||
    Math.min(ay, by) - len > vBounds.maxY
  ) {
    ctx.moveTo(bx, by);
    return;
  }

  const p1x = ax + dx / 3,     p1y = ay + dy / 3;
  const p2x = ax + 2 * dx / 3, p2y = ay + 2 * dy / 3;
  const pdx = p2x - p1x,       pdy = p2y - p1y;
  const px  = p1x + pdx * 0.5 - pdy * SQRT3_2;
  const py  = p1y + pdy * 0.5 + pdx * SQRT3_2;
  drawKochSegment(ctx, ax,  ay,  p1x, p1y, depth - 1, minLenSq, vBounds);
  drawKochSegment(ctx, p1x, p1y, px,  py,  depth - 1, minLenSq, vBounds);
  drawKochSegment(ctx, px,  py,  p2x, p2y, depth - 1, minLenSq, vBounds);
  drawKochSegment(ctx, p2x, p2y, bx,  by,  depth - 1, minLenSq, vBounds);
}

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
  const canvasRef = useRef(null);
  const iterRef   = useRef(0);
  const hueRef    = useRef(hue);
  const zoomRef   = useRef(1);
  const panRef    = useRef({ x: 0, y: 0 });
  const dragRef   = useRef({ active: false, lastX: 0, lastY: 0 });

  const [iter,    setIter]    = useState(0);
  const [running, setRunning] = useState(true);
  const [speed,   setSpeed]   = useState(1200);

  // Keep refs in sync so event-handler closures always read the latest values
  useEffect(() => { iterRef.current = iter; }, [iter]);
  useEffect(() => { hueRef.current  = hue;  }, [hue]);

  // All mutable state lives in refs, so this function is safe to call from
  // any context including the stale closures inside the event-listener effect.
  function redrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w;
      canvas.height = h;
    }

    const it   = iterRef.current;
    const hu   = hueRef.current;
    const zoom = zoomRef.current;
    const pan  = panRef.current;

    const ctx      = canvas.getContext("2d");
    const scale    = Math.min(w, h) * 0.38;
    const minLenSq = (0.5 / zoom) ** 2; // 0.5 screen-pixels² in canvas space

    // Visible rectangle in canvas-pixel space (before the zoom transform)
    const vBounds = {
      minX: (-w / 2 - pan.x) / zoom,
      maxX: ( w / 2 - pan.x) / zoom,
      minY: (-h / 2 - pan.y) / zoom,
      maxY: ( h / 2 - pan.y) / zoom,
    };

    ctx.fillStyle = "#0c0a06";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    const ax =  0,                ay = -scale;
    const bx =  SQRT3_2 * scale,  by =  0.5 * scale;
    const cx = -SQRT3_2 * scale,  cy =  0.5 * scale;

    // Interior fill — only meaningful when the whole snowflake fits on screen
    if (zoom < 2) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      drawKochSegment(ctx, ax, ay, bx, by, it, minLenSq, vBounds);
      drawKochSegment(ctx, bx, by, cx, cy, it, minLenSq, vBounds);
      drawKochSegment(ctx, cx, cy, ax, ay, it, minLenSq, vBounds);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hu}, 60%, 35%, 0.22)`;
      ctx.fill();
    }

    // Outline stroke — frustum-culled for performance at high zoom
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    drawKochSegment(ctx, ax, ay, bx, by, it, minLenSq, vBounds);
    drawKochSegment(ctx, bx, by, cx, cy, it, minLenSq, vBounds);
    drawKochSegment(ctx, cx, cy, ax, ay, it, minLenSq, vBounds);
    ctx.closePath();
    ctx.strokeStyle = `hsl(${hu}, 80%, 65%)`;
    ctx.lineWidth   = Math.max(0.4, 1.6 / (it + 1)) / zoom;
    ctx.stroke();

    ctx.restore();
  }

  // Redraw whenever iter or hue changes (refs are synced first by earlier effects)
  useEffect(() => { redrawCanvas(); }, [iter, hue]);

  // Wheel zoom + drag pan — registered once; reads only from refs so stale closure is fine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onWheel(e) {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const cx     = e.clientX - rect.left - canvas.clientWidth  / 2;
      const cy     = e.clientY - rect.top  - canvas.clientHeight / 2;
      const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.5, Math.min(5000, zoomRef.current * factor));
      const ratio   = newZoom / zoomRef.current;
      panRef.current  = {
        x: cx - (cx - panRef.current.x) * ratio,
        y: cy - (cy - panRef.current.y) * ratio,
      };
      zoomRef.current = newZoom;
      redrawCanvas();
    }

    function onMouseDown(e) {
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      canvas.style.cursor = "grabbing";
    }

    function onMouseMove(e) {
      if (!dragRef.current.active) return;
      panRef.current = {
        x: panRef.current.x + e.clientX - dragRef.current.lastX,
        y: panRef.current.y + e.clientY - dragRef.current.lastY,
      };
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      redrawCanvas();
    }

    function onMouseUp() {
      dragRef.current.active  = false;
      canvas.style.cursor = "grab";
    }

    canvas.addEventListener("wheel",      onWheel,     { passive: false });
    canvas.addEventListener("mousedown",  onMouseDown);
    canvas.addEventListener("mousemove",  onMouseMove);
    canvas.addEventListener("mouseup",    onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp);
    return () => {
      canvas.removeEventListener("wheel",      onWheel);
      canvas.removeEventListener("mousedown",  onMouseDown);
      canvas.removeEventListener("mousemove",  onMouseMove);
      canvas.removeEventListener("mouseup",    onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!captureRef) return;
    captureRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      return { dataUrl, width: canvas.width, height: canvas.height };
    };
  });

  useEffect(() => {
    if (!running || iter >= MAX_ITER) return;
    const t = setTimeout(() => setIter(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [running, iter, speed]);

  function resetView() {
    zoomRef.current = 1;
    panRef.current  = { x: 0, y: 0 };
    redrawCanvas();
  }

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
  const speedLabel = speed < 1000 ? `${speed} ms` : `${(speed / 1000).toFixed(1)} s`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", cursor: "grab" }}
      />

      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {fmtSegCount(iter)} segments · scroll to zoom · drag to pan
      </div>

      <div style={{
        position: "absolute", top: 8, right: 8,
        display: "flex", flexDirection: "column", gap: 12,
        backgroundColor: "rgba(0,0,0,0.65)",
        padding: "12px 16px", borderRadius: 4,
        color: "white", fontSize: 12, letterSpacing: "1px",
        fontFamily: "var(--font)", minWidth: 210,
      }}>
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
          <button
            style={overlayBtn()}
            onClick={() => { setIter(0); setRunning(true); resetView(); }}
          >
            Reset
          </button>
        </div>

        <button
          style={{ ...overlayBtn(), width: "100%", textAlign: "center" }}
          onClick={resetView}
        >
          Reset View
        </button>

        <div>
          <div style={row}>
            <span style={lbl}>Auto Speed</span>
            <span style={val}>{speedLabel} / step</span>
          </div>
          <input
            type="range" min={100} max={3000} step={100}
            value={3100 - speed} onChange={e => setSpeed(3100 - +e.target.value)}
            style={sldr}
          />
        </div>
      </div>
    </div>
  );
}

export default KochVisualization;
