export function createActionPanel({ actionPanel, actionText, actionFinish, state }) {
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

  actionFinish.addEventListener("click", () => {
    if (state.actionFinishHandler) {
      state.actionFinishHandler();
    }
  });

  return { showActionPanel, hideActionPanel };
}
