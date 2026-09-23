// Atlas cells are authored left to right, then top to bottom. Three.js plane
// UVs start at the bottom, so the row is inverted when selecting a frame.
export function flipbookFrameUV(frame, {columns, rows}) {
  const count = columns * rows;
  const index = Math.max(0, Math.min(count - 1, Math.floor(frame)));
  return {
    offset: {x: (index % columns) / columns,
      y: (rows - 1 - Math.floor(index / columns)) / rows},
    repeat: {x: 1 / columns, y: 1 / rows},
  };
}
