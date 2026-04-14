import Controls from "./components/Controls";
import React, { useState } from "react";
import FractalCanvas from "./components/FractalCanvas";

function Home() {
  const [fractalType, setFractalType] = useState("Octahedron");

  return <h1>HOME WORKS</h1>;
  /*
  return (
    <div style={{ display: "flex", height: "10vh" }}>
      <FractalCanvas type={fractalType} />
      <Controls setFractalType={setFractalType} />
    </div>
  );*/
}

export default Home;