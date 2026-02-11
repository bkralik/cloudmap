import { model, findAccessPoint, findConnection } from "../model.js";
import { state } from "../state.js";

export function attachCanvasInteractions({
  svg,
  canvas,
  contextMenu,
  setMode,
  generateId,
  hideContextMenu,
  hideEditors,
  showContextMenu,
  showFinishMenu,
  showActionPanel,
  hideActionPanel,
  showAreaEditor,
  renderAccessPoints,
  renderConnections,
  renderAreas,
  renderAreaHandles,
  updateAreaPaths,
  updateAreaHandles,
  updateConnectionPaths,
  fitToView,
}) {
  function startCurvatureDrag(px, py) {
    const connection = findConnection(state.selectedConnectionId);
    if (!connection) {
      return;
    }
    const from = findAccessPoint(connection.fromId);
    const to = findAccessPoint(connection.toId);
    if (!from || !to) {
      return;
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    state.curveDrag = {
      startX: px,
      startY: py,
      nx,
      ny,
      startCurvature: connection.curvature || 0,
    };
  }

  function updateCurvatureFromDrag(px, py) {
    const connection = findConnection(state.selectedConnectionId);
    if (!connection || !state.curveDrag) {
      return;
    }
    const deltaX = px - state.curveDrag.startX;
    const deltaY = py - state.curveDrag.startY;
    const delta = deltaX * state.curveDrag.nx + deltaY * state.curveDrag.ny;
    const clamp = 240;
    const next = state.curveDrag.startCurvature + delta;
    connection.curvature = Math.max(-clamp, Math.min(clamp, next));
  }

  svg.on("click", (event) => {
    if (event.button && event.button !== 0) {
      return;
    }
    hideContextMenu();
    hideEditors();
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    if (state.mode === "addingAccessPoint") {
      const accessPoint = {
        id: generateId("ap"),
        name: `AP-${String(model.accessPoints.length + 1).padStart(2, "0")}`,
        x,
        y,
        areaId: null,
        routers: [],
      };
      model.accessPoints.push(accessPoint);
      setMode("idle");
      renderAccessPoints();
      renderConnections();
      return;
    }
    if (state.mode === "addingArea") {
      const area = {
        id: generateId("area"),
        name: `Area-${model.areas.length + 1}`,
        x,
        y,
        rx: 180,
        ry: 110,
        jitter: 0.12,
        pointIds: [],
      };
      model.areas.push(area);
      setMode("idle");
      renderAreas();
      return;
    }
    if (state.mode === "connecting") {
      state.connectFromId = null;
      setMode("idle");
    }
  });

  svg.on("mousedown.hide", (event) => {
    if (event.button !== 0) {
      return;
    }
    hideContextMenu();
  });

  svg.on("mousedown", (event) => {
    if (state.mode !== "curvingConnection" || !state.selectedConnectionId) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    startCurvatureDrag(x, y);
    state.curveDragging = true;
    updateCurvatureFromDrag(x, y);
    updateConnectionPaths();
  });

  svg.on("mousedown.area", (event) => {
    if (state.mode !== "movingArea" || !state.selectedAreaId) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    const area = model.areas.find((item) => item.id === state.selectedAreaId);
    if (!area) {
      return;
    }
    const inside = ((x - area.x) / area.rx) ** 2 + ((y - area.y) / area.ry) ** 2 <= 1;
    if (!inside) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    state.areaDrag = {
      startX: x,
      startY: y,
      areaX: area.x,
      areaY: area.y,
    };
  });

  svg.on("mousemove", (event) => {
    if (!state.curveDragging || state.mode !== "curvingConnection" || !state.selectedConnectionId) {
      return;
    }
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    updateCurvatureFromDrag(x, y);
    updateConnectionPaths();
  });

  svg.on("mousemove.area", (event) => {
    if (state.mode !== "movingArea" || !state.areaDrag || !state.selectedAreaId) {
      return;
    }
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    const area = model.areas.find((item) => item.id === state.selectedAreaId);
    if (!area) {
      return;
    }
    area.x = state.areaDrag.areaX + (x - state.areaDrag.startX);
    area.y = state.areaDrag.areaY + (y - state.areaDrag.startY);
    updateAreaPaths();
    updateAreaHandles();
  });

  svg.on("mouseup", () => {
    if (state.mode === "curvingConnection") {
      state.curveDragging = false;
      state.curveDrag = null;
    }
    if (state.mode === "movingArea") {
      state.areaDrag = null;
    }
  });

  svg.on("contextmenu", (event) => {
    event.preventDefault();
    hideEditors();
    hideActionPanel();
    const [sx, sy] = d3.pointer(event);
    const transform = d3.zoomTransform(svg.node());
    const [x, y] = transform.invert([sx, sy]);
    state.lastMenuWorld = { x, y };
    const rect = canvas.getBoundingClientRect();
    if (state.mode !== "idle") {
      showFinishMenu(event.clientX - rect.left, event.clientY - rect.top);
      return;
    }
    const target = event.target;
    const area =
      target && target.classList && target.classList.contains("area-shape") ? d3.select(target).datum() : null;
    if (area) {
      state.selectedAreaId = area.id;
      showContextMenu(event.clientX - rect.left, event.clientY - rect.top, [
        {
          label: "Change name",
          action: () => {
            showAreaEditor(area);
          },
        },
        {
          label: "Move area",
          action: () => {
            state.selectedAreaId = area.id;
            setMode("movingArea", area.name);
            showActionPanel("Drag the area to move it.", "Finish Area Move", () => {
              state.selectedAreaId = null;
              state.areaDrag = null;
              setMode("idle");
              hideActionPanel();
              renderAreaHandles();
            });
            renderAreaHandles();
          },
        },
        {
          label: "Delete area",
          className: "btn btn-outline-danger btn-sm w-100",
          action: () => {
            model.areas = model.areas.filter((item) => item.id !== area.id);
            model.accessPoints.forEach((ap) => {
              if (ap.areaId === area.id) {
                ap.areaId = null;
              }
            });
            state.selectedAreaId = null;
            renderAreas();
          },
        },
      ]);
    } else {
      showContextMenu(event.clientX - rect.left, event.clientY - rect.top, [
        {
          label: "Add Access Point",
          action: () => {
            const accessPoint = {
              id: generateId("ap"),
              name: `AP-${String(model.accessPoints.length + 1).padStart(2, "0")}`,
              x: state.lastMenuWorld.x,
              y: state.lastMenuWorld.y,
              areaId: null,
              routers: [],
            };
            model.accessPoints.push(accessPoint);
            renderAccessPoints();
            renderConnections();
            state.selectedAccessPointId = accessPoint.id;
            setMode("movingAp", accessPoint.name);
            showActionPanel("Drag the access point to move it.", "Finish AP Move", () => {
              state.selectedAccessPointId = null;
              setMode("idle");
              hideActionPanel();
            });
          },
        },
        {
          label: "Add Area",
          action: () => {
            const newArea = {
              id: generateId("area"),
              name: `Area-${model.areas.length + 1}`,
              x: state.lastMenuWorld.x,
              y: state.lastMenuWorld.y,
              rx: 180,
              ry: 110,
              jitter: 0.12,
              pointIds: [],
            };
            model.areas.push(newArea);
            renderAreas();
          },
        },
      ]);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!contextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });

  window.addEventListener("resize", () => fitToView());
}
