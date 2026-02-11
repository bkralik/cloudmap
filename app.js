import { model, findAccessPoint, findAreaAt, findConnection } from "./src/model.js";
import { state } from "./src/state.js";
import { generateId, normalizeColor } from "./src/utils.js";
import { createAreasRenderer } from "./src/render/areas.js";
import { createConnectionsRenderer } from "./src/render/connections.js";
import { createAccessPointsRenderer } from "./src/render/accessPoints.js";
import { createContextMenu } from "./src/ui/contextMenu.js";
import { createActionPanel } from "./src/ui/actionPanel.js";
import { createEditors } from "./src/ui/editors.js";
import { createConnectionTypesPanel } from "./src/ui/connectionTypesPanel.js";

(() => {
  const svg = d3.select("#map");
  const canvas = document.getElementById("canvas");
  const statusText = document.getElementById("statusText");
  const contextMenu = document.getElementById("contextMenu");
  const actionPanel = document.getElementById("actionPanel");
  const actionText = document.getElementById("actionText");
  const actionFinish = document.getElementById("actionFinish");
  const apEditor = document.getElementById("apEditor");
  const apName = document.getElementById("apName");
  const apRouters = document.getElementById("apRouters");
  const apRouterAdd = document.getElementById("apRouterAdd");
  const apSave = document.getElementById("apSave");
  const apCancel = document.getElementById("apCancel");
  const areaEditor = document.getElementById("areaEditor");
  const areaName = document.getElementById("areaName");
  const areaSave = document.getElementById("areaSave");
  const areaCancel = document.getElementById("areaCancel");
  const connectionEditor = document.getElementById("connectionEditor");
  const connectionType = document.getElementById("connectionType");
  const connectionDescription = document.getElementById("connectionDescription");
  const connectionSave = document.getElementById("connectionSave");
  const connectionCancel = document.getElementById("connectionCancel");
  const appRoot = document.querySelector(".app");
  const openConnectionTypes = document.getElementById("openConnectionTypes");
  const typesList = document.getElementById("typesList");
  const typeNew = document.getElementById("typeNew");
  const typeName = document.getElementById("typeName");
  const typeKind = document.getElementById("typeKind");
  const typeSpeed = document.getElementById("typeSpeed");
  const typeColor = document.getElementById("typeColor");
  const typeColorPick = document.getElementById("typeColorPick");
  const typeColorPicker = document.getElementById("typeColorPicker");
  const typeThickness = document.getElementById("typeThickness");
  const typeSave = document.getElementById("typeSave");
  const typeCancel = document.getElementById("typeCancel");
  const typesForm = document.getElementById("typesForm");
  const typeErrors = document.getElementById("typeErrors");

  const constants = {
    apRx: 34,
    apRy: 20,
    apPaddingX: 14,
    apPaddingY: 8,
    apLineHeight: 14,
    areaMinRx: 60,
    areaMinRy: 40,
    areaHandleRadius: 6,
  };

  const drag = d3
    .drag()
    .filter((event, d) => state.mode === "movingAp" && state.selectedAccessPointId === d.id && event.button === 0)
    .on("start", function (event, d) {
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

  const zoom = d3
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

  svg.call(zoom);

  const root = svg.append("g").attr("class", "root");
  const areasLayer = root.append("g").attr("class", "areas");
  const connectionsLayer = root.append("g").attr("class", "connections");
  const areaHandlesLayer = root.append("g").attr("class", "area-handles");
  const accessPointsLayer = root.append("g").attr("class", "access-points");

  function setStatus(text) {
    statusText.textContent = text;
  }

  function setMode(mode, detail) {
    state.mode = mode;
    if (mode === "addingAccessPoint") {
      setStatus("Adding access point: click on the map");
    } else if (mode === "addingArea") {
      setStatus("Adding area: click on the map");
    } else if (mode === "connecting") {
      setStatus(`Connecting from ${detail}`);
    } else if (mode === "movingAp") {
      setStatus(`Moving ${detail}`);
    } else if (mode === "curvingConnection") {
      setStatus("Adjusting connection curvature");
    } else if (mode === "movingArea") {
      setStatus(`Moving area ${detail}`);
    } else {
      setStatus("Ready");
    }
  }

  const { showContextMenu, hideContextMenu, showFinishMenu } = createContextMenu({
    contextMenu,
    state,
    setMode,
  });

  const { showActionPanel, hideActionPanel } = createActionPanel({
    actionPanel,
    actionText,
    actionFinish,
    state,
  });

  const connectionTypesPanel = createConnectionTypesPanel({
    state,
    appRoot,
    openConnectionTypes,
    typesList,
    typeNew,
    typeName,
    typeKind,
    typeSpeed,
    typeColor,
    typeColorPick,
    typeColorPicker,
    typeThickness,
    typeSave,
    typeCancel,
    typesForm,
    typeErrors,
    connectionType,
    connectionEditor,
    normalizeColor,
    generateId,
  });

  const { renderConnectionTypeOptions } = connectionTypesPanel;

  const editors = createEditors({
    state,
    apEditor,
    apName,
    apRouters,
    apRouterAdd,
    apSave,
    apCancel,
    areaEditor,
    areaName,
    areaSave,
    areaCancel,
    connectionEditor,
    connectionType,
    connectionDescription,
    connectionSave,
    connectionCancel,
    renderConnectionTypeOptions,
  });

  const { hideEditors, showApEditor, showAreaEditor, showConnectionEditor } = editors;

  const { renderConnections, updateConnectionPaths } = createConnectionsRenderer({
    connectionsLayer,
    canvas,
    showContextMenu,
    showFinishMenu,
    showActionPanel,
    hideActionPanel,
    hideEditors,
    showConnectionEditor,
    setMode,
  });

  const { renderAreas, updateAreaPaths, updateAreaHandles, renderAreaHandles } = createAreasRenderer({
    svg,
    areasLayer,
    areaHandlesLayer,
    constants,
  });

  const { renderAccessPoints } = createAccessPointsRenderer({
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
  });

  function render() {
    renderConnections();
    renderAreas();
    renderAccessPoints();
  }

  function fitToView() {
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
    const padding = 80;
    const contentWidth = maxX - minX || 1;
    const contentHeight = maxY - minY || 1;
    const scale = Math.min(
      2,
      Math.max(0.3, Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight))
    );
    const translateX = width / 2 - scale * (minX + contentWidth / 2);
    const translateY = height / 2 - scale * (minY + contentHeight / 2);
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
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
    const area = findAreaAt(x, y);
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

  window.addEventListener("resize", () => fitToView());


  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!contextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });

  editors.setRenderers({ renderAccessPoints, renderAreas, renderConnections });

  const onTypesChanged = () => {
    renderConnections();
    if (connectionEditor.hidden === false) {
      renderConnectionTypeOptions(connectionType.value);
    }
  };

  connectionTypesPanel.wireSave(onTypesChanged);
  connectionTypesPanel.setTypeForm(null);
  connectionTypesPanel.renderConnectionTypesList(onTypesChanged);

  render();
  setTimeout(fitToView, 50);

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

})();



