import { useEffect } from "react";
import ThreeScene from "./ThreeScene";
import Mandelbulb from "./Mandelbulb";
import KochCoastline from "./KochCoastline";
import KochVisualization from "./KochVisualization";
import LichtenbergLightning from "./LichtenbergLightning";

// Maps named color scheme index to a representative hue (0–360) for nature fractals
// that use HSL-based lighting/coloring rather than the POINT_SCHEMES palette.
const SCHEME_HUES = [220, 20, 270, 160, 25, 200, 90, 0, 40, 220];

const NATURE_FRACTALS = ["KochCoastline", "KochVisualization", "LichtenbergLightning"];

function FractalCanvas({ fractalType, colorScheme, captureRef, fov, dollyMult }) {
  // Null out captureRef when switching to a fractal that doesn't support hi-res export.
  useEffect(() => {
    if (NATURE_FRACTALS.includes(fractalType) && captureRef) {
      captureRef.current = null;
    }
  }, [fractalType]);

  const hue = SCHEME_HUES[colorScheme] ?? 220;

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
      ) : fractalType === "KochCoastline" ? (
        <KochCoastline hue={hue} />
      ) : fractalType === "KochVisualization" ? (
        <KochVisualization hue={hue} />
      ) : fractalType === "LichtenbergLightning" ? (
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
            &gt; {fractalType} Fractal
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
