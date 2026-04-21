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

function Controls({ setFractalType }) {
  return (
    <div style={{
      width: "200px",
      flexShrink: 0,
      padding: "16px",
      backgroundColor: "var(--panel)",
      borderLeft: "1px solid var(--border)",
    }}>
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

      <button style={btnStyle} onClick={() => setFractalType("Octahedron")}>
        Octahedron
      </button>

      <button style={btnStyle} onClick={() => setFractalType("Dodecahedron")}>
        Dodecahedron
      </button>

      <button style={btnStyle} onClick={() => setFractalType("Tetrahedron")}>
        Tetrahedron
      </button>

      <button style={btnStyle} onClick={() => setFractalType("Mandelbulb")}>
        Mandelbulb
      </button>
    </div>
  );
}

export default Controls;
