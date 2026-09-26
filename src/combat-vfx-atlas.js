// Atlas cells are authored left to right, then top to bottom. Three.js plane
// UVs start at the bottom, so the row is inverted when selecting a frame.
export function flipbookFrameUV(frame, {columns, rows}) {
  const values = flipbookFrameUVInto(frame, {columns, rows}, {});
  return {
    offset: {x: values.offsetX, y: values.offsetY},
    repeat: {x: values.repeatX, y: values.repeatY},
  };
}

export function flipbookFrameUVInto(frame, {columns, rows}, out) {
  const count = columns * rows;
  const index = Math.max(0, Math.min(count - 1, Math.floor(frame)));
  out.offsetX = (index % columns) / columns;
  out.offsetY = (rows - 1 - Math.floor(index / columns)) / rows;
  out.repeatX = 1 / columns;
  out.repeatY = 1 / rows;
  return out;
}
