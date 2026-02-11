import { model, findAccessPoint, findConnection } from "../model.js";

export function createEditors({
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
}) {
  let renderAccessPoints = () => {};
  let renderAreas = () => {};
  let renderConnections = () => {};

  function setRenderers(renderers) {
    renderAccessPoints = renderers.renderAccessPoints || renderAccessPoints;
    renderAreas = renderers.renderAreas || renderAreas;
    renderConnections = renderers.renderConnections || renderConnections;
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

  function renderRoutersList(routers) {
    apRouters.innerHTML = "";
    (routers || []).forEach((router) => addRouterRow(router));
    if (!(routers || []).length) {
      addRouterRow("");
    }
  }

  function readRoutersList() {
    return Array.from(apRouters.querySelectorAll("input"))
      .map((input) => input.value.trim())
      .filter((value) => value.length > 0);
  }

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

  apRouterAdd.addEventListener("click", () => addRouterRow(""));

  return {
    hideEditors,
    showApEditor,
    showAreaEditor,
    showConnectionEditor,
    setRenderers,
  };
}
