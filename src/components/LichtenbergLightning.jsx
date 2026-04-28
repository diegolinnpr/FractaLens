import { useEffect, useRef, useState } from "react";

// ── Simulation constants ──────────────────────────────────────────────────────
const GRID           = 100;  // NxN potential grid
const ETA            = 2.0;  // DBM growth exponent — higher = more branchy/lightning-like
const N_RELAX        = 20;   // SOR Laplace iterations per animation frame
const SOR_W          = 1.85; // over-relaxation parameter (optimal ≈ 2/(1+π/N))
const GROW_PER_FRAME = 3;    // discharge cells added per frame

const at = (x, y) => y * GRID + x;

// ── SOR Laplace relaxation step ───────────────────────────────────────────────
// Solves ∇²φ = 0 with φ=1 on discharge, φ=0 on ground, Neumann on sides.
function sorStep(phi, disc) {
  for (let y = 1; y < GRID - 1; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = at(x, y);
      if (disc[i]) continue;
      const l = x > 0      ? phi[at(x - 1, y)] : phi[i]; // Neumann left
      const r = x < GRID-1 ? phi[at(x + 1, y)] : phi[i]; // Neumann right
      phi[i] += SOR_W * ((phi[at(x, y-1)] + phi[at(x, y+1)] + l + r) * 0.25 - phi[i]);
    }
  }
}

// ── Create fresh simulation state ─────────────────────────────────────────────
function createSim() {
  const N    = GRID * GRID;
  const phi  = new Float32Array(N);
  const disc = new Uint8Array(N);
  const par  = new Int32Array(N).fill(-1);
  // Sub-pixel jitter per cell for organic branch appearance
  const jit  = Float32Array.from({ length: N * 2 }, () => (Math.random() - 0.5) * 0.45);

  // Linear initial potential: 1 at top (cloud), 0 at bottom (ground)
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++)
      phi[at(x, y)] = (GRID - 1 - y) / (GRID - 1);
  for (let x = 0; x < GRID; x++) phi[at(x, GRID - 1)] = 0;

  // Seed: single point at top centre
  const sx = Math.floor(GRID / 2), sy = 0;
  disc[at(sx, sy)] = 1;
  phi[at(sx, sy)]  = 1;

  // Candidate map: cell index → parent discharge cell
  // Growth allowed left, right, down — no upward to keep it lightning-like
  const cands = new Map();
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
    const nx = sx + dx, ny = sy + dy;
    if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID)
      cands.set(at(nx, ny), at(sx, sy));
  }

  // Warm up the potential field before first growth step
  for (let i = 0; i < 150; i++) sorStep(phi, disc);

  return { phi, disc, par, jit, cands, cells: 1, list: [at(sx, sy)], returnPath: null };
}

// ── Grow one discharge cell using DBM probability ─────────────────────────────
function growOne(sim) {
  const { phi, disc, par, cands, list } = sim;
  if (!cands.size) return "stuck";

  // P(cell) ∝ φ(cell)^η — cells with stronger field gradient are chosen more often
  const entries = [...cands.entries()];
  let total = 0;
  const w = entries.map(([ci]) => {
    const v = Math.pow(Math.max(0, phi[ci]), ETA);
    total += v;
    return v;
  });
  if (total === 0) return "stuck";

  let r = Math.random() * total;
  let chosen = entries[0][0], chosenPar = entries[0][1];
  for (let i = 0; i < entries.length; i++) {
    r -= w[i];
    if (r <= 0) { [chosen, chosenPar] = entries[i]; break; }
  }

  // Commit new cell
  disc[chosen] = 1;
  phi[chosen]  = 1;
  par[chosen]  = chosenPar;
  cands.delete(chosen);
  list.push(chosen);
  sim.cells++;

  // Expand candidate frontier (no upward growth)
  const cx = chosen % GRID, cy = Math.floor(chosen / GRID);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1]]) {
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) continue;
    const ni = at(nx, ny);
    if (!disc[ni] && !cands.has(ni)) cands.set(ni, chosen);
  }

  // Ground reached → trace return path (ground → source for flash animation)
  if (cy === GRID - 1) {
    const path = [chosen];
    let c = chosen;
    while (par[c] >= 0) { c = par[c]; path.push(c); }
    sim.returnPath = path;
    return "hit";
  }

  return "ok";
}

