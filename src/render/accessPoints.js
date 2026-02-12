import { model } from "../model.js";
import { state } from "../state.js";
import { generateId } from "../utils.js";

export function createAccessPointsRenderer({
  accessPointsLayer,
  canvas,
  constants,
  drag,
  showContextMenu,
  showFinishMenu,
  showActionPanel,
  hideActionPanel,
  hideEditors,
  hideContextMenu,
  showApEditor,
  setMode,
  renderConnections,
}) {
  function renderMultilineText(textSelection, text) {
    textSelection.text(null);
    textSelection.attr("text-anchor", "middle");
    const lines = String(text || "").split(/\r?\n/);
    const lineHeight = constants.apLineHeight;
    if (!lines.length) {
      return;
    }
    const startDy = -((lines.length - 1) / 2) * lineHeight;
    lines.forEach((lineText, index) => {
      textSelection
        .append("tspan")
        .attr("x", 0)
        .attr("dy", index === 0 ? startDy : lineHeight)
        .text(lineText);
    });
  }

  function renderAccessPoints() {
    const selection = accessPointsLayer.selectAll("g").data(model.accessPoints, (d) => d.id);
    const enter = selection.enter().append("g").attr("class", "access-point");
    enter
      .append("ellipse")
      .attr("rx", constants.apRx)
      .attr("ry", constants.apRy)
      .attr("fill", "#0dfc0d")
      .attr("stroke", "#2f7a2f")
      .attr("stroke-width", 2);
    enter
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "#143214")
      .attr("font-size", 12)
      .attr("font-weight", 600);

    const merged = enter.merge(selection);
    merged.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    merged.select("text").each(function (d) {
      renderMultilineText(d3.select(this), d.name);
    });
    merged.each(function () {
      const group = d3.select(this);
      const textNode = group.select("text").node();
      if (!textNode) {
        return;
      }
      const bbox = textNode.getBBox();
      const rx = Math.max(constants.apRx, bbox.width / 2 + constants.apPaddingX);
      const ry = Math.max(constants.apRy, bbox.height / 2 + constants.apPaddingY);
      group.select("ellipse").attr("rx", rx).attr("ry", ry);
    });
    merged
      .on("click", (event, d) => {
        event.stopPropagation();
        hideContextMenu();
        if (state.mode === "connecting" && state.connectFromId && state.connectFromId !== d.id) {
          const connection = {
            id: generateId("conn"),
            fromId: state.connectFromId,
            toId: d.id,
            curvature: 0,
            description: "",
            typeId: model.connectionTypes[0]?.id || null,
          };
          model.connections.push(connection);
          state.connectFromId = null;
          setMode("idle");
          renderConnections();
        }
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        hideEditors();
        hideActionPanel();
        state.selectedAccessPointId = d.id;
        const rect = canvas.getBoundingClientRect();
        if (state.mode !== "idle") {
          showFinishMenu(event.clientX - rect.left, event.clientY - rect.top);
          return;
        }
        showContextMenu(event.clientX - rect.left, event.clientY - rect.top, [
          {
            label: "Connect to...",
            action: () => {
              state.connectFromId = d.id;
              setMode("connecting", d.name);
            },
          },
          {
            label: "Edit AP",
            action: () => {
              showApEditor(d);
            },
          },
          {
            label: "Move AP",
            action: () => {
              state.selectedAccessPointId = d.id;
              setMode("movingAp", d.name);
              showActionPanel("Drag the access point to move it.", "Finish AP Move", () => {
                state.selectedAccessPointId = null;
                setMode("idle");
                hideActionPanel();
              });
            },
          },
          {
            label: "Delete AP",
            className: "btn btn-outline-danger btn-sm w-100",
            action: () => {
              model.accessPoints = model.accessPoints.filter((ap) => ap.id !== d.id);
              model.connections = model.connections.filter(
                (conn) => conn.fromId !== d.id && conn.toId !== d.id
              );
              state.selectedAccessPointId = null;
              renderAccessPoints();
              renderConnections();
            },
          },
        ]);
      });
    merged.call(drag);
    selection.exit().remove();
  }

  return { renderAccessPoints };
}
