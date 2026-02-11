export function createContextMenu({ contextMenu, state, setMode }) {
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
            return;
          }
          state.connectFromId = null;
          state.selectedAccessPointId = null;
          state.selectedConnectionId = null;
          state.selectedAreaId = null;
          setMode("idle");
        },
      },
    ]);
  }

  return { showContextMenu, hideContextMenu, showFinishMenu };
}
