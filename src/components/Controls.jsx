import { useState } from "react";

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
  borderColor: "var(--text)",
};

// Distinct style for the download action button
const downloadBtnStyle = {
  ...btnStyle,
  marginBottom: 0,
  backgroundColor: "transparent",
  border: "1px solid var(--text)",
  color: "var(--text)",
  textAlign: "center",
  letterSpacing: "2px",
  fontSize: "11px",
  textTransform: "uppercase",
  opacity: 1,
  transition: "opacity 0.15s",
};

const downloadBtnLoadingStyle = {
  ...downloadBtnStyle,
  opacity: 0.45,
  cursor: "wait",
};

export const COLOR_SCHEME_NAMES = [
  "Cosmic Blue",
  "Molten Core",
  "Neon Void",
  "Aurora Borealis",
  "Ember Glow",
  "Glacier",
  "Toxic Waste",
  "Blood Moon",
  "Solar Flare",
  "Monochrome",
];

function Controls({ setFractalType, fractalType, colorScheme, setColorScheme, onDownloadPDF }) {
  const [rendering, setRendering] = useState(false);

  async function handleDownload() {
    if (rendering) return;
    setRendering(true);
    try {
      await onDownloadPDF();
    } finally {
      setRendering(false);
    }
  }

  return (
    <div style={{
      width: "200px",
      flexShrink: 0,
      padding: "16px",
      backgroundColor: "var(--panel)",
      borderLeft: "1px solid var(--border)",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Fractal Type ── */}
      <div style={{
        fontSize: "11px",
        color: "var(--text-dim)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "8px",
        marginBottom: "12px",
      }}>
        Fractal Type
      </div>

      {["Octahedron", "Dodecahedron", "Tetrahedron", "Mandelbulb"].map((name) => (
        <button
          key={name}
          style={fractalType === name ? activeBtnStyle : btnStyle}
          onClick={() => setFractalType(name)}
        >
          {name}
        </button>
      ))}

      {/* ── Color Scheme ── */}
      <div style={{
        fontSize: "11px",
        color: "var(--text-dim)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "8px",
        marginBottom: "12px",
        marginTop: "20px",
      }}>
        Color Scheme
      </div>

      {COLOR_SCHEME_NAMES.map((name, idx) => (
        <button
          key={name}
          style={colorScheme === idx ? activeBtnStyle : btnStyle}
          onClick={() => setColorScheme(idx)}
        >
          {name}
        </button>
      ))}

      {/* ── Export ── */}
      <div style={{
        fontSize: "11px",
        color: "var(--text-dim)",
        letterSpacing: "2px",
        textTransform: "uppercase",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "8px",
        marginBottom: "12px",
        marginTop: "20px",
      }}>
        Export
      </div>

      <button
        style={rendering ? downloadBtnLoadingStyle : downloadBtnStyle}
        onClick={handleDownload}
        disabled={rendering}
        title={
          fractalType === "Mandelbulb"
            ? "Renders at 2560×2560 — may take a few seconds"
            : "Renders at 4096×4096"
        }
      >
        {rendering ? "Rendering…" : "⬇ Download PDF"}
      </button>

      {rendering && (
        <div style={{
          marginTop: "8px",
          fontSize: "10px",
          color: "var(--text-dim)",
          letterSpacing: "0.5px",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          {fractalType === "Mandelbulb"
            ? "Raymarching hi-res frame…"
            : "Capturing point cloud…"}
        </div>
      )}
    </div>
  );
}

export default Controls;
