export const model = {
  connectionTypes: [
    {
      id: "type-1",
      name: "Pojitko 10G",
      type: "wireless",
      speed: "88 mbit",
      color: "red",
      thickness: 5,
    },
    {
      id: "type-2",
      name: "Optika Vodafone 1G",
      type: "fiber",
      speed: "1 gbit",
      color: "blue",
      thickness: 10,
    },
  ],
  accessPoints: [
    { id: "ap-1", name: "AP-01", x: 200, y: 180, areaId: "area-1", routers: ["R1"] },
    { id: "ap-2", name: "AP-02", x: 420, y: 240, areaId: "area-1", routers: ["R2"] },
    { id: "ap-3", name: "AP-03", x: 320, y: 360, areaId: "area-2", routers: [] },
  ],
  areas: [
    { id: "area-1", name: "North", x: 320, y: 220, rx: 220, ry: 140, jitter: 0.12, pointIds: ["ap-1", "ap-2"] },
    { id: "area-2", name: "South", x: 320, y: 360, rx: 200, ry: 120, jitter: 0.15, pointIds: ["ap-3"] },
  ],
  connections: [
    { id: "conn-1", fromId: "ap-1", toId: "ap-2", curvature: 40, description: "Primary link", typeId: "type-1" },
    { id: "conn-2", fromId: "ap-2", toId: "ap-3", curvature: 40, description: "Secondary link", typeId: "type-2" },
  ],
};

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
