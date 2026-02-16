import { model } from "./src/model.js";
import { state } from "./src/state.js";
import { generateId, normalizeColor } from "./src/utils.js";
import { constants, mapDataUrl } from "./src/constants.js";
import { loadModel } from "./src/model.js";
import { createAreasRenderer } from "./src/render/areas.js";
import { createConnectionsRenderer } from "./src/render/connections.js";
import { createAccessPointsRenderer } from "./src/render/accessPoints.js";
import { createContextMenu } from "./src/ui/contextMenu.js";
import { createActionPanel } from "./src/ui/actionPanel.js";
import { createEditors } from "./src/ui/editors.js";
import { createStatus } from "./src/ui/status.js";
import { createConnectionTypesPanel } from "./src/ui/connectionTypesPanel.js";
import { createZoom } from "./src/interactions/zoom.js";
import { createApDrag } from "./src/interactions/apDrag.js";
import { attachCanvasInteractions } from "./src/interactions/canvas.js";
import { createFitToView } from "./src/viewport.js";

(async () => {
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
  const typeLineStyle = document.getElementById("typeLineStyle");
  const typeColor = document.getElementById("typeColor");
  const typeColorPick = document.getElementById("typeColorPick");
  const typeColorPicker = document.getElementById("typeColorPicker");
  const typeThickness = document.getElementById("typeThickness");
  const typeSave = document.getElementById("typeSave");
  const typeCancel = document.getElementById("typeCancel");
  const typesForm = document.getElementById("typesForm");
  const typeErrors = document.getElementById("typeErrors");

  const root = svg.append("g").attr("class", "root");
  const areasLayer = root.append("g").attr("class", "areas");
  const connectionsLayer = root.append("g").attr("class", "connections");
  const areaHandlesLayer = root.append("g").attr("class", "area-handles");
  const accessPointsLayer = root.append("g").attr("class", "access-points");

  const { setMode } = createStatus({ state, statusText });

  const { showContextMenu, hideContextMenu, showFinishMenu } = createContextMenu({
    contextMenu,
    state,
    setMode,
  });

  const zoom = createZoom({ root, hideContextMenu });
  svg.call(zoom);
  const fitToView = createFitToView({ svg, zoom });

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
    typeLineStyle,
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

  const drag = createApDrag({ updateConnectionPaths });

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

  editors.setRenderers({ renderAccessPoints, renderAreas, renderConnections });

  attachCanvasInteractions({
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
  });

  const onTypesChanged = () => {
    renderConnections();
    if (connectionEditor.hidden === false) {
      renderConnectionTypeOptions(connectionType.value);
    }
  };

  connectionTypesPanel.wireSave(onTypesChanged);

  try {
    await loadModel(mapDataUrl);
  } catch (error) {
    console.error(error);
  }

  connectionTypesPanel.setTypeForm(null);
  connectionTypesPanel.renderConnectionTypesList(onTypesChanged);

  render();
  setTimeout(fitToView, 50);

})();