// ── Render one frame ──────────────────────────────────────────────────────────
function renderFrame(canvas, sim, hue, phase, phaseT) {
  const cw = canvas.width, ch = canvas.height;
  const cellW = cw / GRID, cellH = ch / GRID;
  const ctx = canvas.getContext("2d");
  const { disc, par, jit, list, returnPath } = sim;

  // Clear to background
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#0c0a06";
  ctx.fillRect(0, 0, cw, ch);

  const fadeAlpha = phase === "fade" ? Math.max(0, 1 - phaseT) : 1;
  if (fadeAlpha === 0) return;

  // Map cell index to canvas coordinate (with jitter)
  const cx = i => (i % GRID + 0.5 + jit[i * 2])     * cellW;
  const cy = i => (Math.floor(i / GRID) + 0.5 + jit[i * 2 + 1]) * cellH;

  // Build branch path once
  function strokeBranches() {
    ctx.beginPath();
    for (const i of list) {
      if (par[i] < 0) continue;
      ctx.moveTo(cx(i), cy(i));
      ctx.lineTo(cx(par[i]), cy(par[i]));
    }
    ctx.stroke();
  }

  // Additive blending gives bright intersections where branches overlap
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap  = "round";
  ctx.lineJoin = "round";

  // Three glow passes: wide dim → mid → bright core
  ctx.lineWidth   = 7;
  ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.04 * fadeAlpha})`;
  strokeBranches();

  ctx.lineWidth   = 3;
  ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${0.18 * fadeAlpha})`;
  strokeBranches();

  ctx.lineWidth   = 1;
  ctx.strokeStyle = `hsla(${hue}, 80%, 98%, ${0.65 * fadeAlpha})`;
  strokeBranches();

  // Return-stroke flash: bright white pulse that fades out along the main channel
  if (returnPath && phase === "flash") {
    const bright = 1 - phaseT;
    for (const [lw, a] of [[9, 0.12], [4, 0.4], [1.5, 1.0]]) {
      ctx.lineWidth   = lw;
      ctx.strokeStyle = `rgba(190, 220, 255, ${a * bright})`;
      ctx.beginPath();
      for (let i = 0; i < returnPath.length - 1; i++) {
        ctx.moveTo(cx(returnPath[i]),     cy(returnPath[i]));
        ctx.lineTo(cx(returnPath[i + 1]), cy(returnPath[i + 1]));
      }
      ctx.stroke();
    }
  }

  ctx.globalCompositeOperation = "source-over";
}

// ─────────────────────────────────────────────────────────────────────────────

function LichtenbergLightning({ hue = 200 }) {
  const canvasRef  = useRef(null);
  const simRef     = useRef(null);
  const animRef    = useRef(null);
  const phaseRef   = useRef("growing");
  const t0Ref      = useRef(0);
  const pausedRef  = useRef(false);
  const hueRef     = useRef(hue);

  const [uiPhase, setUiPhase] = useState("growing");
  const [cells,   setCells]   = useState(1);
  const [paused,  setPaused]  = useState(false);

  useEffect(() => { hueRef.current = hue; }, [hue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    simRef.current  = createSim();
    phaseRef.current = "growing";
    t0Ref.current    = 0;

    function loop(ts) {
      animRef.current = requestAnimationFrame(loop);
      const sim   = simRef.current;
      const phase = phaseRef.current;

      if (phase === "growing" && !pausedRef.current) {
        // Relax the potential field, then add cells
        for (let k = 0; k < N_RELAX; k++) sorStep(sim.phi, sim.disc);
        for (let k = 0; k < GROW_PER_FRAME; k++) {
          const res = growOne(sim);
          if (res === "hit" || res === "stuck") {
            phaseRef.current = "flash";
            t0Ref.current    = ts;
            setUiPhase("flash");
            break;
          }
        }
        setCells(sim.cells);

      } else if (phase === "flash") {
        if (ts - t0Ref.current >= 500) {
          phaseRef.current = "fade";
          t0Ref.current    = ts;
          setUiPhase("fade");
        }
      } else if (phase === "fade") {
        if (ts - t0Ref.current >= 700) {
          phaseRef.current = "done";
          t0Ref.current    = ts;
          setUiPhase("done");
        }
      } else if (phase === "done" && !pausedRef.current) {
        if (ts - t0Ref.current >= 600) {
          simRef.current   = createSim();
          phaseRef.current = "growing";
          t0Ref.current    = ts;
          setUiPhase("growing");
          setCells(1);
        }
      }

      const phaseDur = phase === "flash" ? 500 : 700;
      const phaseT   = Math.min(1, (ts - t0Ref.current) / phaseDur);
      renderFrame(canvas, simRef.current, hueRef.current, phaseRef.current, phaseT);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handlePause = () => {
    const next = !paused;
    setPaused(next);
    pausedRef.current = next;
  };

  const handleNew = () => {
    simRef.current   = createSim();
    phaseRef.current = "growing";
    t0Ref.current    = performance.now();
    setUiPhase("growing");
    setCells(1);
    if (paused) {
      setPaused(false);
      pausedRef.current = false;
    }
  };

  const phaseLabel = { growing: "Growing", flash: "Return Stroke", fade: "Fading", done: "Complete" }[uiPhase];

  const overlayBtn = () => ({
    background: "none",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "white",
    padding: "4px 10px",
    fontSize: 11,
    letterSpacing: "1px",
    fontFamily: "var(--font)",
    cursor: "pointer",
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Status — top left */}
      <div style={{
        position: "absolute", top: 8, left: 8,
        color: "white", fontSize: 12, opacity: 0.6, pointerEvents: "none",
      }}>
        {cells.toLocaleString()} cells · {phaseLabel}
      </div>

      {/* Controls — top right */}
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
        <button style={overlayBtn()} onClick={handlePause}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button style={overlayBtn()} onClick={handleNew}>
          New Strike
        </button>
      </div>
    </div>
  );
}

export default LichtenbergLightning;
