import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={{
      backgroundColor: "var(--panel)",
      borderBottom: "1px solid var(--border)",
      padding: "10px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <span style={{ color: "var(--amber)", letterSpacing: "3px", fontWeight: "bold" }}>
        [FrantaLens]
      </span>
      <nav style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link to="/">Home</Link>
        <span style={{ color: "var(--text-dim)" }}>|</span>
        <Link to="/article">Article</Link>
      </nav>
    </div>
  );
}

export default Navbar;
