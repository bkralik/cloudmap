// Model structure:
// {
//   connectionTypes: [{ id, name, type: "wireless"|"metalic"|"fiber", speed, color, thickness }],
//   accessPoints: [{ id, name, x, y, areaId, routers: [string] }],
//   areas: [{ id, name, x, y, rx, ry, jitter, pointIds: [apId] }],
//   connections: [{ id, fromId, toId, curvature, description, typeId }],
// }
export const model = {
  connectionTypes: [],
  accessPoints: [],
  areas: [],
  connections: [],
};

export async function loadModel(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load model from ${url}: ${response.status}`);
  }
  const data = await response.json();
  model.connectionTypes = Array.isArray(data.connectionTypes) ? data.connectionTypes : [];
  model.accessPoints = Array.isArray(data.accessPoints) ? data.accessPoints : [];
  model.areas = Array.isArray(data.areas) ? data.areas : [];
  model.connections = Array.isArray(data.connections) ? data.connections : [];
  return model;
}

export function findAccessPoint(id) {
  return model.accessPoints.find((ap) => ap.id === id);
}

export function findConnection(id) {
  return model.connections.find((conn) => conn.id === id);
}

export function findConnectionType(id) {
  return model.connectionTypes.find((type) => type.id === id);
}

export function findAreaAt(x, y) {
  for (let i = model.areas.length - 1; i >= 0; i -= 1) {
    const area = model.areas[i];
    const dx = (x - area.x) / area.rx;
    const dy = (y - area.y) / area.ry;
    if (dx * dx + dy * dy <= 1) {
      return area;
    }
  }
  return null;
}
