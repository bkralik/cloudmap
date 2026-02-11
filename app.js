import { model, findAccessPoint, findAreaAt, findConnection } from "./src/model.js";
import { state } from "./src/state.js";
import { generateId, normalizeColor } from "./src/utils.js";
import { createAreasRenderer } from "./src/render/areas.js";
import { createConnectionsRenderer } from "./src/render/connections.js";
import { createAccessPointsRenderer } from "./src/render/accessPoints.js";

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

  function hideContextMenu() {
    contextMenu.hidden = true;
  }

  function showContextMenu(x, y, items) {
    contextMenu.innerHTML = "";
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = item.className || "btn btn-outline-success btn-sm w-100";
      button.textContent = item.label;
      button.addEventListener("click", () => {
        hideContextMenu();
        item.action();
      });
      contextMenu.appendChild(button);
    });
    contextMenu.hidden = false;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
  }

  function showFinishMenu(x, y) {
    showContextMenu(x, y, [
      {
        label: "Finish",
        className: "btn btn-success btn-sm w-100",
        action: () => {
          if (state.actionFinishHandler) {
            state.actionFinishHandler();
          } else {
            state.connectFromId = null;
            state.selectedAccessPointId = null;
            state.selectedConnectionId = null;
            state.selectedAreaId = null;
            setMode("idle");
          }
        },
      },
    ]);
  }

  function showActionPanel(text, buttonLabel, onFinish) {
    actionText.textContent = text;
    actionFinish.textContent = buttonLabel;
    state.actionFinishHandler = onFinish;
    actionPanel.hidden = false;
  }

  function hideActionPanel() {
    actionPanel.hidden = true;
    state.actionFinishHandler = null;
  }

  function hideEditors() {
    apEditor.hidden = true;
    areaEditor.hidden = true;
    connectionEditor.hidden = true;
    state.editingApId = null;
    state.editingAreaId = null;
    state.editingConnectionId = null;
  }

  function showApEditor(accessPoint) {
    hideEditors();
    state.editingApId = accessPoint.id;
    apName.value = accessPoint.name;
    renderRoutersList(accessPoint.routers || []);
    apEditor.hidden = false;
    apName.focus();
    apName.select();
  }

  function showAreaEditor(area) {
    hideEditors();
    state.editingAreaId = area.id;
    areaName.value = area.name;
    areaEditor.hidden = false;
    areaName.focus();
    areaName.select();
  }

  function showConnectionEditor(connection) {
    hideEditors();
    state.editingConnectionId = connection.id;
    connectionDescription.value = connection.description || "";
    renderConnectionTypeOptions(connection.typeId);
    connectionEditor.hidden = false;
    connectionDescription.focus();
    connectionDescription.select();
  }

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

  actionFinish.addEventListener("click", () => {
    if (state.actionFinishHandler) {
      state.actionFinishHandler();
    }
  });

  openConnectionTypes.addEventListener("click", (event) => {
    event.preventDefault();
    appRoot.classList.toggle("sidebar-open");
  });

  apSave.addEventListener("click", () => {
    const accessPoint = findAccessPoint(state.editingApId);
    if (!accessPoint) {
      hideEditors();
      return;
    }
    accessPoint.name = apName.value;
    accessPoint.routers = readRoutersList();
    renderAccessPoints();
    hideEditors();
  });

  apCancel.addEventListener("click", () => hideEditors());
  apName.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideEditors();
    }
  });

  areaSave.addEventListener("click", () => {
    const area = model.areas.find((item) => item.id === state.editingAreaId);
    if (!area) {
      hideEditors();
      return;
    }
    area.name = areaName.value.trim() || area.name;
    renderAreas();
    hideEditors();
  });

  areaCancel.addEventListener("click", () => hideEditors());
  areaName.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideEditors();
    }
  });

  connectionSave.addEventListener("click", () => {
    const connection = findConnection(state.editingConnectionId);
    if (!connection) {
      hideEditors();
      return;
    }
    connection.description = connectionDescription.value;
    connection.typeId = connectionType.value || null;
    renderConnections();
    hideEditors();
  });

  connectionCancel.addEventListener("click", () => hideEditors());
  connectionDescription.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideEditors();
    }
  });

  typeNew.addEventListener("click", () => {
    setTypeForm({ id: null, name: "", type: "wireless", speed: "", color: "", thickness: 2 });
  });
  typeCancel.addEventListener("click", () => setTypeForm(null));
  typeColorPick.addEventListener("click", () => {
    typeColorPicker.click();
  });
  typeColorPicker.addEventListener("input", () => {
    typeColor.value = typeColorPicker.value;
    updateTypeValidation();
  });
  typeColor.addEventListener("blur", () => {
    const normalized = normalizeColor(typeColor.value);
    if (normalized) {
      typeColorPicker.value = normalized;
    }
    updateTypeValidation();
  });
  typeName.addEventListener("input", () => updateTypeValidation());
  typeKind.addEventListener("change", () => updateTypeValidation());
  typeSpeed.addEventListener("input", () => updateTypeValidation());
  typeColor.addEventListener("input", () => updateTypeValidation());
  typeThickness.addEventListener("input", () => updateTypeValidation());
  typeSave.addEventListener("click", () => {
    const validation = validateTypeForm();
    if (!validation.ok) {
      return;
    }
    const name = typeName.value.trim();
    const next = {
      id: state.editingTypeId || generateId("type"),
      name,
      type: typeKind.value || "wireless",
      speed: typeSpeed.value.trim(),
      color: validation.color || "#3f4a3a",
      thickness: validation.thickness,
    };
    if (state.editingTypeId) {
      model.connectionTypes = model.connectionTypes.map((item) => (item.id === next.id ? next : item));
    } else {
      model.connectionTypes.push(next);
      state.editingTypeId = next.id;
    }
    renderConnectionTypesList();
    renderConnections();
    if (connectionEditor.hidden === false) {
      renderConnectionTypeOptions(connectionType.value || next.id);
    }
    setTypeForm(null);
  });

  apRouterAdd.addEventListener("click", () => addRouterRow(""));

  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (!contextMenu.contains(event.target)) {
      hideContextMenu();
    }
  });

  setTypeForm(null);
  renderConnectionTypesList();
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

  function renderRoutersList(routers) {
    apRouters.innerHTML = "";
    (routers || []).forEach((router) => addRouterRow(router));
    if (!(routers || []).length) {
      addRouterRow("");
    }
  }

  function setTypeForm(type) {
    if (!type) {
      state.editingTypeId = null;
      typeName.value = "";
      typeKind.value = "wireless";
      typeSpeed.value = "";
      typeColor.value = "";
      typeThickness.value = "2";
      typesForm.hidden = true;
      typeErrors.textContent = "";
      typeSave.disabled = false;
      return;
    }
    state.editingTypeId = type.id;
    typeName.value = type.name || "";
    typeKind.value = type.type || "wireless";
    typeSpeed.value = type.speed || "";
    typeColor.value = type.color || "";
    typeColorPicker.value = normalizeColor(type.color) || "#3f4a3a";
    typeThickness.value = type.thickness ?? 2;
    typesForm.hidden = false;
    updateTypeValidation();
  }

  function renderConnectionTypesList() {
    typesList.innerHTML = "";
    model.connectionTypes.forEach((type) => {
      const row = document.createElement("div");
      row.className = "type-row";

      const header = document.createElement("div");
      header.className = "type-row-header";

      const title = document.createElement("div");
      title.className = "type-row-title";
      title.textContent = type.name;

      const actions = document.createElement("div");
      actions.className = "type-row-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-outline-success btn-sm";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => setTypeForm(type));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-outline-danger btn-sm";
      del.textContent = "Delete";
      const inUse = model.connections.some((conn) => conn.typeId === type.id);
      if (inUse) {
        del.disabled = true;
        del.title = "Type is used by a connection";
      } else {
        del.addEventListener("click", () => {
          model.connectionTypes = model.connectionTypes.filter((item) => item.id !== type.id);
          renderConnectionTypesList();
          renderConnections();
          if (connectionEditor.hidden === false) {
            renderConnectionTypeOptions(connectionType.value);
          }
          if (state.editingTypeId === type.id) {
            setTypeForm(null);
          }
        });
      }

      actions.appendChild(edit);
      actions.appendChild(del);
      header.appendChild(title);
      header.appendChild(actions);

      const meta = document.createElement("div");
      meta.className = "type-row-meta";
      meta.textContent = `${type.type} • ${type.speed} • ${type.color} • ${type.thickness}px`;

      row.appendChild(header);
      row.appendChild(meta);
      typesList.appendChild(row);
    });
  }

  function renderConnectionTypeOptions(selectedId) {
    connectionType.innerHTML = "";
    if (!model.connectionTypes.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No connection types";
      option.selected = true;
      connectionType.appendChild(option);
      connectionType.disabled = true;
      return;
    }
    connectionType.disabled = false;
    model.connectionTypes.forEach((type) => {
      const option = document.createElement("option");
      option.value = type.id;
      option.textContent = `${type.name} (${type.type}, ${type.speed})`;
      if (type.id === selectedId) {
        option.selected = true;
      }
      connectionType.appendChild(option);
    });
    if (!connectionType.value) {
      connectionType.value = model.connectionTypes[0].id;
    }
  }

  function addRouterRow(value) {
    const row = document.createElement("div");
    row.className = "router-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control form-control-sm";
    input.value = value || "";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn btn-outline-danger btn-sm";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      row.remove();
    });
    row.appendChild(input);
    row.appendChild(remove);
    apRouters.appendChild(row);
  }

  function readRoutersList() {
    return Array.from(apRouters.querySelectorAll("input"))
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);
  }

  function validateTypeForm() {
    const errors = [];
    const name = typeName.value.trim();
    if (!name) {
      errors.push("Name is required.");
    }
    const color = normalizeColor(typeColor.value.trim());
    if (!color) {
      errors.push("Line color must be valid.");
    }
    const thicknessValue = Number(typeThickness.value);
    const thickness =
      Number.isFinite(thicknessValue) && thicknessValue >= 1 && thicknessValue <= 100 ? thicknessValue : null;
    if (thickness === null) {
      errors.push("Line thickness must be between 1 and 100.");
    }
    typeErrors.innerHTML = errors.map((err) => `<div>${err}</div>`).join("");
    typeSave.disabled = errors.length > 0;
    return { ok: errors.length === 0, color, thickness };
  }

  function updateTypeValidation() {
    if (typesForm.hidden) {
      return;
    }
    validateTypeForm();
  }
})();
