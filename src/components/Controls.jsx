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

function Controls({ setFractalType, fractalType, colorScheme, setColorScheme }) {
  return (
    <div style={{
      width: "200px",
      flexShrink: 0,
      padding: "16px",
      backgroundColor: "var(--panel)",
      borderLeft: "1px solid var(--border)",
      overflowY: "auto",
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
    </div>
  );
}

export default Controls;
