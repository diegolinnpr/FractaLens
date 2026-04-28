import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function useCameraControls(initialPos) {
  const modeRef = useRef("orbit");
  const [mode, setMode] = useState("orbit");
  const pos = useRef(initialPos.clone());
  const yaw = useRef(Math.PI); // face toward origin from +Z
  const pitch = useRef(0);
  const speed = useRef(0.1);
  const keys = useRef({});

  useEffect(() => {
    // ── Keyboard ────────────────────────────────────────────────
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();

      // Prevent browser scroll hijack on Space
      if (k === " ") e.preventDefault();

      keys.current[k] = true;

      if (k === "f") {
        modeRef.current = "fly";
        speed.current *= 0.5; // ↓ reduce default speed by 2×
        setMode("fly");
        // Grab the mouse — keydown counts as a user gesture in all major browsers
        document.body.requestPointerLock();
      }
      if (k === "o") {
        modeRef.current = "orbit";
        setMode("orbit");
        if (document.pointerLockElement) document.exitPointerLock();
      }
    };

    const onKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    // ── Mouse look (Minecraft-style) ────────────────────────────
    // Only active while the pointer is locked AND we're in fly mode.
    // movementX/Y gives raw delta regardless of where the cursor is on screen.
    const onMouseMove = (e) => {
      if (!document.pointerLockElement) return;
      if (modeRef.current !== "fly") return;

      const sensitivity = 0.0009;
      yaw.current   -= e.movementX * sensitivity;
      pitch.current -= e.movementY * sensitivity;
      pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
    };

    // Re-acquire pointer lock if the user clicks the canvas while in fly mode
    // (e.g. after an Escape that dismissed it)
    const onClick = () => {
      if (modeRef.current === "fly" && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  // ── Per-frame fly tick (called inside the render loop) ─────────
  function tickFly() {
    const k = keys.current;

    // Build camera basis from yaw / pitch
    const forward = new THREE.Vector3(
      Math.cos(pitch.current) * Math.sin(yaw.current),
      Math.sin(pitch.current),
      Math.cos(pitch.current) * Math.cos(yaw.current)
    );
    // Right is always horizontal (no roll), derived from yaw only
    const right = new THREE.Vector3(
      Math.sin(yaw.current - Math.PI / 2),
      0,
      Math.cos(yaw.current - Math.PI / 2)
    );
    // FIX: derive up from the actual camera axes so it stays perpendicular to
    // forward at all pitch angles — hardcoding (0,1,0) caused the pole distortion
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    // WASD translation  (keys stored lowercase — no need to check uppercase)
    if (k["w"]) pos.current.addScaledVector(forward,  speed.current);
    if (k["s"]) pos.current.addScaledVector(forward, -speed.current);
    if (k["a"]) pos.current.addScaledVector(right,   -speed.current);
    if (k["d"]) pos.current.addScaledVector(right,    speed.current);

    // Vertical (Space = up, Shift = down)
    if (k[" "])     pos.current.addScaledVector(up,  speed.current);
    if (k["shift"]) pos.current.addScaledVector(up, -speed.current);

    // Speed adjustment  ([ and ] feel more natural than + / -)
    if (k["+"] || k["="] || k["]"]) speed.current = Math.min(2.0,   speed.current * 1.04);
    if (k["-"] || k["_"] || k["["]) speed.current = Math.max(0.0001, speed.current * 0.96);

    return { forward, right, up };
  }

  return { modeRef, mode, pos, yaw, pitch, keys, tickFly };
}