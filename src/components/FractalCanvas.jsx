import React from "react";
import ThreeScene from "./ThreeScene";
import Mandelbulb from "./Mandelbulb";
import KochCoastline from "./KochCoastline";
import KochVisualization from "./KochVisualization";
import LichtenbergLightning from "./LichtenbergLightning";

function FractalCanvas({ type, hue }) {
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
        <Mandelbulb hue={hue} />
      ) : type === "KochCoastline" ? (
        <KochCoastline hue={hue} />
      ) : type === "KochVisualization" ? (
        <KochVisualization hue={hue} />
      ) : type === "LichtenbergLightning" ? (
        <LichtenbergLightning hue={hue} />
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
            <ThreeScene type={type} hue={hue} />
          </div>
        </>
      )}
    </div>
  );
}

export default FractalCanvas;
