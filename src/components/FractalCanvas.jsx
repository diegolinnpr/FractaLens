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
          <h2 style={{ margin: "10px" }}>{type} Fractal Here</h2>
          <div style={{ flex: 1 }}>
            <ThreeScene type={type} />
          </div>
        </>
      )}
    </div>
  );
}

export default FractalCanvas;