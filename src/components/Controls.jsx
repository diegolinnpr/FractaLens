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

function Controls({ setFractalType, hue, setHue }) {
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
        Chaos Game Fractals
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

      <div style={{
        marginTop: "20px",
        paddingTop: "14px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          fontSize: "11px",
          color: "var(--text-dim)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}>
          3D Fractals
        </div>

        <button style={btnStyle} onClick={() => setFractalType("Mandelbulb")}>
          Mandelbulb
        </button>
      </div>

      <div style={{
        marginTop: "20px",
        paddingTop: "14px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          fontSize: "11px",
          color: "var(--text-dim)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}>
          Landscape Fractals
        </div>

        <button style={btnStyle} onClick={() => setFractalType("KochCoastline")}>
          Koch Coastline
        </button>

        <button style={btnStyle} onClick={() => setFractalType("KochVisualization")}>
          Koch Visualization
        </button>

        <button style={btnStyle} onClick={() => setFractalType("LichtenbergLightning")}>
          Lichtenberg Lightning
        </button>
      </div>

      <div style={{
        marginTop: "20px",
        paddingTop: "14px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{
          fontSize: "11px",
          color: "var(--text-dim)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginBottom: "12px",
        }}>
          Customizations
        </div>

        <div style={{
          fontSize: "11px",
          color: "var(--text)",
          letterSpacing: "1px",
          marginBottom: "8px",
        }}>
          Color
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="range"
            min="60"
            max="360"
            value={hue}
            onChange={e => setHue(Number(e.target.value))}
            className="hue-slider"
            style={{ flex: 1 }}
          />
          <div style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            backgroundColor: `hsl(${hue}, 100%, 50%)`,
            border: "1px solid var(--border)",
            flexShrink: 0,
          }} />
        </div>
      </div>
    </div>
  );
}

export default Controls;
