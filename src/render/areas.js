import { model } from "../model.js";
import { state } from "../state.js";

export function createAreasRenderer({ svg, areasLayer, areaHandlesLayer, constants }) {
  function cloudPath(area) {
    const w = area.rx * 2;
    const h = area.ry * 2;
    const x = area.x - area.rx;
    const y = area.y - area.ry;
    const p1x = x + 0.2 * w;
    const p1y = y + 0.6 * h;
    const d = [
      `M ${p1x} ${p1y}`,
      `C ${x + 0.05 * w} ${y + 0.6 * h}, ${x + 0.05 * w} ${y + 0.35 * h}, ${x + 0.2 * w} ${
        y + 0.35 * h
      }`,
      `C ${x + 0.25 * w} ${y + 0.15 * h}, ${x + 0.45 * w} ${y + 0.1 * h}, ${x + 0.55 * w} ${
        y + 0.25 * h
      }`,
      `C ${x + 0.65 * w} ${y + 0.05 * h}, ${x + 0.9 * w} ${y + 0.15 * h}, ${x + 0.85 * w} ${
        y + 0.4 * h
      }`,
      `C ${x + 0.98 * w} ${y + 0.45 * h}, ${x + 0.98 * w} ${y + 0.65 * h}, ${x + 0.8 * w} ${
        y + 0.7 * h
      }`,
      `C ${x + 0.78 * w} ${y + 0.9 * h}, ${x + 0.5 * w} ${y + 0.9 * h}, ${x + 0.45 * w} ${
        y + 0.75 * h
      }`,
      `C ${x + 0.3 * w} ${y + 0.85 * h}, ${x + 0.15 * w} ${y + 0.8 * h}, ${x + 0.2 * w} ${
        y + 0.6 * h
      }`,
      "Z",
    ];
    return d.join(" ");
  }

  function updateAreaLabels() {
    areasLayer
      .selectAll("text.area-label")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y);
  }

  function updateAreaPaths() {
    areasLayer.selectAll("path.area-shape").attr("d", cloudPath);
    updateAreaLabels();
  }

  function updateAreaHandles() {
    areaHandlesLayer
      .selectAll("circle.area-resize")
      .attr("cx", (d) => d.x + d.rx * 0.7)
      .attr("cy", (d) => d.y + d.ry * 0.7);
  }

  const areaResizeDrag = d3
    .drag()
    .filter((event, d) => state.mode === "movingArea" && state.selectedAreaId === d.id && event.button === 0)
    .on("start", (event) => {
      if (event.sourceEvent) {
        event.sourceEvent.stopPropagation();
      }
      state.areaDrag = null;
    })
    .on("drag", (event, d) => {
      const source = event.sourceEvent || event;
      const [sx, sy] = d3.pointer(source, svg.node());
      const [x, y] = d3.zoomTransform(svg.node()).invert([sx, sy]);
      d.rx = Math.max(constants.areaMinRx, Math.abs(x - d.x)) / 0.7;
      d.ry = Math.max(constants.areaMinRy, Math.abs(y - d.y)) / 0.7;
      updateAreaPaths();
      updateAreaHandles();
    });

  function renderAreaHandles() {
    const data =
      state.mode === "movingArea" && state.selectedAreaId
        ? model.areas.filter((area) => area.id === state.selectedAreaId)
        : [];
    const selection = areaHandlesLayer.selectAll("circle.area-resize").data(data, (d) => d.id);
    const enter = selection
      .enter()
      .append("circle")
      .attr("class", "area-resize")
      .attr("r", constants.areaHandleRadius)
      .attr("fill", "#1f2d1f")
      .attr("stroke", "#f4f7f2")
      .attr("stroke-width", 2);
    const merged = enter.merge(selection);
    merged.attr("cx", (d) => d.x + d.rx * 0.7).attr("cy", (d) => d.y + d.ry * 0.7);
    merged.call(areaResizeDrag);
    selection.exit().remove();
  }

  function renderAreas() {
    const selection = areasLayer.selectAll("path.area-shape").data(model.areas, (d) => d.id);
    selection
      .enter()
      .append("path")
      .attr("class", "area-shape")
      .attr("fill", "rgba(110, 140, 110, 0.25)")
      .attr("stroke", "#6a8f6a")
      .attr("stroke-width", 2)
      .attr("pointer-events", "visiblePainted")
      .merge(selection)
      .attr("d", cloudPath);
    selection.exit().remove();

    const textSelection = areasLayer.selectAll("text.area-label").data(model.areas, (d) => d.id);
    textSelection
      .enter()
      .append("text")
      .attr("class", "area-label")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#1f2d1f")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("pointer-events", "none")
      .merge(textSelection)
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .text((d) => d.name);
    textSelection.exit().remove();

    renderAreaHandles();
  }

  return {
    renderAreas,
    updateAreaPaths,
    updateAreaLabels,
    updateAreaHandles,
    renderAreaHandles,
  };
}
