import { state } from "../state.js";

export function createApDrag({ updateConnectionPaths }) {
  return d3
    .drag()
    .filter((event, d) => state.mode === "movingAp" && state.selectedAccessPointId === d.id && event.button === 0)
    .on("start", (event) => {
      if (event.sourceEvent) {
        event.sourceEvent.stopPropagation();
      }
    })
    .on("drag", function (event, d) {
      d.x = event.x;
      d.y = event.y;
      d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);
      updateConnectionPaths();
    });
}
