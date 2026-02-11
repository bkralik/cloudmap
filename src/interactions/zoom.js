import { state } from "../state.js";

export function createZoom({ root, hideContextMenu }) {
  return d3
    .zoom()
    .filter((event) => {
      if (state.mode === "curvingConnection" || state.mode === "movingAp" || state.mode === "movingArea") {
        return false;
      }
      return (!event.ctrlKey || event.type === "wheel") && !event.button;
    })
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => {
      root.attr("transform", event.transform);
    })
    .on("start", () => hideContextMenu());
}
