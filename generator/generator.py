import numpy as np
import os
from shapes import shapes

# Resolved at runtime so the script works from any working directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data")


def chaos_game(corners, n_points):
    corners = np.array(corners, dtype=np.float32)
    points = np.zeros((n_points, 3), dtype=np.float32)
    for i in range(1, n_points):
        next_corner = corners[np.random.randint(len(corners))]
        points[i] = 0.5 * (points[i - 1] + next_corner)
    return points


def gen_shape(n_corners, n_points):
    name, corner_list = shapes[n_corners]
    corners = np.array(corner_list, dtype=np.float32)
    print(f"Generating {name} ({n_corners} corners, {n_points:,} points)...")
    points = chaos_game(corners, n_points)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, f"{name}.bin")
    points.tofile(out_path)
    print(f"  Saved → {out_path}  ({os.path.getsize(out_path) / 1e6:.1f} MB)")


if __name__ == "__main__":
    # Generates the three shapes used by the app.
    # Add more n_corners values (5, 8, 12) to generate additional shapes.
    for n_corners in [4, 6, 20]:
        gen_shape(n_corners, 5_000_000)
