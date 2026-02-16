import { model } from "../model.js";

export function createConnectionTypesPanel({
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
}) {
  function setTypeForm(type) {
    if (!type) {
      state.editingTypeId = null;
      typeName.value = "";
      typeKind.value = "wireless";
      typeSpeed.value = "";
      typeLineStyle.value = "solid";
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
    typeLineStyle.value = type.lineStyle || "solid";
    typeColor.value = type.color || "";
    typeColorPicker.value = normalizeColor(type.color) || "#3f4a3a";
    typeThickness.value = type.thickness ?? 2;
    typesForm.hidden = false;
    updateTypeValidation();
  }

  function renderConnectionTypesList(onTypesChanged) {
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
          renderConnectionTypesList(onTypesChanged);
          if (state.editingTypeId === type.id) {
            setTypeForm(null);
          }
          onTypesChanged();
        });
      }

      actions.appendChild(edit);
      actions.appendChild(del);
      header.appendChild(title);
      header.appendChild(actions);

      const meta = document.createElement("div");
      meta.className = "type-row-meta";
      const metaParts = [type.type, type.speed, type.lineStyle, type.color, `${type.thickness}px`].filter(
        (value) => value && String(value).trim().length > 0
      );
      meta.textContent = metaParts.join(" - ");

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

  openConnectionTypes.addEventListener("click", (event) => {
    event.preventDefault();
    appRoot.classList.toggle("sidebar-open");
  });

  typeNew.addEventListener("click", () => {
    setTypeForm({ id: null, name: "", type: "wireless", speed: "", lineStyle: "solid", color: "", thickness: 2 });
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
  typeLineStyle.addEventListener("change", () => updateTypeValidation());
  typeColor.addEventListener("input", () => updateTypeValidation());
  typeThickness.addEventListener("input", () => updateTypeValidation());

  function wireSave(onTypesChanged) {
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
        lineStyle: typeLineStyle.value || "solid",
        color: validation.color || "#3f4a3a",
        thickness: validation.thickness,
      };
      if (state.editingTypeId) {
        model.connectionTypes = model.connectionTypes.map((item) => (item.id === next.id ? next : item));
      } else {
        model.connectionTypes.push(next);
        state.editingTypeId = next.id;
      }
      renderConnectionTypesList(onTypesChanged);
      if (connectionEditor.hidden === false) {
        renderConnectionTypeOptions(connectionType.value || next.id);
      }
      onTypesChanged();
      setTypeForm(null);
    });
  }

  return {
    setTypeForm,
    renderConnectionTypesList,
    renderConnectionTypeOptions,
    wireSave,
  };
}
