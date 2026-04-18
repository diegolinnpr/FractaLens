import { Link } from "react-router-dom";

function Navbar() {
  return (
    <div style={{ 
      backgroundColor: "#1c1c1c",
      minHeight: "1vh",
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      color: "#ffffff"
      }}>
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ color: "#ffffff", textDecoration: "none" }}>Home</Link> |{" "}
        <Link to="/article" style={{ color: "#ffffff", textDecoration: "none" }}>Article</Link>
      </nav>
    </div>
  );
}

export default Navbar;