export function createStatus({ state, statusText }) {
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

  return { setStatus, setMode };
}
