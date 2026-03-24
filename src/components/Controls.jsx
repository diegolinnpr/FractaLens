function Controls({ setFractalType }) {
  return (
    <div style={{ width: "300px", padding: "20px", backgroundColor: "#eee" }}>
      <button onClick={() => setFractalType("Octahedron")}>
        Octahedron
      </button>

      <br /><br />

      <button onClick={() => setFractalType("Dodecahedron")}>
        Dodecahedron
      </button>

      <br /><br />
      
      <button onClick={() => setFractalType("Tetrahedron")}>
        Tetrahedron
      </button>

      <br /><br />

      <button onClick={() => setFractalType("Mandelbulb")}>
        Mandelbulb
      </button>
      
    </div>
  );
}
export default Controls;