import { model, findAccessPoint, findConnectionType } from "../model.js";
import { state } from "../state.js";

export function createConnectionsRenderer({
  connectionsLayer,
  canvas,
  showContextMenu,
  showFinishMenu,
  showActionPanel,
  hideActionPanel,
  hideEditors,
  showConnectionEditor,
  setMode,
}) {
  function connectionPath(connection) {
    const from = findAccessPoint(connection.fromId);
    const to = findAccessPoint(connection.toId);
    if (!from || !to) {
      return "";
    }
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    if (!connection.curvature) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const chord = Math.hypot(dx, dy) || 1;
    const sagitta = Math.abs(connection.curvature);
    const radius = chord * chord / (8 * sagitta) + sagitta / 2;
    const sweep = connection.curvature > 0 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2}`;
  }

  function getConnectionStyle(connection) {
    const fallback = { color: "#3f4a3a", thickness: 2, lineStyle: "solid" };
    if (!connection) {
      return fallback;
    }
    const type = findConnectionType(connection.typeId);
    if (!type) {
      return fallback;
    }
    return {
      color: type.color || fallback.color,
      thickness: Number(type.thickness) || fallback.thickness,
      lineStyle: type.lineStyle || fallback.lineStyle,
    };
  }

  function updateConnectionPaths() {
    connectionsLayer.selectAll("path.connection-line").attr("d", connectionPath);
    connectionsLayer.selectAll("path.connection-hit").attr("d", connectionPath);
  }

  function renderConnections() {
    const selection = connectionsLayer.selectAll("g.connection").data(model.connections, (d) => d.id);
    const enter = selection.enter().append("g").attr("class", "connection");
    const openConnectionMenu = (event, d) => {
      event.preventDefault();
      event.stopPropagation();
      hideEditors();
      hideActionPanel();
      state.selectedConnectionId = d.id;
      const rect = canvas.getBoundingClientRect();
      if (state.mode !== "idle") {
        showFinishMenu(event.clientX - rect.left, event.clientY - rect.top);
        return;
      }
      showContextMenu(event.clientX - rect.left, event.clientY - rect.top, [
        {
          label: "Edit connection",
          action: () => {
            showConnectionEditor(d);
          },
        },
        {
          label: "Change curvature",
          action: () => {
            state.selectedConnectionId = d.id;
            state.curveDragging = false;
            state.curveDrag = null;
            setMode("curvingConnection");
            showActionPanel("Drag on the map to change curvature.", "Finish Connection Move", () => {
              state.selectedConnectionId = null;
              state.curveDragging = false;
              state.curveDrag = null;
              setMode("idle");
              hideActionPanel();
            });
          },
        },
        {
          label: "Delete connection",
          className: "btn btn-outline-danger btn-sm w-100",
          action: () => {
            model.connections = model.connections.filter((conn) => conn.id !== d.id);
            state.selectedConnectionId = null;
            renderConnections();
          },
        },
      ]);
    };

    enter
      .append("path")
      .attr("class", "connection-hit")
      .attr("stroke", "transparent")
      .attr("stroke-width", 24)
      .attr("fill", "none")
      .attr("pointer-events", "stroke")
      .on("contextmenu", openConnectionMenu);
    enter.append("path").attr("class", "connection-line").attr("fill", "none");
    enter.select("path.connection-line").attr("pointer-events", "stroke").on("contextmenu", openConnectionMenu);
    const merged = selection.merge(enter);
    merged.select("path.connection-line").each(function (d) {
      const style = getConnectionStyle(d);
      const dashLength = Math.max(4, style.thickness * 2);
      const dashArray = style.lineStyle === "dashed" ? `${dashLength} ${dashLength}` : null;
      d3.select(this)
        .attr("stroke", style.color)
        .attr("stroke-width", style.thickness)
        .attr("stroke-dasharray", dashArray);
    });
    updateConnectionPaths();
    selection.exit().remove();
  }

  return { renderConnections, updateConnectionPaths };
}
