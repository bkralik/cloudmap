export function generateId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
}

export function normalizeColor(value) {
  if (!value) {
    return "";
  }
  const probe = document.createElement("div");
  probe.style.color = value;
  if (!probe.style.color) {
    return "";
  }
  document.body.appendChild(probe);
  const normalized = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = normalized.match(/\d+/g);
  if (!match || match.length < 3) {
    return "";
  }
  const toHex = (num) => Number(num).toString(16).padStart(2, "0");
  return `#${toHex(match[0])}${toHex(match[1])}${toHex(match[2])}`;
}
