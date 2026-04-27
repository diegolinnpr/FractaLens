import React from "react";
import ThreeScene from "./ThreeScene";
import Mandelbulb from "./Mandelbulb";

function FractalCanvas({ fractalType, colorScheme, captureRef, fov, dollyMult }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#111",
      color: "white",
      height: "100%",
    }}>
      {fractalType === "Mandelbulb" ? (
        <Mandelbulb
          colorScheme={colorScheme}
          captureRef={captureRef}
          fov={fov}
          dollyMult={dollyMult}
        />
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
            &gt; {fractalType} Fractal Here
          </div>
          <div style={{ flex: 1 }}>
            <ThreeScene
              type={fractalType}
              colorScheme={colorScheme}
              captureRef={captureRef}
              fov={fov}
              dollyMult={dollyMult}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default FractalCanvas;
