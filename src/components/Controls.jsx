import { useEffect, useState } from "react";

// ─── Inject slider CSS once (track + thumb can't be styled with inline styles) ──
const SLIDER_CSS = `
  .fractal-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 2px;
    background: var(--border, #333);
    outline: none;
    cursor: pointer;
    margin: 6px 0 2px;
  }
  .fractal-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--text, #e0e0e0);
    cursor: pointer;
    transition: transform 0.1s ease, background 0.1s ease;
  }
  .fractal-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border: none;
    border-radius: 50%;
    background: var(--text, #e0e0e0);
    cursor: pointer;
  }
  .fractal-slider:hover::-webkit-slider-thumb {
    transform: scale(1.4);
  }
  .fractal-slider.dolly::-webkit-slider-thumb {
    background: #7eb8ff;
  }
  .fractal-slider.dolly::-moz-range-thumb {
    background: #7eb8ff;
  }
  .fractal-slider::-webkit-slider-runnable-track {
    height: 2px;
    background: var(--border, #333);
  }
`;

function injectSliderCSS() {
  if (document.getElementById("fractal-slider-css")) return;
  const el = document.createElement("style");
  el.id = "fractal-slider-css";
  el.textContent = SLIDER_CSS;
  document.head.appendChild(el);
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const btnStyle = {
  display: "block",
  width: "100%",
  padding: "9px 12px",
  marginBottom: "6px",
  backgroundColor: "var(--panel)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  textAlign: "left",
  letterSpacing: "1px",
  cursor: "pointer",
};

const activeBtnStyle = {
  ...btnStyle,
  backgroundColor: "var(--border)",
  border: "1px solid var(--text)",
};

const downloadBtnStyle = {
  ...btnStyle,
  marginBottom: 0,
  backgroundColor: "transparent",
  border: "1px solid var(--text)",
  textAlign: "center",
  letterSpacing: "2px",
  fontSize: "11px",
  textTransform: "uppercase",
  transition: "opacity 0.15s",
};

const sectionHeadStyle = {
  fontSize: "11px",
  color: "var(--text-dim)",
  letterSpacing: "2px",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "8px",
  marginBottom: "12px",
  marginTop: "20px",
};

const firstSectionHeadStyle = { ...sectionHeadStyle, marginTop: 0 };

export const COLOR_SCHEME_NAMES = [
  "Cosmic Blue", "Molten Core", "Neon Void", "Aurora Borealis", "Ember Glow",
  "Glacier", "Toxic Waste", "Blood Moon", "Solar Flare", "Monochrome",
];

// Dolly slider: 0.25 – 4.0, displayed as "telephoto ← → wide"
const DOLLY_MIN = 0.25;
const DOLLY_MAX = 4.0;

const CHAOS_GAME_FRACTALS = ["Octahedron", "Dodecahedron", "Tetrahedron"];
const FRACTALS_3D         = ["Mandelbulb"];
const LANDSCAPE_FRACTALS  = ["KochCoastline", "KochVisualization", "LichtenbergLightning"];

const FRACTAL_LABELS = {
  Octahedron:            "Octahedron",
  Dodecahedron:          "Dodecahedron",
  Tetrahedron:           "Tetrahedron",
  Mandelbulb:            "Mandelbulb",
  KochCoastline:         "Koch Coastline",
  KochVisualization:     "Koch Visualization",
  LichtenbergLightning:  "Lichtenberg Lightning",
};

function SliderRow({ label, value, displayValue, min, max, step, onChange, className = "" }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "2px",
      }}>
        <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>
          {label}
        </span>
        <span style={{
          fontSize: "11px",
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.5px",
        }}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        className={`fractal-slider ${className}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function FractalBtn({ name, fractalType, setFractalType }) {
  return (
    <button
      style={fractalType === name ? activeBtnStyle : btnStyle}
      onClick={() => setFractalType(name)}
    >
      {FRACTAL_LABELS[name]}
    </button>
  );
}

function Controls({
  setFractalType, fractalType,
  colorScheme, setColorScheme,
  onDownloadImage,
  fov, dollyMult,
  onFovChange, onDollyChange,
}) {
  const [rendering, setRendering] = useState(false);

  useEffect(() => { injectSliderCSS(); }, []);

  async function handleDownload() {
    if (rendering) return;
    setRendering(true);
    try { await onDownloadImage(); } finally { setRendering(false); }
  }

  const dollyLabel = dollyMult < 0.95
    ? `${(1 / dollyMult).toFixed(1)}× closer · wide`
    : dollyMult > 1.05
    ? `${dollyMult.toFixed(1)}× farther · tele`
    : "neutral";

  const supportsCapture = !LANDSCAPE_FRACTALS.includes(fractalType);

  return (
    <div style={{
      width: "210px",
      flexShrink: 0,
      padding: "16px",
      backgroundColor: "var(--panel)",
      borderLeft: "1px solid var(--border)",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* ── Chaos Game Fractals ── */}
      <div style={firstSectionHeadStyle}>Chaos Game</div>
      {CHAOS_GAME_FRACTALS.map((name) => (
        <FractalBtn key={name} name={name} fractalType={fractalType} setFractalType={setFractalType} />
      ))}

      {/* ── 3D Fractals ── */}
      <div style={sectionHeadStyle}>3D Fractals</div>
      {FRACTALS_3D.map((name) => (
        <FractalBtn key={name} name={name} fractalType={fractalType} setFractalType={setFractalType} />
      ))}

      {/* ── Landscape Fractals ── */}
      <div style={sectionHeadStyle}>Landscape</div>
      {LANDSCAPE_FRACTALS.map((name) => (
        <FractalBtn key={name} name={name} fractalType={fractalType} setFractalType={setFractalType} />
      ))}

      {/* ── Color Scheme ── */}
      <div style={sectionHeadStyle}>Color Scheme</div>
      <select
        value={colorScheme}
        onChange={(e) => setColorScheme(parseInt(e.target.value))}
        style={{
          display: "block",
          width: "100%",
          padding: "8px 12px",
          marginBottom: "14px",
          backgroundColor: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          letterSpacing: "1px",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
          fontSize: "12px",
          outline: "none",
          fontFamily: "var(--font)",
        }}
      >
        {COLOR_SCHEME_NAMES.map((name, idx) => (
          <option key={name} value={idx}>{name}</option>
        ))}
      </select>

      {/* ── Camera ── */}
      <div style={sectionHeadStyle}>Camera</div>

      <SliderRow
        label="FOV"
        value={fov}
        displayValue={`${Math.round(fov)}°`}
        min={5}
        max={135}
        step={1}
        onChange={onFovChange}
      />

      <SliderRow
        label="DOLLY ZOOM"
        value={dollyMult}
        displayValue={dollyLabel}
        min={DOLLY_MIN}
        max={DOLLY_MAX}
        step={0.01}
        onChange={onDollyChange}
        className="dolly"
      />

      {/* tick marks for dolly neutral */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "9px",
        color: "var(--text-dim)",
        letterSpacing: "0.5px",
        marginTop: "-10px",
        marginBottom: "8px",
      }}>
        <span>WIDE</span>
        <span style={{ color: dollyMult > 0.95 && dollyMult < 1.05 ? "var(--text)" : "var(--text-dim)" }}>·</span>
        <span>TELE</span>
      </div>

      {/* ── Export ── */}
      {supportsCapture && (
        <>
          <div style={sectionHeadStyle}>Export</div>
          <button
            style={{ ...downloadBtnStyle, opacity: rendering ? 0.45 : 1, cursor: rendering ? "wait" : "pointer" }}
            onClick={handleDownload}
            disabled={rendering}
            title={fractalType === "Mandelbulb" ? "Renders at 2560×2560" : "Renders at 4096×4096"}
          >
            {rendering ? "Rendering…" : "⬇ Download Hi-Res"}
          </button>
          {rendering && (
            <div style={{ marginTop: "8px", fontSize: "10px", color: "var(--text-dim)",
              textAlign: "center", lineHeight: 1.5 }}>
              {fractalType === "Mandelbulb" ? "Raymarching hi-res frame…" : "Capturing point cloud…"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Controls;
