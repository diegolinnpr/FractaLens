import React from "react";
import ThreeScene from "./ThreeScene";
import Mandelbulb from "./Mandelbulb";

function FractalCanvas({ type }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#111",
      color: "white",
      height: "100%",
    }}>
      {type === "Mandelbulb" ? (
        <Mandelbulb />
      ) : (
        <>
          <div style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--panel)",
            color: "var(--text)",
            fontSize: "13px",
            letterSpacing: "1px",
            flexShrink: 0,
          }}>
            &gt; {type} Fractal Here
          </div>
          <div style={{ flex: 1 }}>
            <ThreeScene type={type} />
          </div>
        </>
      )}
    </div>
  );
}

export default FractalCanvas;
