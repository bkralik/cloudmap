import { model } from "./model.js";

export function createFitToView({ svg, zoom, padding = 80 }) {
  return function fitToView() {
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    if (!width || !height) {
      return;
    }
    const bounds = [];
    model.accessPoints.forEach((ap) => bounds.push([ap.x, ap.y]));
    model.areas.forEach((area) => {
      const radiusX = area.rx * (1 + area.jitter);
      const radiusY = area.ry * (1 + area.jitter);
      bounds.push([area.x - radiusX, area.y - radiusY]);
      bounds.push([area.x + radiusX, area.y + radiusY]);
    });
    if (!bounds.length) {
      return;
    }
    const xs = bounds.map((b) => b[0]);
    const ys = bounds.map((b) => b[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const contentWidth = maxX - minX || 1;
    const contentHeight = maxY - minY || 1;
    const scale = Math.min(
      2,
      Math.max(0.3, Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight))
    );
    const translateX = width / 2 - scale * (minX + contentWidth / 2);
    const translateY = height / 2 - scale * (minY + contentHeight / 2);
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  };
}
